"""Endpoint tests for /api/convert-netcdf-to-json/* using Flask's test client."""

import pytest
import simplejson

from app.services.data_processing_service import CHUNK_SEPARATOR
from tests.conftest import N_SN, N_WE

BASE = "/api/convert-netcdf-to-json"


def cerv2_form(upload, content, **fields):
    form = {"file": upload(content), "filter_variables": "lon,lat,tslb", "step_size": "1"}
    form.update(fields)
    return form


def test_metadata_endpoint(client, upload, cerv2_bytes):
    response = client.post(f"{BASE}/metadata", data={"file": upload(cerv2_bytes)})
    assert response.status_code == 200
    assert response.mimetype == "application/json"
    body = response.get_json()
    assert body["dimensions"]["west_east"] == N_WE
    assert "tslb" in body["variables_metadata"]


def test_data_endpoint(client, upload, cerv2_bytes):
    response = client.post(f"{BASE}/data", data={"file": upload(cerv2_bytes)})
    assert response.status_code == 200
    body = response.get_json()
    assert body["variables_data"]["time"]["data"] == [0, 1, 2]


def test_cerv2_chunks_endpoint(client, upload, cerv2_bytes):
    response = client.post(f"{BASE}/cerv2-data-chunks", data=cerv2_form(upload, cerv2_bytes))
    assert response.status_code == 200
    # same parsing as backend/public-api/src/services/netcdfApi.service.ts
    parts = response.get_data(as_text=True).split(CHUNK_SEPARATOR)
    assert parts[-1] == ""
    points = [simplejson.loads(p) for p in parts[:-1]]
    assert len(points) == N_WE * N_SN
    first = points[0]
    assert set(first) == {"x", "y", "vars", "timeVars"}
    assert first["vars"] == {"lon": 0.0, "lat": 0.0}


def test_cerv2_chunks_with_ranges(client, upload, cerv2_bytes):
    form = cerv2_form(
        upload,
        cerv2_bytes,
        filter_variables="lon",
        longitude_range="0,2",
        latitude_range="1,3",
    )
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 200
    parts = response.get_data(as_text=True).split(CHUNK_SEPARATOR)[:-1]
    assert len(parts) == 4


@pytest.mark.parametrize("endpoint", ["metadata", "data", "cerv2-data-chunks"])
def test_missing_file_is_rejected_by_parser(client, endpoint):
    response = client.post(f"{BASE}/{endpoint}", data={"filter_variables": "lon", "step_size": "1"})
    assert response.status_code == 400
    assert "file" in response.get_json()["errors"]


@pytest.mark.parametrize("endpoint", ["metadata", "data", "cerv2-data-chunks"])
def test_invalid_netcdf_returns_400(client, upload, endpoint):
    form = {"file": upload(b"definitely not netcdf"), "filter_variables": "lon", "step_size": "1"}
    response = client.post(f"{BASE}/{endpoint}", data=form)
    assert response.status_code == 400
    assert response.get_json() == {"error": "Bad Request", "message": "Error processing the file"}


@pytest.mark.parametrize("step_size", ["abc", "0", "-2", "1.5"])
def test_invalid_step_size(client, upload, cerv2_bytes, step_size):
    form = cerv2_form(upload, cerv2_bytes, step_size=step_size)
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 400
    assert response.get_json()["message"] == "step_size must be a positive integer"


def test_missing_step_size(client, upload, cerv2_bytes):
    form = {"file": upload(cerv2_bytes), "filter_variables": "lon"}
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 400
    assert "step_size" in response.get_json()["errors"]


@pytest.mark.parametrize("field", ["longitude_range", "latitude_range"])
@pytest.mark.parametrize("value", ["1", "a,b", "1,2,3"])
def test_invalid_range(client, upload, cerv2_bytes, field, value):
    form = cerv2_form(upload, cerv2_bytes, **{field: value})
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 400
    assert response.get_json()["message"] == f"{field} must be two integers 'start,end'"


def test_variable_without_coordinates(client, upload, cerv2_bytes):
    form = cerv2_form(upload, cerv2_bytes, filter_variables="time")
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 400
    assert "south_north and west_east" in response.get_json()["message"]


def test_unknown_variable(client, upload, cerv2_bytes):
    form = cerv2_form(upload, cerv2_bytes, filter_variables="does_not_exist")
    response = client.post(f"{BASE}/cerv2-data-chunks", data=form)
    assert response.status_code == 400
    assert response.get_json()["message"] == "None of the requested variables exists in the file"
