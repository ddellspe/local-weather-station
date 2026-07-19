import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import App from "./App";

// Mock getContext on HTMLCanvasElement so components using Chart.js render safely
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});

import { Chart } from "chart.js";

// Mock Chart.js completely since headless Node environment lacks HTML5 canvas context 2D APIs.
vi.mock("chart.js", () => {
  const registerMock = vi.fn();
  const destroyMock = vi.fn();
  const updateMock = vi.fn();

  class ChartMock {
    static register = registerMock;
    static instances: ChartMock[] = [];
    data: any;
    options: any;
    config: any;
    destroy = destroyMock;
    update = updateMock;

    constructor(_ctx: any, config: any) {
      this.config = config;
      this.data = config.data || {
        labels: [],
        datasets: [{ data: [] }, { data: [] }, { data: [] }],
      };
      this.options = config.options || {};
      ChartMock.instances.push(this);
    }
  }

  return {
    Chart: ChartMock,
    LineController: {},
    LineElement: {},
    PointElement: {},
    LinearScale: {},
    CategoryScale: {},
    Legend: {},
    Tooltip: {},
    Filler: {},
    Title: {},
  };
});

describe("App Component", () => {
  const mockConfig = { update_interval: 15 };
  const mockStations = {
    stations: [
      { id: "station-1", timezone: "UTC" },
      { id: "station-2", timezone: "America/New_York" },
    ],
  };
  const mockHistory2h = {
    history: [
      {
        timestamp: 1720000000,
        temperature: 70.0,
        humidity: 60,
        dew_point: 55.0,
        feels_like: 70.0,
        wind_speed: 3.0,
        wind_direction: 90,
        rainfall_rate: 0.0,
        daily_rain: 0.0,
      },
      {
        timestamp: 1720036000,
        temperature: 72.0,
        humidity: 58,
        dew_point: 56.0,
        feels_like: 72.5,
        wind_speed: 4.5,
        wind_direction: 95,
        rainfall_rate: 0.01,
        daily_rain: 0.01,
      },
    ],
    daily_extremes: {
      temperature: { min: 65.0, max: 75.0 },
      feels_like: { min: 64.0, max: 76.0 },
    },
    changes_24h: {
      temperature: 2.0,
      feels_like: 2.5,
      humidity: -2.0,
    },
  };
  const mockWind = {
    current: { wind_direction: 95, wind_speed: 4.5 },
    max_gust_1h: 6.0,
    history_1h: [
      { wind_speed: 4.0, wind_direction: 90, timestamp: 1720030000 },
    ],
  };
  const mockRain = {
    current: {
      rainfall_rate: 0.01,
      daily_rain: 0.01,
      weekly_rain: 0.5,
      monthly_rain: 1.0,
      yearly_rain: 5.0,
    },
    history_since_last_zero: [
      { timestamp: 1720036000, rainfall_rate: 0.01, daily_rain: 0.01 },
    ],
  };
  const mockHistory24h = {
    history: [
      {
        timestamp: 1720000000,
        temperature: 70.0,
        humidity: 60,
        dew_point: 55.0,
        feels_like: 70.0,
        wind_speed: 3.0,
        wind_direction: 90,
        rainfall_rate: 0.0,
        daily_rain: 0.0,
      },
    ],
    daily_extremes: {
      temperature: { min: 65.0, max: 75.0 },
      feels_like: { min: 64.0, max: 76.0 },
    },
    changes_24h: {
      temperature: 2.0,
      feels_like: 2.5,
      humidity: -2.0,
    },
  };
  const mockHourly = {
    history: [
      {
        timestamp: 1720000000,
        temperature: { avg: 70.0, min: 65.0, max: 75.0 },
        feels_like: { avg: 70.0, min: 64.0, max: 76.0 },
        humidity: 60,
      },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Default document title
    document.title = "{{ SITE_TITLE }}";
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    cleanup();
    (Chart as any).instances = [];
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("loads config, stations, fast/slow dashboard data, and runs periodic updates", async () => {
    // Set up document title branch
    document.title = "Local Weather Server Custom";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        return Promise.reject(new Error(`Unhandled mock fetch URL: ${urlStr}`));
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);

    // Fast-forward initial mounts
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Check header and site title (should read from document.title since it was set)
    expect(screen.getByText("Local Weather Server Custom")).toBeDefined();
    expect(
      screen.getByText("Real-time Meteorological Dashboard"),
    ).toBeDefined();

    // Check station selection dropdown
    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe("station-1");

    // Check latest conditions rendered properly
    expect(screen.getByText("Current Conditions")).toBeDefined();
    expect(screen.getByText("72.0")).toBeDefined(); // Temp value
    expect(screen.getByText("72.5")).toBeDefined(); // Feels like value
    expect(screen.getByText("58")).toBeDefined(); // Humidity

    // Select second station to trigger station change fast/slow data fetches
    await act(async () => {
      fireEvent.change(select, { target: { value: "station-2" } });
    });
    expect(select.value).toBe("station-2");

    // Clear call history and verify that periodic updates tick fast and slow data
    fetchSpy.mockClear();

    // Fast-forward 15 seconds (one tick interval) -> triggers fast update (hour=2, wind, rain)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    // Verify fast fetches happened
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/history?hours=2"),
    );
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/wind"));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/rain"));
    // Slow fetches shouldn't happen yet on first tick
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("/history?hours=24"),
    );

    // Reset calls
    fetchSpy.mockClear();

    // Advance five more ticks (75 seconds) which exceeds ticksRef threshold and triggers slow refresh
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
    }

    // Verify slow fetches happened
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/history?hours=24"),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/history/hourly"),
    );
  });

  it("handles fallback to default siteTitle when document.title is placeholder", async () => {
    document.title = "{{ SITE_TITLE }}";

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      const data = urlStr.endsWith("/api/v1/config")
        ? mockConfig
        : urlStr.endsWith("/api/v1/stations")
          ? { stations: [{ id: "station-1", timezone: "UTC" }] }
          : { history: [], daily_extremes: null, changes_24h: null };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText("Local Weather Server")).toBeDefined();
  });

  it("handles empty config and errors in config fetch gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/v1/config")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ stations: [{ id: "station-1", timezone: "UTC" }] }),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error loading config"),
      expect.any(Error),
    );
  });

  it("handles errors in stations fetch and logs stationsError state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/v1/stations")) {
        return Promise.resolve({
          ok: false,
          statusText: "Forbidden",
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText(/Error loading stations:/)).toBeDefined();
  });

  it("handles empty history or errors in fast/slow dashboard data gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/v1/stations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              stations: [{ id: "station-1", timezone: "UTC" }],
            }),
        } as Response);
      }
      // Fail other fast/slow fetches
      return Promise.resolve({
        ok: false,
        statusText: "Internal Server Error",
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Check latest error is rendered
    expect(screen.getAllByText(/Error: /).length).toBeGreaterThan(0);
  });

  it("renders empty history layout when history returns empty array", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/api/v1/stations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              stations: [{ id: "station-1", timezone: "UTC" }],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ history: [] }),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(
      screen.getByText("No weather data found for station station-1."),
    ).toBeDefined();
  });

  it("renders with negative changes and alternative update interval config", async () => {
    const mockConfigAlt = { update_interval: 70 };
    const mockHistory2hNegative = {
      history: [
        {
          timestamp: 1720000000,
          temperature: 75.0,
          humidity: 40,
          dew_point: 50.0,
          feels_like: 75.0,
          wind_speed: 3.0,
          wind_direction: 90,
          rainfall_rate: 0.0,
          daily_rain: 0.0,
        },
        {
          timestamp: 1720036000,
          temperature: 70.0,
          humidity: 45,
          dew_point: 52.0,
          feels_like: 69.0,
          wind_speed: 4.5,
          wind_direction: 95,
          rainfall_rate: 0.0,
          daily_rain: 0.05,
        },
      ],
      daily_extremes: {
        temperature: { min: 65.0, max: 75.0 },
        feels_like: { min: 64.0, max: 76.0 },
      },
      changes_24h: {
        temperature: -5.0,
        feels_like: -6.0,
        humidity: 5.0,
      },
    };

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfigAlt;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2hNegative;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        return Promise.reject(new Error(`Unhandled mock fetch URL: ${urlStr}`));
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Check negative and positive rendering badges
    expect(screen.getByText("-5.0°F 24h")).toBeDefined();
    expect(screen.getByText("-6.0°F 24h")).toBeDefined();
    expect(screen.getByText("+5% 24h")).toBeDefined();
  });

  it("renders safely when changes_24h values are null or missing", async () => {
    const mockHistory2hNullChanges = {
      history: [
        {
          timestamp: 1720036000,
          temperature: 70.0,
          humidity: 45,
          dew_point: 52.0,
          feels_like: 69.0,
          wind_speed: 4.5,
          wind_direction: 95,
          rainfall_rate: 0.0,
          daily_rain: 0.05,
        },
      ],
      daily_extremes: null,
      changes_24h: null,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = { stations: [{ id: "station-1", timezone: "UTC" }] }; // Only 1 station to cover station dropdown falsy branch
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2hNullChanges;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        return Promise.reject(new Error(`Unhandled mock fetch URL: ${urlStr}`));
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Check that change badges are NOT rendered
    expect(screen.queryByText(/24h/)).toBeNull();
    // Check that daily highs/lows are NOT rendered since daily_extremes is null
    expect(screen.queryByText("Daily High / Low")).toBeNull();
  });

  it("covers fallback values and null station options to hit line 113, 115, and 266 branches", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        // Return null id for the first station to force selectedStation to be null,
        // while stations.length > 1 is true. This forces line 266 value={selectedStation || ""} branch evaluation.
        // Also omit the stations field entirely in a fallback to test data.stations || [] (line 113).
        data = {
          stations: [
            { id: null, timezone: "UTC" },
            { id: "station-2", timezone: "EST" },
          ],
        };
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Dropdown selector is rendered because stations.length is 2
    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select).toBeDefined();
    // Since selectedStation is null, it should select fallback empty string ""
    expect(select.value).toBe("");
  });

  it("covers empty stations field branch to hit line 113 and 115 falsy conditions", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        // Omit stations property entirely to hit data.stations || [] branch
        data = {};
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Dropdown selector is not rendered since stations is empty array
    expect(screen.queryByLabelText("Station:")).toBeNull();
  });

  it("uses station query parameter for selection", async () => {
    window.history.replaceState({}, "", "?station=station-2");

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select.value).toBe("station-2");
    expect(localStorage.getItem("selected_station")).toBe("station-2");
    expect(window.location.search).toContain("station=station-2");
  });

  it("uses default_station query parameter for selection", async () => {
    window.history.replaceState({}, "", "?default_station=station-2");

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select.value).toBe("station-2");
  });

  it("uses localStorage for station selection when query param is absent", async () => {
    localStorage.setItem("selected_station", "station-2");

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select.value).toBe("station-2");
  });

  it("uses backend config default_station when query param and localStorage are absent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = { update_interval: 15, default_station: "station-2" };
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select.value).toBe("station-2");
  });

  it("user changing station via dropdown updates localStorage and URL search params", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = String(url);
      let data: any;

      if (urlStr.endsWith("/api/v1/config")) {
        data = mockConfig;
      } else if (urlStr.endsWith("/api/v1/stations")) {
        data = mockStations;
      } else if (urlStr.includes("/history?hours=2")) {
        data = mockHistory2h;
      } else if (urlStr.includes("/wind")) {
        data = mockWind;
      } else if (urlStr.includes("/rain")) {
        data = mockRain;
      } else if (urlStr.includes("/history?hours=24")) {
        data = mockHistory24h;
      } else if (urlStr.includes("/history/hourly")) {
        data = mockHourly;
      } else {
        data = {};
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      } as Response);
    });

    render(<App />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const select = screen.getByLabelText("Station:") as HTMLSelectElement;
    expect(select.value).toBe("station-1");

    // Change dropdown value to station-2
    await act(async () => {
      fireEvent.change(select, { target: { value: "station-2" } });
    });

    expect(select.value).toBe("station-2");
    expect(localStorage.getItem("selected_station")).toBe("station-2");
    expect(window.location.search).toContain("station=station-2");
  });
});
