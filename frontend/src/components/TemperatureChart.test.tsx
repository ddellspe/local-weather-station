import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TemperatureChart from "./TemperatureChart";

// Mock getContext on HTMLCanvasElement so it doesn't return null by default
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
        datasets: [
          { label: "Temperature", data: [] },
          { label: "Feels Like", data: [] },
          { label: "Dew Point", data: [] },
        ],
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
    Title: {},
  };
});

afterEach(() => {
  cleanup();
  (Chart as any).instances = [];
});

describe("TemperatureChart Component", () => {
  const dummyData = [
    {
      timestamp: 1720000000,
      temperature: 72.5,
      humidity: 50,
      dew_point: 52.1,
      feels_like: 73.0,
      wind_speed: 5.0,
      wind_direction: 180,
      rainfall_rate: 0.0,
      daily_rain: 0.0,
    },
    {
      timestamp: 1720003600,
      temperature: 74.0,
      humidity: 48,
      dew_point: 51.5,
      feels_like: 74.2,
      wind_speed: 6.0,
      wind_direction: 190,
      rainfall_rate: 0.0,
      daily_rain: 0.0,
    },
  ];

  it("renders container title and initializes chart with data", () => {
    const { rerender } = render(<TemperatureChart data={dummyData} />);

    expect(screen.getByText("24-Hour Temperature History")).toBeDefined();

    // Verify Chart mock initialization
    const chartInstances = (Chart as any).instances;
    expect(chartInstances.length).toBe(1);
    const config = chartInstances[0].config;

    // Test tooltip label callback
    const tooltipCallbacks = config.options.plugins.tooltip.callbacks;
    expect(
      tooltipCallbacks.label({
        dataset: { label: "Temperature" },
        parsed: { y: 72.5 },
      }),
    ).toBe("Temperature: 72.5 °F");

    // Test scales callbacks
    const yCallback = config.options.scales.y.ticks.callback;
    expect(yCallback(70)).toBe("70°F");

    // Rerender with new data to hit chartRef.current.update()
    const updatedData = [
      ...dummyData,
      {
        timestamp: 1720007200,
        temperature: 75.0,
        humidity: 45,
        dew_point: 50.0,
        feels_like: 75.0,
        wind_speed: 4.0,
        wind_direction: 200,
        rainfall_rate: 0.0,
        daily_rain: 0.0,
      },
    ];
    rerender(<TemperatureChart data={updatedData} />);
    expect(chartInstances[0].update).toHaveBeenCalled();
  });

  it("handles empty data gracefully and does not initialize chart", () => {
    render(<TemperatureChart data={[]} />);
    expect((Chart as any).instances.length).toBe(0);
  });

  it("handles null canvas context gracefully", () => {
    // Force getContext to return null
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    render(<TemperatureChart data={dummyData} />);
    expect((Chart as any).instances.length).toBe(0);
  });
});
