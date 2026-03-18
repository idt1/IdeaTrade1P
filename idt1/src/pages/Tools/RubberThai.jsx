// src/pages/tools/RubberThai.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

import RubberThaiDashboard from "./components/RubberThaiDashboard.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// ============================================================
// CHART CONSTANTS & HELPERS
// ============================================================
const CHART_CONFIG = {
  paddingLeft: 15,
  paddingRight: 60,
  paddingTop: 15,
  paddingBottom: 25,
};

// เพิ่มจำนวน Label เพื่อรองรับการซูมออกและเลื่อนดูข้อมูลเยอะๆ
const LABELS = Array.from({ length: 400 }, (_, i) => {
  const d = new Date("2024-01-01");
  d.setDate(d.getDate() + i * 3);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
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

function generateRawSeries({ seed = 1, points = 60, trend = 0 } = {}) {
  const rng = createRng(seed);
  const values = [];
  let price = 50 + rng() * 20;

  for (let i = 0; i < points; i++) {
    const shock = (rng() - 0.48) * 6;
    const trendNudge = trend * (rng() * 0.5);
    price = Math.max(10, Math.min(150, price + shock + trendNudge));
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

/* ==========================================================
   DYNAMIC CHART COMPONENT (NEW STYLE)
========================================================== */

function DynamicChart({ title, height = 240, color, gradientId, seed, points = 70, className = "", chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs, pointGap, handleZoom }) {
  
  const [data, setData] = useState(() => generateRawSeries({ seed, points }));

  useEffect(() => {
    setData(generateRawSeries({ seed, points }));
  }, [seed, points]);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  // Event ดักจับ Mouse Wheel เพื่อซูมกราฟ
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault(); // ป้องกันการ Scroll หน้าจอขึ้นลง
      handleZoom(e.deltaY, e.clientX, el);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  // Sync scroll ตอนเปิดครั้งแรก
  useEffect(() => {
    if (!scrollRef.current || !data || data.length === 0) return;
    const currentRef = scrollRef.current;
    chartRefs.current[chartId] = currentRef;

    const siblings = Object.values(chartRefs.current).filter(node => node && node !== currentRef);
    if (siblings.length > 0) {
      currentRef.scrollLeft = siblings[0].scrollLeft;
    } else {
      currentRef.scrollLeft = currentRef.scrollWidth;
    }

    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs, data]);

  const config = { ...CHART_CONFIG, height };
  const yScale = calcYScale(data);
  const normalizeY = makeNormalizeY(config, yScale);

  const { paddingLeft, paddingRight, paddingTop, paddingBottom } = config;
  const chartWidth = paddingLeft + paddingRight + (data.length - 1) * pointGap;

  const linePath = buildCurvePath(data, normalizeY, paddingLeft, pointGap);
  const lastX = paddingLeft + (data.length - 1) * pointGap;
  const areaId = `area-${gradientId}-${chartId}`;

  const lastPt = data[data.length - 1];
  const firstPt = data[0];
  const diff = lastPt - firstPt;
  const pct = firstPt ? ((diff / firstPt) * 100).toFixed(2) : "0.00";
  const isUp = diff >= 0;

  const syncScroll = (sourceEl) => {
    Object.values(chartRefs.current).forEach((node) => {
      if (node && node !== sourceEl) {
        if (Math.abs(node.scrollLeft - sourceEl.scrollLeft) > 1) {
          node.scrollLeft = sourceEl.scrollLeft;
        }
      }
    });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragScrollLeft(scrollRef.current.scrollLeft);
    setGlobalHoverIndex(null);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const dx = e.clientX - dragStartX;
      scrollRef.current.scrollLeft = dragScrollLeft - dx; // ปรับความเร็ว 1:1 กับเมาส์
      syncScroll(scrollRef.current);
      setGlobalHoverIndex(null);
      return;
    }
    const mouseX = e.clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft;
    const index = Math.max(0, Math.min(Math.round((mouseX - paddingLeft) / pointGap), data.length - 1));
    setGlobalHoverIndex(index);
  };

  const isHovering = globalHoverIndex !== null && !isDragging && globalHoverIndex < data.length;
  const hoverX = isHovering ? paddingLeft + globalHoverIndex * pointGap : null;
  const hoverY = isHovering ? normalizeY(data[globalHoverIndex]) : null;

  return (
    <div className={`bg-[#111827] border border-slate-700 rounded-xl flex flex-col overflow-hidden ${className}`}>
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a] shrink-0">
        <p className="text-sm text-slate-300 font-bold uppercase tracking-wide">{title}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color }}>
            {lastPt.toFixed(2)}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isUp ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(diff).toFixed(2)} ({isUp ? "+" : ""}{pct}%)
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full flex-1 bg-[#0f172a]" style={{ height: height - 60 }}>
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
          <svg width={Math.max(window.innerWidth, chartWidth)} height={height - 60} className="overflow-visible pointer-events-none">
            {/* Grid */}
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * ((height - 60) - paddingTop - paddingBottom)) / 4;
              return <line key={i} x1={0} y1={y} x2={Math.max(window.innerWidth, chartWidth)} y2={y} stroke="#1e293b" strokeWidth="1" />;
            })}
            <line x1={0} y1={(height - 60) - paddingBottom} x2={Math.max(window.innerWidth, chartWidth)} y2={(height - 60) - paddingBottom} stroke="#334155" strokeWidth="1.5" />

            {/* Labels Base (คำนวณระยะห่างอัตโนมัติตามระดับการซูม) */}
            {data.map((_, i) => {
              const labelInterval = Math.max(1, Math.ceil(80 / pointGap));
              if (i % labelInterval !== 0) return null;
              return (
                <g key={i}>
                  <line x1={paddingLeft + i * pointGap} y1={(height - 60) - paddingBottom} x2={paddingLeft + i * pointGap} y2={(height - 60) - paddingBottom + 5} stroke="#334155" strokeWidth="1" />
                  <text x={paddingLeft + i * pointGap} y={(height - 60) - paddingBottom + 18} fill="#64748b" fontSize="10" textAnchor="middle">
                    {LABELS[i % LABELS.length]}
                  </text>
                </g>
              );
            })}

            {/* Area */}
            <defs>
              <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${linePath} L ${lastX},${(height - 60) - paddingBottom} L ${paddingLeft},${(height - 60) - paddingBottom} Z`}
              fill={`url(#${areaId})`}
            />

            {/* Line */}
            <path 
              d={linePath} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />

            {/* Last Point Dot */}
            {!isHovering && (
               <circle cx={lastX} cy={normalizeY(lastPt)} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
            )}

            {/* Hover Crosshair (TradingView Style) */}
            {isHovering && (
              <g>
                <line x1={hoverX} y1={paddingTop} x2={hoverX} y2={(height - 60) - paddingBottom} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={0} y1={hoverY} x2={Math.max(window.innerWidth, chartWidth)} y2={hoverY} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx={hoverX} cy={hoverY} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />

                {/* X-Axis Date Badge */}
                <g transform={`translate(${hoverX}, ${(height - 60) - paddingBottom + 12})`}>
                  <rect x="-30" y="-8" width="60" height="18" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="4" />
                  <text x="0" y="1" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {LABELS[globalHoverIndex % LABELS.length]}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Bottom Fade Overlay */}
        <div className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none" style={{ top: "75%" }} />

        {/* Right Axis Panel */}
        <div className="absolute right-0 top-0 w-[55px] h-full pointer-events-none bg-[#0f172a] z-10 border-l border-slate-800/50">
          <svg className="w-full h-full absolute right-0 top-0 overflow-visible pointer-events-none">
            {/* Y-Axis Grid Values */}
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + (i * ((height - 60) - paddingTop - paddingBottom)) / 4;
              const value = yScale.max - (i * (yScale.max - yScale.min)) / 4;
              return <text key={i} x="48" y={y} fill="#64748b" fontSize="10" textAnchor="end" dominantBaseline="central">{value.toFixed(2)}</text>;
            })}

            {/* Current Last Value Badge */}
            {(() => {
              const badgeY = normalizeY(lastPt);
              return (
                <g transform={`translate(6, ${badgeY})`}>
                  <rect x="0" y="-10" width="42" height="20" fill={color} rx="4" />
                  <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {lastPt.toFixed(2)}
                  </text>
                </g>
              );
            })()}

            {/* Hover Y-Axis Value Badge */}
            {isHovering && (
              <g transform={`translate(6, ${hoverY})`}>
                <rect x="0" y="-10" width="42" height="20" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="4" />
                <text x="21" y="0" fill="#ffffff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                  {data[globalHoverIndex].toFixed(2)}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton({ title, height = 240 }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a] shrink-0">
        <p className="text-sm text-slate-300 font-bold uppercase tracking-wide">{title}</p>
        <div className="flex items-center gap-3">
          <div className="h-5 w-14 rounded bg-slate-700 animate-pulse" />
          <div className="h-5 w-24 rounded bg-slate-700 animate-pulse" />
        </div>
      </div>

      <div
        className="relative w-full flex-1 bg-[#0f172a] overflow-hidden"
        style={{ height: height - 60 }}
      >
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {[...Array(5)].map((_, i) => {
            const y = 15 + (i * ((height - 60) - 15 - 25)) / 4;
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
              animation: "shimmer 1.8s ease-in-out infinite",
            }}
          />
        </div>

        <style>{`
          @keyframes shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </div>
  );
}

function EmptyChartCard({ title, height = 240, message = "Please select symbol" }) {
  const bodyHeight = height - 60;

  return (
    <div
      className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden"
      style={{ height }}
    >
      <div className="h-[60px] px-5 py-4 border-b border-slate-700/50 flex items-center justify-between bg-[#0f172a]">
        <p className="text-sm text-slate-300 font-bold uppercase tracking-wide">{title}</p>
      </div>

      <div
        className="relative w-full bg-[#0f172a]"
        style={{ height: bodyHeight }}
      >
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {[...Array(5)].map((_, i) => {
            const y = 15 + (i * (bodyHeight - 15 - 25)) / 4;
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}

          <line
            x1="0"
            y1={bodyHeight - 25}
            x2="100%"
            y2={bodyHeight - 25}
            stroke="#334155"
            strokeWidth="1.5"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-lg font-semibold text-center px-4">
            {message}
          </span>
        </div>

        <div
          className="absolute inset-y-0 left-0 right-[55px] bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent pointer-events-none"
          style={{ top: "75%" }}
        />

        <div className="absolute right-0 top-0 w-[55px] h-full bg-[#0f172a] border-l border-slate-800/50" />
      </div>
    </div>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function RubberThai() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const chartContainerRef = useRef(null); // Ref สำหรับดึงความสูงพื้นที่ว่างทั้งหมด

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbol, setSymbol] = useState("");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  // ================= ระบบ Zoom (คำนวณหา pointGap) =================
  const [pointGap, setPointGap] = useState(40);
  const handleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setPointGap(prev => {
      const zoomOut = deltaY > 0;
      const scaleMultiplier = zoomOut ? 0.9 : 1.1; // ความเร็วในการซูม
      let newGap = prev * scaleMultiplier;
      newGap = Math.max(5, Math.min(150, newGap)); // ลิมิตซูมเข้าสุด-ออกสุด
      
      if (newGap === prev) return prev;
      
      // คำนวณให้ซูมเข้าหาตำแหน่งที่เมาส์ชี้อยู่
      if (scrollEl) {
        const rect = scrollEl.getBoundingClientRect();
        const cursorX = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio = newGap / prev;
        const newContentX = contentX * ratio;
        
        requestAnimationFrame(() => {
          scrollEl.scrollLeft = newContentX - cursorX;
        });
      }
      return newGap;
    });
  }, []);

  const { accessData, isFreeAccess, currentUser } = useSubscription();

  // ================= คำนวณความสูงให้เต็มจอแบบ 100% =================
  const [chartHeight, setChartHeight] = useState(240);

  useEffect(() => {
    const calculateHeight = () => {
      if (chartContainerRef.current) {
        // ดึงความสูงทั้งหมดของกล่องใส่กราฟ แล้วหาร 2 หักระยะเว้นช่องว่าง (gap) ออก
        const containerHeight = chartContainerRef.current.clientHeight;
        setChartHeight(Math.max(150, (containerHeight - 24) / 2)); 
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    setTimeout(calculateHeight, 100); // ดีเลย์เล็กน้อยเพื่อให้ UI เรนเดอร์เสร็จ
    return () => window.removeEventListener("resize", calculateHeight);
  }, [enteredTool]);

  const symbolList = ["STA", "NER", "TRUBB", "STGT", "24CS", "CMAN", "TEGH"];

  const filteredSymbols = symbolList.filter(s =>
    s.toLowerCase().includes(symbolQuery.toLowerCase())
  );

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  /* ===============================  MEMBER CHECK  ================================ */
  useEffect(() => {
    // 1. ถ้าเป็นโหมดทดลอง (Free Access) ให้สิทธิ์ใช้งานทันที
    if (isFreeAccess) {
      setIsMember(true);
      return;
    }

    // 2. ⚠️ แก้คำว่า 'ชื่อแพ็กเกจ' ตรงนี้ ให้ตรงกับเครื่องมือของหน้านั้นๆ (เช่น 'gold')
    const toolId = 'rubber'; 

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

  const features = [
    { title: "Stock vs Commodity Correlation", desc: "Compare stock performance against global rubber prices." },
    { title: "Cycle Identification", desc: "Map rubber supercycle stages clearly." },
    { title: "Leading Indicator Analysis", desc: "Forecast earnings using commodity trends." },
    { title: "Divergence Detection", desc: "Detect mispricing before correction." },
  ];

  const chartSeed = symbol
    ? symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 42;

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
    <div ref={outerRef} className="w-full bg-[#080c12]" style={{ overflow: "hidden", position: "relative" }}>
      <div ref={innerRef} style={{ width: dashboardWidth, height: dashboardHeight, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <RubberThaiDashboard />
      </div>
    </div>
  );
  }

  /* ==========================================================
      SHARED JSX — Features Scroll & Preview Section
  ========================================================== */
  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
      
      <div 
        className="relative group"
        onMouseEnter={() => (isPaused.current = true)}
        onMouseLeave={() => (isPaused.current = false)}
      >
        <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} aria-label="Scroll Left">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
          {features.map((item, index) => (
            <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 snap-center group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} aria-label="Scroll Right">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const dashboardPreviewJSX = (
    <div className="relative group w-full max-w-5xl mb-16">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60"></div>
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>
        <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={780} />
      </div>
    </div>
  );

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  =========================================================== */
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
                Rubber Thai
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop trading in the dark</p>
          </div>

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

          {/* CTA Buttons */}
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
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                Rubber Thai
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop trading in the dark</p>
          </div>

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

          {/* CTA Button */}
          <div className="text-center w-full max-w-md mx-auto mt-4">
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

  /* ==========================================================
      CASE 3 : FULL DASHBOARD
  ========================================================== */
  return (
    // เปลี่ยน Wrapper นอกสุดให้ความสูงเท่ากับหน้าจอ 100vh และตัดส่วนที่เกินออก
    <div className="w-full h-screen overflow-hidden bg-[#0b111a] text-white px-6 py-6 flex flex-col">
      <div className="w-full mx-auto flex-1 flex flex-col min-h-0">

        {/* ================= TOP SEARCH BAR ================= */}
        <div className="relative flex items-center justify-between mb-6 shrink-0">
          <div className="relative w-64">
            <div className="relative bg-[#111827] border border-slate-700 rounded-md px-4 py-3 flex items-center">
              <input
                value={symbolQuery}
                onChange={(e) => {
                  setSymbolQuery(e.target.value);
                  setShowSymbolDropdown(true);
                  setSymbol("");
                }}
                onFocus={() => setShowSymbolDropdown(true)}
                placeholder="Type a Symbol..."
                className="w-full bg-transparent outline-none text-white text-sm placeholder:text-slate-600"
              />
              <div className="flex items-center gap-2">
                {(symbol || symbolQuery) && (
                  <button
                    onClick={() => {
                      if (refreshing) return;

                      setShowSymbolDropdown(false);
                      setGlobalHoverIndex(null);
                      setRefreshing(true);

                      setTimeout(() => {
                        setSymbol("");
                        setSymbolQuery("");
                        setRefreshing(false);
                      }, 700);
                    }}
                    className={`text-xs ml-2 ${
                      refreshing
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ✕
                  </button>
                )}
                <span onClick={() => setShowSymbolDropdown(!showSymbolDropdown)} className="text-slate-400 text-xs ml-2 cursor-pointer">▾</span>
              </div>
            </div>

            {showSymbolDropdown && (
              <div className="absolute mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50">
                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => {
                      if (refreshing) return;

                      setSymbolQuery(item);
                      setShowSymbolDropdown(false);
                      setRefreshing(true);
                      setGlobalHoverIndex(null);

                      setTimeout(() => {
                        setSymbol(item);
                        setRefreshing(false);
                      }, 700);
                    }}
                      className={`px-4 py-2 text-sm transition ${
                      refreshing
                        ? "text-slate-500 cursor-not-allowed"
                        : "text-slate-300 hover:bg-cyan-500 hover:text-white cursor-pointer"
                    }`}
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-slate-500">No results</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= DYNAMIC CHARTS ================= */}
       <div className="flex-1 grid grid-cols-1 gap-6 min-h-0" ref={chartContainerRef}>
        {refreshing ? (
          <>
            <ChartSkeleton
              title={`CLOSE (${symbolQuery || symbol})`}
              height={chartHeight}
            />
            <ChartSkeleton
              title="Rubber Thai Price"
              height={chartHeight}
            />
          </>
        ) : (
          <>
            {symbol ? (
              <DynamicChart
                chartId="chart-close"
                key={`top-${symbol}`}
                title={`CLOSE (${symbol})`}
                height={chartHeight}
                color="#22c55e"
                gradientId="greenArea"
                seed={chartSeed + 1}
                points={300}
                globalHoverIndex={globalHoverIndex}
                setGlobalHoverIndex={setGlobalHoverIndex}
                chartRefs={chartRefs}
                pointGap={pointGap}
                handleZoom={handleZoom}
              />
            ) : (
              <EmptyChartCard
                title="CLOSE"
                height={chartHeight}
                message="Please select symbol"
              />
            )}

            <DynamicChart
              chartId="chart-rubber"
              key={`bot-${symbol}`}
              title="Rubber Thai Price"
              height={chartHeight}
              color="#facc15"
              gradientId="yellowArea"
              seed={chartSeed + 97}
              points={300}
              globalHoverIndex={globalHoverIndex}
              setGlobalHoverIndex={setGlobalHoverIndex}
              chartRefs={chartRefs}
              pointGap={pointGap}
              handleZoom={handleZoom}
            />
          </>
        )}
      </div>

      </div>
    </div>
  );
}