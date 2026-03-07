// src/pages/tools/StockFortuneTeller.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

import StockFortuneTellerDashboard from "./components/StockFortuneTellerDashboard.jsx";
import SearchIcon from "@mui/icons-material/Search";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import FastForwardIcon from "@mui/icons-material/FastForward";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// ====================================================
// Toast System
// ====================================================
function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium
            backdrop-blur-md transition-all duration-300
            ${toast.type === "success"
              ? "bg-[#0a1628]/90 border-cyan-500/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              : toast.type === "error"
              ? "bg-[#0a1628]/90 border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
              : "bg-[#0a1628]/90 border-slate-500/40 text-slate-300"
            }
          `}
          style={{
            animation: "toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          {toast.type === "success" && (
            <CheckCircleOutlineIcon fontSize="small" className="text-cyan-400 flex-shrink-0" />
          )}
          {toast.type === "error" && (
            <ErrorOutlineIcon fontSize="small" className="text-red-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          {/* progress bar */}
          <div
            className={`absolute bottom-0 left-0 h-[2px] rounded-b-xl
              ${toast.type === "success" ? "bg-cyan-500" : toast.type === "error" ? "bg-red-500" : "bg-slate-500"}
            `}
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`,
              width: "100%",
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  return { toasts, showToast };
}

// ====================================================
// ScaledDashboardPreview
// ====================================================
function ScaledDashboardPreview({ dashboardWidth = 1400, dashboardHeight = 850 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const applyScale = () => {
      const w = outer.getBoundingClientRect().width;
      const s = w / dashboardWidth;
      inner.style.transform = `scale(${s})`;
      outer.style.height = `${dashboardHeight * s}px`;
    };

    applyScale();
    const ro = new ResizeObserver(applyScale);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [dashboardWidth, dashboardHeight]);

  return (
    <div ref={outerRef} className="w-full bg-[#0b1221]" style={{ overflow: "hidden", position: "relative" }}>
      <div
        ref={innerRef}
        style={{
          width: dashboardWidth,
          height: dashboardHeight,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <StockFortuneTellerDashboard />
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC DATA GENERATOR
// ============================================================
function symbolToSeed(sym) {
  return sym.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 0);
}

function createRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_CACHE = {};

function generateMockData(symbol) {
  if (!symbol) return null;
  if (MOCK_CACHE[symbol]) return MOCK_CACHE[symbol];

  const seed = symbolToSeed(symbol);
  const rng = createRng(seed);
  const n = 20;

  const priceBase = 5 + rng() * 95;
  const priceTrend = (rng() - 0.48) * 0.15;
  const priceVol = priceBase * (0.015 + rng() * 0.025);
  let pv = priceBase;
  const Last = Array.from({ length: n }, () => {
    pv += (rng() - 0.5) * priceVol * 2 + priceTrend;
    pv = Math.max(priceBase * 0.4, Math.min(priceBase * 2.2, pv));
    return parseFloat(pv.toFixed(2));
  });

  const shortBase = 10 + rng() * 15;
  const shortTrend = (rng() - 0.5) * 0.3;
  let saVal = shortBase;
  let sbVal = shortBase + rng() * 4 - 2;
  const ShortA = Array.from({ length: n }, () => {
    saVal += (rng() - 0.5) * 2.5 + shortTrend;
    saVal = Math.max(5, Math.min(35, saVal));
    return parseFloat(saVal.toFixed(2));
  });
  const ShortB = Array.from({ length: n }, () => {
    sbVal += (rng() - 0.5) * 2.0 + shortTrend * 0.8;
    sbVal = Math.max(4, Math.min(32, sbVal));
    return parseFloat(sbVal.toFixed(2));
  });

  const ptBase = 20 + rng() * 15;
  const ptTrend = (rng() - 0.4) * 0.5;
  let ptVal = ptBase;
  const PredictTrend = Array.from({ length: n }, () => {
    const surge = rng() < 0.15 ? (rng() - 0.3) * 4 : 0;
    ptVal += (rng() - 0.5) * 2.5 + ptTrend + surge;
    ptVal = Math.max(ptBase * 0.5, Math.min(ptBase * 2.5, ptVal));
    return parseFloat(ptVal.toFixed(2));
  });

  const peakBase = 4 + rng() * 4;
  const Peak = Array.from({ length: n }, () => {
    const isSpike = rng() < 0.2;
    if (isSpike) return parseFloat((peakBase + rng() * 14).toFixed(2));
    return parseFloat((peakBase + rng() * 3).toFixed(2));
  });

  const shBase = 8 + rng() * 5;
  const shLevels = [
    parseFloat(shBase.toFixed(2)),
    parseFloat((shBase + 0.01 + rng() * 0.05).toFixed(2)),
    parseFloat((shBase + 0.1 + rng() * 0.1).toFixed(2)),
  ];
  let shIdx = 0;
  let shCounter = 0;
  const shHold = Math.floor(5 + rng() * 6);
  const Shareholder = Array.from({ length: n }, () => {
    shCounter++;
    if (shCounter >= shHold && shIdx < shLevels.length - 1) {
      if (rng() < 0.4) { shIdx++; shCounter = 0; }
    }
    return shLevels[shIdx];
  });

  const managerBases = [
    +(2 + rng() * 4).toFixed(2),
    +(0.5 + rng() * 2).toFixed(2),
    +((rng() - 0.5) * 1.5).toFixed(2),
    -(1 + rng() * 4).toFixed(2),
    -(4 + rng() * 6).toFixed(2),
  ];
  const Manager = managerBases.map((base, mi) => {
    const rngM = createRng(seed + mi * 997 + 1);
    const shift1 = Math.floor(rngM() * (n - 4)) + 2;
    const delta1 = (rngM() - 0.5) * Math.abs(base) * 0.3;
    return Array.from({ length: n }, (_, i) => {
      const val = i < shift1 ? base : parseFloat((base + delta1).toFixed(2));
      return val;
    });
  });

  const result = {
    Last,
    "%ShortA": ShortA,
    "%ShortB": ShortB,
    PredictTrend,
    Peak,
    Shareholder,
    Manager,
    _lastPrice: Last[Last.length - 1],
    _prevPrice: Last[Last.length - 2],
    _high: parseFloat(Math.max(...Last).toFixed(2)),
    _low: parseFloat(Math.min(...Last).toFixed(2)),
    _volume: parseFloat((50 + rng() * 950).toFixed(1)),
  };

  MOCK_CACHE[symbol] = result;
  return result;
}

// ============================================================
// CHART CONSTANTS
// ============================================================
const CHART_CONFIG = {
  height: 170,
  paddingLeft: 15,
  paddingRight: 60,
  paddingTop: 15,
  paddingBottom: 25,
  pointGap: 40,
  minWidth: 620,
};

const MANAGER_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#0ea5e9", "#eab308"];

const LABELS = Array.from({ length: 20 }, (_, i) => {
  const d = new Date("2025-01-01");
  d.setDate(d.getDate() + i * 7);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
});

// ============================================================
// CHART PURE HELPERS
// ============================================================
function getPrimaryData(type, data) {
  if (type === "%Short") return data["%ShortA"];
  if (type === "Manager") return data.Manager[0];
  return data[type] ?? data.Last;
}

function getAllDataForScale(type, data) {
  if (type === "%Short") return [...data["%ShortA"], ...data["%ShortB"]];
  if (type === "Manager") return data.Manager.flat();
  return getPrimaryData(type, data);
}

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
  return dataset.reduce((path, value, i) => {
    const x = paddingLeft + i * pointGap;
    const y = normalizeY(value);
    if (i === 0) return `M ${x},${y}`;
    const prevX = paddingLeft + (i - 1) * pointGap;
    const prevY = normalizeY(dataset[i - 1]);
    const cp1x = prevX + (x - prevX) / 3;
    const cp2x = prevX + (x - prevX) * (2 / 3);
    return `${path} C ${cp1x},${prevY} ${cp2x},${y} ${x},${y}`;
  }, "");
}

function buildStepPath(dataset, normalizeY, paddingLeft, pointGap) {
  return dataset.reduce((path, value, i) => {
    const x = paddingLeft + i * pointGap;
    const y = normalizeY(value);
    if (i === 0) return `M ${x},${y}`;
    const prevX = paddingLeft + (i - 1) * pointGap;
    const prevY = normalizeY(dataset[i - 1]);
    return `${path} L ${x},${prevY} L ${x},${y}`;
  }, "");
}

function getLineColor(type) {
  const colorMap = {
    Last: "#3b82f6",
    PredictTrend: "#f59e0b",
    Peak: "#eab308",
    Shareholder: "#ef4444",
  };
  return colorMap[type] ?? "#38bdf8";
}

// ============================================================
// WaveSkeleton
// ============================================================
function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-[210px] bg-[#0f172a] rounded-lg overflow-hidden relative">
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex gap-2">
          <div className="h-2 rounded-full bg-slate-800 w-1/3" />
          <div className="h-2 rounded-full bg-slate-800 w-1/5" />
        </div>
        <div className="flex-1 my-3 rounded bg-slate-800/60" />
        <div className="flex gap-3 justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2 rounded-full bg-slate-800 flex-1" />
          ))}
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

// ============================================================
// ChartCard
// ============================================================
function ChartCard({ title, type, onChange, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs, selectedSymbol }) {
  return (
    <div className="bg-[#111827] rounded-xl border border-slate-700 p-4 h-[280px]">
      <div className="mb-3 flex justify-between items-center">
        <select
          value={type}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#1f2937] text-xs border border-slate-600 rounded-md px-2 py-1 focus:outline-none focus:border-cyan-500"
        >
          <option>Last</option>
          <option>%Short</option>
          <option>PredictTrend</option>
          <option>Peak</option>
          <option>Shareholder</option>
          <option>Manager</option>
        </select>
        <span className="text-xs text-slate-400">{title}</span>
      </div>
      <div className="w-full h-[210px] bg-[#0f172a] rounded-lg p-4 relative overflow-hidden">
        <ChartRenderer
          type={type}
          chartId={chartId}
          globalHoverIndex={globalHoverIndex}
          setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs}
          selectedSymbol={selectedSymbol}
        />
      </div>
    </div>
  );
}

// ============================================================
// ChartRenderer
// ============================================================
function ChartRenderer({ type, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs, selectedSymbol }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const currentData = useMemo(() => generateMockData(selectedSymbol), [selectedSymbol]);

  const primaryData = getPrimaryData(type, currentData);
  const yScale = calcYScale(getAllDataForScale(type, currentData));
  const normalizeY = makeNormalizeY(CHART_CONFIG, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, height, minWidth } = CHART_CONFIG;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (primaryData.length - 1) * pointGap);

  const curve = (data) => buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const step = (data) => buildStepPath(data, normalizeY, paddingLeft, pointGap);

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, type, chartRefs]);

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
    const rect = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const index = Math.max(0, Math.min(Math.round((mouseX - paddingLeft) / pointGap), primaryData.length - 1));
    setGlobalHoverIndex(index);
  };

  const isHovering = globalHoverIndex !== null && !isDragging;
  const hoverX = isHovering ? paddingLeft + globalHoverIndex * pointGap : null;

  return (
    <div className="relative w-full h-full group bg-[#0f172a] rounded-lg">
      <div
        ref={scrollRef}
        className={`w-full h-full relative overflow-x-auto overflow-y-hidden hide-scrollbar select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        onScroll={(e) => syncScroll(e.target)}
        onMouseDown={handleMouseDown}
        onMouseLeave={() => { setIsDragging(false); setGlobalHoverIndex(null); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
      >
        <svg width={chartWidth} height={height} className="overflow-visible pointer-events-none">
          {[...Array(5)].map((_, i) => {
            const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
            return <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeWidth="1" />;
          })}
          <line x1={0} y1={height - paddingBottom} x2={chartWidth} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

          {primaryData.map((_, i) => (
            <text key={i} x={paddingLeft + i * pointGap} y={height - paddingBottom + 16} fill="#64748b" fontSize="9" textAnchor="middle">
              {LABELS[i]}
            </text>
          ))}

          {type === "%Short" && (
            <>
              <path d={curve(currentData["%ShortA"])} fill="none" stroke="#0ea5e9" strokeWidth="2" />
              <path d={curve(currentData["%ShortB"])} fill="none" stroke="#f97316" strokeWidth="2" />
            </>
          )}

          {(type === "Last" || type === "Peak") && (() => {
            const data = currentData[type];
            const color = getLineColor(type);
            const areaId = `area-${type}-${chartId}`;
            const lastX = paddingLeft + (data.length - 1) * pointGap;
            return (
              <>
                <defs>
                  <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${curve(data)} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`} fill={`url(#${areaId})`} />
                <path d={curve(data)} fill="none" stroke={color} strokeWidth="2.5" />
              </>
            );
          })()}

          {type === "PredictTrend" && (
            <path d={curve(currentData.PredictTrend)} fill="none" stroke={getLineColor(type)} strokeWidth="2.5" />
          )}

          {type === "Shareholder" && (
            <path d={step(currentData.Shareholder)} fill="none" stroke={getLineColor(type)} strokeWidth="2" />
          )}

          {type === "Manager" &&
            currentData.Manager.map((data, idx) => (
              <path key={idx} d={step(data)} fill="none" stroke={MANAGER_COLORS[idx]} strokeWidth="2" />
            ))}

          {isHovering && (
            <g>
              <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
              {type === "%Short" && (
                <>
                  <circle cx={hoverX} cy={normalizeY(currentData["%ShortA"][globalHoverIndex])} r="4" fill="#0ea5e9" stroke="#0f172a" strokeWidth="2" />
                  <circle cx={hoverX} cy={normalizeY(currentData["%ShortB"][globalHoverIndex])} r="4" fill="#f97316" stroke="#0f172a" strokeWidth="2" />
                  <text x={hoverX} y={normalizeY(currentData["%ShortA"][globalHoverIndex]) - 9} fill="#0ea5e9" fontSize="10" fontWeight="700" textAnchor="middle">
                    {currentData["%ShortA"][globalHoverIndex].toFixed(2)}
                  </text>
                  <text x={hoverX} y={normalizeY(currentData["%ShortB"][globalHoverIndex]) - 9} fill="#f97316" fontSize="10" fontWeight="700" textAnchor="middle">
                    {currentData["%ShortB"][globalHoverIndex].toFixed(2)}
                  </text>
                </>
              )}
              {type === "Manager" &&
                currentData.Manager.map((data, idx) => (
                  <g key={idx}>
                    <circle cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="3.5" fill={MANAGER_COLORS[idx]} stroke="#0f172a" strokeWidth="1.5" />
                    <text x={hoverX} y={normalizeY(data[globalHoverIndex]) - 7} fill={MANAGER_COLORS[idx]} fontSize="9" fontWeight="700" textAnchor="middle">
                      {data[globalHoverIndex].toFixed(2)}
                    </text>
                  </g>
                ))}
              {type !== "%Short" && type !== "Manager" && (
                <g>
                  <circle cx={hoverX} cy={normalizeY(primaryData[globalHoverIndex])} r="4" fill={getLineColor(type)} stroke="#0f172a" strokeWidth="2" />
                  <text x={hoverX} y={normalizeY(primaryData[globalHoverIndex]) - 9} fill={getLineColor(type)} fontSize="11" fontWeight="700" textAnchor="middle">
                    {primaryData[globalHoverIndex].toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>

        {isHovering && (
          <div
            className="absolute top-2 z-50 flex flex-col items-center min-w-[60px] bg-[#1e293b] border border-slate-600 rounded-md p-1.5 shadow-xl pointer-events-none transition-transform duration-75"
            style={{
              left: `${hoverX}px`,
              transform: globalHoverIndex > primaryData.length - 5 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <span className="text-[10px] text-slate-400 font-medium mb-1">{LABELS[globalHoverIndex]}</span>
            <div className="flex flex-col items-center gap-0.5">
              {type === "%Short" && (
                <>
                  <span className="text-[#0ea5e9] text-[11px] font-bold">{currentData["%ShortA"][globalHoverIndex].toFixed(2)}</span>
                  <span className="text-[#f97316] text-[11px] font-bold">{currentData["%ShortB"][globalHoverIndex].toFixed(2)}</span>
                </>
              )}
              {type === "Manager" &&
                currentData.Manager.map((data, idx) => (
                  <span key={idx} style={{ color: MANAGER_COLORS[idx] }} className="text-[11px] font-bold">
                    {data[globalHoverIndex] > 0 ? `+${data[globalHoverIndex].toFixed(2)}` : data[globalHoverIndex].toFixed(2)}
                  </span>
                ))}
              {type !== "%Short" && type !== "Manager" && (
                <span className="text-white text-[12px] font-bold">{primaryData[globalHoverIndex].toFixed(2)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none" style={{ top: "75%" }} />

      <div className="absolute right-0 top-0 w-[55px] h-full pointer-events-none bg-[#0f172a] z-10 border-l border-slate-800/50">
        <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
          {[...Array(5)].map((_, i) => {
            const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
            const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
            if (type === "Manager") {
              const tooClose = currentData.Manager.some(
                (data) => Math.abs(normalizeY(data[data.length - 1]) - y) < 12
              );
              if (tooClose) return null;
            }
            return (
              <text key={i} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">
                {value.toFixed(2)}
              </text>
            );
          })}

          {type === "Shareholder" && (() => {
            const lastVal = currentData.Shareholder[currentData.Shareholder.length - 1];
            return (
              <g transform={`translate(6, ${normalizeY(lastVal)})`}>
                <rect x="0" y="-10" width="42" height="20" fill="#ef4444" rx="4" />
                <text x="21" y="0" fill="#ffffff" fontSize="11" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                  {lastVal.toFixed(2)}
                </text>
              </g>
            );
          })()}

          {type === "Manager" && (() => {
            const TAG_H = 20;
            const TAG_W = 42;
            const MIN_GAP = TAG_H + 2;

            const tags = currentData.Manager.map((data, idx) => {
              const lastVal = data[data.length - 1];
              return {
                idx,
                idealY: normalizeY(lastVal),
                realY: normalizeY(lastVal),
                color: MANAGER_COLORS[idx],
                label: lastVal > 0 ? `+${lastVal.toFixed(2)}` : lastVal.toFixed(2),
              };
            }).sort((a, b) => a.idealY - b.idealY);

            for (let i = 1; i < tags.length; i++) {
              if (tags[i].idealY - tags[i - 1].idealY < MIN_GAP)
                tags[i].idealY = tags[i - 1].idealY + MIN_GAP;
            }

            return tags.map(({ idx, idealY, realY, color, label }) => {
              const shifted = Math.abs(idealY - realY) > 1;
              return (
                <g key={idx}>
                  {shifted && (
                    <line x1="5" y1={realY} x2="5" y2={idealY} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                  )}
                  <g transform={`translate(6, ${idealY})`}>
                    <rect x="-1" y={`${-TAG_H / 2 - 1}`} width={TAG_W + 2} height={TAG_H + 2} fill="black" fillOpacity="0.3" rx="5" />
                    <rect x="0" y={`${-TAG_H / 2}`} width={TAG_W} height={TAG_H} fill={color} rx="4" />
                    <rect x="0" y={`${-TAG_H / 2}`} width={TAG_W} height={TAG_H / 2} fill="white" fillOpacity="0.08" rx="4" />
                    <text x={TAG_W / 2} y="0" fill="white" fontSize="10.5" fontWeight="bold" textAnchor="middle" dominantBaseline="central" letterSpacing="-0.2">
                      {label}
                    </text>
                  </g>
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export default function StockFortuneTeller() {
  const scrollContainerRef = useRef(null);
  const scrollDirection = useRef(1);
  const isPaused = useRef(false);
  const searchInputRef = useRef(null);

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const defaultFilters = {
    chart1: "Last",
    chart2: "%Short",
    chart3: "PredictTrend",
    chart4: "Peak",
    chart5: "Shareholder",
    chart6: "Manager",
  };

  const [filters, setFilters] = useState(() => {
    const savedFilters = localStorage.getItem("stockFortuneFilters");
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    return defaultFilters;
  });

  const [refreshing, setRefreshing] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  // ── Toast ──
  const { toasts, showToast } = useToast();

  const { accessData, isFreeAccess } = useSubscription();

  const symbols = [
    "BANPU", "BGRIM", "EGCO", "GPSC", "GULF", "OR", "PTT", "PTTEP",
    "PTTGC", "RATCH", "TOP", "IVL", "BBL", "KBANK", "KTB", "SCB",
    "TISCO", "TTB", "KTC", "SAWAD", "MTC", "TLI", "ADVANC", "DELTA",
    "COM7", "CCET", "TRUE", "CPALL", "CPF", "CBG", "OSP", "GLOBAL",
    "HMPRO", "BJC", "CRC", "ITC", "TU", "AOT", "AWC", "BDMS",
    "BH", "BEM", "BTS", "CPN", "LH", "MINT", "SCGP",
  ];
  const filteredSymbols = symbols.filter((s) => s.toLowerCase().includes(symbol.toLowerCase()));

  const mockData = useMemo(() => generateMockData(selectedSymbol), [selectedSymbol]);

  /* ===============================  MEMBER CHECK  ================================ */
  useEffect(() => {
    if (isFreeAccess) {
      setIsMember(true);
      return;
    }

    const toolId = "fortune";

    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;

      try {
        if (typeof expireTimestamp.toDate === "function") {
          expireDate = expireTimestamp.toDate();
        } else {
          expireDate = new Date(expireTimestamp);
        }
      } catch (e) {
        expireDate = new Date(0);
      }

      if (expireDate.getTime() > new Date().getTime()) {
        setIsMember(true);
      } else {
        setIsMember(false);
      }
    } else {
      setIsMember(false);
    }
  }, [accessData, isFreeAccess]);

  /* ===============================  SCROLL  ================================ */
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 1);
    setShowRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2);
  };

  const scroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isPaused.current = true;
    el.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
    scrollDirection.current = direction === "left" ? -1 : 1;
    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false; }, 500);
  };

  const scrollToLatest = () => {
    Object.values(chartRefs.current).forEach((node) => {
      if (node) {
        node.scrollTo({ left: node.scrollWidth, behavior: "smooth" });
      }
    });
  };

  useEffect(() => {
    const id = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el || isPaused.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (scrollDirection.current === 1 && Math.ceil(el.scrollLeft) >= maxScroll - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && el.scrollLeft <= 2) scrollDirection.current = 1;
      el.scrollLeft += scrollDirection.current;
      checkScroll();
    }, 15);
    return () => clearInterval(id);
  }, [isMember, enteredTool]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  /* ===============================  SAVE ACTION  ================================ */
  const handleSaveLayout = () => {
    try {
      localStorage.setItem("stockFortuneFilters", JSON.stringify(filters));
      showToast("บันทึกรูปแบบกราฟเรียบร้อยแล้ว 💾", "success");
    } catch (e) {
      console.error("Failed to save layout", e);
      showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่", "error");
    }
  };

  /* ===============================  FEATURES  ================================ */
  const features = [
    { title: "Last", desc: "Stay updated with intuitive, real-time daily price action charts." },
    { title: "PredictTrend", desc: "Visualizes the pulse of the market by tracking real-time capital inflows and outflows." },
    { title: "Volume Analysis", desc: "Deep dive into volume patterns to confirm trend strength." },
    { title: "Smart Signals", desc: "AI-driven entry and exit points." },
    { title: "Sector Rotation", desc: "Identify which sectors are leading the market in real-time." },
    { title: "Risk Management", desc: "Calculated risk metrics to help you protect your capital." },
  ];

  const windowChrome = (
    <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>
    </div>
  );

  const featuresSection = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">6 Main Features</h2>
      <div className="relative group" onMouseEnter={() => { isPaused.current = true; }} onMouseLeave={() => { isPaused.current = false; }}>
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
          {features.map((item, index) => (
            <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  /* ==========================================================  CASE 1  =========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Stock Fortune Teller
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop guessing, start calculating</p>
          </div>
          <div className="relative group w-full max-w-6xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={800} />
            </div>
          </div>
          {featuresSection}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.open("/login", "_blank")}
              className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
            >
              Sign In
            </button>
            <button
              onClick={() => window.open("/member-register", "_blank")}
              className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
            >
              Join Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================  CASE 2  =========================================================== */
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Stock Fortune Teller
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop guessing, start calculating</p>
          </div>
          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={800} />
            </div>
          </div>
          {featuresSection}
          <button
            onClick={() => { setEnteredTool(true); }}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
          >
            <span className="mr-2">Start Using Tool</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  /* ==========================================================  CASE 3  =========================================================== */
  if (isMember && enteredTool) {
    return (
      <div className="w-full min-h-screen bg-[#0B1221] text-white px-6 py-6">
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        {/* TOP BAR */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
            <input
              ref={searchInputRef}
              type="text"
              value={symbol}
              onChange={(e) => { setSymbol(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Type a Symbol..."
              className="w-full bg-[#0f172a] border border-slate-600 rounded-full pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            {symbol && (
              <button
                onClick={() => { setSymbol(""); setSelectedSymbol(""); setShowDropdown(false); }}
                className="absolute right-3 inset-y-0 flex items-center text-slate-400 hover:text-red-400 transition"
              >
                <CloseIcon fontSize="small" />
              </button>
            )}
            {showDropdown && (
              <div className="absolute mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50">
                {filteredSymbols.length > 0
                  ? filteredSymbols.map((item, index) => (
                      <div
                        key={index}
                        onMouseDown={() => { setSymbol(item); setSelectedSymbol(item); setShowDropdown(false); }}
                        className="px-4 py-2.5 text-sm text-slate-300 hover:bg-cyan-500/20 hover:text-white cursor-pointer transition"
                      >
                        {item}
                      </div>
                    ))
                  : <div className="px-4 py-2 text-sm text-slate-500">No results</div>
                }
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveLayout}
              className="w-10 h-10 bg-[#0f172a] border border-slate-700 rounded-lg flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 transition"
              title="Save Layout"
            >
              <SaveOutlinedIcon fontSize="small" />
            </button>

            <button
              onClick={() => {
                setSymbol(""); setSelectedSymbol(""); setShowDropdown(false);
                setRefreshing(true);
                setTimeout(() => { setRefreshing(false); searchInputRef.current?.focus(); }, 500);
              }}
              className="w-10 h-10 bg-[#0f172a] border border-slate-700 rounded-lg flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 transition"
              title="Refresh"
            >
              <RefreshIcon fontSize="small" className={refreshing ? "animate-spin" : ""} />
            </button>

            <button
              onClick={scrollToLatest}
              className="w-10 h-10 bg-[#0f172a] border border-slate-700 rounded-lg flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 transition"
              title="Scroll to latest"
            >
              <FastForwardIcon fontSize="small" />
            </button>
          </div>
        </div>

        {/* CHART GRID หรือ Skeleton */}
        {selectedSymbol ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(filters).map(([key, value]) => (
              <ChartCard
                key={key}
                chartId={key}
                title={key}
                type={value}
                globalHoverIndex={globalHoverIndex}
                setGlobalHoverIndex={setGlobalHoverIndex}
                chartRefs={chartRefs}
                selectedSymbol={selectedSymbol}
                onChange={(newValue) => setFilters({ ...filters, [key]: newValue })}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(filters).map(([key, value], cardIdx) => (
              <div key={key} className="bg-[#111827] rounded-xl border border-slate-700/60 p-4 h-[280px]">
                <div className="mb-3 flex justify-between items-center">
                  <select
                    value={value}
                    onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                    className="bg-[#1f2937] text-xs border border-slate-600 rounded-md px-2 py-1 focus:outline-none focus:border-cyan-500"
                  >
                    <option>Last</option>
                    <option>%Short</option>
                    <option>PredictTrend</option>
                    <option>Peak</option>
                    <option>Shareholder</option>
                    <option>Manager</option>
                  </select>
                  <span className="text-xs text-slate-400">{key}</span>
                </div>
                <WaveSkeleton delay={cardIdx * 0.2} />
              </div>
            ))}
          </div>
        )}

        {/* TOAST */}
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return null;
}