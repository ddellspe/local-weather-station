from __future__ import annotations

import datetime
from typing import Any
from unittest.mock import patch

import flask


def _import_test_data(
    server: Any,
    station_id: str,
    dateutc: str = 'now',
    tempf: str = '70.0',
    rain_rate: str = '0.0',
) -> None:
    server.client.get(
        flask.url_for('awn.import_weather_data'),
        query_string={
            'PASSKEY': station_id,
            'dateutc': dateutc,
            'tempf': tempf,
            'humidity': '70.0',
            'winddir': '120',
            'windgustmph': '5.0',
            'windspeedmph': '15.0',
            'hourlyrainin': rain_rate,
            'dailyrainin': '0.02',
            'weeklyrainin': '0.04',
            'monthlyrainin': '0.10',
            'yearlyrainin': '0.50',
            'solarradiation': '450.5',
            'uv': '2',
            'baromabsin': '29.98',
            'baromrelin': '29.99',
        },
    )


def _insert_station(server: Any, station_id: str) -> None:
    with server.sandbox.db() as db:
        exists = db.execute(
            'SELECT id FROM weather_station WHERE id = ?',
            (station_id,),
        ).fetchone()
        if not exists:
            db.execute(
                'INSERT INTO weather_station (id, timezone) VALUES (?, ?)',
                (station_id, 'UTC'),
            )


def _insert_reading(
    server: Any,
    station_id: str,
    timestamp: int,
    temp: float = 70.0,
    feels_like: float = 70.0,
    wind_speed: float = 15.0,
    wind_gust: float = 5.0,
    wind_dir: float = 120.0,
    rain_rate: float = 0.0,
    daily_rain: float = 0.02,
    humidity: float = 70.0,
) -> None:
    _insert_station(server, station_id)
    with server.sandbox.db() as db:
        db.execute(
            'INSERT INTO weather_data ('
            'timestamp, weather_station_id, temperature, humidity, '
            'dew_point, feels_like, absolute_pressure, '
            'relative_pressure, rainfall_rate, daily_rain, '
            'weekly_rain, monthly_rain, yearly_rain, wind_speed, '
            'wind_gust_speed, wind_direction, solar_radiation, '
            'uv_index) '
            'VALUES (?, ?, ?, ?, ?, ?, 29.98, 29.99, ?, ?, '
            '0.04, 0.10, 0.50, ?, ?, ?, 450.5, 2)',
            (
                timestamp,
                station_id,
                temp,
                humidity,
                temp - 10.2,
                feels_like,
                rain_rate,
                daily_rain,
                wind_speed,
                wind_gust,
                wind_dir,
            ),
        )


def test_get_stations(server: Any) -> None:
    # Initially no stations
    resp = server.client.get(flask.url_for('api_v1.get_stations'))
    assert resp.response.status_code == 200
    assert resp.json == {'stations': []}

    # Add a station
    _import_test_data(server, 'station-abc')

    resp = server.client.get(flask.url_for('api_v1.get_stations'))
    assert resp.response.status_code == 200
    assert len(resp.json['stations']) == 1
    assert resp.json['stations'][0]['id'] == 'station-abc'


def test_get_history_not_found(server: Any) -> None:
    resp = server.client.get(
        flask.url_for('api_v1.get_history', station_id='invalid-id'),
    )
    assert resp.response.status_code == 404
    assert resp.json == {'error': 'Station not found'}


def test_get_history_success(server: Any) -> None:
    _import_test_data(server, 'station-abc')

    resp = server.client.get(
        flask.url_for('api_v1.get_history', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert 'history' in resp.json
    assert len(resp.json['history']) == 1
    point = resp.json['history'][0]
    assert point['temperature'] == 70.0
    assert point['humidity'] == 70.0


def test_get_history_extremes(server: Any) -> None:
    station_id = 'station-abc'
    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())

    # Insert some readings
    _insert_reading(
        server, station_id, timestamp=now_epoch -
        3600, temp=65.0, feels_like=60.0,
    )
    _insert_reading(
        server, station_id, timestamp=now_epoch -
        1800, temp=75.0, feels_like=80.0,
    )
    _insert_reading(
        server, station_id, timestamp=now_epoch -
        900, temp=70.0, feels_like=72.0,
    )

    # Insert an old reading (older than 24 hours) which
    # shouldn't be counted in 24h extremes
    _insert_reading(
        server, station_id, timestamp=now_epoch -
        90000, temp=95.0, feels_like=105.0,
    )

    resp = server.client.get(
        flask.url_for('api_v1.get_history', station_id=station_id),
    )
    assert resp.response.status_code == 200
    assert 'extremes_24h' in resp.json
    extremes = resp.json['extremes_24h']
    assert extremes['temperature']['min'] == 65.0
    assert extremes['temperature']['max'] == 75.0
    assert extremes['feels_like']['min'] == 60.0
    assert extremes['feels_like']['max'] == 80.0


def test_get_history_invalid_hours(server: Any) -> None:
    _import_test_data(server, 'station-abc')
    resp = server.client.get(
        flask.url_for('api_v1.get_history', station_id='station-abc'),
        query_string={'hours': 'invalid'},
    )
    assert resp.response.status_code == 400
    assert resp.json == {'error': 'Invalid hours parameter'}


def test_get_wind(server: Any) -> None:
    # 404 test
    resp = server.client.get(
        flask.url_for('api_v1.get_wind', station_id='invalid-id'),
    )
    assert resp.response.status_code == 404

    # Success test
    _import_test_data(server, 'station-abc')
    resp = server.client.get(
        flask.url_for('api_v1.get_wind', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert 'current' in resp.json
    assert 'max_gust_1h' in resp.json
    assert 'history_1h' in resp.json

    current = resp.json['current']
    assert current['wind_speed'] == 15.0
    assert current['wind_direction'] == 120.0
    assert resp.json['max_gust_1h'] == 5.0
    assert len(resp.json['history_1h']) == 1


def test_get_rain(server: Any) -> None:
    # 404 test
    resp = server.client.get(
        flask.url_for('api_v1.get_rain', station_id='invalid-id'),
    )
    assert resp.response.status_code == 404

    # Success test
    _import_test_data(server, 'station-abc', rain_rate='0.1')
    resp = server.client.get(
        flask.url_for('api_v1.get_rain', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert 'current' in resp.json
    assert 'last_zero_timestamp' in resp.json
    assert 'history_since_last_zero' in resp.json

    current = resp.json['current']
    assert current['rainfall_rate'] == 0.1
    assert current['daily_rain'] == 0.02


def test_get_minutely_history(server: Any) -> None:
    # 404 test
    resp = server.client.get(
        flask.url_for('api_v1.get_minutely_history', station_id='invalid-id'),
    )
    assert resp.response.status_code == 404

    # Success test
    _import_test_data(server, 'station-abc')
    resp = server.client.get(
        flask.url_for('api_v1.get_minutely_history', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert 'history' in resp.json
    assert len(resp.json['history']) == 1
    point = resp.json['history'][0]
    assert point['temperature'] == 70.0
    assert point['humidity'] == 70.0


def test_get_hourly_history(server: Any) -> None:
    # 404 test
    resp = server.client.get(
        flask.url_for('api_v1.get_hourly_history', station_id='invalid-id'),
    )
    assert resp.response.status_code == 404

    # Success test
    _import_test_data(server, 'station-abc')
    resp = server.client.get(
        flask.url_for('api_v1.get_hourly_history', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert 'history' in resp.json
    assert len(resp.json['history']) == 1
    point = resp.json['history'][0]
    assert 'temperature' in point
    assert point['temperature']['avg'] == 70.0
    assert point['temperature']['min'] == 70.0
    assert point['temperature']['max'] == 70.0


def test_minutely_aggregation(server: Any) -> None:
    station_id = 'station-abc'
    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())

    # Bucket A: two readings in the same minute
    bucket_a_time = (now_epoch - 120) // 60 * 60
    _insert_reading(server, station_id, timestamp=bucket_a_time, temp=60.0)
    _insert_reading(
        server,
        station_id,
        timestamp=bucket_a_time + 10,
        temp=80.0,
    )

    # Bucket B: one reading in another minute
    bucket_b_time = (now_epoch - 240) // 60 * 60
    _insert_reading(server, station_id, timestamp=bucket_b_time, temp=50.0)

    # Out of window (older than 1 hour)
    _insert_reading(server, station_id, timestamp=now_epoch - 3700, temp=90.0)

    resp = server.client.get(
        flask.url_for('api_v1.get_minutely_history', station_id=station_id),
    )
    assert resp.response.status_code == 200
    history = resp.json['history']

    # Should have exactly 2 buckets, ordered chronologically
    assert len(history) == 2

    # Bucket B is older, comes first
    assert history[0]['timestamp'] == bucket_b_time
    assert history[0]['temperature'] == 50.0

    # Bucket A is newer, comes second
    assert history[1]['timestamp'] == bucket_a_time
    assert history[1]['temperature'] == 70.0  # Average of 60.0 and 80.0


def test_hourly_aggregation(server: Any) -> None:
    station_id = 'station-abc'
    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())

    # Hour Bucket A: 3 readings
    bucket_a_time = (now_epoch - 7200) // 3600 * 3600
    _insert_reading(
        server,
        station_id,
        timestamp=bucket_a_time,
        temp=60.0,
        feels_like=65.0,
    )
    _insert_reading(
        server,
        station_id,
        timestamp=bucket_a_time + 10,
        temp=80.0,
        feels_like=85.0,
    )
    _insert_reading(
        server,
        station_id,
        timestamp=bucket_a_time + 20,
        temp=100.0,
        feels_like=90.0,
    )

    # Hour Bucket B: 1 reading
    bucket_b_time = (now_epoch - 14400) // 3600 * 3600
    _insert_reading(
        server,
        station_id,
        timestamp=bucket_b_time,
        temp=50.0,
        feels_like=50.0,
    )

    # Out of window (25 hours ago)
    _insert_reading(server, station_id, timestamp=now_epoch - 90000, temp=90.0)

    resp = server.client.get(
        flask.url_for('api_v1.get_hourly_history', station_id=station_id),
    )
    assert resp.response.status_code == 200
    history = resp.json['history']

    # Should have exactly 2 hour buckets
    assert len(history) == 2

    # Bucket B is older, comes first
    assert history[0]['timestamp'] == bucket_b_time
    assert history[0]['temperature']['avg'] == 50.0
    assert history[0]['temperature']['min'] == 50.0
    assert history[0]['temperature']['max'] == 50.0

    # Bucket A is newer, comes second
    assert history[1]['timestamp'] == bucket_a_time
    assert history[1]['temperature']['avg'] == 80.0  # (60+80+100)/3
    assert history[1]['temperature']['min'] == 60.0
    assert history[1]['temperature']['max'] == 100.0
    assert history[1]['feels_like']['avg'] == 80.0
    assert history[1]['feels_like']['min'] == 65.0
    assert history[1]['feels_like']['max'] == 90.0


def test_rain_event_history(server: Any) -> None:
    station_id = 'station-abc'
    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())

    # Point 1: 4 hours ago, rate = 0.0
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 14400,
        rain_rate=0.0,
    )

    # Point 2: 3 hours ago, rate = 0.0
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 10800,
        rain_rate=0.0,
    )

    # Point 3: 2 hours ago, rate = 0.5
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 7200,
        rain_rate=0.5,
    )

    # Point 4: 1 hour ago, rate = 1.2
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 3600,
        rain_rate=1.2,
    )

    resp = server.client.get(
        flask.url_for('api_v1.get_rain', station_id=station_id),
    )
    assert resp.response.status_code == 200

    # Last zero timestamp must be Point 2 (3 hours ago)
    assert resp.json['last_zero_timestamp'] == now_epoch - 10800

    # History must include Point 2, Point 3, and Point 4, but NOT Point 1
    history = resp.json['history_since_last_zero']
    assert len(history) == 3
    assert history[0]['timestamp'] == now_epoch - 10800
    assert history[0]['rainfall_rate'] == 0.0
    assert history[1]['timestamp'] == now_epoch - 7200
    assert history[1]['rainfall_rate'] == 0.5
    assert history[2]['timestamp'] == now_epoch - 3600
    assert history[2]['rainfall_rate'] == 1.2


def test_wind_and_gust(server: Any) -> None:
    station_id = 'station-abc'
    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())

    # Point 1: 75 minutes ago (older than 1h window), gust = 40
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 4500,
        wind_speed=10.0,
        wind_gust=40.0,
    )

    # Point 2: 45 minutes ago, gust = 25
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 2700,
        wind_speed=15.0,
        wind_gust=25.0,
    )

    # Point 3: 15 minutes ago, gust = 10
    _insert_reading(
        server,
        station_id,
        timestamp=now_epoch - 900,
        wind_speed=12.0,
        wind_gust=10.0,
    )

    resp = server.client.get(
        flask.url_for('api_v1.get_wind', station_id=station_id),
    )
    assert resp.response.status_code == 200

    # max_gust_1h should be 25.0 (excluding the 40.0 gust from 75 mins ago)
    assert resp.json['max_gust_1h'] == 25.0

    # history_1h should have exactly 2 points
    history = resp.json['history_1h']
    assert len(history) == 2
    assert history[0]['timestamp'] == now_epoch - 2700
    assert history[1]['timestamp'] == now_epoch - 900


def test_endpoints_empty_data(server: Any) -> None:
    # Station exists but has no data
    _insert_station(server, 'station-abc')

    # Get wind
    resp = server.client.get(
        flask.url_for('api_v1.get_wind', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert resp.json['current'] is None
    assert resp.json['max_gust_1h'] == 0.0
    assert resp.json['history_1h'] == []

    # Get rain
    resp = server.client.get(
        flask.url_for('api_v1.get_rain', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert resp.json['current'] is None
    assert resp.json['last_zero_timestamp'] == 0
    assert resp.json['history_since_last_zero'] == []

    # Get history
    resp = server.client.get(
        flask.url_for('api_v1.get_history', station_id='station-abc'),
    )
    assert resp.response.status_code == 200
    assert resp.json['history'] == []
    assert resp.json['extremes_24h'] is None


def test_get_config(server: Any) -> None:
    # 1. Default fallback case (clean env)
    with patch.dict('os.environ', {}, clear=True):
        resp = server.client.get(flask.url_for('api_v1.get_config'))
        assert resp.response.status_code == 200
        assert resp.json == {'update_interval': 15}

    # 2. Configured case
    with patch.dict('os.environ', {'UPDATE_INTERVAL_SECONDS': '12'}):
        resp = server.client.get(flask.url_for('api_v1.get_config'))
        assert resp.response.status_code == 200
        assert resp.json == {'update_interval': 12}

    # 3. Invalid value fallback case
    with patch.dict('os.environ', {'UPDATE_INTERVAL_SECONDS': 'not-a-number'}):
        resp = server.client.get(flask.url_for('api_v1.get_config'))
        assert resp.response.status_code == 200
        assert resp.json == {'update_interval': 15}
