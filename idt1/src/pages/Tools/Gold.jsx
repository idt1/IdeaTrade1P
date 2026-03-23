// src/pages/tools/Gold.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import RefreshIcon from "@mui/icons-material/Refresh";
import ToolHint from "@/components/ToolHint.jsx";
import GoldDashboard from "./components/GoldDashboard.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// ============================================================
// CHART CONSTANTS
// ============================================================
const CHART_CONFIG = {
  paddingLeft: 15,
  paddingRight: 60,
  paddingTop: 15,
  paddingBottom: 25,
  pointGap: 40,
  minWidth: 620,
};

const LABELS = Array.from({ length: 200 }, (_, i) => {
  const d = new Date("2024-01-01");
  d.setDate(d.getDate() + i * 3);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
});

/* ==========================================================
   DYNAMIC CHART UTILITIES
========================================================== */

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRawSeries({ seed = 1, points = 60, basePrice = 2000, vol = 5 } = {}) {
  const rng = createRng(seed);
  const values = [];
  let price = basePrice + (rng() - 0.5) * 50;

  for (let i = 0; i < points; i++) {
    const shock = (rng() - 0.48) * vol;
    price = Math.max(basePrice * 0.5, Math.min(basePrice * 1.5, price + shock));
    values.push(parseFloat(price.toFixed(2)));
  }
  return values;
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

function ChartBodySkeleton() {
  return (
    <div className="relative w-full bg-[#0f172a]" style={{ height: 280 }}>
      <div className="absolute inset-0 px-4 py-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute left-4 right-16 h-px bg-slate-800"
            style={{ top: `${30 + i * 50}px` }}
          />
        ))}

        <div className="absolute left-4 right-16 top-8 bottom-10 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700/60 to-slate-800 opacity-80" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[42px] h-[20px] rounded bg-slate-700" />
      </div>
    </div>
  );
}

/* ==========================================================
   DYNAMIC CHART COMPONENT (NEW STYLE)
========================================================== */
function DynamicChart({ title, height = 280, color, gradientId, seed, points = 70, basePrice = 2000, vol = 5, className = "", chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs, onRefresh, isRefreshing, toolHint }) {
  
  const data = useMemo(() => generateRawSeries({ seed, points, basePrice, vol }), [seed, points, basePrice, vol]);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const config = { ...CHART_CONFIG, height };
  const yScale = calcYScale(data);
  const normalizeY = makeNormalizeY(config, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, minWidth } = config;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (data.length - 1) * pointGap);

  const linePath = buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const lastX = paddingLeft + (data.length - 1) * pointGap;
  const areaId = `area-${gradientId}-${chartId}`;

  const lastPt = data[data.length - 1];
  const firstPt = data[0];
  const diff = lastPt - firstPt;
  const pct = firstPt ? ((diff / firstPt) * 100).toFixed(2) : "0.00";
  const isUp = diff >= 0;
  const dynamicColor = color || (isUp ? "#22c55e" : "#ef4444");

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs]);

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
    <div className={`relative bg-[#111827] border border-slate-700 rounded-xl flex flex-col ${className}`}>

      {/* 🟢 ToolHint ลอยตัวที่มุมซ้ายบนของการ์ด เหมือนหน้า S50 */}
      {toolHint && (
        <div className="absolute -top-3 -left-3 z-20 shadow-lg rounded-full">
          {toolHint}
        </div>
      )}

      {/* Header */}
      {/* 🟢 เพิ่ม pl-6 (padding-left) เพื่อเว้นที่ให้ปุ่มที่ลอยอยู่ ไม่ให้ทับตัวหนังสือ */}
      <div className="px-3 sm:px-4 pl-6 sm:pl-8 pt-4 pb-3 bg-[#0f172a] rounded-t-xl flex items-center justify-between shrink-0">
        
        <p className="text-sm text-slate-300 font-bold uppercase tracking-wide">{title}</p>

        {/* ส่วนตัวเลขและปุ่มรีเฟรชด้านขวา */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm font-bold" style={{ color: dynamicColor }}>
            {lastPt.toFixed(2)}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isUp ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(diff).toFixed(2)} ({isUp ? "+" : ""}{pct}%)
          </span>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-7 h-7 rounded-md bg-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Refresh ${title}`}
          >
            <RefreshIcon sx={{ fontSize: 16, color: "inherit" }} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full bg-[#0f172a] rounded-b-xl overflow-hidden" style={{ height }}>
        {isRefreshing ? (
          <ChartBodySkeleton />
        ) : (
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
              {/* Grid */}
              {[...Array(5)].map((_, i) => {
                const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
                return <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeWidth="1" />;
              })}
              <line x1={0} y1={height - paddingBottom} x2={chartWidth} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

              {/* Labels */}
              {data.map((_, i) => (
                <text key={i} x={paddingLeft + i * pointGap} y={height - paddingBottom + 16} fill="#64748b" fontSize="9" textAnchor="middle">
                  {LABELS[i % LABELS.length]}
                </text>
              ))}

              {/* Area */}
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dynamicColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={dynamicColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${linePath} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`}
                fill={`url(#${areaId})`}
              />

              {/* Line */}
              <path 
                d={linePath} 
                fill="none" 
                stroke={dynamicColor} 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
                strokeLinecap="round" 
              />

              {/* Last Point Dot */}
              {!isHovering && (
                <>
                  <circle cx={lastX} cy={normalizeY(lastPt)} r="4" fill={dynamicColor} stroke="#0f172a" strokeWidth="2" />
                </>
              )}

              {/* Hover Crosshair */}
              {isHovering && (
                <g>
                  <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="4" fill={dynamicColor} stroke="#0f172a" strokeWidth="2" />
                  <text x={hoverX} y={normalizeY(data[globalHoverIndex]) - 10} fill={dynamicColor} fontSize="11" fontWeight="700" textAnchor="middle">
                    {data[globalHoverIndex].toFixed(2)}
                  </text>
                </g>
              )}
            </svg>

            {/* Floating Tooltip */}
            {isHovering && (
              <div
                className="absolute top-3 z-50 flex flex-col items-center min-w-[60px] bg-[#1e293b] border border-slate-600 rounded-md p-1.5 shadow-xl pointer-events-none transition-transform duration-300"
                style={{
                  left: `${hoverX}px`,
                  transform: globalHoverIndex > data.length - 5 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
                }}
              >
                <span className="text-[10px] text-slate-400 font-medium mb-1">{LABELS[globalHoverIndex % LABELS.length]}</span>
                <span className="text-white text-[12px] font-bold">{data[globalHoverIndex].toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Fade Overlay */}
        <div className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none" style={{ top: "75%" }} />

        {/* Right Axis Panel */}
        <div className="absolute right-0 top-0 w-[55px] h-full pointer-events-none bg-[#0f172a] z-10 border-l border-slate-800/50">
          <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
              const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
              return <text key={i} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">{value.toFixed(2)}</text>;
            })}

            {/* Current Value Badge */}
            {(() => {
              const badgeY = normalizeY(lastPt);
              return (
                <g transform={`translate(6, ${badgeY})`}>
                  <rect x="0" y="-10" width="42" height="20" fill={dynamicColor} rx="4" />
                  <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {lastPt.toFixed(1)}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function Gold() {
   const navigate = useNavigate();

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  
  const scrollContainerRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  // Shared Hover State for Syncing Charts
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  // Refresh state สำหรับ charts
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { accessData, isFreeAccess, currentUser } = useSubscription();

 /* ===============================  MEMBER CHECK  ================================ */
  useEffect(() => {
    if (isFreeAccess) {
      setIsMember(true);
      return;
    }

    const toolId = 'gold'; 

    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;
      
      try {
        if (typeof expireTimestamp.toDate === 'function') {
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

  const handleRefresh = useCallback(() => {
  if (isRefreshing) return;

  setIsRefreshing(true);
  setGlobalHoverIndex(null);

  setTimeout(() => {
    setRefreshKey((prev) => prev + 1);
    setIsRefreshing(false);
  }, 900);
}, [isRefreshing]);

  /* ================= SCROLL LOGIC ================= */
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeft(scrollLeft > 1);
    setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
  };

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    isPaused.current = true;
    const { current } = scrollContainerRef;
    const scrollAmount = 350;

    if (direction === "left") {
      current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      scrollDirection.current = -1;
    } else {
      current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      scrollDirection.current = 1;
    }

    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false; }, 500);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const speed = 1;
    const intervalTime = 15;

    const autoScrollInterval = setInterval(() => {
      if (isPaused.current || !container) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= maxScroll - 2) {
        scrollDirection.current = -1;
      } else if (scrollDirection.current === -1 && scrollLeft <= 2) {
        scrollDirection.current = 1;
      }

      container.scrollLeft += (scrollDirection.current * speed);
      checkScroll();
    }, intervalTime);

    return () => clearInterval(autoScrollInterval);
  }, [isMember, enteredTool]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const features = [
    { title: "Gold (Smart Signal)", desc: "Advanced gold flow detection with smart filtering." },
    { title: "VIX Index", desc: "Volatility monitoring to detect fear-driven gold spikes." },
    { title: "DXY Correlation", desc: "Dollar strength vs gold inverse movement tracking." },
    { title: "US10YY", desc: "Yield monitoring for capital rotation signals." },
  ];

  /* ==========================================================
      SHARED JSX — Features Scroll & Preview Section
  ========================================================== */
  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
        4 Main Features
      </h2>

      <div 
        className="relative group"
        onMouseEnter={() => isPaused.current = true}
        onMouseLeave={() => isPaused.current = false}
      >
        
        <button 
          onClick={() => scroll("left")}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 
                    w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                    hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                    hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                    flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                    active:scale-95
                    ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} 
          aria-label="Scroll Left"
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
              className="
                  w-[350px] md:w-[400px] flex-shrink-0 snap-center
                  group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl 
                  hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300
              "
            >
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <button 
          onClick={() => scroll("right")}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 
                    w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                    hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                    hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                    flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                    active:scale-95
                    ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
          aria-label="Scroll Right"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </div>
  );

  const dashboardPreviewJSX = (
    <div className="relative group w-full max-w-5xl mb-16">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
      
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>

        <div className="aspect-[3/4] md:aspect-[17/10] w-full bg-[#0B1221] relative overflow-hidden group">
          <div className="absolute inset-0 opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
            <GoldDashboard/>
          </div>
        </div>
      </div>
    </div>
  );

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  ========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}
        </style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Gold
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Look beyond the price tag
            </p>
          </div>

          {dashboardPreviewJSX}
          {featuresSectionJSX}

          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              
              {!currentUser && (
                <button
                  onClick={() => navigate("/login")}
                  className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
                >
                  Sign In
                </button>
              )}

              <button
                onClick={() => navigate("/member-register")}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
              >
                Join Membership
              </button>

            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 2 : START SCREEN (Member but not entered)
  ========================================================== */
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}
        </style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Gold
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Look beyond the price tag
            </p>
          </div>

          {dashboardPreviewJSX}
          {featuresSectionJSX}

          <div className="text-center w-full max-w-md mx-auto mt-4">
            <button
              onClick={() => setEnteredTool(true)}
              className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
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

  /* ==========================================================
     CASE 3 : FULL PRODUCTION GOLD DASHBOARD
  ========================================================== */

  return (
    <div className="w-full min-h-screen bg-[#0b111a] text-white p-3 sm:p-6 flex flex-col pb-24">
      <div className="max-w-[1700px] w-full mx-auto flex-1 flex flex-col">

        {/* ================= MAIN CHART ================= */}
        <DynamicChart
          chartId="chart-gold"
          title="Gold (COMEX)"
          toolHint={
            <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
               Track smart gold flow signals, monitor VIX-gold correlation, analyze DXY dollar strength impact, and watch US 10-year yield for capital rotation signals
            </ToolHint>
          }
          height={260}
          gradientId="goldMainArea"
          seed={123 + refreshKey}
          points={100}
          basePrice={2030}
          vol={10}
          className="mb-4 sm:mb-6 shrink-0" 
          globalHoverIndex={globalHoverIndex}
          setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* ================= LOWER GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          <DynamicChart
            chartId="chart-trends"
            title="Trends"
            height={200}
            gradientId="trendsArea"
            seed={456 + refreshKey}
            points={100}
            basePrice={100}
            vol={2}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <DynamicChart
            chartId="chart-vix"
            title="VIX"
            height={200}
            color="#a855f7"
            gradientId="vixArea"
            seed={789 + refreshKey}
            points={100}
            basePrice={15}
            vol={1}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <DynamicChart
            chartId="chart-dxy"
            title="DXY"
            height={200}
            color="#3b82f6"
            gradientId="dxyArea"
            seed={101 + refreshKey}
            points={100}
            basePrice={103}
            vol={0.5}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <DynamicChart
            chartId="chart-us10yy"
            title="US10YY"
            height={200}
            color="#f97316"
            gradientId="us10Area"
            seed={202 + refreshKey}
            points={100}
            basePrice={4.2}
            vol={0.1}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />

        </div>

      </div>
    </div>
  );
}