# Data-science microservice (Flask + gunicorn).
# Build context is the repository root, see docker-compose*.yml:
#   docker build -f backend/data-science/Dockerfile -t tcf-data-science .
FROM python:3.13-slim

ENV STAGE=production \
    PORT=50000 \
    GUNICORN_TIMEOUT=1200 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install runtime dependencies first for better layer caching.
# netCDF4, numpy and cftime ship manylinux wheels, so no compiler is needed.
COPY backend/data-science/requirements.txt ./
RUN pip install -r requirements.txt

# Copy source code
COPY backend/data-science/app ./app
COPY backend/data-science/config ./config
COPY backend/data-science/main.py ./

EXPOSE ${PORT}

# Run as an unprivileged user
USER 1000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/health', timeout=4)"

# Shell form so ${PORT} / ${GUNICORN_TIMEOUT} are expanded; exec makes gunicorn PID 1.
# Large NetCDF uploads take long to convert, hence the long worker timeout.
# --no-control-socket: gunicorn >= 25.1 would otherwise create $HOME/.gunicorn/,
# which UID 1000 (no home directory in the image) cannot write.
CMD exec gunicorn main:app --bind 0.0.0.0:${PORT} --timeout ${GUNICORN_TIMEOUT} --no-control-socket
