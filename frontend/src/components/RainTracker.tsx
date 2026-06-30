import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);

interface RainDataPoint {
  timestamp: number;
  rainfall_rate: number;
  daily_rain: number;
}

interface RainTrackerProps {
  currentRate: number | null;
  dailyRain: number | null;
  weeklyRain: number | null;
  monthlyRain: number | null;
  yearlyRain: number | null;
  history: RainDataPoint[];
}

export default function RainTracker({
  currentRate,
  dailyRain,
  weeklyRain,
  monthlyRain,
  yearlyRain,
  history,
}: RainTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    // Sort data chronologically (older to newer) for correct line rendering
    const sortedData = [...history].sort((a, b) => a.timestamp - b.timestamp);

    const labels = sortedData.map((d) =>
      new Date(d.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    const rates = sortedData.map((d) => d.rainfall_rate);
    const accumulations = sortedData.map((d) => d.daily_rain);

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = rates;
      chartRef.current.data.datasets[1].data = accumulations;
      chartRef.current.options.animation = { duration: 0 };
      chartRef.current.update();
    } else {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Rain Rate",
              data: rates,
              borderColor: "#38bdf8",
              backgroundColor: "rgba(56, 189, 248, 0.12)",
              tension: 0.4,
              borderWidth: 1.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
              yAxisID: "y",
            },
            {
              label: "Accumulation",
              data: accumulations,
              borderColor: "#818cf8",
              backgroundColor: "rgba(129, 140, 248, 0.12)",
              tension: 0.4,
              borderWidth: 1.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: false,
              yAxisID: "yRain",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1000,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                color: "#94a3b8",
                boxWidth: 8,
                boxHeight: 8,
                usePointStyle: true,
                pointStyle: "circle",
                font: {
                  family: "Outfit",
                  size: 9,
                },
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              titleFont: { family: "Outfit", size: 10 },
              bodyFont: { family: "Outfit", size: 10 },
              callbacks: {
                label: (context) => {
                  if (context.dataset.label === "Rain Rate") {
                    return `Rate: ${context.parsed.y.toFixed(2)} in/h`;
                  } else {
                    return `Accum: ${context.parsed.y.toFixed(2)} in`;
                  }
                },
              },
            },
          },
          scales: {
            x: {
              display: false,
            },
            y: {
              type: "linear",
              display: true,
              position: "left",
              min: 0,
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "#94a3b8",
                font: {
                  family: "Outfit",
                  size: 8,
                },
                callback: (value) => `${value} in/h`,
              },
            },
            yRain: {
              type: "linear",
              display: true,
              position: "right",
              min: 0,
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                color: "#94a3b8",
                font: {
                  family: "Outfit",
                  size: 8,
                },
                callback: (value) => `${value} in`,
              },
            },
          },
        },
      });
    }
  }, [history]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  const isRaining = currentRate !== null && currentRate > 0;

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="card-header">
        <h3 className="card-title">Rainfall Tracker</h3>
        {isRaining && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              color: "#60a5fa",
              fontWeight: "bold",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#3b82f6",
                boxShadow: "0 0 8px #3b82f6",
                animation: "pulse 1.5s infinite",
              }}
            />
            Raining
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {/* Sparkline Chart */}
        <div
          style={{
            flex: "1",
            minWidth: "150px",
            height: "140px",
            position: "relative",
          }}
        >
          {history.length > 0 ? (
            <canvas ref={canvasRef} />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "0.9rem",
                border: "1px dashed rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.01)",
              }}
            >
              No recent rain events
            </div>
          )}
        </div>

        {/* Rain Accumulation Specs */}
        <div style={{ width: "100%", maxWidth: "180px", textAlign: "left" }}>
          <div className="metric-row">
            <div className="metric-label">Rain Rate</div>
            <div className="metric-value highlight-blue">
              {currentRate !== null ? currentRate.toFixed(2) : "0.00"}
              <span className="unit">in/h</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Daily</div>
            <div className="metric-value">
              {dailyRain !== null ? dailyRain.toFixed(2) : "0.00"}
              <span className="unit">in</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Weekly</div>
            <div className="metric-value">
              {weeklyRain !== null ? weeklyRain.toFixed(2) : "0.00"}
              <span className="unit">in</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Monthly</div>
            <div className="metric-value">
              {monthlyRain !== null ? monthlyRain.toFixed(2) : "0.00"}
              <span className="unit">in</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Yearly</div>
            <div className="metric-value">
              {yearlyRain !== null ? yearlyRain.toFixed(2) : "0.00"}
              <span className="unit">in</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
