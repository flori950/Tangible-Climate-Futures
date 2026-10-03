"""Shared pytest fixtures: Flask app/client and tiny NetCDF files built with netCDF4."""

import io

import numpy as np
import pytest
from netCDF4 import Dataset

from app import create_app
from config.app_config import get_flask_config

# Grid used by the CERV2-like fixture. Non-square on purpose, so a mixed-up
# axis order shows up as a shape error or wrong value.
N_TIME, N_SOIL, N_SN, N_WE = 3, 2, 4, 5


def tslb_value(t, soil, sn, we):
    """Value stored in the fixture's ``tslb`` variable at the given indices."""
    return 1000 * t + 100 * soil + 10 * sn + we


def write_cerv2_file(path):
    """
    Write a small CERV2-shaped NetCDF file.

    - ``lon[sn, we] = we`` and ``lat[sn, we] = sn`` (2-D, no time)
    - ``tslb[time, soil, sn, we] = tslb_value(...)`` (4-D, with time)
    - ``time[time]`` (1-D, no spatial dimensions)
    - ``nan_var[sn, we]`` with a NaN at ``[0, 0]``
    """
    with Dataset(path, "w") as ds:
        ds.title = "fixture"
        ds.createDimension("time", N_TIME)
        ds.createDimension("soil", N_SOIL)
        ds.createDimension("south_north", N_SN)
        ds.createDimension("west_east", N_WE)

        time = ds.createVariable("time", np.int32, ("time",))
        time.units = "days since 2022-01-01 00:00:00"
        time[:] = np.arange(N_TIME)

        sn_idx, we_idx = np.meshgrid(np.arange(N_SN), np.arange(N_WE), indexing="ij")
        lon = ds.createVariable("lon", np.float32, ("south_north", "west_east"))
        lon.units = "degrees_east"
        lon.valid_range = np.array([-180, 180], dtype=np.float32)
        lon[:] = we_idx
        lat = ds.createVariable("lat", np.float32, ("south_north", "west_east"))
        lat[:] = sn_idx

        tslb = ds.createVariable("tslb", np.float32, ("time", "soil", "south_north", "west_east"))
        t, soil, sn, we = np.meshgrid(
            np.arange(N_TIME), np.arange(N_SOIL), np.arange(N_SN), np.arange(N_WE), indexing="ij"
        )
        tslb[:] = tslb_value(t, soil, sn, we)

        nan_var = ds.createVariable("nan_var", np.float64, ("south_north", "west_east"))
        values = np.ones((N_SN, N_WE))
        values[0, 0] = np.nan
        nan_var[:] = values
    return path


@pytest.fixture
def cerv2_path(tmp_path):
    return write_cerv2_file(tmp_path / "cerv2.nc")


@pytest.fixture
def cerv2_bytes(cerv2_path):
    return cerv2_path.read_bytes()


@pytest.fixture
def cerv2_dataset(cerv2_path):
    ds = Dataset(cerv2_path)
    yield ds
    ds.close()


@pytest.fixture
def app():
    app = create_app("production", get_flask_config("production"))
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def upload():
    """Build a multipart file tuple for the Flask test client."""

    def _upload(content, filename="upload.nc"):
        return (io.BytesIO(content), filename)

    return _upload
