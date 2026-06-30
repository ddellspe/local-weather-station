import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Title,
} from "chart.js";

// Register Chart.js modules
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Title,
);

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

interface TemperatureChartProps {
  data: WeatherReading[];
}

export default function TemperatureChart({ data }: TemperatureChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    // Sort data chronologically (older to newer) for correct line rendering
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const labels = sortedData.map((d) =>
      new Date(d.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );

    const temperatures = sortedData.map((d) => d.temperature);
    const feelsLikeTemps = sortedData.map((d) => d.feels_like);
    const dewPoints = sortedData.map((d) => d.dew_point);

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = temperatures;
      chartRef.current.data.datasets[1].data = feelsLikeTemps;
      chartRef.current.data.datasets[2].data = dewPoints;
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
              label: "Temperature",
              data: temperatures,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
            },
            {
              label: "Feels Like",
              data: feelsLikeTemps,
              borderColor: "#fbbf24",
              backgroundColor: "rgba(251, 191, 36, 0.05)",
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
            },
            {
              label: "Dew Point",
              data: dewPoints,
              borderColor: "#22d3ee",
              backgroundColor: "rgba(34, 211, 238, 0.05)",
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
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
                  size: 12,
                  weight: 500,
                },
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              titleFont: { family: "Outfit", size: 12 },
              bodyFont: { family: "Outfit", size: 12 },
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °F`;
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
                font: {
                  family: "Outfit",
                  size: 10,
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
                  size: 10,
                },
                callback: (value) => `${value}°F`,
              },
            },
          },
        },
      });
    }
  }, [data]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="glass-card"
      style={{
        height: "350px",
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          fontSize: "1.2rem",
          color: "#60a5fa",
          marginBottom: "1rem",
          textAlign: "left",
        }}
      >
        24-Hour Temperature History
      </h3>
      <div style={{ height: "260px", width: "100%" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
