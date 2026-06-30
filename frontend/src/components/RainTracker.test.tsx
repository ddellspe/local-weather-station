import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RainTracker from "./RainTracker";

afterEach(cleanup);

// Mock Chart.js completely since headless Node environment lacks HTML5 canvas context 2D APIs.
// The factory function is hoisted, so we define all mocked objects directly within it.
vi.mock("chart.js", () => {
  const ChartMock = vi.fn().mockImplementation(() => {
    return {
      destroy: vi.fn(),
      update: vi.fn(),
    };
  });
  (ChartMock as any).register = vi.fn();

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

describe("RainTracker Component", () => {
  it("renders rain metrics and accumulations", () => {
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

    expect(screen.getByText("Rainfall Tracker")).toBeDefined();
    expect(screen.getByText("0.15")).toBeDefined();
    expect(screen.getByText("0.25")).toBeDefined();
    expect(screen.getByText("1.20")).toBeDefined();
    expect(screen.getByText("2.50")).toBeDefined();
    expect(screen.getByText("10.00")).toBeDefined();
    expect(screen.getByText("Raining")).toBeDefined();
  });

  it('renders "No recent rain events" placeholder when history is empty', () => {
    render(
      <RainTracker
        currentRate={0.0}
        dailyRain={0.0}
        weeklyRain={0.0}
        monthlyRain={0.0}
        yearlyRain={0.0}
        history={[]}
      />,
    );

    expect(screen.getByText("Rainfall Tracker")).toBeDefined();
    expect(screen.getByText("No recent rain events")).toBeDefined();
    expect(screen.queryByText("Raining")).toBeNull();
  });
});
