"""
Error handling for the Flask application and the flask-restx API.

flask-restx handles exceptions raised inside its own resources before Flask's
``app.errorhandler`` sees them (unless exceptions propagate, i.e. in debug or
testing mode). Handlers are therefore registered on both the Flask app and the
restx ``Api`` so that every route returns the same JSON error shape:

    {"error": "<HTTP reason>", "message": "<client-facing message>"}
"""

import logging

from flask import jsonify
from werkzeug.exceptions import HTTPException

from app.errors import DataScienceError

logger = logging.getLogger(__name__)


def error_payload(e):
    """
    Build the JSON body and status code for an exception.

    :param e: The exception that occurred.
    :return: A ``(body, status_code)`` tuple.
    """
    if isinstance(e, DataScienceError):
        return {"error": e.error, "message": e.public_message}, e.status_code

    logger.exception("Unhandled exception while processing request", exc_info=e)
    return {"error": "Internal Server Error", "message": "An unexpected error occurred"}, 500


class ErrorHandlerMiddleware:
    """
    Registers custom error handlers on a Flask app and, optionally, a restx Api.
    """

    def __init__(self, app, api=None):
        """
        Initialize the middleware with the Flask application.

        :param app: The Flask application.
        :param api: The flask-restx ``Api`` mounted on the app (optional).
        """
        self.app = app
        self.api = api
        self.register_error_handler()

    def register_error_handler(self):
        """
        Register custom error handlers for specific exception types.
        """

        @self.app.errorhandler(Exception)
        def handle_generic_error(e):
            """
            Convert exceptions raised outside restx resources into JSON.

            HTTP errors (404, 405, ...) keep their status code; they used to be
            turned into 500 responses.
            """
            if isinstance(e, HTTPException):
                return jsonify({"error": e.name, "message": e.description}), e.code
            body, status = error_payload(e)
            return jsonify(body), status

        if self.api is not None:

            @self.api.errorhandler(DataScienceError)
            def handle_data_science_error(e):
                return error_payload(e)

            # Default handler for non-HTTP exceptions inside restx resources.
            # HTTP exceptions (e.g. reqparse validation 400s) keep restx's format.
            @self.api.errorhandler
            def handle_unexpected_error(e):
                return error_payload(e)

    def __call__(self, environ, start_response):
        """
        Implement the WSGI application interface.

        :param environ: The WSGI environment dictionary.
        :param start_response: The function to start the response.
        :return: The response from the Flask application.
        """
        return self.app(environ, start_response)
