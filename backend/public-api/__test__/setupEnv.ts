// Runs before every test file (jest `setupFiles`), before any module is imported.
// Config values are read from process.env at import time, so they must be set here.
process.env.NODE_ENV = "test";
// The integration tests call the API without Firebase tokens.
// The auth middleware itself is tested separately with this flag switched off.
process.env.DISABLE_SWAGGER_AUTH = "true";
// Data-science service URL used by the (mocked) NetCDF API calls.
process.env.PYTHON_BACKEND_HOST = "datascience.test";
process.env.PYTHON_BACKEND_PORT = "50000";
