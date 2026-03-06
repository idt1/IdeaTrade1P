// src/pages/tools/components/S50Dashboard.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ============================================================
// CHART CONSTANTS & HELPERS
// ============================================================
const CHART_CONFIG = {
  height: 250,
  paddingLeft: 15,
  paddingRight: 60,
  paddingTop: 15,
  paddingBottom: 25,
  pointGap: 40,
  minWidth: 620,
};

const LABELS = Array.from({ length: 300 }, (_, i) => {
  const d = new Date("2024-01-01");
  d.setDate(d.getDate() + i);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
});

const generateMasterData = (seed = 1, totalPoints = 300) => {
  const data = [];
  let value = 850 + seed * 10;
  for (let i = 0; i < totalPoints; i++) {
    const random = Math.sin(i * 0.7 + seed) * 10000;
    const change = (random - Math.floor(random)) * 4 - 2;
    value += change;
    data.push(parseFloat(value.toFixed(1)));
  }
  return data;
};

function calcYScale(data) {
  const rawMax = Math.max(...data);
  const rawMin = Math.min(...data);
  const range = rawMax - rawMin || 1;
  return { max: rawMax + range * 0.15, min: rawMin - range * 0.15 };
}

function makeNormalizeY({ height, paddingTop, paddingBottom }, { max, min }) {
  return (value) =>
    height - paddingBottom - ((value - min) / (max - min)) * (height - paddingTop - paddingBottom);
}

function buildCurvePath(dataset, normalizeY, paddingLeft, pointGap) {
  if (!dataset || dataset.length === 0) return "";
  return dataset.reduce((path, value, i) => {
    const x = paddingLeft + i * pointGap;
    const y = normalizeY(value);
    if (i === 0) return `M ${x},${y}`;
    const prevX = paddingLeft + (i - 1) * pointGap;
    const prevY = normalizeY(dataset[i - 1]);
    const cp1x = prevX + (x - prevX) / 3;
    const cp2x = prevX + (x - prevX) * 2 / 3;
    return `${path} C ${cp1x},${prevY} ${cp2x},${y} ${x},${y}`;
  }, "");
}

// ============================================================
// CHART CARD
// ============================================================
function ChartCard({ title, timeframe, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs, color, isMobile }) {
  const seed = title.length + (color === "#22c55e" ? 0 : 7);
  const masterDataRef = useRef(generateMasterData(seed));
  const height = isMobile ? 180 : 250;

  const data = useMemo(() => {
    const master = masterDataRef.current;
    let sliceSize = 60;
    if (timeframe === "15m") sliceSize = 40;
    if (timeframe === "1H") sliceSize = 80;
    if (timeframe === "Day") sliceSize = 150;
    if (timeframe === "Week") sliceSize = 300;
    return master.slice(master.length - sliceSize);
  }, [timeframe]);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const yScale = calcYScale(data);
  const normalizeY = makeNormalizeY(CHART_CONFIG, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, minWidth } = CHART_CONFIG;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (data.length - 1) * pointGap);

  const linePath = buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const lastX = paddingLeft + (data.length - 1) * pointGap;
  const areaId = `area-${chartId}`;
  const lastPt = data[data.length - 1];

  // Sync Scrolling
  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, timeframe, chartRefs]);

  const syncScroll = (sourceEl) => {
    Object.values(chartRefs.current).forEach((node) => {
      if (node && node !== sourceEl && Math.abs(node.scrollLeft - sourceEl.scrollLeft) > 1)
        node.scrollLeft = sourceEl.scrollLeft;
    });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.pageX - scrollRef.current.offsetLeft);
    setDragScrollLeft(scrollRef.current.scrollLeft);
    setGlobalHoverIndex(null);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      scrollRef.current.scrollLeft = dragScrollLeft - (x - dragStartX) * 1.5;
      setGlobalHoverIndex(null);
      return;
    }
    const mouseX = e.clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft;
    const index = Math.max(0, Math.min(Math.round((mouseX - paddingLeft) / pointGap), data.length - 1));
    setGlobalHoverIndex(index);
  };

  const isHovering = globalHoverIndex !== null && !isDragging && globalHoverIndex < data.length;
  const hoverX = isHovering ? paddingLeft + globalHoverIndex * pointGap : null;

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
        <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", fontFamily: "sans-serif" }}>{title}</span>
        <span style={{ fontSize: 11, color: "#64748b", background: "#1e293b", padding: "2px 8px", borderRadius: 4, fontFamily: "sans-serif" }}>{timeframe}</span>
      </div>

      {/* Chart Area */}
      <div style={{ position: "relative", width: "100%", background: "#0f172a", height }}>
        <div
          ref={scrollRef}
          style={{
            width: "100%", height: "100%",
            overflowX: "auto", overflowY: "hidden",
            msOverflowStyle: "none", scrollbarWidth: "none",
            cursor: isDragging ? "grabbing" : "crosshair",
            userSelect: "none",
            position: "relative",
          }}
          onScroll={(e) => syncScroll(e.target)}
          onMouseDown={handleMouseDown}
          onMouseLeave={() => { setIsDragging(false); setGlobalHoverIndex(null); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
        >
          <svg width={chartWidth} height={height} style={{ overflow: "visible", pointerEvents: "none" }}>
            {/* Grid */}
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
              return <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeWidth="1" />;
            })}
            <line x1={0} y1={height - paddingBottom} x2={chartWidth} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

            {/* X Labels */}
            {data.map((_, i) => (
              i % 5 === 0 && (
                <text key={i} x={paddingLeft + i * pointGap} y={height - paddingBottom + 16}
                  fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
                  {LABELS[i % LABELS.length]}
                </text>
              )
            ))}

            {/* Area */}
            <defs>
              <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${linePath} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`}
              fill={`url(#${areaId})`}
            />

            {/* Line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Hover */}
            {isHovering && (
              <g>
                <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom}
                  stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="4"
                  fill={color} stroke="#0f172a" strokeWidth="2" />
                <text x={hoverX} y={normalizeY(data[globalHoverIndex]) - 10}
                  fill={color} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                  {data[globalHoverIndex].toFixed(1)}
                </text>
              </g>
            )}
          </svg>

          {/* Floating Tooltip */}
          {isHovering && (
            <div style={{
              position: "absolute", top: 8, zIndex: 50,
              left: hoverX,
              transform: globalHoverIndex > data.length - 5 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
              display: "flex", flexDirection: "column", alignItems: "center",
              minWidth: 60,
              background: "#1e293b", border: "1px solid #475569",
              borderRadius: 6, padding: "6px 8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              pointerEvents: "none",
              fontFamily: "sans-serif",
            }}>
              <span style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{LABELS[globalHoverIndex % LABELS.length]}</span>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{data[globalHoverIndex].toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bottom fade */}
        <div style={{
          position: "absolute", bottom: paddingBottom, left: 0, right: 55,
          height: 40, background: "linear-gradient(to top, rgba(15,23,42,0.9), transparent)",
          pointerEvents: "none",
        }} />

        {/* Right Y-Axis */}
        <div style={{
          position: "absolute", right: 0, top: 0, width: 55, height: "100%",
          background: "#0f172a", borderLeft: "1px solid rgba(30,41,59,0.5)",
          pointerEvents: "none", zIndex: 10,
        }}>
          <svg style={{ width: "100%", height: "100%", position: "absolute", top: 0, right: 0, overflow: "visible", pointerEvents: "none" }}>
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
              const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
              return (
                <text key={i} x="48" y={y} fill="#64748b" fontSize="10"
                  textAnchor="end" dominantBaseline="central" fontFamily="sans-serif">
                  {value.toFixed(1)}
                </text>
              );
            })}
            {/* Current Value Badge */}
            <g transform={`translate(6, ${normalizeY(lastPt)})`}>
              <rect x="0" y="-10" width="42" height="20" fill={color} rx="4" />
              <text x="21" y="0" fill="#ffffff" fontSize="10"
                textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontFamily="sans-serif">
                {lastPt.toFixed(1)}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// S50Dashboard — default export (used by S50.jsx)
// ============================================================
export default function S50Dashboard({ timeframe = "Day" }) {
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const chartRefs = useRef({});

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
    { id: "chart4", title: "4. Mid-Trend (SET Context)", color: "#ef4444" },
  ];

  return (
    <>
      <style>{`
        .s50-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; width: 100%; box-sizing: border-box; background: #0b111a; }
        @media (max-width: 767px) { .s50-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="s50-grid">
        {charts.map((c) => (
          <ChartCard
            key={c.id}
            title={c.title}
            timeframe={timeframe}
            chartId={c.id}
            color={c.color}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            isMobile={isMobile}
          />
        ))}
      </div>
    </>
  );
}