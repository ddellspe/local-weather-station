import { useEffect, useState, useRef } from "react";
import TemperatureChart from "./components/TemperatureChart";
import WindRose from "./components/WindRose";
import RainTracker from "./components/RainTracker";
import HourlyRangeChart from "./components/HourlyRangeChart";
import "./App.css";

interface Station {
  id: string;
  timezone: string;
}

interface WeatherReading {
  timestamp: number;
  temperature: number;
  humidity: number;
  dew_point: number;
  feels_like: number;
  wind_speed: number;
  wind_direction: number;
  rainfall_rate: number;
  daily_rain: number;
}

function App() {
  const siteTitle =
    document.title && document.title !== "{{ SITE_TITLE }}"
      ? document.title
      : "Local Weather Server";

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState<string | null>(null);

  // Current conditions state
  const [latestReading, setLatestReading] = useState<WeatherReading | null>(
    null,
  );
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState<string | null>(null);

  // 24-hour history state
  const [history, setHistory] = useState<WeatherReading[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Wind state
  const [windData, setWindData] = useState<any>(null);
  const [windLoading, setWindLoading] = useState(false);
  const [windError, setWindError] = useState<string | null>(null);

  // Rain state
  const [rainData, setRainData] = useState<any>(null);
  const [rainLoading, setRainLoading] = useState(false);
  const [rainError, setRainError] = useState<string | null>(null);

  // Hourly history state
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  const [updateInterval, setUpdateInterval] = useState<number>(15);

  // Fetch configuration on mount
  useEffect(() => {
    fetch("/api/v1/config")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch config");
        }
        return res.json();
      })
      .then((data) => {
        if (typeof data.update_interval === "number") {
          setUpdateInterval(data.update_interval);
        }
      })
      .catch((err) => {
        console.error("Error loading config:", err);
      });
  }, []);

  // Fetch stations on mount
  useEffect(() => {
    fetch("/api/v1/stations")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch stations");
        }
        return res.json();
      })
      .then((data) => {
        const loadedStations = data.stations || [];
        setStations(loadedStations);
        if (loadedStations.length > 0) {
          setSelectedStation(loadedStations[0].id);
        }
        setStationsLoading(false);
      })
      .catch((err) => {
        setStationsError(err.message);
        setStationsLoading(false);
      });
  }, []);

  // Fetch fast dashboard data (current, wind, rain)
  const fetchFastData = (stationId: string, isSilent: boolean = false) => {
    if (!isSilent) {
      setLatestLoading(true);
      setWindLoading(true);
      setRainLoading(true);
    }
    setLatestError(null);
    setWindError(null);
    setRainError(null);

    // 1. Fetch current conditions (using hours=2 to get latest reading)
    fetch(`/api/v1/stations/${stationId}/history?hours=2`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch current conditions");
        return res.json();
      })
      .then((data) => {
        const hist = data.history || [];
        setLatestReading(hist.length > 0 ? hist[hist.length - 1] : null);
      })
      .catch((err) => setLatestError(err.message))
      .finally(() => setLatestLoading(false));

    // 2. Fetch wind data
    fetch(`/api/v1/stations/${stationId}/wind`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch wind data");
        return res.json();
      })
      .then((data) => {
        setWindData(data);
      })
      .catch((err) => setWindError(err.message))
      .finally(() => setWindLoading(false));

    // 3. Fetch rain data
    fetch(`/api/v1/stations/${stationId}/rain`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch rain data");
        return res.json();
      })
      .then((data) => {
        setRainData(data);
      })
      .catch((err) => setRainError(err.message))
      .finally(() => setRainLoading(false));
  };

  // Fetch slow dashboard data (24-hour graphs)
  const fetchSlowData = (stationId: string, isSilent: boolean = false) => {
    if (!isSilent) {
      setHistoryLoading(true);
      setHourlyLoading(true);
    }
    setHistoryError(null);
    setHourlyError(null);

    // 1. Fetch 24-hour history
    fetch(`/api/v1/stations/${stationId}/history?hours=24`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch weather history");
        return res.json();
      })
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch((err) => setHistoryError(err.message))
      .finally(() => setHistoryLoading(false));

    // 2. Fetch hourly history
    fetch(`/api/v1/stations/${stationId}/history/hourly`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch hourly weather data");
        return res.json();
      })
      .then((data) => {
        setHourlyData(data.history || []);
      })
      .catch((err) => setHourlyError(err.message))
      .finally(() => setHourlyLoading(false));
  };

  const ticksRef = useRef(0);

  // Trigger fetch when selected station changes or interval fires
  useEffect(() => {
    if (!selectedStation) return;

    // Reset tick count on station change
    ticksRef.current = 0;

    // Initial non-silent load
    fetchFastData(selectedStation, false);
    fetchSlowData(selectedStation, false);

    // Setup periodic auto-update
    const intervalId = setInterval(() => {
      const ticksNeeded = Math.ceil(
        Math.min(updateInterval * 5, 300) / updateInterval,
      );
      ticksRef.current += 1;

      // Always update fast data on every tick
      fetchFastData(selectedStation, true);

      if (ticksRef.current >= ticksNeeded) {
        // Slow refresh
        fetchSlowData(selectedStation, true);
        ticksRef.current = 0;
      }
    }, updateInterval * 1000);

    return () => clearInterval(intervalId);
  }, [selectedStation, updateInterval]);

  return (
    <>
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{siteTitle}</h1>
          <p className="header-subtitle">Real-time Meteorological Dashboard</p>
        </div>

        <div className="header-right">
          <div className="live-status">
            <span className="status-dot"></span>
            <span className="status-text">Live</span>
          </div>

          {/* Station Selector */}
          {!stationsLoading && !stationsError && stations.length > 1 && (
            <div className="station-selector-wrapper">
              <label htmlFor="station-select">Station: </label>
              <select
                id="station-select"
                value={selectedStation || ""}
                onChange={(e) => setSelectedStation(e.target.value)}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {stationsError && (
        <p style={{ color: "var(--accent-red)", marginBottom: "1.5rem" }}>
          Error loading stations: {stationsError}
        </p>
      )}

      <main className="dashboard-grid">
        {/* Weather Conditions Display */}
        {latestLoading && (
          <p style={{ gridColumn: "1 / -1" }}>
            Loading current weather conditions...
          </p>
        )}
        {latestError && (
          <p style={{ color: "var(--accent-red)", gridColumn: "1 / -1" }}>
            Error: {latestError}
          </p>
        )}

        {!latestLoading && !latestError && latestReading && (
          <div className="glass-card">
            <div className="card-header">
              <h3 className="card-title">Current Conditions</h3>
              <span className="card-subtitle">
                {new Date(latestReading.timestamp * 1000).toLocaleTimeString(
                  [],
                  { hour: "2-digit", minute: "2-digit", second: "2-digit" },
                )}
              </span>
            </div>

            <div className="metric-row">
              <div className="metric-label">Temperature</div>
              <div className="metric-value">
                {latestReading.temperature.toFixed(1)}
                <span className="unit">°F</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Feels Like</div>
              <div className="metric-value highlight-orange">
                {latestReading.feels_like.toFixed(1)}
                <span className="unit">°F</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Humidity</div>
              <div className="metric-value">
                {latestReading.humidity.toFixed(0)}
                <span className="unit">%</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Dew Point</div>
              <div className="metric-value">
                {latestReading.dew_point.toFixed(1)}
                <span className="unit">°F</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Wind Speed</div>
              <div className="metric-value highlight-cyan">
                {latestReading.wind_speed.toFixed(1)}
                <span className="unit">mph</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Daily Rain</div>
              <div className="metric-value highlight-blue">
                {latestReading.daily_rain.toFixed(2)}
                <span className="unit">in</span>
              </div>
            </div>
          </div>
        )}

        {/* Wind Rose Card */}
        {windLoading && (
          <p style={{ gridColumn: "1 / -1" }}>Loading wind activity...</p>
        )}
        {windError && (
          <p style={{ color: "#ef4444", gridColumn: "1 / -1" }}>
            Error: {windError}
          </p>
        )}
        {!windLoading && !windError && windData && (
          <WindRose
            currentDirection={
              windData.current ? windData.current.wind_direction : null
            }
            currentSpeed={windData.current ? windData.current.wind_speed : null}
            maxGust={windData.max_gust_1h || 0}
            history={windData.history_1h || []}
          />
        )}
        {/* Rain Tracker Card */}
        {rainLoading && (
          <p style={{ gridColumn: "1 / -1" }}>Loading rain tracker...</p>
        )}
        {rainError && (
          <p style={{ color: "#ef4444", gridColumn: "1 / -1" }}>
            Error: {rainError}
          </p>
        )}
        {!rainLoading && !rainError && rainData && (
          <RainTracker
            currentRate={
              rainData.current ? rainData.current.rainfall_rate : null
            }
            dailyRain={rainData.current ? rainData.current.daily_rain : null}
            weeklyRain={rainData.current ? rainData.current.weekly_rain : null}
            monthlyRain={
              rainData.current ? rainData.current.monthly_rain : null
            }
            yearlyRain={rainData.current ? rainData.current.yearly_rain : null}
            history={rainData.history_since_last_zero || []}
          />
        )}
        {!latestLoading &&
          !latestError &&
          !latestReading &&
          selectedStation && (
            <p style={{ gridColumn: "1 / -1" }}>
              No weather data found for station {selectedStation}.
            </p>
          )}

        {/* 24-Hour Hourly Summary Range Chart Display */}
        {hourlyLoading && (
          <p style={{ gridColumn: "1 / -1" }}>Loading hourly averages...</p>
        )}
        {hourlyError && (
          <p style={{ color: "#ef4444", gridColumn: "1 / -1" }}>
            Error: {hourlyError}
          </p>
        )}
        {!hourlyLoading && !hourlyError && hourlyData.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <HourlyRangeChart data={hourlyData} />
          </div>
        )}

        {/* 24-Hour Temperature Chart Display */}
        {historyLoading && (
          <p style={{ gridColumn: "1 / -1" }}>
            Loading 24-hour temperature history...
          </p>
        )}
        {historyError && (
          <p style={{ color: "#ef4444", gridColumn: "1 / -1" }}>
            Error: {historyError}
          </p>
        )}
        {!historyLoading && !historyError && history.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <TemperatureChart data={history} />
          </div>
        )}
      </main>
    </>
  );
}

export default App;
