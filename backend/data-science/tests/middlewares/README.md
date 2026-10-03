# tests/middlewares/

Tests for `app/middlewares/error_middleware.py`.

- `test_error_middleware.py` builds its own small app with `DEBUG`/`TESTING` off, so exceptions do not propagate (as under gunicorn). It adds one Flask route and one restx resource that raise on purpose. The tests check that 404/405 keep their status, that domain errors give 400 with the JSON shape, that unexpected errors give 500 without leaking the exception text, that HTTP aborts inside restx keep the restx format, and that the class works as a WSGI callable.
