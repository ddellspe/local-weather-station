# local-weather-station

A backend server, database, and frontend that is set up to support people who have a weather station that
can work with the ambient weather or weather underground weather APIs as a way to extract more realtime
data in order to have more representative readout of the weather station.

## Docker File

The Docker File to run the local-weather-station is available at ghcr.io/ddellspe/local-weather-station:latest

To run the file, run the following docker commands

```console
docker pull ghcr.io/ddellspe/local-weather-station:latest
docker run -d -p 5000:5000 -v ./data:/app/data ghcr.io/ddellspe/local-weather-station:latest
```

### Docker Environment Variables

| Environment Variable | Default Value | Purpose |
| --- | --- | --- |
| DB_PATH | database.db | Sets the name of the database file for use |

### Docker Volumes

The `/app/data` volume is where databases are created whether the default value (`database.db`) or the overridden value (via the `DB_PATH` environment variable)

## License

MIT
