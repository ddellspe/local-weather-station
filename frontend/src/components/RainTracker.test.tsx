import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RainTracker from "./RainTracker";

// Mock getContext on HTMLCanvasElement so it doesn't return null
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
          { label: "Rain Rate", data: [] },
          { label: "Accumulation", data: [] },
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

describe("RainTracker Component", () => {
  it("renders rain metrics and accumulations and handles updates/unmounts", () => {
    const history = [{ timestamp: 1000, rainfall_rate: 0.1, daily_rain: 0.05 }];

    const { rerender } = render(
      <RainTracker
        currentRate={0.15}
        dailyRain={0.25}
        weeklyRain={1.2}
        monthlyRain={2.5}
        yearlyRain={10.0}
        history={history}
      />,
    );

    expect(screen.getByText("Rainfall Tracker")).toBeDefined();
    expect(screen.getByText("0.15")).toBeDefined();
    expect(screen.getByText("0.25")).toBeDefined();
    expect(screen.getByText("1.20")).toBeDefined();
    expect(screen.getByText("2.50")).toBeDefined();
    expect(screen.getByText("10.00")).toBeDefined();
    expect(screen.getByText("Raining")).toBeDefined();

    // Verify and invoke Chart callbacks to reach 100% code coverage
    const chartInstances = (Chart as any).instances;
    expect(chartInstances.length).toBe(1);
    const config = chartInstances[0].config;

    // Test tooltip label callback
    const tooltipCallbacks = config.options.plugins.tooltip.callbacks;
    expect(
      tooltipCallbacks.label({
        dataset: { label: "Rain Rate" },
        parsed: { y: 1.25 },
      }),
    ).toBe("Rate: 1.25 in/h");
    expect(
      tooltipCallbacks.label({
        dataset: { label: "Accumulation" },
        parsed: { y: 3.45 },
      }),
    ).toBe("Accum: 3.45 in");

    // Test scales callbacks
    const yCallback = config.options.scales.y.ticks.callback;
    expect(yCallback(0.5)).toBe("0.5 in/h");

    const yRainCallback = config.options.scales.yRain.ticks.callback;
    expect(yRainCallback(2.3)).toBe("2.3 in");

    // Rerender to test the update path (where chartRef.current exists)
    const newHistory = [
      { timestamp: 1000, rainfall_rate: 0.1, daily_rain: 0.05 },
      { timestamp: 2000, rainfall_rate: 0.2, daily_rain: 0.1 },
    ];
    rerender(
      <RainTracker
        currentRate={0.2}
        dailyRain={0.3}
        weeklyRain={1.3}
        monthlyRain={2.6}
        yearlyRain={10.1}
        history={newHistory}
      />,
    );
  });

  it('renders "No recent rain events" placeholder when history is empty and fields are null', () => {
    render(
      <RainTracker
        currentRate={null}
        dailyRain={null}
        weeklyRain={null}
        monthlyRain={null}
        yearlyRain={null}
        history={[]}
      />,
    );

    expect(screen.getByText("Rainfall Tracker")).toBeDefined();
    expect(screen.getByText("No recent rain events")).toBeDefined();
    expect(screen.queryByText("Raining")).toBeNull();
    // Verify default value renders (0.00 for null values)
    expect(screen.getAllByText("0.00").length).toBeGreaterThan(0);
  });

  it("handles null canvas context gracefully", () => {
    // Force getContext to return null to cover early return when !ctx
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    const history = [{ timestamp: 1000, rainfall_rate: 0.1, daily_rain: 0.05 }];
    render(
      <RainTracker
        currentRate={0.15}
        dailyRain={0.25}
        weeklyRain={1.2}
        monthlyRain={2.5}
        yearlyRain={10.0}
        history={history}
      />,
    );
    // It should render, and chartRef.current should remain null (since early return)
    const chartInstances = (Chart as any).instances;
    expect(chartInstances.length).toBe(0);
  });
});
