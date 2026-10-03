"""
Conversion of uploaded NetCDF / CERV2 files into JSON.

Each public ``convert_*`` method works in two phases:

1. **Eager** (runs inside the request): the upload is written to a private
   temporary file, opened with netCDF4 and validated. Any failure here raises
   immediately, so the controller can still answer with a proper error status.
2. **Lazy** (runs while the response streams): the returned generator yields
   the JSON text. When it finishes or the client disconnects, the dataset is
   closed and the temporary file is deleted.
"""

import os
import tempfile

import numpy as np
import simplejson
from netCDF4 import Dataset

from app.errors import FailedToParseError, InvalidRequestError, NoCoordinatesError

# Separator between the JSON objects of the CERV2 chunk stream. The public API
# splits the response body on this exact string.
CHUNK_SEPARATOR = "||*split*||"


def custom_encoder(obj):
    """
    Custom JSON encoder to handle serialization of specific data types.

    Args:
        obj (object): The object to be serialized.

    Returns:
        object: A JSON serializable representation of the input object.
    """
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.generic):
        # any numpy scalar (float32, int16, int64, bool_, bytes_, ...)
        return obj.item()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def dumps(data):
    """Serialize ``data`` to JSON, mapping NaN/Infinity to ``null``."""
    return simplejson.dumps(data, default=custom_encoder, ignore_nan=True)


def _open_upload(netCDF4_file):
    """
    Save an uploaded file to a private temporary path and open it.

    The client-supplied filename is never used for the path.

    Returns:
        tuple[Dataset, str]: The open dataset and the temporary path.

    Raises:
        FailedToParseError: If the file is not a readable NetCDF file.
    """
    fd, file_path = tempfile.mkstemp(suffix=".nc")
    os.close(fd)
    try:
        netCDF4_file.save(file_path)
        return Dataset(file_path), file_path
    except Exception as e:
        os.remove(file_path)
        raise FailedToParseError() from e


def _close_upload(dataset, file_path):
    """Close the dataset and remove its temporary file."""
    try:
        dataset.close()
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


class DataProcessingService:
    """
    A service for converting NetCDF files to JSON format and performing data processing.

    This class provides methods for converting NetCDF metadata and data to JSON, as well as
    chunking NetCDF data into JSON format with filtering and dimension reduction.
    """

    def convert_netcdf_metadata_to_json(self, netCDF4_file):
        """
        Converts the metadata of a NetCDF file to JSON.

        Args:
            netCDF4_file (FileStorage): The uploaded NetCDF file.

        Returns:
            Iterator[str]: Yields one JSON document with ``dimensions``,
            ``variables_metadata`` and ``global_attributes``.
        """
        dataset, file_path = _open_upload(netCDF4_file)

        def generate():
            try:
                data = {
                    "dimensions": {},  # dimensions and their sizes
                    "variables_metadata": {},  # metadata about each variable
                    "global_attributes": {},  # global metadata
                }

                for dim_name, dim in dataset.dimensions.items():
                    data["dimensions"][dim_name] = len(dim)

                for var_name, var in dataset.variables.items():
                    data["variables_metadata"][var_name] = {
                        "dimensions": var.dimensions,
                        "attributes": {
                            attr_name: getattr(var, attr_name) for attr_name in var.ncattrs()
                        },
                    }

                for attr_name in dataset.ncattrs():
                    data["global_attributes"][attr_name] = getattr(dataset, attr_name)

                yield dumps(data)
            finally:
                _close_upload(dataset, file_path)

        return generate()

    def convert_netcdf_data_to_json(self, netCDF4_file):
        """
        Converts the data of every variable of a NetCDF file to JSON.

        Args:
            netCDF4_file (FileStorage): The uploaded NetCDF file.

        Returns:
            Iterator[str]: Yields one JSON document ``{"variables_data": {...}}``.
        """
        dataset, file_path = _open_upload(netCDF4_file)

        def generate():
            try:
                data = {"variables_data": {}}
                for var_name, var in dataset.variables.items():
                    data["variables_data"][var_name] = {
                        "dimensions": var.dimensions,
                        "data": var[:].filled().tolist(),
                    }
                yield dumps(data)
            finally:
                _close_upload(dataset, file_path)

        return generate()

    def convert_cerv2_data_to_json_chunks(
        self, netCDF4_file, filter, longitude_range, latitude_range, step_size
    ):
        """
        Converts selected CERV2 variables into one JSON object per grid point.

        Args:
            netCDF4_file (FileStorage): The uploaded NetCDF file.
            filter (list[str]): Names of the variables to export.
            longitude_range (list): ``[start, end]`` index range on ``west_east`` (or empty).
            latitude_range (list): ``[start, end]`` index range on ``south_north`` (or empty).
            step_size (int): Keep every ``step_size``-th grid point in both directions.

        Returns:
            Iterator[str]: Yields ``{"x", "y", "vars"?, "timeVars"?}`` objects,
            each followed by :data:`CHUNK_SEPARATOR`.

        Raises:
            FailedToParseError: The upload is not a readable NetCDF file.
            NoCoordinatesError: A requested variable has no spatial dimensions.
            InvalidRequestError: None of the requested variables exists.
        """
        dataset, file_path = _open_upload(netCDF4_file)
        try:
            variables, time_variables = preprocess_variables(
                dataset, filter, longitude_range, latitude_range, step_size
            )
        except Exception:
            _close_upload(dataset, file_path)
            raise

        def generate():
            try:
                yield from generate_cerv2_chunks(variables, time_variables)
            finally:
                _close_upload(dataset, file_path)

        return generate()


def generate_cerv2_chunks(variables, time_variables):
    """
    Yield one JSON object per (x, y) grid point.

    Args:
        variables (list[tuple[str, ndarray]]): Arrays shaped ``(west_east, south_north)``.
        time_variables (list[tuple[str, ndarray]]): Arrays shaped
            ``(west_east, south_north, time, ...)``.
    """
    if not variables and not time_variables:
        return
    if time_variables:
        max_t = max(v.shape[2] for _, v in time_variables)
    shape = variables[0][1].shape[:2] if variables else time_variables[0][1].shape[:2]

    for x, y in np.ndindex(shape):
        data = {"x": x, "y": y}
        if variables:
            data["vars"] = {name: values[x, y] for name, values in variables}
        if time_variables:
            data["timeVars"] = {
                t: {
                    name: values[x, y, t] if values.shape[2] > t else None
                    for name, values in time_variables
                }
                for t in range(max_t)
            }
        yield dumps(data) + CHUNK_SEPARATOR


def preprocess_variables(dataset, var_filter, lon_range, lat_range, step_size):
    """
    Select, reorder, crop and thin the requested variables.

    Every selected array is transposed to ``(west_east, south_north, time?, ...)``
    so that index ``[x, y]`` refers to the same grid point for all variables.

    Returns:
        tuple[list, list]: ``(variables, time_variables)`` as lists of
        ``(name, ndarray)``; variables with a ``time`` dimension go to the second list.
    """
    variables = []
    time_variables = []
    for var_name, var in dataset.variables.items():
        if var_name not in var_filter:
            continue
        if "south_north" not in var.dimensions or "west_east" not in var.dimensions:
            raise NoCoordinatesError(
                f"this service doesn't handle the variable {var_name} as it doesn't "
                "contain the dimensions south_north and west_east"
            )

        var_data = var[:].filled()  # convert masked array to numpy array
        dim_map = change_dimensions_dict(var.dimensions)
        var_data = var_data.transpose(list(dim_map.values()))
        if lon_range:
            var_data = var_data[int(lon_range[0]) : int(lon_range[1])]
        if lat_range:
            var_data = var_data[:, int(lat_range[0]) : int(lat_range[1])]
        var_data = var_data[::step_size, ::step_size]
        if "time" in var.dimensions:
            time_variables.append((var_name, var_data))
        else:
            variables.append((var_name, var_data))

    if not variables and not time_variables:
        raise InvalidRequestError("None of the requested variables exists in the file")
    return variables, time_variables


def change_dimensions_dict(dimensions):
    """
    Map dimension names to their index in ``dimensions``.

    The dict is ordered ``west_east``, ``south_north``, ``time`` (when present),
    then the remaining dimensions in their original order, so
    ``list(result.values())`` is a transpose order that moves the known
    dimensions to the front.
    """
    dim_map = {"west_east": None, "south_north": None}
    if "time" in dimensions:
        dim_map["time"] = None
    for idx, key in enumerate(dimensions):
        dim_map[key] = idx
    return dim_map
