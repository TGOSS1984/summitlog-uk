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

# TEMPORARY: one-time enrichment of mountain summaries from Wikipedia.
# Threaded (8 workers), so ~800 mountains should complete in well under a
# minute, not the 10+ minutes a sequential version would take. Revert this
# CMD once you've confirmed it ran successfully.
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings.production && python manage.py migrate --noinput --settings=config.settings.production && python manage.py fetch_wikipedia_summaries --settings=config.settings.production && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]