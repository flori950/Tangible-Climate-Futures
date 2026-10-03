"""Application factory, health route, docs and configuration."""

import pytest

from app import create_app
from config.app_config import DevelopmentConfig, ProductionConfig, get_flask_config


def test_health_matches_ci_check(client):
    # .github/scripts/health_check.sh compares the body (minus trailing newline) literally
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_data(as_text=True).strip() == '{"status":"healthy"}'


def test_swagger_docs_are_served(client):
    assert client.get("/docs").status_code == 200
    spec = client.get("/api/swagger.json").get_json()
    assert set(spec["paths"]) == {
        "/convert-netcdf-to-json/metadata",
        "/convert-netcdf-to-json/data",
        "/convert-netcdf-to-json/cerv2-data-chunks",
    }


@pytest.mark.parametrize(
    ("mode", "expected"),
    [
        ("development", DevelopmentConfig),
        ("production", ProductionConfig),
        ("unknown", DevelopmentConfig),
    ],
)
def test_get_flask_config(mode, expected):
    assert get_flask_config(mode) is expected


def test_create_app_applies_config():
    assert create_app("development", DevelopmentConfig).config["DEBUG"] is True
    assert create_app("production", ProductionConfig).config["DEBUG"] is False


def test_main_module_builds_production_app(monkeypatch):
    import importlib
    import sys

    monkeypatch.setenv("STAGE", "production")
    sys.modules.pop("main", None)
    main = importlib.import_module("main")
    assert main.mode == "production"
    assert main.app.config["DEBUG"] is False
