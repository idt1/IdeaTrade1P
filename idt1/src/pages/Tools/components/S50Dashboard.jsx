// src/pages/tools/components/S50Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { AreaLWC, LineLWC } from '../../../components/LWChart';

// ============================================================
// DATA HELPERS
// ============================================================
const BASE_DATE = new Date("2024-01-01");

function toTimestamp(index) {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + index);
  // lightweight-charts expects YYYY-MM-DD strings or Unix seconds
  return d.toISOString().slice(0, 10);
}

function generateMasterData(seed = 1, totalPoints = 300) {
  const data = [];
  let value = 850 + seed * 10;
  for (let i = 0; i < totalPoints; i++) {
    const random = Math.sin(i * 0.7 + seed) * 10000;
    const change = (random - Math.floor(random)) * 4 - 2;
    value += change;
    data.push({ time: toTimestamp(i), value: parseFloat(value.toFixed(1)) });
  }
  return data;
}

function sliceByTimeframe(master, timeframe) {
  const sizes = { "15m": 40, "1H": 80, "Day": 150, "Week": 300 };
  const size = sizes[timeframe] ?? 60;
  return master.slice(master.length - size);
}

// ============================================================
// CHART CARD
// ============================================================
function ChartCard({ title, timeframe, color, isMobile }) {
  const seed = title.length + (color === "#22c55e" ? 0 : 7);
  const height = isMobile ? 180 : 250;

  const master = useMemo(() => generateMasterData(seed), [seed]);
  const data = useMemo(() => sliceByTimeframe(master, timeframe), [master, timeframe]);

  return (
    <div style={{
      background: "#111827",
      border: "1px solid #334155",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px",
        background: "#0f172a",
        borderBottom: "1px solid rgba(51,65,85,0.5)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", fontFamily: "sans-serif" }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, color: "#64748b", background: "#1e293b",
          padding: "2px 8px", borderRadius: 4, fontFamily: "sans-serif",
        }}>
          {timeframe}
        </span>
      </div>

      {/* LWC Chart */}
      <div style={{ background: "#0f172a" }}>
        <AreaLWC
          data={data}
          color={color}
          height={height}
          gradientOpacity={0.25}
        />
      </div>
    </div>
  );
}

// ============================================================
// S50Dashboard — default export
// ============================================================
export default function S50Dashboard({ timeframe = "Day" }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const charts = [
    { id: "chart1", title: "1. Last (SET50 Daily)",      color: "#22c55e" },
    { id: "chart2", title: "2. Confirm Up/Down S50",     color: "#ef4444" },
    { id: "chart3", title: "3. Trend (Volume Flow)",     color: "#ef4444" },
    { id: "chart4", title: "4. Mid-Trend (SET Context)", color: "#22c55e" },
  ];

  return (
    <>
      <style>{`
        .s50-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 12px;
          width: 100%;
          box-sizing: border-box;
          background: #0b111a;
        }
        @media (max-width: 767px) {
          .s50-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="s50-grid">
        {charts.map((c) => (
          <ChartCard
            key={c.id}
            title={c.title}
            timeframe={timeframe}
            color={c.color}
            isMobile={isMobile}
          />
        ))}
      </div>
    </>
  );
}