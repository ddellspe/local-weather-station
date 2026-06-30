import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import WindRose from "./WindRose";

afterEach(cleanup);

describe("WindRose Component", () => {
  it("renders the wind activity title and current wind speed", () => {
    const history = [
      { wind_speed: 5.0, wind_direction: 180, timestamp: 1000 },
      { wind_speed: 10.0, wind_direction: 90, timestamp: 2000 },
    ];

    render(
      <WindRose
        currentDirection={180}
        currentSpeed={8.5}
        maxGust={12.0}
        history={history}
      />,
    );

    expect(screen.getByText("Wind Activity")).toBeDefined();
    expect(screen.getByText("8.5")).toBeDefined();
    expect(screen.getByText("12.0")).toBeDefined();

    // Use a custom matcher function to match the combined text content "S (180°)"
    // which is split across a text node and a nested span tag.
    expect(
      screen.getByText(
        (_content, element) => element?.textContent === "S (180°)",
      ),
    ).toBeDefined();
  });

  it("renders correctly with null current wind speed and empty history", () => {
    render(
      <WindRose
        currentDirection={null}
        currentSpeed={null}
        maxGust={0}
        history={[]}
      />,
    );

    expect(screen.getByText("Wind Activity")).toBeDefined();
    expect(screen.getAllByText("-")[0]).toBeDefined();
    expect(screen.getByText("0.0")).toBeDefined();
  });
});
