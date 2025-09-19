from __future__ import annotations

from local_weather_server.server.app import app as application

if __name__ == '__main__':
    application.run('0.0.0.0')
