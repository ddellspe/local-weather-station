import { useMemo } from "react";

interface WindDataPoint {
  wind_speed: number;
  wind_direction: number;
  timestamp: number;
}

interface WindRoseProps {
  currentDirection: number | null;
  currentSpeed: number | null;
  maxGust: number;
  history: WindDataPoint[];
}

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export default function WindRose({
  currentDirection,
  currentSpeed,
  maxGust,
  history,
}: WindRoseProps) {
  // Group history into 16 bins (representing N, NNE, NE, etc.)
  const binCounts = useMemo(() => {
    const counts = Array(16).fill(0);
    history.forEach((pt) => {
      const bin = Math.round(pt.wind_direction / 22.5) % 16;
      counts[bin] += 1;
    });
    return counts;
  }, [history]);

  const maxCount = useMemo(() => {
    return Math.max(...binCounts, 1);
  }, [binCounts]);

  // Center and sizes for polar coordinates SVG drawing
  const size = 150;
  const center = size / 2;
  const maxRadius = size / 2 - 15;

  // Calculate polar coordinates for the frequency polygon
  const polygonPoints = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i * 22.5 * Math.PI) / 180 - Math.PI / 2; // Rotate N to be up
      const r = maxRadius * 0.15 + maxRadius * 0.85 * (binCounts[i] / maxCount);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  }, [binCounts, maxCount, center, maxRadius]);

  // Calculate pointer coordinates for the CURRENT wind direction needle
  const currentNeedle = useMemo(() => {
    if (currentDirection === null) return null;
    // Calculate angle in radians, rotating N (0 degrees) to point straight up
    const angle = (currentDirection * Math.PI) / 180 - Math.PI / 2;
    // Tip of needle
    const xTip = center + (maxRadius - 3) * Math.cos(angle);
    const yTip = center + (maxRadius - 3) * Math.sin(angle);
    // Left base of arrowhead
    const xLeft = center + 12 * Math.cos(angle - Math.PI / 6);
    const yLeft = center + 12 * Math.sin(angle - Math.PI / 6);
    // Right base of arrowhead
    const xRight = center + 12 * Math.cos(angle + Math.PI / 6);
    const yRight = center + 12 * Math.sin(angle + Math.PI / 6);

    return `${center},${center} ${xLeft},${yLeft} ${xTip},${yTip} ${xRight},${yRight}`;
  }, [currentDirection, center, maxRadius]);

  const currentCardinal =
    currentDirection !== null
      ? CARDINALS[Math.round(currentDirection / 22.5) % 16]
      : "-";

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
        <h3 className="card-title">Wind Activity</h3>
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
        {/* Polar SVG Plot */}
        <div
          style={{
            position: "relative",
            width: `${size}px`,
            height: `${size}px`,
          }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Concentric rings */}
            <circle
              cx={center}
              cy={center}
              r={maxRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            <circle
              cx={center}
              cy={center}
              r={maxRadius * 0.66}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            <circle
              cx={center}
              cy={center}
              r={maxRadius * 0.33}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />

            {/* 4 Cardinal Axis Spokes */}
            <line
              x1={center}
              y1={center - maxRadius}
              x2={center}
              y2={center + maxRadius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
            <line
              x1={center - maxRadius}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />

            {/* Direction Labels */}
            <text
              x={center}
              y={center - maxRadius + 12}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              N
            </text>
            <text
              x={center + maxRadius - 10}
              y={center + 3}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              E
            </text>
            <text
              x={center}
              y={center + maxRadius - 2}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              S
            </text>
            <text
              x={center - maxRadius + 10}
              y={center + 3}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              W
            </text>

            {/* Frequency Polygon (Wind Rose shape) */}
            {history.length > 0 && (
              <polygon
                points={polygonPoints}
                fill="rgba(6, 182, 212, 0.25)"
                stroke="#06b6d4"
                strokeWidth="1.5"
              />
            )}

            {/* Current direction indicator (Needle arrow pointing in direction wind is blowing) */}
            {currentNeedle && (
              <polygon
                points={currentNeedle}
                fill="rgba(239, 68, 68, 0.8)"
                stroke="#ef4444"
                strokeWidth="1"
              />
            )}
            <circle cx={center} cy={center} r="4" fill="#ef4444" />
          </svg>
        </div>

        {/* Text Specs */}
        <div style={{ flex: "1", minWidth: "150px", textAlign: "left" }}>
          <div className="metric-row">
            <div className="metric-label">Current Wind</div>
            <div className="metric-value highlight-cyan">
              {currentSpeed !== null ? currentSpeed.toFixed(1) : "-"}
              <span className="unit">mph</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Direction</div>
            <div className="metric-value">
              {currentCardinal}{" "}
              <span className="unit">({currentDirection?.toFixed(0)}°)</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-label">Peak Gust (1h)</div>
            <div className="metric-value highlight-orange">
              {maxGust.toFixed(1)}
              <span className="unit">mph</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
