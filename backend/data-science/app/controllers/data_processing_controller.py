"""
REST endpoints of the ``convert-netcdf-to-json`` namespace (mounted under ``/api``).

All endpoints take a multipart upload with a ``file`` field and stream JSON back.
The service opens and validates the file before the response starts, so
unreadable files and bad parameters still produce a 400 response.
"""

from flask import Response
from flask_restx import Namespace, Resource
from werkzeug.datastructures import FileStorage

from app.errors import DataScienceError, FailedToParseError, InvalidRequestError
from app.services import data_processing_service

# Create a Namespace for the API endpoints
api = Namespace("convert-netcdf-to-json", description="Data Processing operations")

# Define a parser for file upload
upload_parser = api.parser()
upload_parser.add_argument("file", type=FileStorage, location="files", required=True)


def _stream(make_generator):
    """
    Run the eager part of a service call and wrap its generator in a response.

    Domain errors pass through unchanged; anything else is reported as a parse error.
    """
    try:
        json_generator = make_generator()
    except DataScienceError:
        raise
    except Exception as e:
        raise FailedToParseError() from e
    return Response(json_generator, mimetype="application/json")


def _parse_csv(value):
    """Split a comma-separated form value; ``None``/empty gives ``[]``."""
    return [part.strip() for part in value.split(",")] if value else []


def _parse_range(value, name):
    """Parse an ``"start,end"`` index range into two ints (or ``[]`` if absent)."""
    parts = _parse_csv(value)
    if not parts:
        return []
    try:
        start, end = (int(p) for p in parts)
    except ValueError as e:
        raise InvalidRequestError(f"{name} must be two integers 'start,end'") from e
    return [start, end]


def _parse_step_size(value):
    """Parse ``step_size`` as a positive integer."""
    try:
        step_size = int(value)
    except (TypeError, ValueError) as e:
        raise InvalidRequestError("step_size must be a positive integer") from e
    if step_size < 1:
        raise InvalidRequestError("step_size must be a positive integer")
    return step_size


# Endpoint to convert NetCDF metadata to JSON
@api.route("/metadata")
@api.expect(upload_parser)
class ConvertNetCDFMetadataToJSON(Resource):
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    def post(self):
        """
        Uploads a NetCDF file and converts its metadata to JSON.
        """
        args = upload_parser.parse_args()
        netCDF4_file = args["file"]
        return _stream(
            lambda: data_processing_service.convert_netcdf_metadata_to_json(netCDF4_file)
        )


# Endpoint to convert NetCDF data to JSON
@api.route("/data")
@api.expect(upload_parser)
class ConvertNetCDFDataToJSON(Resource):
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    def post(self):
        """
        Uploads a NetCDF file and converts its data to JSON.
        """
        args = upload_parser.parse_args()
        netCDF4_file = args["file"]
        return _stream(lambda: data_processing_service.convert_netcdf_data_to_json(netCDF4_file))


# Define a parser for CERV2 data conversion
cerv2_parser = api.parser()
cerv2_parser.add_argument("file", type=FileStorage, location="files", required=True)
cerv2_parser.add_argument("filter_variables", type=str, location="form", required=True)
cerv2_parser.add_argument("longitude_range", type=str, location="form", required=False)
cerv2_parser.add_argument("latitude_range", type=str, location="form", required=False)
cerv2_parser.add_argument("step_size", type=str, location="form", required=True)


# Endpoint to convert CERV2 data to JSON chunks
@api.route("/cerv2-data-chunks")
@api.expect(cerv2_parser)
class ConvertCERV2DataToJSONChunks(Resource):
    @api.response(200, "Success")
    @api.response(400, "Bad Request")
    def post(self):
        """
        Uploads a NetCDF file and converts its CERV2 data to JSON chunks.
        """
        args = cerv2_parser.parse_args()
        netCDF4_file = args["file"]
        filter_variables = _parse_csv(args.get("filter_variables"))
        longitude_range = _parse_range(args.get("longitude_range"), "longitude_range")
        latitude_range = _parse_range(args.get("latitude_range"), "latitude_range")
        step_size = _parse_step_size(args["step_size"])

        return _stream(
            lambda: data_processing_service.convert_cerv2_data_to_json_chunks(
                netCDF4_file, filter_variables, longitude_range, latitude_range, step_size
            )
        )
