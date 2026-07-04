from __future__ import annotations

import datetime
import zoneinfo
from typing import NamedTuple

from local_weather_server.utils.calculators import dew_pointf
from local_weather_server.utils.calculators import feels_like


class WeatherStation(NamedTuple):
    id: str
    timezone: datetime.tzinfo | None = None


class WeatherData(NamedTuple):
    timestamp: datetime.datetime
    weather_station: WeatherStation
    temperature: float
    humidity: float
    dew_point: float
    feels_like: float
    absolute_pressure: float
    relative_pressure: float
    rainfall_rate: float
    daily_rain: float
    weekly_rain: float
    monthly_rain: float
    yearly_rain: float
    wind_speed: float
    wind_gust_speed: float
    wind_direction: float
    solar_radiation: float
    uv_index: int

    @classmethod
    def from_wungerground_request(
        cls,
        dateutc: str,
        ID: str,
        tempf: str,
        humidity: str,
        winddir: str,
        windgustmph: str,
        windspeedmph: str,
        rainin: str,
        dailyrainin: str,
        weeklyrainin: str,
        monthlyrainin: str,
        yearlyrainin: str,
        solarradiation: str,
        UV: str,
        absbaromin: str,
        baromin: str,
        **kwargs: str,
    ) -> WeatherData:
        # API Request example
        # Setup is using:
        # Server IP/Hostname [ip address of the running image]
        # Path: /wunderground/import?timezone=America/Chicago&
        #   (or the specific timezone being referenced)
        # Station ID: (Whatever ID is desired to be used
        #   if trying to replace the AWN version capture
        #   its station ID and then push it)
        # Station Key: (Whatever you want, it's ignored currently)
        # Port: Running image port
        # Upload interval: 9 s
        #
        # Example GET request
        # /wunderground/import?timezone=America/Chicago&
        # ID=<ID>&PASSWORD=<KEY>&
        # tempf=74.3&humidity=92&dewptf=72.0&windchillf=74.3&
        # winddir=235&windspeedmph=0.22&windgustmph=2.24&
        # rainin=0.000&dailyrainin=0.051&weeklyrainin=0.051&monthlyrainin=0.051&yearlyrainin=26.228&
        # solarradiation=65.35&UV=0&
        # indoortempf=72.9&indoorhumidity=51&
        # absbaromin=30.035&baromin=30.035&lowbatt=0&dateutc=now&
        # softwaretype=AMBWeatherPro_V5.2.7&action=updateraw&realtime=1&rtfreq=5
        timezone = kwargs.get('timezone', 'UTC')
        tz = zoneinfo.ZoneInfo(key=timezone)
        if dateutc == 'now':
            timestamp = datetime.datetime.now(tz).replace(microsecond=0)
        else:
            timestamp = datetime.datetime.strptime(
                dateutc, '%Y-%m-%d %H:%M:%S',
            ).replace(tzinfo=datetime.UTC).astimezone(tz)
        temperature = float(tempf)
        relative_humidity = float(humidity)
        wind_speed = float(windspeedmph)
        dew_pt = dew_pointf(
            temperature=temperature,
            humidity=relative_humidity,
        )
        feels_lk = feels_like(
            temperature=temperature,
            humidity=relative_humidity, wind_speed=wind_speed,
        )
        return WeatherData(
            timestamp=timestamp,
            weather_station=WeatherStation(id=ID, timezone=tz),
            temperature=temperature,
            humidity=relative_humidity,
            dew_point=round(dew_pt, 1),
            feels_like=round(feels_lk, 1),
            absolute_pressure=float(absbaromin),
            relative_pressure=float(baromin),
            rainfall_rate=float(rainin),
            daily_rain=float(dailyrainin),
            weekly_rain=float(weeklyrainin),
            monthly_rain=float(monthlyrainin),
            yearly_rain=float(yearlyrainin),
            wind_speed=wind_speed,
            wind_gust_speed=float(windgustmph),
            wind_direction=float(winddir),
            solar_radiation=float(solarradiation),
            uv_index=int(UV),
        )

    @classmethod
    def from_awn_request(
        cls,
        dateutc: str,
        PASSKEY: str,
        tempf: str,
        humidity: str,
        windspeedmph: str,
        windgustmph: str,
        winddir: str,
        uv: str,
        solarradiation: str,
        hourlyrainin: str,
        dailyrainin: str,
        weeklyrainin: str,
        monthlyrainin: str,
        yearlyrainin: str,
        baromrelin: str,
        baromabsin: str,
        **kwargs: str,
    ) -> WeatherData:
        # API Request example
        # Setup is using:
        # Server IP/Hostname [ip address of the running image]
        # Path: /awn/import?timezone=America/Chicago
        #   (or the specific timezone being referenced)
        # Port: Running image port
        # Upload interval: 9 s
        #
        # Example GET request
        # /awn/import?timezone=America/Chicago&
        # PASSKEY=<ID>&stationtype=AMBWeatherPro_V5.2.7&dateutc=2026-07-04+15:59:58&
        # tempf=74.3&humidity=92&
        # windspeedmph=0.45&windspdmph_avg10m=0.00&windgustmph=1.12&
        # maxdailygust=8.05&winddir=233&winddir_avg10m=236&
        # uv=0&solarradiation=58.79&
        # hourlyrainin=0.071&eventrainin=0.051&dailyrainin=0.051&weeklyrainin=0.051&monthlyrainin=0.051&yearlyrainin=26.228&
        # battout=1&
        # tempinf=72.9&humidityin=51&
        # baromrelin=30.038&baromabsin=30.038&battin=1
        timezone = kwargs.get('timezone', 'UTC')
        tz = zoneinfo.ZoneInfo(key=timezone)
        if dateutc == 'now':
            timestamp = datetime.datetime.now(tz).replace(microsecond=0)
        else:
            timestamp = datetime.datetime.strptime(
                dateutc, '%Y-%m-%d %H:%M:%S',
            ).replace(tzinfo=datetime.UTC).astimezone(tz)
        temperature = float(tempf)
        relative_humidity = float(humidity)
        wind_speed = float(windspeedmph)
        dew_pt = dew_pointf(
            temperature=temperature,
            humidity=relative_humidity,
        )
        feels_lk = feels_like(
            temperature=temperature,
            humidity=relative_humidity, wind_speed=wind_speed,
        )
        return WeatherData(
            timestamp=timestamp,
            weather_station=WeatherStation(id=PASSKEY, timezone=tz),
            temperature=temperature,
            humidity=relative_humidity,
            dew_point=round(dew_pt, 1),
            feels_like=round(feels_lk, 1),
            absolute_pressure=float(baromabsin),
            relative_pressure=float(baromrelin),
            rainfall_rate=float(hourlyrainin),
            daily_rain=float(dailyrainin),
            weekly_rain=float(weeklyrainin),
            monthly_rain=float(monthlyrainin),
            yearly_rain=float(yearlyrainin),
            wind_speed=wind_speed,
            wind_gust_speed=float(windgustmph),
            wind_direction=float(winddir),
            solar_radiation=float(solarradiation),
            uv_index=int(uv),
        )
