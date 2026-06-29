CREATE TABLE IF NOT EXISTS weather_data(
    timestamp INTEGER NOT NULL,
    weather_station_id CHAR(40) NOT NULL,
    temperature DECIMAL(4, 1) NOT NULL,
    humidity DECIMAL(4, 1) NOT NULL,
    dew_point DECIMAL(3, 1) NOT NULL,
    feels_like DECIMAL(4, 1) NOT NULL,
    absolute_pressure DECIMAL(6, 3) NOT NULL,
    relative_pressure DECIMAL(6, 3) NOT NULL,
    rainfall_rate DECIMAL(6, 3) NOT NULL,
    daily_rain DECIMAL(6, 3) NOT NULL,
    weekly_rain DECIMAL(6, 3) NOT NULL,
    monthly_rain DECIMAL(6, 3) NOT NULL,
    yearly_rain DECIMAL(6, 3) NOT NULL,
    wind_speed DECIMAL(5, 2) NOT NULL,
    wind_gust_speed DECIMAL(5, 2) NOT NULL,
    wind_direction DECIMAL(4, 1) NOT NULL,
    solar_radiation DECIMAL(6, 3) NOT NULL,
    uv_index INT NOT NULL
);

CREATE INDEX IF NOT EXISTS weather_data_timestamp_idx ON weather_data (timestamp);
CREATE INDEX IF NOT EXISTS weather_data_weather_station_id_idx ON weather_data (weather_station_id);
CREATE INDEX IF NOT EXISTS weather_data_station_timestamp_idx ON weather_data (weather_station_id, timestamp DESC);
