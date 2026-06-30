from __future__ import annotations

import zoneinfo

from local_weather_server.models.database import WeatherData


def test_from_awn_request_timezone_parsing() -> None:
    data = WeatherData.from_awn_request(
        dateutc='2026-06-29 12:00:00',
        PASSKEY='test-station',
        tempf='70.0',
        humidity='50.0',
        windspeedmph='10.0',
        windgustmph='15.0',
        winddir='180.0',
        uv='5',
        solarradiation='500.0',
        hourlyrainin='0.0',
        dailyrainin='0.0',
        weeklyrainin='0.0',
        monthlyrainin='0.0',
        yearlyrainin='0.0',
        baromrelin='29.92',
        baromabsin='29.91',
        timezone='America/Chicago',
    )

    # 2026-06-29 12:00:00 UTC = 1782734400 epoch
    assert int(data.timestamp.timestamp()) == 1782734400

    # 12:00:00 UTC = 07:00:00 Chicago (UTC-5 during daylight savings)
    assert data.timestamp.hour == 7
    assert data.timestamp.minute == 0
    assert data.timestamp.second == 0
    assert data.timestamp.tzinfo == zoneinfo.ZoneInfo('America/Chicago')


def test_from_wunderground_request_timezone_parsing() -> None:
    data = WeatherData.from_wungerground_request(
        dateutc='2026-06-29 12:00:00',
        ID='test-station',
        tempf='70.0',
        humidity='50.0',
        winddir='180.0',
        windgustmph='15.0',
        windspeedmph='10.0',
        rainin='0.0',
        dailyrainin='0.0',
        weeklyrainin='0.0',
        monthlyrainin='0.0',
        yearlyrainin='0.0',
        solarradiation='500.0',
        UV='5',
        absbaromin='29.91',
        baromin='29.92',
        timezone='America/Chicago',
    )

    # 2026-06-29 12:00:00 UTC = 1782734400 epoch
    assert int(data.timestamp.timestamp()) == 1782734400

    # 12:00:00 UTC = 07:00:00 Chicago
    assert data.timestamp.hour == 7
    assert data.timestamp.minute == 0
    assert data.timestamp.second == 0
    assert data.timestamp.tzinfo == zoneinfo.ZoneInfo('America/Chicago')
