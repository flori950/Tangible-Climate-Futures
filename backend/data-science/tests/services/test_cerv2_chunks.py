"""Tests for the CERV2 chunking path of DataProcessingService."""

import io
import os
import tempfile

import pytest
import simplejson
from werkzeug.datastructures import FileStorage

from app.errors import FailedToParseError, InvalidRequestError, NoCoordinatesError
from app.services.data_processing_service import (
    CHUNK_SEPARATOR,
    DataProcessingService,
    generate_cerv2_chunks,
    preprocess_variables,
)
from tests.conftest import N_SN, N_TIME, N_WE, tslb_value

service = DataProcessingService()


def as_upload(content, filename="upload.nc"):
    return FileStorage(stream=io.BytesIO(content), filename=filename)


def parse_stream(chunks):
    body = "".join(chunks)
    assert body.endswith(CHUNK_SEPARATOR)
    return [simplejson.loads(part) for part in body.split(CHUNK_SEPARATOR)[:-1]]


def temp_nc_files():
    return {f for f in os.listdir(tempfile.gettempdir()) if f.endswith(".nc")}


def test_chunks_cover_every_grid_point_with_aligned_axes(cerv2_bytes):
    gen = service.convert_cerv2_data_to_json_chunks(
        as_upload(cerv2_bytes), ["lon", "lat", "tslb"], [], [], 1
    )
    points = parse_stream(gen)

    # x runs over west_east, y over south_north
    assert len(points) == N_WE * N_SN
    for p in points:
        x, y = p["x"], p["y"]
        # 2-D variables and time variables refer to the same grid point
        assert p["vars"] == {"lon": x, "lat": y}
        assert sorted(p["timeVars"]) == [str(t) for t in range(N_TIME)]
        for t in range(N_TIME):
            assert p["timeVars"][str(t)]["tslb"] == [tslb_value(t, soil, y, x) for soil in range(2)]


def test_ranges_and_step_size(cerv2_bytes):
    gen = service.convert_cerv2_data_to_json_chunks(
        as_upload(cerv2_bytes), ["lon", "lat"], [1, 5], [0, 4], 2
    )
    points = parse_stream(gen)
    # west_east 1..4 step 2 -> 1, 3 ; south_north 0..3 step 2 -> 0, 2
    assert [(p["vars"]["lon"], p["vars"]["lat"]) for p in points] == [
        (1, 0),
        (1, 2),
        (3, 0),
        (3, 2),
    ]
    assert all("timeVars" not in p for p in points)


def test_only_time_variables(cerv2_bytes):
    points = parse_stream(
        service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["tslb"], [], [], 3)
    )
    assert len(points) == 2 * 2  # ceil(5/3) * ceil(4/3)
    assert all("vars" not in p for p in points)


def test_nan_is_serialised_as_null(cerv2_bytes):
    points = parse_stream(
        service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["nan_var"], [], [], 1)
    )
    assert points[0]["vars"]["nan_var"] is None
    assert points[1]["vars"]["nan_var"] == 1.0


def test_unknown_variable_raises_before_streaming(cerv2_bytes):
    with pytest.raises(InvalidRequestError):
        service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["nope"], [], [], 1)


def test_variable_without_coordinates_raises(cerv2_bytes):
    with pytest.raises(NoCoordinatesError):
        service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["time"], [], [], 1)


def test_invalid_file_raises_failed_to_parse():
    with pytest.raises(FailedToParseError):
        service.convert_netcdf_metadata_to_json(as_upload(b"not a netcdf file"))


def test_client_filename_is_not_used_as_path(cerv2_bytes, tmp_path):
    # a path-traversal filename must not be written outside the temp file
    evil = "../../" + str(tmp_path / "escaped.nc")
    "".join(service.convert_netcdf_metadata_to_json(as_upload(cerv2_bytes, evil)))
    assert not (tmp_path / "escaped.nc").exists()


def test_temp_files_are_removed(cerv2_bytes):
    before = temp_nc_files()
    "".join(service.convert_netcdf_data_to_json(as_upload(cerv2_bytes)))
    with pytest.raises(InvalidRequestError):
        service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["nope"], [], [], 1)
    with pytest.raises(FailedToParseError):
        service.convert_netcdf_data_to_json(as_upload(b"garbage"))
    # a generator closed early (client disconnect) also cleans up
    gen = service.convert_cerv2_data_to_json_chunks(as_upload(cerv2_bytes), ["lon"], [], [], 1)
    next(gen)
    gen.close()
    assert temp_nc_files() == before


def test_metadata_document(cerv2_bytes):
    data = simplejson.loads(
        "".join(service.convert_netcdf_metadata_to_json(as_upload(cerv2_bytes)))
    )
    assert data["dimensions"] == {"time": 3, "soil": 2, "south_north": 4, "west_east": 5}
    assert data["variables_metadata"]["lon"] == {
        "dimensions": ["south_north", "west_east"],
        "attributes": {"units": "degrees_east", "valid_range": [-180.0, 180.0]},
    }
    assert data["global_attributes"] == {"title": "fixture"}


def test_data_document(cerv2_bytes):
    data = simplejson.loads("".join(service.convert_netcdf_data_to_json(as_upload(cerv2_bytes))))
    variables = data["variables_data"]
    assert set(variables) == {"time", "lon", "lat", "tslb", "nan_var"}
    assert variables["time"] == {"dimensions": ["time"], "data": [0, 1, 2]}
    assert variables["lat"]["data"][2] == [2.0] * N_WE
    assert variables["nan_var"]["data"][0][0] is None


def test_generate_chunks_with_nothing_selected_yields_nothing():
    assert list(generate_cerv2_chunks([], [])) == []


def test_preprocess_ignores_unrequested_variables(cerv2_dataset):
    variables, time_variables = preprocess_variables(cerv2_dataset, ["lat"], [], [], 1)
    assert [name for name, _ in variables] == ["lat"]
    assert variables[0][1].shape == (N_WE, N_SN)
    assert time_variables == []
