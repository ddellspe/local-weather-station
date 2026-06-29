CREATE TABLE IF NOT EXISTS weather_station (
    id char(40) NOT NULL PRIMARY KEY ASC,
    timezone char(25) DEFAULT 'UTC'
);
