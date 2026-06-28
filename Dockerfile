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

# TEMPORARY: one-time import of the full DOBIH dataset (~21k rows, filtered
# down to Wainwrights/Munros/Nuttalls). Remove the import_mountains line
# once you've confirmed it ran successfully — no need to repeat this on
# every future deploy.
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings.production && python manage.py migrate --noinput --settings=config.settings.production && python manage.py loaddata initial_mountain_data --settings=config.settings.production && python manage.py import_mountains mountains/data/dobih.csv --dobih --settings=config.settings.production && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]