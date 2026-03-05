// src/pages/tools/S50.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import S50Dashboard from "./components/S50Dashboard.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none'
};
// ── เพิ่มตรงนี้หลัง import ──
function ScaledDashboardPreview({ dashboardWidth = 900, dashboardHeight = 560 }) {
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
    <div ref={outerRef} style={{ width: "100%", overflow: "hidden", position: "relative", background: "#0B1221" }}>
      <div ref={innerRef} style={{ width: dashboardWidth, height: dashboardHeight, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <S50Dashboard />
      </div>
    </div>
  );
}
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

// สร้าง Label จำลองให้ครอบคลุมจำนวนจุดสูงสุด (300 จุดสำหรับ timeframe Week)
const LABELS = Array.from({ length: 300 }, (_, i) => {
  const d = new Date("2024-01-01");
  d.setDate(d.getDate() + i);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
});

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

// ===== DETERMINISTIC MASTER DATA =====
const generateMasterData = (seed = 1, totalPoints = 300) => {
  const data = [];
  let value = 850 + seed * 10; // Base ราคา S50 สมจริงแถวๆ 850-950

  for (let i = 0; i < totalPoints; i++) {
    const random = Math.sin(i * 0.7 + seed) * 10000;
    const change = (random - Math.floor(random)) * 4 - 2; // ความผันผวน
    value += change;
    data.push(parseFloat(value.toFixed(1)));
  }

  return data;
};

// ============================================================
// REUSABLE CHART CARD (NEW STYLE)
// ============================================================
function ChartCard({ title, timeframe, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs }) {
  const seed = title.length;
  const masterDataRef = useRef(generateMasterData(seed));

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

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, height, minWidth } = CHART_CONFIG;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (data.length - 1) * pointGap);

  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? "#22c55e" : "#ef4444";
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
    <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0f172a] border-b border-slate-700/50 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-300">{title}</span>
        <span className="text-xs text-slate-500 bg-[#1e293b] px-2 py-1 rounded">{timeframe}</span>
      </div>

      {/* SVG Interactive Area */}
      <div className="relative w-full bg-[#0f172a]" style={{ height }}>
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

            {/* Area Fill */}
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

            {/* Line Path */}
            <path 
              d={linePath} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />

            {/* Hover Crosshair & Values */}
            {isHovering && (
              <g>
                <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
                <text x={hoverX} y={normalizeY(data[globalHoverIndex]) - 10} fill={color} fontSize="11" fontWeight="700" textAnchor="middle">
                  {data[globalHoverIndex].toFixed(1)}
                </text>
              </g>
            )}
          </svg>

          {/* Floating Tooltip */}
          {isHovering && (
            <div
              className="absolute top-2 z-50 flex flex-col items-center min-w-[60px] bg-[#1e293b] border border-slate-600 rounded-md p-1.5 shadow-xl pointer-events-none transition-transform duration-75"
              style={{
                left: `${hoverX}px`,
                transform: globalHoverIndex > data.length - 5 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
              }}
            >
              <span className="text-[10px] text-slate-400 font-medium mb-1">{LABELS[globalHoverIndex % LABELS.length]}</span>
              <span className="text-white text-[12px] font-bold">{data[globalHoverIndex].toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bottom Fade */}
        <div className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none" style={{ top: "75%" }} />

        {/* Right Y-Axis Panel */}
        <div className="absolute right-0 top-0 w-[55px] h-full pointer-events-none bg-[#0f172a] z-10 border-l border-slate-800/50">
          <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
              const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
              return <text key={i} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">{value.toFixed(1)}</text>;
            })}

            {/* Current Value Badge */}
            <g transform={`translate(6, ${normalizeY(lastPt)})`}>
              <rect x="0" y="-10" width="42" height="20" fill={color} rx="4" />
              <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
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
// MAIN EXPORT S50
// ============================================================
export default function S50() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [timeframe, setTimeframe] = useState("Day"); // ยังคงเก็บ State ไว้ให้ Component ด้านในใช้งาน

  // Shared Hover State (Sync across charts)
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  /* ================= MEMBER CHECK ================= */
  useEffect(() => {
    try {
      const userProfile = localStorage.getItem("userProfile");
      if (userProfile) {
        const user = JSON.parse(userProfile);
        if (user.unlockedItems?.includes("s50")) {
          setIsMember(true);
          // ใช้งาน Preview ตลอด เอา sessionStorage.getItem("s50ToolEntered") ออก
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

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

  // Auto Scroll Effect
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
    { title: "Last", desc: "Track the daily price action of the SET50 Index." },
    { title: "Confirm Up/Down S50", desc: "Forecast bullish or bearish momentum." },
    { title: "Trend (Flow Analysis)", desc: "Visualizes net buying/selling in SET50." },
    { title: "Mid-Trend (Market Sentiment)", desc: "Monitor overall SET market activity." },
  ];

  /* ==========================================================
    SHARED JSX — Features Scroll Section
  ========================================================== */
  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
        4 Main Features
      </h2>

      <div
        className="relative group"
        onMouseEnter={() => (isPaused.current = true)}
        onMouseLeave={() => (isPaused.current = false)}
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
  <div className="relative group w-full max-w-6xl mb-16">
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>

    <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
      </div>
      <ScaledDashboardPreview dashboardWidth={900} dashboardHeight={600} />
    </div>
  </div>
);
  

  /* ==========================================================
    CASE 1 : PREVIEW VERSION (Not Member)
  ========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                S50
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Master the S50 Index Futures with absolute conviction
            </p>
          </div>

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

          {/* CTA Buttons */}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
              >
                Sign In
              </button>

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
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                S50
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Master the S50 Index Futures with absolute conviction
            </p>
          </div>

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

          {/* CTA Button */}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <button
              onClick={() => {
                setEnteredTool(true);
              }}
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

  /* ==========================================================
    CASE 3 : FULL DASHBOARD (Member + Entered)
  ========================================================== */
  return (
    <div className="w-full min-h-screen bg-[#0b111a] text-white px-6 py-6">
      <div className="max-w-[1600px] mx-auto">

        {/* ================= CHART GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard 
            title="1. Last (SET50 Daily)" 
            timeframe={timeframe} 
            chartId="chart1"
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
          />
          <ChartCard 
            title="2. Confirm Up/Down S50" 
            timeframe={timeframe} 
            chartId="chart2"
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
          />
          <ChartCard 
            title="3. Trend (Volume Flow)" 
            timeframe={timeframe} 
            chartId="chart3"
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
          />
          <ChartCard 
            title="4. Mid-Trend (SET Context)" 
            timeframe={timeframe} 
            chartId="chart4"
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
          />
        </div>

      </div>
    </div>
  );
}