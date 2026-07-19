import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import HourlyRangeChart from "./HourlyRangeChart";

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
          { label: "Max", data: [] },
          { label: "Min", data: [] },
          { label: "Average", data: [] },
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
    Filler: {},
  };
});

afterEach(() => {
  cleanup();
  (Chart as any).instances = [];
});

describe("HourlyRangeChart Component", () => {
  const dummyData = [
    {
      timestamp: 1720000000,
      temperature: { avg: 72.5, min: 70.0, max: 75.0 },
      feels_like: { avg: 73.0, min: 71.0, max: 76.0 },
      humidity: 50,
    },
    {
      timestamp: 1720003600,
      temperature: { avg: 74.0, min: 71.5, max: 76.5 },
      feels_like: { avg: 74.2, min: 72.0, max: 77.0 },
      humidity: 48,
    },
  ];

  it("renders container title, metric toggle buttons, and initializes chart", () => {
    const { rerender } = render(<HourlyRangeChart data={dummyData} />);

    expect(screen.getByText("24-Hour Range & Averages")).toBeDefined();
    const feelsLikeBtn = screen.getByText("Feels Like");
    const actualTempBtn = screen.getByText("Actual Temp");
    expect(feelsLikeBtn).toBeDefined();
    expect(actualTempBtn).toBeDefined();

    // Verify Chart mock initialization (default feels_like metric)
    const chartInstances = (Chart as any).instances;
    expect(chartInstances.length).toBe(1);
    const config = chartInstances[0].config;

    // Test tooltip label callback
    const tooltipCallbacks = config.options.plugins.tooltip.callbacks;
    expect(
      tooltipCallbacks.label({
        dataset: { label: "Max Feels Like" },
        parsed: { y: 76.0 },
      }),
    ).toBe("Max Feels Like: 76.0°F");

    // Test scales callbacks
    const yCallback = config.options.scales.y.ticks.callback;
    expect(yCallback(70)).toBe("70°F");

    // Click "Actual Temp" to change metric and verify update configuration
    fireEvent.click(actualTempBtn);
    expect(chartInstances[0].update).toHaveBeenCalled();

    // Click "Feels Like" to toggle back
    fireEvent.click(feelsLikeBtn);
    expect(chartInstances[0].update).toHaveBeenCalled();

    // Rerender with new data to test the update path
    const updatedData = [
      ...dummyData,
      {
        timestamp: 1720007200,
        temperature: { avg: 75.0, min: 72.0, max: 78.0 },
        feels_like: { avg: 75.0, min: 72.0, max: 78.0 },
        humidity: 45,
      },
    ];
    rerender(<HourlyRangeChart data={updatedData} />);
    expect(chartInstances[0].update).toHaveBeenCalled();
  });

  it("handles empty data gracefully and does not initialize chart", () => {
    render(<HourlyRangeChart data={[]} />);
    expect((Chart as any).instances.length).toBe(0);
  });

  it("handles null canvas context gracefully", () => {
    // Force getContext to return null
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    render(<HourlyRangeChart data={dummyData} />);
    expect((Chart as any).instances.length).toBe(0);
  });
});
