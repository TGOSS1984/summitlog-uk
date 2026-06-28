FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy project
COPY backend/ .

# collectstatic and migrate need real env vars (SECRET_KEY, DATABASE_URL)
# which Render only injects at container runtime, not during the build
# step above — so both run here, right before gunicorn starts, on every
# deploy. Mountain data is already loaded from the DOBIH dataset and
# persists in the database — no need to reload or reseed it on future
# deploys.
# $PORT is supplied by Render (defaults to 8000 for local `docker run`).
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings.production && python manage.py migrate --noinput --settings=config.settings.production && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]