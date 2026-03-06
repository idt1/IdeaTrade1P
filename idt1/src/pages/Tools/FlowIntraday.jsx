// src/pages/tools/FlowIntraday.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

import FlowIntradayDashboard from "./components/FlowIntradayDashboard.jsx";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// ============================================================
// CHART CONSTANTS & HELPERS
// ============================================================
const CHART_CONFIG = {
  paddingLeft: 10,
  paddingRight: 45,
  paddingTop: 15,
  paddingBottom: 20,
  pointGap: 25,
  minWidth: 400,
};

// สร้าง Label เวลาสำหรับ Intraday (เช่น 10:00, 10:05, ...)
const LABELS = Array.from({ length: 150 }, (_, i) => {
  const totalMinutes = 10 * 60 + i * 5; // เริ่ม 10:00
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateIntradaySeries(symbol, points = 80) {
  if (!symbol) return [];
  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = createRng(seed);
  const values = [];
  let price = 100 + rng() * 50;

  for (let i = 0; i < points; i++) {
    const shock = (rng() - 0.48) * 3;
    price = Math.max(10, Math.min(300, price + shock));
    values.push(parseFloat(price.toFixed(2)));
  }
  return values;
}

function calcYScale(data) {
  if (!data || data.length === 0) return { max: 100, min: 0 };
  const rawMax = Math.max(...data);
  const rawMin = Math.min(...data);
  const range = rawMax - rawMin || 1;
  return { max: rawMax + range * 0.15, min: rawMin - range * 0.15 };
}

function makeNormalizeY(height, paddingTop, paddingBottom, { max, min }) {
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

/* ==========================================================
   DYNAMIC INTERACTIVE CHART COMPONENT (For Grid & Fullscreen)
========================================================== */
function InteractiveGridChart({ symbol, height = 180, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs }) {
  const data = useMemo(() => generateIntradaySeries(symbol, 80), [symbol]);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  // 🔥 สำคัญ: ย้าย useEffect ทั้งหมดขึ้นมาไว้ก่อนคำสั่ง return เพื่อกัน React Hook Crash! 🔥
  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs, data]); // ผูกตัวแปร data ด้วย ให้กราฟเลื่อนขวาสุดเมื่อโหลดเสร็จ

  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-sm font-semibold flex items-center justify-center h-full">Select Symbol to View Chart</div>;
  }

  const yScale = calcYScale(data);
  const normalizeY = makeNormalizeY(height, CHART_CONFIG.paddingTop, CHART_CONFIG.paddingBottom, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, minWidth } = CHART_CONFIG;
  const chartWidth = Math.max(minWidth, paddingLeft + paddingRight + (data.length - 1) * pointGap);

  const linePath = buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const lastX = paddingLeft + (data.length - 1) * pointGap;
  const areaId = `area-${chartId}`;

  const lastPt = data[data.length - 1];
  const firstPt = data[0];
  const isUp = lastPt >= firstPt;
  const color = isUp ? "#22c55e" : "#ef4444";

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
    <div className="relative w-full h-full bg-[#0b1220] overflow-hidden">
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
          {/* Grid Lines */}
          {[...Array(4)].map((_, i) => {
            const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 3;
            return <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e293b" strokeWidth="1" />;
          })}
          <line x1={0} y1={height - paddingBottom} x2={chartWidth} y2={height - paddingBottom} stroke="#334155" strokeWidth="1.5" />

          {/* X Axis Labels */}
          {data.map((_, i) => (
            <text key={i} x={paddingLeft + i * pointGap} y={height - paddingBottom + 14} fill="#64748b" fontSize="8" textAnchor="middle">
              {LABELS[i % LABELS.length]}
            </text>
          ))}

          {/* Area Gradient */}
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${linePath} L ${lastX},${height - paddingBottom} L ${paddingLeft},${height - paddingBottom} Z`}
            fill={`url(#${areaId})`}
          />

          {/* Line Path */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Last Point Dot */}
          {!isHovering && (
            <circle cx={lastX} cy={normalizeY(lastPt)} r="3" fill={color} stroke="#0b1220" strokeWidth="1.5" />
          )}

          {/* Hover Crosshair & Values */}
          {isHovering && (
            <g>
              <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={height - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverX} cy={normalizeY(data[globalHoverIndex])} r="3.5" fill={color} stroke="#0b1220" strokeWidth="1.5" />
              <text x={hoverX} y={normalizeY(data[globalHoverIndex]) - 8} fill={color} fontSize="10" fontWeight="700" textAnchor="middle">
                {data[globalHoverIndex].toFixed(2)}
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {isHovering && (
          <div
            className="absolute top-2 z-50 flex flex-col items-center min-w-[50px] bg-[#1e293b] border border-slate-600 rounded p-1 shadow-lg pointer-events-none transition-transform duration-75"
            style={{
              left: `${hoverX}px`,
              transform: globalHoverIndex > data.length - 5 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <span className="text-[9px] text-slate-400 font-medium">{LABELS[globalHoverIndex % LABELS.length]}</span>
            <span className="text-white text-[11px] font-bold">{data[globalHoverIndex].toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Bottom Fade */}
      <div className="absolute inset-y-0 left-0 right-[45px] bg-gradient-to-t from-[#0b1220]/90 via-transparent to-transparent pointer-events-none" style={{ top: "70%" }} />

      {/* Right Axis Panel */}
      <div className="absolute right-0 top-0 w-[45px] h-full pointer-events-none bg-[#0b1220] z-10 border-l border-slate-800/50">
        <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
          {[...Array(4)].map((_, i) => {
            const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 3;
            const value = yScale.max - (i * (yScale.max - yScale.min)) / 3;
            return <text key={i} x="38" y={y} fill="#64748b" fontSize="9" textAnchor="end" dominantBaseline="central">{value.toFixed(1)}</text>;
          })}

          {/* Current Value Badge */}
          <g transform={`translate(4, ${normalizeY(lastPt)})`}>
            <rect x="0" y="-8" width="36" height="16" fill={color} rx="3" />
            <text x="18" y="0" fill="#ffffff" fontSize="9" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
              {lastPt.toFixed(1)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */
export default function FlowIntraday() {

  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  const [layout, setLayout] = useState("4");
  const [symbols, setSymbols] = useState(Array(12).fill(""));
  const [fullscreenIndex, setFullscreenIndex] = useState(null);

  const boxes = Array.from({ length: 12 });

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  // Shared Hover State for Syncing Grid Charts
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const { accessData, isFreeAccess } = useSubscription();

  /* ===============================  MEMBER CHECK  ================================ */
  useEffect(() => {
    // 1. ถ้าเป็นโหมดทดลอง (Free Access) ให้สิทธิ์ใช้งานทันที
    if (isFreeAccess) {
      setIsMember(true);
      return;
    }

    // 2. ⚠️ แก้คำว่า 'ชื่อแพ็กเกจ' ตรงนี้ ให้ตรงกับเครื่องมือของหน้านั้นๆ (เช่น 'gold')
    const toolId = 'flow'; 

    // 3. เช็คสิทธิ์จาก Firebase
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

      // เช็คว่าหมดอายุหรือยัง
      if (expireDate.getTime() > new Date().getTime()) {
        setIsMember(true); // ยังไม่หมดอายุ
      } else {
        setIsMember(false); // หมดอายุแล้ว
      }
    } else {
      setIsMember(false); // ไม่มีแพ็กเกจนี้
    }
  }, [accessData, isFreeAccess]);

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setFullscreenIndex(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const features = [
    { title: "Multi-Asset Flow Monitor", desc: "Monitor up to 12 stocks at once in a powerful grid layout." },
    { title: "Smart Flow Alerts", desc: "Set custom triggers and receive instant notifications." },
    { title: "Customizable Layout", desc: "Switch layouts and adapt to your trading style." },
  ];

  const handleSymbolChange = (index, value) => {
    const updated = [...symbols];
    updated[index] = value.toUpperCase();
    setSymbols(updated);
  };

  /* ==========================================================
      CASE 1 & 2 : PREVIEW VERSION (Not Member / Not Entered)
  ========================================================== */
  if (!isMember || !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">

        {/* Background Ambience */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Flow Intraday
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Turn your trading screen into an elite surveillance system
            </p>
          </div>

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
              <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden group">
                <div className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
                  <FlowIntradayDashboard />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
              3 Main Features
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
                    className="w-[350px] md:w-[400px] flex-shrink-0 snap-center
                      group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl 
                      hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300"
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

          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!isMember ? (
                <>
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
                </>
              ) : (
                <button
                  onClick={() => setEnteredTool(true)}
                  className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
                >
                  <span className="mr-2">Start Using Tool</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 3 : FULL PRODUCTION DASHBOARD
  ========================================================== */
  return (
    <div className="w-full min-h-screen bg-[#0b111a] text-white px-6 py-6">
      <div className="max-w-[1600px] mx-auto">

        {/* --- Top Controls --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEnteredTool(false)}
              className="text-slate-400 hover:text-white"
            >
              ←
            </button>
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-700 px-4 py-2 rounded-lg">
              <span className="text-sm text-slate-400">Select Layout :</span>
              <div className="flex gap-2">
                {["4", "3", "2"].map((col) => (
                  <button
                    key={col}
                    onClick={() => setLayout(col)}
                    className={`w-7 h-7 rounded text-xs flex items-center justify-center transition
                      ${layout === col ? "bg-purple-600 text-white" : "bg-[#1f2937] text-slate-400 hover:text-white"}`}
                  >
                    {col === "4" ? "▦" : col === "3" ? "▤" : "☰"}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm text-slate-400">
              <span>Price</span>
              <div className="w-8 h-[2px] bg-white"></div>
              <span>Value</span>
              <div className="flex gap-1">
                <div className="w-3 h-[2px] bg-green-400"></div>
                <div className="w-3 h-[2px] bg-red-400"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-[#111827] border border-slate-700 px-4 py-2 rounded-lg text-sm outline-none">
              <option>Favorites</option>
              <option>SET50</option>
              <option>Energy</option>
            </select>
            <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition">
              ♥ ADD
            </button>
          </div>
        </div>

        {/* --- Grid Layout --- */}
        <div
          className={`grid gap-5 transition-all duration-300
            ${layout === "4" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : layout === "3" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2"}`}
        >
          {boxes.map((_, index) => (
            <div
              key={index}
              className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition flex flex-col"
            >
              {/* Box Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-slate-700">
                <select
                  value={symbols[index]}
                  onChange={(e) => handleSymbolChange(index, e.target.value)}
                  className="bg-transparent text-xs text-slate-400 outline-none font-bold hover:text-white transition"
                >
                  <option value="" className="text-slate-500 font-normal">Symbol...</option>
                  <option value="PTT" className="text-white">PTT</option>
                  <option value="TOP" className="text-white">TOP</option>
                  <option value="DELTA" className="text-white">DELTA</option>
                  <option value="AOT" className="text-white">AOT</option>
                  <option value="ADVANC" className="text-white">ADVANC</option>
                </select>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <select className="bg-[#1f2937] px-2 py-0.5 rounded text-xs outline-none cursor-pointer">
                    <option>Flow</option>
                    <option>Price</option>
                  </select>
                  <span className="cursor-pointer hover:text-white transition">🔔</span>
                  {symbols[index] && (
                    <ZoomInIcon
                      onClick={() => setFullscreenIndex(index)}
                      sx={{
                        fontSize: 18, color: "#94a3b8", cursor: "pointer", transition: "all 0.2s ease",
                        "&:hover": { color: "#ffffff", transform: "scale(1.1)" }
                      }}
                    />
                  )}
                  <span className="cursor-pointer hover:text-white transition">🔄</span>
                </div>
              </div>

              {/* Chart Component */}
              <div className="h-[180px]">
                <InteractiveGridChart
                  symbol={symbols[index]}
                  height={180}
                  chartId={`grid-chart-${index}`}
                  globalHoverIndex={globalHoverIndex}
                  setGlobalHoverIndex={setGlobalHoverIndex}
                  chartRefs={chartRefs}
                />
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* --- Fullscreen Modal --- */}
      {fullscreenIndex !== null && symbols[fullscreenIndex] && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-[#0f172a]">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              {symbols[fullscreenIndex]} <span className="text-slate-400 font-normal text-sm ml-2">Fullscreen View</span>
            </h2>
            <button onClick={() => setFullscreenIndex(null)} className="text-slate-400 hover:text-white text-2xl transition">✕</button>
          </div>
          <div className="flex-1 p-6 bg-[#0b1220]">
            <InteractiveGridChart
              symbol={symbols[fullscreenIndex]}
              height={window.innerHeight - 150} // คำนวณความสูงให้เต็มจอ
              chartId="fullscreen-chart"
              globalHoverIndex={globalHoverIndex}
              setGlobalHoverIndex={setGlobalHoverIndex}
              chartRefs={chartRefs}
            />
          </div>
        </div>
      )}
    </div>
  );
}