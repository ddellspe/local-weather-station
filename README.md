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

| Environment Variable    | Default Value        | Purpose                                                    |
| ----------------------- | -------------------- | ---------------------------------------------------------- |
| DB_PATH                 | database.db          | Sets the name of the database file for use.                |
| SITE_TITLE              | Local Weather Server | Custom site title shown in the dashboard UI and tab title. |
| UPDATE_INTERVAL_SECONDS | 15                   | Rate in seconds at which the fast UI widgets refresh data. |

### Docker Volumes

The `/app/data` volume is where databases are created whether the default value (`database.db`) or the overridden value (via the `DB_PATH` environment variable)

## Weather Station Setup

To configure your personal weather station (such as an Ambient Weather WS-2000) to upload meteorological readings to this server, use the following configuration settings in your weather station's console or custom upload settings (e.g., in the WS View / Awnet app):

### Ambient Weather Network (AWN) Protocol

- **Server IP/Hostname**: The IP address or hostname of your running server/image.
- **Path**: `/awn/import?timezone=<your-timezone>` (e.g., `/awn/import?timezone=America/Chicago`).
- **Port**: The running image port (default `5000`).
- **Upload Interval**: `9` seconds.

### Weather Underground Protocol

- **Server IP/Hostname**: The IP address or hostname of your running server/image.
- **Path**: `/wunderground/import?timezone=<your-timezone>` (e.g., `/wunderground/import?timezone=America/Chicago`).
- **Station ID**: Whatever ID is desired (if trying to replace the AWN version capture, use its station ID).
- **Station Key**: Any value (this is currently ignored by the server).
- **Port**: The running image port (default `5000`).
- **Upload Interval**: `9` seconds.

## License

MIT
