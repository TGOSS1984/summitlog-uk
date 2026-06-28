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

# collectstatic, migrate, and loaddata need real env vars (SECRET_KEY,
# DATABASE_URL) which Render only injects at container runtime, not during
# the build step above — so all three run here, right before gunicorn
# starts, on every deploy. loaddata is safe to repeat: the fixture's rows
# have fixed primary keys, so re-running it just re-saves the same rows
# rather than creating duplicates.
# $PORT is supplied by Render (defaults to 8000 for local `docker run`).
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings.production && python manage.py migrate --noinput --settings=config.settings.production && python manage.py loaddata initial_mountain_data --settings=config.settings.production && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]