// src/pages/tools/PetroleumInsights.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PetroleumDashboard from "./components/PetroleumDashboard";
import ToolHint from "@/components/ToolHint";

const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

// ── ScaledDashboardPreview ──────────────────────────────────────────────────
function ScaledDashboardPreview({ dashboardWidth = 1280, dashboardHeight = 780 }) {
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
      inner.style.transformOrigin = "top left";
      outer.style.height = `${dashboardHeight * s}px`;
    };
    applyScale();
    const ro = new ResizeObserver(applyScale);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [dashboardWidth, dashboardHeight]);

  return (
    <div ref={outerRef} className="w-full bg-[#0e1118]" style={{ overflow: "hidden", position: "relative" }}>
      <div ref={innerRef} style={{ width: dashboardWidth, height: dashboardHeight, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>
        <PetroleumDashboard />
      </div>
    </div>
  );
}

// ── Constants ───────────────────────────────────────────────────────────────
const CHART_CONFIG = {
  paddingLeft: 15,
  paddingRight: 60,
  paddingTop: 15,
  paddingBottom: 25,
  pointGap: 40,
  minWidth: 620,
};

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f43f5e", "#eab308"];
const OIL_TYPES_LIST = ["GASOHOL95 E10", "GASOHOL91", "GASOHOL95 E20", "GASOHOL95 E85", "H-DIESEL", "FO 600 (1) 2%S", "FO 1500 (2) 2%S", "LPG", "ULG95"];
const SYMBOL_LIST = ["BBGI", "BCP", "BCPG", "BANPU", "BGRIM", "EA", "ESSO", "GULF", "IRPC", "IVL", "PTT", "PTTEP", "TOP"];

const LABELS = Array.from({ length: 20 }, (_, i) => {
  const d = new Date("2024-07-01");
  d.setDate(d.getDate() + i * 7);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
});

// ── Data generators ──────────────────────────────────────────────────────────
function createRng(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function symbolToSeed(sym) {
  return sym.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 0);
}
function generateSymbolData(symbol, n = 20) {
  const seed = symbolToSeed(symbol);
  const rng = createRng(seed);
  const exBase = 14 + rng() * 8, exVol = 0.3 + rng() * 1.2, exTrend = (rng() - 0.5) * 0.08;
  let exVal = exBase;
  const ExRefin = Array.from({ length: n }, () => {
    exVal += (rng() - 0.5) * exVol * 2 + exTrend;
    exVal = Math.max(exBase * 0.7, Math.min(exBase * 1.3, exVal));
    return parseFloat(exVal.toFixed(2));
  });
  const mgBase = 0.2 + rng() * 0.5, mgVol = 0.02 + rng() * 0.06, mgTrend = (rng() - 0.5) * 0.004;
  let mgVal = mgBase;
  const MktMargin = Array.from({ length: n }, () => {
    mgVal += (rng() - 0.5) * mgVol * 2 + mgTrend;
    mgVal = Math.max(mgBase * 0.5, Math.min(mgBase * 1.8, mgVal));
    return parseFloat(mgVal.toFixed(2));
  });
  const levelSets = [[28, 20, 15], [30, 22, 18, 10], [25, 18, 12], [32, 24, 16, 8], [20, 15, 10]];
  const levels = levelSets[Math.floor(rng() * levelSets.length)];
  const numLevels = levels.length;
  let currentLevel = Math.floor(rng() * numLevels);
  const OilFund = Array.from({ length: n }, () => {
    if (rng() < 0.20) currentLevel = Math.max(0, Math.min(numLevels - 1, currentLevel + (rng() < 0.5 ? 1 : -1)));
    return levels[currentLevel];
  });
  const priceBase = 5 + rng() * 195, priceVol = priceBase * (0.01 + rng() * 0.02), priceTrend = (rng() - 0.48) * priceBase * 0.003;
  let priceVal = priceBase;
  const LastPrice = Array.from({ length: n }, () => {
    priceVal += (rng() - 0.5) * priceVol * 2 + priceTrend;
    priceVal = Math.max(priceBase * 0.5, Math.min(priceBase * 1.8, priceVal));
    return parseFloat(priceVal.toFixed(2));
  });
  return { ExRefin, MktMargin, OilFund, LastPrice };
}
const DATA_CACHE = {};
function getSymbolData(symbol, oilType = "") {
  const key = `${symbol}__${oilType}`;
  if (!DATA_CACHE[key]) DATA_CACHE[key] = generateSymbolData(symbol + oilType);
  return DATA_CACHE[key];
}

// ── Chart helpers ────────────────────────────────────────────────────────────
function calcYScale(allData) {
  if (!allData || allData.length === 0) return { max: 100, min: 0 };
  const rawMax = Math.max(...allData), rawMin = Math.min(...allData);
  const range = rawMax - rawMin || 1;
  return { max: rawMax + range * 0.15, min: rawMin - range * 0.15 };
}
function makeNormalizeY({ height, paddingTop, paddingBottom }, { max, min }) {
  return (value) => height - paddingBottom - ((value - min) / (max - min)) * (height - paddingTop - paddingBottom);
}
function buildCurvePath(dataset, normalizeY, paddingLeft, pointGap) {
  return dataset.reduce((path, value, i) => {
    const x = paddingLeft + i * pointGap, y = normalizeY(value);
    if (i === 0) return `M ${x},${y}`;
    const prevX = paddingLeft + (i - 1) * pointGap, prevY = normalizeY(dataset[i - 1]);
    return `${path} C ${prevX + (x - prevX) / 3},${prevY} ${prevX + (x - prevX) * 2 / 3},${y} ${x},${y}`;
  }, "");
}
function buildStepPath(dataset, normalizeY, paddingLeft, pointGap) {
  return dataset.reduce((path, value, i) => {
    const x = paddingLeft + i * pointGap, y = normalizeY(value);
    if (i === 0) return `M ${x},${y}`;
    const prevX = paddingLeft + (i - 1) * pointGap, prevY = normalizeY(dataset[i - 1]);
    return `${path} L ${x},${prevY} L ${x},${y}`;
  }, "");
}

// ── useDropdown ──────────────────────────────────────────────────────────────
function useDropdown(ref) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, ref]);
  return [open, setOpen];
}

// ── Loading Skeletons ────────────────────────────────────────────────────────
const shimmerStyle = {
  background: "linear-gradient(90deg,transparent 0%,rgba(56,189,248,0.08) 40%,rgba(125,211,252,0.18) 50%,rgba(56,189,248,0.08) 60%,transparent 100%)",
  animation: "shimmer 1.8s ease-in-out infinite",
};

function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full bg-[#0f172a] rounded-lg overflow-hidden relative" style={{ height: "calc(100% - 2rem)" }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex gap-2">
          <div className="h-2 rounded-full bg-slate-800 w-1/3" />
          <div className="h-2 rounded-full bg-slate-800 w-1/5" />
        </div>
        <div className="flex-1 my-3 rounded bg-slate-800/60" />
        <div className="flex gap-3 justify-between">
          {[...Array(5)].map((_, i) => <div key={`skel-bar-${i}`} className="h-2 rounded-full bg-slate-800 flex-1" />)}
        </div>
      </div>
      <div className="absolute inset-0" style={{ ...shimmerStyle, animationDelay: `${delay}s` }} />
    </div>
  );
}

function SkeletonBig() {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl p-8 flex items-center justify-center relative overflow-hidden h-full">
      <div className="text-center w-full flex flex-col items-center gap-3">
        <div className="h-2 w-20 rounded-full bg-slate-800" />
        <div className="h-12 w-36 rounded-lg bg-slate-800 mt-1" />
        <div className="h-3 w-28 rounded-full bg-slate-800" />
        <div className="h-2 w-16 rounded-full bg-slate-800 mt-4" />
      </div>
      <div className="absolute inset-0" style={shimmerStyle} />
    </div>
  );
}

// ── ChartRenderer ─────────────────────────────────────────────────────────────
function ChartRenderer({ dataKey, isStep, globalHoverIndex, setGlobalHoverIndex, chartRefs, chartId, symbolProp, oilTypesProp }) {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [chartHeight, setChartHeight] = useState(200);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  // ── วัดความสูง container จริงด้วย ResizeObserver ──────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (h > 50) setChartHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const datasets = useMemo(
    () => oilTypesProp.map((ot) => getSymbolData(symbolProp, ot)[dataKey]),
    [oilTypesProp, symbolProp, dataKey]
  );

  const yScale = calcYScale(datasets.flat());

  // ── ใช้ chartHeight แบบ dynamic แทน fixed height ──────────────────────────
  const cfg = { ...CHART_CONFIG, height: chartHeight };
  const normalizeY = makeNormalizeY(cfg, yScale);
  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, height, minWidth } = cfg;

  const dataLength = datasets.length > 0 ? datasets[0].length : 20;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (dataLength - 1) * pointGap);

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, dataKey, chartRefs]);

  const syncScroll = useCallback((sourceEl) => {
    Object.values(chartRefs.current).forEach((node) => {
      if (node && node !== sourceEl && Math.abs(node.scrollLeft - sourceEl.scrollLeft) > 1)
        node.scrollLeft = sourceEl.scrollLeft;
    });
  }, [chartRefs]);

  const onMouseDown = (e) => {
    dragState.current = { active: true, startX: e.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft };
    setGlobalHoverIndex(null);
  };
  const onMouseMove = (e) => {
    if (dragState.current.active) {
      e.preventDefault();
      scrollRef.current.scrollLeft = dragState.current.scrollLeft - (e.pageX - scrollRef.current.offsetLeft - dragState.current.startX) * 1.5;
      setGlobalHoverIndex(null);
      return;
    }
    const mouseX = e.clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft;
    setGlobalHoverIndex(Math.max(0, Math.min(Math.round((mouseX - paddingLeft) / pointGap), dataLength - 1)));
  };
  const onMouseUp = () => { dragState.current.active = false; };
  const onMouseLeave = () => { dragState.current.active = false; setGlobalHoverIndex(null); };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    dragState.current = { active: true, startX: touch.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft };
    setGlobalHoverIndex(null);
  };
  const onTouchMove = (e) => {
    if (!dragState.current.active) return;
    const touch = e.touches[0];
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - (touch.pageX - scrollRef.current.offsetLeft - dragState.current.startX) * 1.5;
  };
  const onTouchEnd = () => { dragState.current.active = false; };

  const isDragging = dragState.current.active;
  const isHovering = globalHoverIndex !== null && !isDragging;
  const hoverX = isHovering ? paddingLeft + globalHoverIndex * pointGap : null;
  const lastX = paddingLeft + (dataLength - 1) * pointGap;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f172a] rounded-lg">
      <div
        ref={scrollRef}
        className={`w-full h-full relative overflow-x-auto overflow-y-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        style={scrollbarHideStyle}
        onScroll={(e) => syncScroll(e.target)}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <svg width={chartWidth} height={height} className="overflow-visible pointer-events-none">
          {[...Array(5)].map((_, i) => {
            const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
            return <line key={`grid-h-${i}`} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeWidth="1" />;
          })}
          <line x1={0} y1={height - paddingBottom} x2={chartWidth} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

          {[...Array(dataLength)].map((_, i) => (
            <text key={`label-${i}`} x={paddingLeft + i * pointGap} y={height - paddingBottom + 16} fill="#64748b" fontSize="9" textAnchor="middle">{LABELS[i]}</text>
          ))}

          {datasets.map((data, idx) => {
            const color = COLORS[idx % COLORS.length];
            const linePath = isStep ? buildStepPath(data, normalizeY, paddingLeft, pointGap) : buildCurvePath(data, normalizeY, paddingLeft, pointGap);
            const areaId = `area-${dataKey}-${idx}`;
            return (
              <g key={`dataset-${idx}`}>
                {!isStep && idx === 0 && (
                  <>
                    <defs>
                      <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${linePath} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`} fill={`url(#${areaId})`} />
                  </>
                )}
                <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
                {isHovering && (
                  <circle key={`dot-${idx}`} cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
                )}
              </g>
            );
          })}

          {isHovering && (
            <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
          )}
        </svg>

        {isHovering && (
          <div
            className="absolute top-2 z-50 flex flex-col min-w-[130px] bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 shadow-xl pointer-events-none"
            style={{
              left: `${hoverX}px`,
              transform: globalHoverIndex > dataLength - 5 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <span className="text-[10px] text-slate-400 font-medium mb-2 border-b border-slate-700 pb-1">{LABELS[globalHoverIndex]}</span>
            <div className="flex flex-col gap-1.5">
              {datasets.map((data, idx) => (
                <div key={`tip-${idx}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-[10px] text-slate-300 truncate max-w-[80px]">{oilTypesProp[idx]}</span>
                  </div>
                  <span className="text-white text-[11px] font-bold tabular-nums">{data[globalHoverIndex].toFixed(2)}</span>
                </div>
              ))}
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
            return (
              <text key={`ytick-${i}`} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">
                {value.toFixed(2)}
              </text>
            );
          })}
          {datasets.map((data, idx) => {
            const lastVal = data[data.length - 1];
            return (
              <g key={`lastval-${idx}`} transform={`translate(6, ${normalizeY(lastVal)})`}>
                <rect x="0" y="-10" width="42" height="20" fill={COLORS[idx % COLORS.length]} rx="4" />
                <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                  {isStep ? lastVal.toFixed(0) : lastVal.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────────
function GridPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {[0.2, 0.4, 0.6, 0.8].map((y, i) => <line key={`gh-${i}`} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`} stroke="#243244" strokeWidth="1" />)}
      {[0.2, 0.4, 0.6, 0.8].map((x, i) => <line key={`gv-${i}`} x1={`${x * 100}%`} y1="0" x2={`${x * 100}%`} y2="100%" stroke="#243244" strokeWidth="1" />)}
    </svg>
  );
}

function EmptyChartCard({ title, message = "Please select symbol and oil types" }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5 flex flex-col h-full min-h-0">
      <p className="text-xs text-slate-400 mb-4">{title}</p>
      <div className="relative flex-1 bg-[#0b1018] rounded-xl overflow-hidden border border-slate-800 min-h-0">
        <GridPattern />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-slate-500 text-sm font-medium text-center px-4">{message}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyClosePriceCard({ message = "Please select symbol" }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl p-6 flex flex-col h-full min-h-0">
      <div className="relative flex-1 rounded-xl bg-[#0b1018] border border-slate-800 overflow-hidden min-h-0">
        <GridPattern />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-slate-500 text-base font-medium text-center px-4">{message}</span>
        </div>
      </div>
    </div>
  );
}

// ── PremiumChart ─────────────────────────────────────────────────────────────
function PremiumChart({ title, dataKey, isStep, globalHoverIndex, setGlobalHoverIndex, chartRefs, chartId, symbolProp, oilTypesProp }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5 flex flex-col h-full min-h-0">
      <p className="text-xs text-slate-400 mb-4 flex-shrink-0">{title}</p>
      <div className="relative flex-1 bg-[#0f172a] rounded-xl overflow-hidden min-h-0">
        <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white/5 select-none pointer-events-none">{title}</div>
        <ChartRenderer
          dataKey={dataKey} isStep={isStep}
          globalHoverIndex={globalHoverIndex} setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs} chartId={chartId}
          symbolProp={symbolProp} oilTypesProp={oilTypesProp}
        />
      </div>
    </div>
  );
}

// ── ClosePriceBig ─────────────────────────────────────────────────────────────
function ClosePriceBig({ globalHoverIndex, symbolProp, oilTypesProp }) {
  if (!oilTypesProp || oilTypesProp.length === 0) return <SkeletonBig />;
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl p-5 flex flex-col gap-3 overflow-y-auto h-full min-h-0">
      {oilTypesProp.map((ot, i) => {
        const data = getSymbolData(symbolProp, ot).LastPrice;
        const idx = globalHoverIndex !== null ? globalHoverIndex : data.length - 1;
        const val = data[idx], prev = data[Math.max(idx - 1, 0)];
        const diff = (val - prev).toFixed(2);
        const pct = prev !== 0 ? ((val - prev) / prev * 100).toFixed(2) : "0.00";
        const up = Number(diff) >= 0;
        return (
          <div key={ot} className="flex justify-between items-center border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{ot}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>{val.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium tabular-nums ${up ? "text-green-400" : "text-red-400"}`}>
                {up ? "▲" : "▼"} {Math.abs(diff)} ({up ? "+" : ""}{pct}%)
              </p>
              <p className="text-xs text-slate-500 mt-1">{LABELS[idx]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SymbolDropdown ─────────────────────────────────────────────────────────
function SymbolDropdown({ symbol, onSelect, disabled }) {
  const ref = useRef(null);
  const [open, setOpen] = useDropdown(ref);

  return (
    <div ref={ref} className="relative w-full sm:w-[220px] shrink-0">
      <button
        type="button"
        disabled={disabled}
        className="w-full h-[44px] bg-[#111827] border border-slate-700 rounded-md px-3 text-sm text-white flex items-center justify-between hover:border-slate-500 transition disabled:opacity-50"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 text-slate-500">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className={`min-w-0 flex-1 truncate text-left ${symbol ? "text-white" : "text-slate-400"}`}>
            {symbol || "Select symbol..."}
          </span>
        </div>

        <div className="ml-2 flex items-center gap-2 shrink-0">
          {symbol && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onSelect("");
                }
              }}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
              aria-label="Clear symbol"
            >
              ✕
            </span>
          )}

          <span
            className={`text-slate-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-[300px] overflow-y-auto z-50 p-2"
        >
          {SYMBOL_LIST.map((item) => {
            const isSelected = symbol === item;

            return (
              <li
                key={item}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className={`px-3 py-2.5 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors mb-1
                  ${isSelected ? "bg-[#1e293b] text-white" : "text-slate-400 hover:bg-[#162032] hover:text-slate-200"}`}
              >
                <span className="truncate">{item}</span>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── OilTypeDropdown ────────────────────────────────────────────────────────
function OilTypeDropdown({ selectedOilTypes, onToggle, disabled }) {
  const ref = useRef(null);
  const [open, setOpen] = useDropdown(ref);

  const label =
    selectedOilTypes.length > 0
      ? `${selectedOilTypes.length} Selected (${selectedOilTypes[0]}${selectedOilTypes.length > 1 ? ", ..." : ""})`
      : "Select Oil Types...";

  return (
    <div ref={ref} className="relative w-full sm:w-[220px] shrink-0">
      <button
        type="button"
        disabled={disabled}
        className="w-full h-[44px] bg-[#111827] border border-slate-700 rounded-md px-3 text-sm text-white flex items-center justify-between hover:border-slate-500 transition disabled:opacity-50"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-left text-slate-300">
          {label}
        </span>

        <span
          className={`ml-2 text-slate-400 text-xs shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full left-0 mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-[300px] overflow-y-auto z-50 p-2"
        >
          {OIL_TYPES_LIST.map((ot) => {
            const isSelected = selectedOilTypes.includes(ot);

            return (
              <li
                key={ot}
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(ot)}
                className={`px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 cursor-pointer transition-colors mb-1
                  ${isSelected ? "bg-[#1e293b] text-white" : "text-slate-400 hover:bg-[#162032] hover:text-slate-200"}`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "border-cyan-500 bg-cyan-500" : "border-slate-500"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[OIL_TYPES_LIST.indexOf(ot) % COLORS.length] }}
                    />
                  )}
                  <span className="truncate">{ot}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function PetroleumInsights() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [period, setPeriod] = useState("MAX");
  const [symbol, setSymbol] = useState("");
  const [selectedOilTypes, setSelectedOilTypes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const skeletonCards = useMemo(() => [
    { key: "closePrice", title: "Close Price", delay: 0 },
    { key: "exrefin", title: "EX-REFIN", delay: 0.2 },
    { key: "mktmargin", title: "Marketing Margin", delay: 0.4 },
    { key: "oilfund", title: "Oil Fund", delay: 0.6 },
  ], []);

  const { userData, currentUser, loading } = useAuth();

  // ── Member check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const toolId = "petroleum";
    if (userData?.subscriptions?.[toolId]) {
      const ts = userData.subscriptions[toolId];
      let expireDate;
      try { expireDate = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts); }
      catch { expireDate = new Date(0); }
      setIsMember(expireDate.getTime() > Date.now());
    } else {
      try {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
          const p = JSON.parse(saved);
          setIsMember(p.role === "member" || p.role === "membership");
        } else setIsMember(false);
      } catch { setIsMember(false); }
    }
  }, [userData, loading]);

  // ── Symbol/OilType handlers ────────────────────────────────────────────────
  const handleSymbolSelect = useCallback((item) => {
    if (refreshing) return;
    setRefreshing(true);
    setGlobalHoverIndex(null);
    setTimeout(() => {
      setSymbol(item);
      setDataVersion((p) => p + 1);
      setRefreshing(false);
    }, 500);
  }, [refreshing]);

  const handleOilTypeToggle = useCallback((ot) => {
    if (refreshing) return;
    setRefreshing(true);
    setGlobalHoverIndex(null);
    setSelectedOilTypes((prev) => {
      const next = prev.includes(ot) ? prev.filter((t) => t !== ot) : [...prev, ot];
      setTimeout(() => {
        setDataVersion((p) => p + 1);
        setRefreshing(false);
      }, 500);
      return next;
    });
  }, [refreshing]);

  // ── Feature cards scroll ───────────────────────────────────────────────────
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 1);
    setShowRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2);
  }, []);

  const scroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isPaused.current = true;
    el.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
    scrollDirection.current = direction === "left" ? -1 : 1;
    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false; }, 500);
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
  }, [isMember, enteredTool, checkScroll]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const features = [
    { title: "WTI & Brent Tracking", desc: "Monitor global crude oil benchmarks in real-time." },
    { title: "Refinery Margin", desc: "Track GRM changes and refining profitability instantly." },
    { title: "Oil Fund Analysis", desc: "Understand government oil stabilization mechanisms." },
    { title: "Energy Macro Signals", desc: "Macro-driven energy market trend detection." },
    { title: "Gas & LNG Insights", desc: "Natural gas movement and global supply chain flow." },
    { title: "Institutional Flow", desc: "Follow capital rotation in energy sector." },
  ];

  // ── Shared landing sections ────────────────────────────────────────────────
  const landingHeader = (
    <div className="text-center mb-8 px-4">
      <h1 className="font-bold mb-4 tracking-tight" style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}>
        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
          Petroleum Insights
        </span>
      </h1>
      <p className="text-slate-400 font-light" style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)" }}>
        Stop relying on crude oil prices alone
      </p>
    </div>
  );

  const dashboardPreview = (
    <div className="relative group w-full mb-12 max-w-5xl mx-auto">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
      <div className="relative bg-[#0e1118] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={700} />
      </div>
    </div>
  );

  const featuresSection = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
        6 Main Features
      </h2>
      <div
        className="relative group"
        onMouseEnter={() => {
          isPaused.current = true;
        }}
        onMouseLeave={() => {
          isPaused.current = false;
        }}
      >
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${
            showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar"
          style={scrollbarHideStyle}
        >
          {features.map((item, index) => (
            <div
              key={index}
              className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${
            showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(600px,80vw)] h-[min(600px,80vw)] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 w-full mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
          {landingHeader}
          {dashboardPreview}
          {featuresSection}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4 w-full max-w-sm">
            {!currentUser && (
              <button
                onClick={() => navigate("/welcome")}
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => navigate("/member-register")}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
            >
              Join Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(600px,80vw)] h-[min(600px,80vw)] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 w-full mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
          {landingHeader}
          {dashboardPreview}
          {featuresSection}
          <div className="mt-4">
            <button
              onClick={() => setEnteredTool(true)}
              className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2">Start Using Tool</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isMember && enteredTool) {
    const sharedChartProps = { globalHoverIndex, setGlobalHoverIndex, chartRefs, symbolProp: symbol, oilTypesProp: selectedOilTypes };

    return (
      // 1. ใช้ h-[100dvh] เพื่อให้เต็มจอเสมอ และ overflow-y-auto ให้เลื่อนจอได้ถ้าพื้นที่ความสูงไม่พอ
      <div className="w-full h-[100dvh] overflow-y-auto bg-[#0c111b] text-white px-3 md:px-6 py-4 md:py-6 flex flex-col">
        <div className="w-full mx-auto flex flex-col flex-1 min-h-0">

          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 mb-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0 w-full lg:w-auto">
              <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                Multi-asset oil price tracking, monitor fuel type variations, analyze exchange refinery rates, track market margins, and display historical price data
              </ToolHint>
              <SymbolDropdown symbol={symbol} onSelect={handleSymbolSelect} disabled={refreshing} />
              <OilTypeDropdown selectedOilTypes={selectedOilTypes} onToggle={handleOilTypeToggle} disabled={refreshing} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["3M", "6M", "1Y", "YTD", "MAX"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${period === p ? "bg-[#1f2937] border-cyan-400 text-cyan-400" : "border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ── Chart grid ────────────────────────────────────────────────── */}
          {/* 2. เปลี่ยนเป็น lg:grid-cols-2 และใช้ gridAutoRows: "minmax(280px, 1fr)" */}
          {refreshing ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0" style={{ gridAutoRows: "minmax(280px, 1fr)" }}>
              {skeletonCards.map((card) => (
                <div key={card.key} className="bg-[#111827] rounded-xl border border-slate-700/60 p-4 h-full min-h-0 flex flex-col">
                  <div className="mb-3"><span className="text-xs text-slate-400">{card.title}</span></div>
                  <div className="flex-1 min-h-0">
                    <WaveSkeleton delay={card.delay} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0" style={{ gridAutoRows: "minmax(280px, 1fr)" }}>
              {symbol
                ? <ClosePriceBig key={`close-${dataVersion}`} globalHoverIndex={globalHoverIndex} symbolProp={symbol} oilTypesProp={selectedOilTypes} />
                : <EmptyClosePriceCard message="Please select symbol" />
              }
              {symbol && selectedOilTypes.length > 0
                ? <PremiumChart key={`exrefin-${dataVersion}`} title="EX-REFIN" dataKey="ExRefin" isStep={false} chartId="exrefin" {...sharedChartProps} />
                : <EmptyChartCard title="EX-REFIN" message={!symbol ? "Please select symbol" : "Please select oil types"} />
              }
              {symbol && selectedOilTypes.length > 0
                ? <PremiumChart key={`mktmargin-${dataVersion}`} title="Marketing Margin" dataKey="MktMargin" isStep={false} chartId="mktmargin" {...sharedChartProps} />
                : <EmptyChartCard title="Marketing Margin" message={!symbol ? "Please select symbol" : "Please select oil types"} />
              }
              {symbol && selectedOilTypes.length > 0
                ? <PremiumChart key={`oilfund-${dataVersion}`} title="Oil Fund" dataKey="OilFund" isStep={true} chartId="oilfund" {...sharedChartProps} />
                : <EmptyChartCard title="Oil Fund" message={!symbol ? "Please select symbol" : "Please select oil types"} />
              }
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}