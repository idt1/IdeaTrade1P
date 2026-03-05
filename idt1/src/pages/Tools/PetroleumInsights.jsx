// src/pages/tools/PetroleumInsights.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// นำเข้า Dashboard ตัวเต็มมาใช้แสดงในพรีวิว
import PetroleumDashboard from "./components/PetroleumDashboard";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// ====================================================
// ScaledDashboardPreview
// ====================================================
function ScaledDashboardPreview({ dashboardWidth = 1280, dashboardHeight = 900 }) {
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
    <div ref={outerRef} className="w-full bg-[#0e1118]" style={{ overflow: "hidden", position: "relative" }}>
      <div ref={innerRef} style={{ width: dashboardWidth, height: dashboardHeight, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        
        {/* เรียกใช้ Dashboard ตัวเต็ม เพื่อแสดงพรีวิวให้เห็นกราฟ */}
        <PetroleumDashboard />
        
      </div>
    </div>
  );
}

// ============================================================
// CHART CONSTANTS 
// ============================================================
const CHART_CONFIG = {
  height:        200,
  paddingLeft:   15,
  paddingRight:  60,
  paddingTop:    15,
  paddingBottom: 25,
  pointGap:      40,
  minWidth:      620,
};

const LABELS = Array.from({ length: 20 }, (_, i) => {
  const d = new Date("2024-07-01");
  d.setDate(d.getDate() + i * 7);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
});

// ============================================================
// DYNAMIC DATA GENERATOR
// ============================================================
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
  const rng  = createRng(seed);

  const exBase  = 14 + rng() * 8;
  const exVol   = 0.3 + rng() * 1.2;
  const exTrend = (rng() - 0.5) * 0.08;
  let exVal     = exBase;
  const ExRefin = Array.from({ length: n }, () => {
    exVal += (rng() - 0.5) * exVol * 2 + exTrend;
    exVal  = Math.max(exBase * 0.7, Math.min(exBase * 1.3, exVal));
    return parseFloat(exVal.toFixed(2));
  });

  const mgBase  = 0.2 + rng() * 0.5;
  const mgVol   = 0.02 + rng() * 0.06;
  const mgTrend = (rng() - 0.5) * 0.004;
  let mgVal     = mgBase;
  const MktMargin = Array.from({ length: n }, () => {
    mgVal += (rng() - 0.5) * mgVol * 2 + mgTrend;
    mgVal  = Math.max(mgBase * 0.5, Math.min(mgBase * 1.8, mgVal));
    return parseFloat(mgVal.toFixed(2));
  });

  const levelSets = [
    [28, 20, 15],
    [30, 22, 18, 10],
    [25, 18, 12],
    [32, 24, 16, 8],
    [20, 15, 10],
  ];
  const levels     = levelSets[Math.floor(rng() * levelSets.length)];
  const numLevels  = levels.length;
  const changeSeeds = Array.from({ length: n }, () => rng());
  let currentLevel  = Math.floor(rng() * numLevels);
  const OilFund = changeSeeds.map((r) => {
    if (r < 0.20) {
      const dir = rng() < 0.5 ? 1 : -1;
      currentLevel = Math.max(0, Math.min(numLevels - 1, currentLevel + dir));
    }
    return levels[currentLevel];
  });

  const priceBase  = 5 + rng() * 195;
  const priceVol   = priceBase * (0.01 + rng() * 0.02);
  const priceTrend = (rng() - 0.48) * priceBase * 0.003;
  let priceVal     = priceBase;
  const LastPrice = Array.from({ length: n }, () => {
    priceVal += (rng() - 0.5) * priceVol * 2 + priceTrend;
    priceVal  = Math.max(priceBase * 0.5, Math.min(priceBase * 1.8, priceVal));
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

// ============================================================
// CHART PURE HELPERS
// ============================================================
function calcYScale(data) {
  const rawMax = Math.max(...data);
  const rawMin = Math.min(...data);
  const range  = rawMax - rawMin || 1;
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
    const cp1x  = prevX + (x - prevX) / 3;
    const cp2x  = prevX + (x - prevX) * 2 / 3;
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

// ============================================================
// LOADING SKELETONS
// ============================================================
function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-full bg-[#0f172a] rounded-lg overflow-hidden relative">
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
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.07) 40%, rgba(125,211,252,0.15) 50%, rgba(56,189,248,0.07) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

function SkeletonBig() {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl p-8 flex items-center justify-center relative overflow-hidden">
      <div className="text-center w-full flex flex-col items-center gap-3">
        <div className="h-2 w-20 rounded-full bg-slate-800" />
        <div className="h-12 w-36 rounded-lg bg-slate-800 mt-1" />
        <div className="h-3 w-28 rounded-full bg-slate-800" />
        <div className="h-2 w-16 rounded-full bg-slate-800 mt-4" />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.07) 40%, rgba(125,211,252,0.15) 50%, rgba(56,189,248,0.07) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ============================================================
// ChartRenderer 
// ============================================================
function ChartRenderer({ dataKey, isStep, color, globalHoverIndex, setGlobalHoverIndex, chartRefs, chartId, symbolProp, oilTypeProp }) {
  const scrollRef    = useRef(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [dragStartX,      setDragStartX]      = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const data       = getSymbolData(symbolProp, oilTypeProp)[dataKey];
  const yScale     = calcYScale(data);
  const normalizeY = makeNormalizeY(CHART_CONFIG, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, height, minWidth } = CHART_CONFIG;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (data.length - 1) * pointGap);

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, dataKey, chartRefs]);

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
    const index  = Math.max(0, Math.min(Math.round((mouseX - paddingLeft) / pointGap), data.length - 1));
    setGlobalHoverIndex(index);
  };

  const isHovering = globalHoverIndex !== null && !isDragging;
  const hoverX     = isHovering ? paddingLeft + globalHoverIndex * pointGap : null;
  const linePath   = isStep
    ? buildStepPath(data, normalizeY, paddingLeft, pointGap)
    : buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const lastX  = paddingLeft + (data.length - 1) * pointGap;
  const areaId = `area-${dataKey}`;

  return (
    <div className="relative w-full h-full bg-[#0f172a] rounded-lg">
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

          {data.map((_, i) => (
            <text key={i} x={paddingLeft + i * pointGap} y={height - paddingBottom + 16} fill="#64748b" fontSize="9" textAnchor="middle">
              {LABELS[i]}
            </text>
          ))}

          {!isStep && (
            <>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${linePath} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`}
                fill={`url(#${areaId})`}
              />
            </>
          )}

          <path d={linePath} fill="none" stroke={color} strokeWidth="2" />

          {isHovering && (
            <g>
              <line
                x1={hoverX} y1={paddingTop}
                x2={hoverX} y2={height - paddingBottom}
                stroke="#475569" strokeWidth="1" strokeDasharray="4 4"
              />
              <circle
                cx={hoverX}
                cy={normalizeY(data[globalHoverIndex])}
                r="4"
                fill={color}
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text
                x={hoverX}
                y={normalizeY(data[globalHoverIndex]) - 10}
                fill={color}
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {data[globalHoverIndex].toFixed(2)}
              </text>
            </g>
          )}
        </svg>

        {isHovering && (
          <div
            className="absolute top-2 z-50 flex flex-col items-center min-w-[60px] bg-[#1e293b] border border-slate-600 rounded-md p-1.5 shadow-xl pointer-events-none transition-transform duration-75"
            style={{
              left: `${hoverX}px`,
              transform: globalHoverIndex > data.length - 5
                ? "translateX(calc(-100% - 10px))"
                : "translateX(10px)",
            }}
          >
            <span className="text-[10px] text-slate-400 font-medium mb-1">{LABELS[globalHoverIndex]}</span>
            <span className="text-white text-[12px] font-bold">{data[globalHoverIndex].toFixed(2)}</span>
          </div>
        )}
      </div>

      <div
        className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none"
        style={{ top: "75%" }}
      />

      <div className="absolute right-0 top-0 w-[55px] h-full pointer-events-none bg-[#0f172a] z-10 border-l border-slate-800/50">
        <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
          {[...Array(5)].map((_, i) => {
            const y     = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
            const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
            return (
              <text key={i} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">
                {value.toFixed(2)}
              </text>
            );
          })}
          {(() => {
            const lastVal = data[data.length - 1];
            const badgeY  = normalizeY(lastVal);
            return (
              <g transform={`translate(6, ${badgeY})`}>
                <rect x="0" y="-10" width="42" height="20" fill={color} rx="4" />
                <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                  {isStep ? lastVal.toFixed(0) : lastVal.toFixed(2)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// PremiumChart
// ============================================================
function PremiumChart({ title, dataKey, isStep, color, globalHoverIndex, setGlobalHoverIndex, chartRefs, chartId, symbolProp, oilTypeProp }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5">
      <p className="text-xs text-slate-400 mb-4">{title}</p>
      <div className="relative w-full h-[220px] bg-[#0f172a] rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white/5 select-none">{title}</div>
        <ChartRenderer
          dataKey={dataKey}
          isStep={isStep}
          color={color}
          globalHoverIndex={globalHoverIndex}
          setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs}
          chartId={chartId}
          symbolProp={symbolProp}
          oilTypeProp={oilTypeProp}
        />
      </div>
    </div>
  );
}

// ============================================================
// ClosePriceBig
// ============================================================
function ClosePriceBig({ globalHoverIndex, symbolProp, oilTypeProp }) {
  const data = getSymbolData(symbolProp, oilTypeProp).LastPrice;
  const idx  = globalHoverIndex !== null ? globalHoverIndex : data.length - 1;
  const val  = data[idx];
  const prev = data[Math.max(idx - 1, 0)];
  const diff = (val - prev).toFixed(2);
  const pct  = prev !== 0 ? ((val - prev) / prev * 100).toFixed(2) : "0.00";
  const up   = Number(diff) >= 0;

  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl p-8 flex items-center justify-center relative">
      <div className="text-center">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Last Price</p>
        <p className="text-5xl font-bold">{val.toFixed(2)}</p>
        <p className={`text-sm mt-2 ${up ? "text-green-400" : "text-red-400"}`}>
          {up ? "▲" : "▼"} {Math.abs(diff)} ({up ? "+" : ""}{pct}%)
        </p>
        <p className="text-xs text-slate-500 mt-6">{LABELS[idx]}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
export default function PetroleumInsights() {
  const navigate = useNavigate();

  const scrollContainerRef = useRef(null);
  const scrollDirection    = useRef(1);
  const isPaused           = useRef(false);

  const [isMember,    setIsMember]    = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  const [period,   setPeriod]   = useState("MAX");
  const [symbol,   setSymbol]   = useState("");
  const [oilType,  setOilType]  = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const [showLeft,  setShowLeft]  = useState(false);
  const [showRight, setShowRight] = useState(true);

  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const [symbolQuery,        setSymbolQuery]        = useState("");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);

  const symbolList      = ["BBGI","BCP","BCPG","BANPU","BGRIM","EA","ESSO","GULF","IRPC","IVL","PTT","PTTEP","TOP"];
  const filteredSymbols = symbolList.filter(s => s.toLowerCase().includes(symbolQuery.toLowerCase()));

  /* ===============================
      MEMBER CHECK
  ================================ */
  useEffect(() => {
    try {
      const userProfile = localStorage.getItem("userProfile");
      if (userProfile) {
        const user = JSON.parse(userProfile);
        if (user.unlockedItems?.includes("petroleum")) {
          setIsMember(true);
        }
      }
    } catch (error) {
      console.error("Error checking member status:", error);
    }
  }, []);

  /* ===============================
      SCROLL LOGIC
  ================================ */
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

  const features = [
    { title: "WTI & Brent Tracking",  desc: "Monitor global crude oil benchmarks in real-time." },
    { title: "Refinery Margin",        desc: "Track GRM changes and refining profitability instantly." },
    { title: "Oil Fund Analysis",      desc: "Understand government oil stabilization mechanisms." },
    { title: "Energy Macro Signals",   desc: "Macro-driven energy market trend detection." },
    { title: "Gas & LNG Insights",     desc: "Natural gas movement and global supply chain flow." },
    { title: "Institutional Flow",     desc: "Follow capital rotation in energy sector." },
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
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
        4 Main Features
      </h2>
      <div className="relative group" onMouseEnter={() => { isPaused.current = true; }} onMouseLeave={() => { isPaused.current = false; }}>
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20
                      w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white
                      hover:bg-cyan-500 hover:border-cyan-400 hover:text-white
                      hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
                      flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95
                      ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
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
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20
                      w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white
                      hover:bg-cyan-500 hover:border-cyan-400 hover:text-white
                      hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
                      flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95
                      ${showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  =========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Petroleum Insights
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop relying on crude oil prices alone</p>
          </div>
          <div className="relative group w-full max-w-6xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0e1118] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={900} />
            </div>
          </div>
          {featuresSection}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate("/login")} className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">Sign In</button>
              <button onClick={() => navigate("/member-register")} className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">Join Membership</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 2 : START SCREEN (Member, Not Entered)
  =========================================================== */
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Petroleum Insights
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop relying on crude oil prices alone</p>
          </div>
          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0e1118] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={900} />
            </div>
          </div>
          {featuresSection}
          <div className="text-center w-full max-w-md mx-auto mt-4">
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
      </div>
    );
  }

  /* ==========================================================
      CASE 3 : FULL PRODUCTION PETROLEUM DASHBOARD
  =========================================================== */
  if (isMember && enteredTool) {
    const sharedChartProps = { globalHoverIndex, setGlobalHoverIndex, chartRefs, symbolProp: symbol, oilTypeProp: oilType };

    return (
      <div className="w-full min-h-screen bg-[#0c111b] text-white px-6 py-6">
        <style>{`
          @keyframes symbolBounce {
            0%   { transform: scale(1); }
            30%  { transform: scale(1.04); }
            50%  { transform: scale(0.98); }
            70%  { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          .symbol-bounce { animation: symbolBounce 1.8s ease-in-out infinite; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="max-w-[1600px] mx-auto">

          {/* TOP CONTROL BAR */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">

              <div className="relative w-56">
                <div className={`relative bg-[#111827] border border-slate-700 rounded-md px-4 py-3 flex items-center ${!symbol && !symbolQuery ? "symbol-bounce" : ""}`}>
                  <input
                    value={symbolQuery}
                    onChange={(e) => { setSymbolQuery(e.target.value); setShowSymbolDropdown(true); setSymbol(""); }}
                    onFocus={() => setShowSymbolDropdown(true)}
                    placeholder=""
                    className="w-full bg-transparent outline-none text-white text-sm"
                  />
                  <div className="flex items-center gap-2">
                    {(symbol || symbolQuery) && (
                      <button onClick={() => { setSymbol(""); setSymbolQuery(""); }} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
                    )}
                    <span onClick={() => setShowSymbolDropdown(!showSymbolDropdown)} className="text-slate-400 text-xs ml-2 cursor-pointer">▾</span>
                  </div>
                </div>
                <label className={`absolute left-4 px-2 transition-all duration-200 pointer-events-none ${symbol || symbolQuery || showSymbolDropdown ? "-top-2 text-xs bg-[#0c111b]" : "top-1/2 -translate-y-1/2 text-sm"}`}>
                  Type a Symbol...
                </label>
                {showSymbolDropdown && (
                  <div className="absolute mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50">
                    {filteredSymbols.length > 0
                      ? filteredSymbols.map((item, index) => (
                          <div key={index} onClick={() => { setSymbol(item); setSymbolQuery(item); setShowSymbolDropdown(false); }}
                            className="px-4 py-2 text-sm text-slate-300 hover:bg-cyan-500 hover:text-white cursor-pointer transition">
                            {item}
                          </div>
                        ))
                      : <div className="px-4 py-2 text-sm text-slate-500">No results</div>
                    }
                  </div>
                )}
              </div>

              <select
                value={oilType}
                onChange={(e) => setOilType(e.target.value)}
                className="bg-[#111827] border border-slate-700 px-4 py-3 rounded-md text-sm text-white outline-none focus:border-cyan-400 w-64"
              >
                <option value="">Select oil type</option>
                <option>GASOHOL95 E10</option>
                <option>GASOHOL91</option>
                <option>GASOHOL95 E20</option>
                <option>GASOHOL95 E85</option>
                <option>H-DIESEL</option>
                <option>FO 600 (1) 2%S</option>
                <option>FO 1500 (2) 2%S</option>
                <option>LPG</option>
                <option>ULG95</option>
              </select>
            </div>

            <div className="flex gap-2">
              {["3M","6M","1Y","YTD","MAX"].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border ${period === p ? "bg-[#1f2937] border-cyan-400 text-cyan-400" : "border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-400"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN GRID — Shows Skeletons if inputs are missing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* TOP-LEFT */}
            {symbol
              ? <ClosePriceBig globalHoverIndex={globalHoverIndex} symbolProp={symbol} oilTypeProp={oilType || "GASOHOL95 E10"} />
              : <SkeletonBig />
            }

            {/* EX-REFIN */}
            {(symbol && oilType)
              ? <PremiumChart title="EX-REFIN" dataKey="ExRefin" isStep={false} color="#22c55e" chartId="exrefin" {...sharedChartProps} />
              : <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5">
                  <div className="h-2 rounded-full bg-slate-800 w-24 mb-4" />
                  <div className="relative w-full h-[220px] bg-[#0f172a] rounded-xl overflow-hidden"><WaveSkeleton delay={0} /></div>
                </div>
            }

            {/* Marketing Margin */}
            {(symbol && oilType)
              ? <PremiumChart title="Marketing Margin" dataKey="MktMargin" isStep={false} color="#22c55e" chartId="mktmargin" {...sharedChartProps} />
              : <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5">
                  <div className="h-2 rounded-full bg-slate-800 w-24 mb-4" />
                  <div className="relative w-full h-[220px] bg-[#0f172a] rounded-xl overflow-hidden"><WaveSkeleton delay={0.15} /></div>
                </div>
            }

            {/* Oil Fund */}
            {(symbol && oilType)
              ? <PremiumChart title="Oil Fund" dataKey="OilFund" isStep={true} color="#22c55e" chartId="oilfund" {...sharedChartProps} />
              : <div className="bg-[#111827] border border-slate-700 rounded-2xl p-5">
                  <div className="h-2 rounded-full bg-slate-800 w-24 mb-4" />
                  <div className="relative w-full h-[220px] bg-[#0f172a] rounded-xl overflow-hidden"><WaveSkeleton delay={0.3} /></div>
                </div>
            }

          </div>
        </div>
      </div>
    );
  }

  return null;
}