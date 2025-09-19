FROM python:3.13-bullseye

WORKDIR /app

COPY ./setup.cfg ./setup.py ./wsgi.py /app/
ADD local_weather_server /app/local_weather_server

RUN python -m pip install virtualenv && \
    python -m virtualenv /venv && \
    /venv/bin/pip install . && \
    /venv/bin/pip install uwsgi

ENV DB_PATH="database.db"

EXPOSE 5000

VOLUME /app/data

WORKDIR /app/data

# Run the application.
CMD ["/venv/bin/uwsgi", "--http", "0.0.0.0:5000", "--master", "-p", "2", "--wsgi-file", "/app/wsgi.py"]
