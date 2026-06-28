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

# TEMPORARY: wipe all mountain/collection/region data, then import ONLY
# the real DOBIH dataset — no demo fixture involved at all. Revert this
# CMD once you've confirmed the import succeeded.
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings.production && python manage.py migrate --noinput --settings=config.settings.production && python manage.py shell -c 'from mountains.models import Mountain, MountainCollection, SubRegion, Region; Mountain.objects.all().delete(); MountainCollection.objects.all().delete(); SubRegion.objects.all().delete(); Region.objects.all().delete(); print(\"Mountain data wiped clean\")' --settings=config.settings.production && python manage.py import_mountains mountains/data/dobih.csv --dobih --settings=config.settings.production && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]