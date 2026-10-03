"""Domain errors raised by the data-science service.

Every error derives from :class:`DataScienceError`, which carries the HTTP
status code and the client-facing message used by the error middleware.
"""


class DataScienceError(Exception):
    """Base class for errors that map to a well-defined HTTP response."""

    status_code = 500
    error = "Internal Server Error"
    public_message = "An unexpected error occurred"

    def __init__(self, message=None):
        super().__init__(message or self.public_message)
        if message:
            self.public_message = message


class FailedToParseError(DataScienceError):
    """The uploaded file could not be opened or read as NetCDF."""

    status_code = 400
    error = "Bad Request"
    public_message = "Error processing the file"


class NoCoordinatesError(DataScienceError):
    """A requested variable lacks the ``south_north``/``west_east`` dimensions."""

    status_code = 400
    error = "Bad Request"
    public_message = "Variable does not contain the dimensions south_north and west_east"


class InvalidRequestError(DataScienceError):
    """A form parameter is malformed or no requested variable exists in the file."""

    status_code = 400
    error = "Bad Request"
    public_message = "Invalid request parameters"
