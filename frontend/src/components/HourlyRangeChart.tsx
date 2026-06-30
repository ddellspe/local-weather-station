import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
);

interface TempRange {
  avg: number;
  min: number;
  max: number;
}

interface HourlyDataPoint {
  timestamp: number;
  temperature: TempRange;
  feels_like: TempRange;
  humidity: number;
}

interface HourlyRangeChartProps {
  data: HourlyDataPoint[];
}

export default function HourlyRangeChart({ data }: HourlyRangeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [metric, setMetric] = useState<"feels_like" | "temperature">(
    "feels_like",
  );

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const labels = sortedData.map((d) =>
      new Date(d.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );

    // Map min, max, and avg based on the toggled metric
    const maxVals = sortedData.map((d) => d[metric].max);
    const minVals = sortedData.map((d) => d[metric].min);
    const avgVals = sortedData.map((d) => d[metric].avg);

    // Determine colors and labels dynamically
    const isFeelsLike = metric === "feels_like";
    const labelPrefix = isFeelsLike ? "Feels Like" : "Temp";
    const mainColor = isFeelsLike ? "#fbbf24" : "#3b82f6";
    const maxBorder = isFeelsLike
      ? "rgba(245, 158, 11, 0.4)"
      : "rgba(239, 68, 68, 0.4)";
    const minBorder = isFeelsLike
      ? "rgba(251, 191, 36, 0.4)"
      : "rgba(59, 130, 246, 0.4)";
    const fillColor = isFeelsLike
      ? "rgba(245, 158, 11, 0.05)"
      : "rgba(59, 130, 246, 0.05)";

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].label = `Max ${labelPrefix}`;
      chartRef.current.data.datasets[0].data = maxVals;
      chartRef.current.data.datasets[0].borderColor = maxBorder;

      chartRef.current.data.datasets[1].label = `Min ${labelPrefix}`;
      chartRef.current.data.datasets[1].data = minVals;
      chartRef.current.data.datasets[1].borderColor = minBorder;
      chartRef.current.data.datasets[1].backgroundColor = fillColor;

      chartRef.current.data.datasets[2].label = `Average ${labelPrefix}`;
      chartRef.current.data.datasets[2].data = avgVals;
      chartRef.current.data.datasets[2].borderColor = mainColor;

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
              label: `Max ${labelPrefix}`,
              data: maxVals,
              borderColor: maxBorder,
              borderDash: [3, 3],
              borderWidth: 1,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: false,
            },
            {
              label: `Min ${labelPrefix}`,
              data: minVals,
              borderColor: minBorder,
              borderDash: [3, 3],
              borderWidth: 1,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: 0, // Fills to Max dataset
              backgroundColor: fillColor,
            },
            {
              label: `Average ${labelPrefix}`,
              data: avgVals,
              borderColor: mainColor,
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5,
              fill: false,
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
              position: "top",
              labels: {
                color: "#94a3b8",
                font: {
                  family: "Outfit",
                  size: 11,
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
                  const val = context.parsed.y.toFixed(1);
                  return `${context.dataset.label}: ${val}°F`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "#94a3b8",
                maxTicksLimit: 12,
                font: {
                  family: "Outfit",
                  size: 9,
                },
              },
            },
            y: {
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "#94a3b8",
                font: {
                  family: "Outfit",
                  size: 9,
                },
                callback: (value) => `${value}°F`,
              },
            },
          },
        },
      });
    }
  }, [data, metric]); // Re-run when data or toggled metric changes

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []); // Re-run when data or toggled metric changes

  return (
    <div
      className="glass-card"
      style={{
        height: "320px",
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="card-header">
        <h3 className="card-title">24-Hour Range & Averages</h3>
        {/* Metric Selector Button Group */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "2px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            onClick={() => setMetric("feels_like")}
            style={{
              background: metric === "feels_like" ? "#1e293b" : "transparent",
              color: metric === "feels_like" ? "#60a5fa" : "#94a3b8",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Feels Like
          </button>
          <button
            onClick={() => setMetric("temperature")}
            style={{
              background: metric === "temperature" ? "#1e293b" : "transparent",
              color: metric === "temperature" ? "#3b82f6" : "#94a3b8",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Actual Temp
          </button>
        </div>
      </div>
      <div style={{ height: "240px", width: "100%" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
