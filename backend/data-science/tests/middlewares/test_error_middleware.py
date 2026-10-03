"""Error middleware: the same JSON error shape for Flask routes and restx resources."""

import pytest
from flask import Flask
from flask_restx import Api, Namespace, Resource, abort

from app.errors import (
    DataScienceError,
    FailedToParseError,
    InvalidRequestError,
    NoCoordinatesError,
)
from app.middlewares.error_middleware import ErrorHandlerMiddleware, error_payload
from config.app_config import ProductionConfig


@pytest.fixture
def prod_app():
    """
    App with exception propagation off (the code path used under gunicorn),
    with an extra Flask route and restx resource that raise on purpose.
    """
    app = Flask(__name__)
    app.config.from_object(ProductionConfig)
    api = Api(app, prefix="/api")

    @app.route("/boom")
    def boom():
        raise RuntimeError("secret internals")

    @app.route("/parse-error")
    def parse_error():
        raise FailedToParseError()

    ns = Namespace("test-errors")

    @ns.route("/<string:kind>")
    class Raiser(Resource):
        def get(self, kind):
            if kind == "domain":
                raise InvalidRequestError("bad thing")
            if kind == "abort":
                abort(409, "conflict")
            raise ValueError("secret internals")

    api.add_namespace(ns)
    ErrorHandlerMiddleware(app, api)
    return app


def test_404_keeps_status(prod_app):
    response = prod_app.test_client().get("/does-not-exist")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Not Found"


def test_405_keeps_status(client):
    response = client.get("/api/convert-netcdf-to-json/metadata")
    assert response.status_code == 405


def test_http_error_in_restx_resource_keeps_restx_format(prod_app):
    response = prod_app.test_client().get("/api/test-errors/abort")
    assert response.status_code == 409
    assert response.get_json() == {"message": "conflict"}


def test_unexpected_error_on_flask_route_hides_details(prod_app):
    response = prod_app.test_client().get("/boom")
    assert response.status_code == 500
    assert response.get_json() == {
        "error": "Internal Server Error",
        "message": "An unexpected error occurred",
    }


def test_domain_error_on_flask_route(prod_app):
    response = prod_app.test_client().get("/parse-error")
    assert response.status_code == 400
    assert response.get_json() == {"error": "Bad Request", "message": "Error processing the file"}


def test_domain_error_in_restx_resource(prod_app):
    response = prod_app.test_client().get("/api/test-errors/domain")
    assert response.status_code == 400
    assert response.get_json() == {"error": "Bad Request", "message": "bad thing"}


def test_unexpected_error_in_restx_resource(prod_app):
    response = prod_app.test_client().get("/api/test-errors/other")
    assert response.status_code == 500
    assert response.get_json()["message"] == "An unexpected error occurred"


@pytest.mark.parametrize(
    ("error", "status", "message"),
    [
        (FailedToParseError(), 400, "Error processing the file"),
        (NoCoordinatesError(), 400, NoCoordinatesError.public_message),
        (InvalidRequestError("x"), 400, "x"),
        (DataScienceError(), 500, "An unexpected error occurred"),
        (KeyError("k"), 500, "An unexpected error occurred"),
    ],
)
def test_error_payload(error, status, message):
    body, code = error_payload(error)
    assert code == status
    assert body["message"] == message


def test_middleware_is_wsgi_callable(app):
    middleware = ErrorHandlerMiddleware(app)
    environ = {
        "REQUEST_METHOD": "GET",
        "PATH_INFO": "/health",
        "SERVER_NAME": "localhost",
        "SERVER_PORT": "80",
        "wsgi.url_scheme": "http",
        "wsgi.input": None,
    }
    statuses = []
    body = b"".join(middleware(environ, lambda status, headers: statuses.append(status)))
    assert statuses == ["200 OK"]
    assert b"healthy" in body
