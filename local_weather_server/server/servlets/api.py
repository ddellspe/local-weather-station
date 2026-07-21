from __future__ import annotations

import datetime
import zoneinfo
from typing import Any

import flask

api_v1 = flask.Blueprint('api_v1', __name__)


@api_v1.route('/stations')
def get_stations() -> dict[str, list[dict[str, str | None]]]:
    cursor = flask.g.db.execute('SELECT id, timezone FROM weather_station')
    stations = [{'id': row[0], 'timezone': row[1]}
                for row in cursor.fetchall()]
    return {'stations': stations}


@api_v1.route('/stations/<station_id>/history')
def get_history(
    station_id: str,
) -> tuple[dict[str, Any], int] | dict[str, Any]:
    station = flask.g.db.execute(
        'SELECT id, timezone FROM weather_station WHERE id = ?',
        (station_id,),
    ).fetchone()
    if not station:
        return {'error': 'Station not found'}, 404

    timezone_str = station[1]
    try:
        tz = zoneinfo.ZoneInfo(timezone_str) if timezone_str else datetime.UTC
    except Exception:
        tz = datetime.UTC

    try:
        hours = int(flask.request.args.get('hours', '24'))
    except ValueError:
        return {'error': 'Invalid hours parameter'}, 400

    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())
    start_time = now_epoch - (hours * 3600)

    cursor = flask.g.db.execute(
        'SELECT '
        '  (timestamp / 300) * 300 as five_minute_bucket, '
        '  AVG(temperature), '
        '  AVG(humidity), '
        '  AVG(dew_point), '
        '  AVG(feels_like), '
        '  AVG(wind_speed), '
        '  AVG(wind_direction), '
        '  AVG(rainfall_rate), '
        '  AVG(daily_rain) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ? '
        'GROUP BY five_minute_bucket '
        'ORDER BY five_minute_bucket ASC',
        (station_id, start_time),
    )
    history = []
    for row in cursor.fetchall():
        history.append({
            'timestamp': row[0],
            'temperature': round(row[1], 1) if row[1] is not None else 0.0,
            'humidity': round(row[2], 1) if row[2] is not None else 0.0,
            'dew_point': round(row[3], 1) if row[3] is not None else 0.0,
            'feels_like': round(row[4], 1) if row[4] is not None else 0.0,
            'wind_speed': round(row[5], 2) if row[5] is not None else 0.0,
            'wind_direction': round(row[6], 1) if row[6] is not None else 0.0,
            'rainfall_rate': round(row[7], 3) if row[7] is not None else 0.0,
            'daily_rain': round(row[8], 2) if row[8] is not None else 0.0,
        })
    # Calculate 24-hour extremes
    start_time_24h = now_epoch - (24 * 3600)
    extremes_row = flask.g.db.execute(
        'SELECT MIN(temperature), MAX(temperature), '
        'MIN(feels_like), MAX(feels_like) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ?',
        (station_id, start_time_24h),
    ).fetchone()

    extremes_24h = None
    if extremes_row and any(val is not None for val in extremes_row):
        extremes_24h = {
            'temperature': {
                'min': extremes_row[0],
                'max': extremes_row[1],
            },
            'feels_like': {
                'min': extremes_row[2],
                'max': extremes_row[3],
            },
        }

    # Calculate timezone-aware daily extremes (since local midnight)
    now_local = datetime.datetime.now(tz)
    midnight_local = now_local.replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    midnight_epoch = int(midnight_local.timestamp())

    daily_row = flask.g.db.execute(
        'SELECT MIN(temperature), MAX(temperature), '
        'MIN(feels_like), MAX(feels_like) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ?',
        (station_id, midnight_epoch),
    ).fetchone()

    daily_extremes = None
    if daily_row and any(val is not None for val in daily_row):
        daily_extremes = {
            'temperature': {
                'min': daily_row[0],
                'max': daily_row[1],
            },
            'feels_like': {
                'min': daily_row[2],
                'max': daily_row[3],
            },
        }

    # Calculate 24-hour changes
    row = flask.g.db.execute(
        'SELECT timestamp, temperature, feels_like, humidity, dew_point, '
        'wind_speed, wind_direction, rainfall_rate, daily_rain '
        'FROM weather_data '
        'WHERE weather_station_id = ? '
        'ORDER BY timestamp DESC LIMIT 1',
        (station_id,),
    ).fetchone()

    changes_24h = None
    latest = None
    if row:
        latest = {
            'timestamp': row[0],
            'temperature': round(row[1], 1) if row[1] is not None else 0.0,
            'feels_like': round(row[2], 1) if row[2] is not None else 0.0,
            'humidity': round(row[3], 1) if row[3] is not None else 0.0,
            'dew_point': round(row[4], 1) if row[4] is not None else 0.0,
            'wind_speed': round(row[5], 2) if row[5] is not None else 0.0,
            'wind_direction': round(row[6], 1) if row[6] is not None else 0.0,
            'rainfall_rate': round(row[7], 3) if row[7] is not None else 0.0,
            'daily_rain': round(row[8], 2) if row[8] is not None else 0.0,
        }

        latest_row = row
        target_time = now_epoch - (24 * 3600)
        row_before = flask.g.db.execute(
            'SELECT temperature, feels_like, humidity, timestamp '
            'FROM weather_data '
            'WHERE weather_station_id = ? AND timestamp <= ? '
            'ORDER BY timestamp DESC LIMIT 1',
            (station_id, target_time),
        ).fetchone()
        row_after = flask.g.db.execute(
            'SELECT temperature, feels_like, humidity, timestamp '
            'FROM weather_data '
            'WHERE weather_station_id = ? AND timestamp >= ? '
            'ORDER BY timestamp ASC LIMIT 1',
            (station_id, target_time),
        ).fetchone()

        row_24h = None
        if row_before and row_after:
            diff_before = abs(row_before[3] - target_time)
            diff_after = abs(row_after[3] - target_time)
            if diff_before <= diff_after:
                row_24h = row_before
            else:
                row_24h = row_after
        else:
            row_24h = row_before or row_after

        # Ensure the 24h reading is within a 3-hour window of target_time
        if row_24h and abs(row_24h[3] - target_time) <= 3 * 3600:
            changes_24h = {
                'temperature': round(latest_row[1] - row_24h[0], 1),
                'feels_like': round(latest_row[2] - row_24h[1], 1),
                'humidity': round(latest_row[3] - row_24h[2], 1),
            }

    return {
        'history': history,
        'extremes_24h': extremes_24h,
        'daily_extremes': daily_extremes,
        'changes_24h': changes_24h,
        'latest': latest,
    }


@api_v1.route('/stations/<station_id>/wind')
def get_wind(station_id: str) -> tuple[dict[str, Any], int] | dict[str, Any]:
    station = flask.g.db.execute(
        'SELECT id FROM weather_station WHERE id = ?',
        (station_id,),
    ).fetchone()
    if not station:
        return {'error': 'Station not found'}, 404

    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())
    start_time_1h = now_epoch - 3600

    current_row = flask.g.db.execute(
        'SELECT wind_speed, wind_direction, wind_gust_speed, timestamp '
        'FROM weather_data '
        'WHERE weather_station_id = ? '
        'ORDER BY timestamp DESC LIMIT 1',
        (station_id,),
    ).fetchone()

    max_gust_row = flask.g.db.execute(
        'SELECT MAX(wind_gust_speed) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ?',
        (station_id, start_time_1h),
    ).fetchone()

    history_cursor = flask.g.db.execute(
        'SELECT wind_speed, wind_direction, timestamp '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ? '
        'ORDER BY timestamp ASC',
        (station_id, start_time_1h),
    )

    current_data = None
    if current_row:
        current_data = {
            'wind_speed': current_row[0],
            'wind_direction': current_row[1],
            'wind_gust_speed': current_row[2],
            'timestamp': current_row[3],
        }

    history = [{
        'wind_speed': r[0],
        'wind_direction': r[1],
        'timestamp': r[2],
    } for r in history_cursor.fetchall()]

    max_gust = (
        max_gust_row[0]
        if max_gust_row and max_gust_row[0] is not None
        else 0.0
    )

    return {
        'current': current_data,
        'max_gust_1h': max_gust,
        'history_1h': history,
    }


@api_v1.route('/stations/<station_id>/rain')
def get_rain(station_id: str) -> tuple[dict[str, Any], int] | dict[str, Any]:
    station = flask.g.db.execute(
        'SELECT id FROM weather_station WHERE id = ?',
        (station_id,),
    ).fetchone()
    if not station:
        return {'error': 'Station not found'}, 404

    current_row = flask.g.db.execute(
        'SELECT daily_rain, weekly_rain, monthly_rain, yearly_rain, '
        'rainfall_rate, timestamp '
        'FROM weather_data '
        'WHERE weather_station_id = ? '
        'ORDER BY timestamp DESC LIMIT 1',
        (station_id,),
    ).fetchone()

    last_zero_row = flask.g.db.execute(
        'SELECT timestamp '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND daily_rain = 0.0 '
        'ORDER BY timestamp DESC LIMIT 1',
        (station_id,),
    ).fetchone()

    current_data = None
    if current_row:
        current_data = {
            'daily_rain': current_row[0],
            'weekly_rain': current_row[1],
            'monthly_rain': current_row[2],
            'yearly_rain': current_row[3],
            'rainfall_rate': current_row[4],
            'timestamp': current_row[5],
        }

    last_zero_ts = last_zero_row[0] if last_zero_row else 0

    history_cursor = flask.g.db.execute(
        'SELECT timestamp, rainfall_rate, daily_rain '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ? '
        'ORDER BY timestamp ASC',
        (station_id, last_zero_ts),
    )

    history = [{
        'timestamp': r[0],
        'rainfall_rate': r[1],
        'daily_rain': r[2],
    } for r in history_cursor.fetchall()]

    return {
        'current': current_data,
        'last_zero_timestamp': last_zero_ts,
        'history_since_last_zero': history,
    }


@api_v1.route('/stations/<station_id>/history/minutely')
def get_minutely_history(
    station_id: str,
) -> tuple[dict[str, Any], int] | dict[str, Any]:
    station = flask.g.db.execute(
        'SELECT id FROM weather_station WHERE id = ?',
        (station_id,),
    ).fetchone()
    if not station:
        return {'error': 'Station not found'}, 404

    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())
    start_time = now_epoch - 3600

    cursor = flask.g.db.execute(
        'SELECT '
        '  (timestamp / 60) * 60 as minute_bucket, '
        '  AVG(temperature), '
        '  AVG(feels_like), '
        '  AVG(wind_speed), '
        '  AVG(humidity) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ? '
        'GROUP BY minute_bucket '
        'ORDER BY minute_bucket ASC',
        (station_id, start_time),
    )

    history = []
    for r in cursor.fetchall():
        history.append({
            'timestamp': r[0],
            'temperature': round(r[1], 1) if r[1] is not None else 0.0,
            'feels_like': round(r[2], 1) if r[2] is not None else 0.0,
            'wind_speed': round(r[3], 2) if r[3] is not None else 0.0,
            'humidity': round(r[4], 1) if r[4] is not None else 0.0,
        })

    return {'history': history}


@api_v1.route('/stations/<station_id>/history/hourly')
def get_hourly_history(
    station_id: str,
) -> tuple[dict[str, Any], int] | dict[str, Any]:
    station = flask.g.db.execute(
        'SELECT id FROM weather_station WHERE id = ?',
        (station_id,),
    ).fetchone()
    if not station:
        return {'error': 'Station not found'}, 404

    now_epoch = int(datetime.datetime.now(datetime.UTC).timestamp())
    start_time = now_epoch - (24 * 3600)

    cursor = flask.g.db.execute(
        'SELECT '
        '  (timestamp / 3600) * 3600 as hour_bucket, '
        '  AVG(temperature), '
        '  MIN(temperature), '
        '  MAX(temperature), '
        '  AVG(feels_like), '
        '  MIN(feels_like), '
        '  MAX(feels_like), '
        '  AVG(humidity), '
        '  AVG(rainfall_rate), '
        '  MAX(rainfall_rate) '
        'FROM weather_data '
        'WHERE weather_station_id = ? AND timestamp >= ? '
        'GROUP BY hour_bucket '
        'ORDER BY hour_bucket ASC',
        (station_id, start_time),
    )

    history = []
    for r in cursor.fetchall():
        history.append({
            'timestamp': r[0],
            'temperature': {
                'avg': round(r[1], 1) if r[1] is not None else 0.0,
                'min': r[2] if r[2] is not None else 0.0,
                'max': r[3] if r[3] is not None else 0.0,
            },
            'feels_like': {
                'avg': round(r[4], 1) if r[4] is not None else 0.0,
                'min': r[5] if r[5] is not None else 0.0,
                'max': r[6] if r[6] is not None else 0.0,
            },
            'humidity': round(r[7], 1) if r[7] is not None else 0.0,
            'rainfall_rate': {
                'avg': round(r[8], 3) if r[8] is not None else 0.0,
                'max': r[9] if r[9] is not None else 0.0,
            },
        })

    return {'history': history}


@api_v1.route('/config')
def get_config() -> dict[str, Any]:
    import os
    try:
        update_interval = int(os.environ.get('UPDATE_INTERVAL_SECONDS', '15'))
    except ValueError:
        update_interval = 15
    default_station = os.environ.get('DEFAULT_STATION')
    return {
        'update_interval': update_interval,
        'default_station': default_station,
    }
