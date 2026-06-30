# Stage 1: Build the frontend React/Vite dashboard
FROM node:24-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python Flask server
FROM python:3.13-bullseye

WORKDIR /app

COPY ./setup.cfg ./setup.py ./wsgi.py /app/
ADD local_weather_server /app/local_weather_server

# Copy the compiled static assets from Stage 1 into the Flask static folder
COPY --from=frontend-builder /frontend/dist /app/local_weather_server/server/static

RUN python -m pip install virtualenv && \
    python -m virtualenv /venv && \
    /venv/bin/pip install . && \
    /venv/bin/pip install uwsgi

ENV DB_PATH="database.db"
ENV SITE_TITLE="Local Weather Server"
ENV UPDATE_INTERVAL_SECONDS="15"

EXPOSE 5000

VOLUME /app/data

WORKDIR /app/data

# Run the application.
CMD ["/venv/bin/uwsgi", "--http", "0.0.0.0:5000", "--master", "-p", "2", "--wsgi-file", "/app/wsgi.py"]
