import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  createChart, ColorType, CrosshairMode,
  LineSeries, LineStyle,
} from "lightweight-charts";
import RefreshIcon from "@mui/icons-material/Refresh";
import ToolHint from "@/components/ToolHint.jsx";
import S50Dashboard from "./components/S50Dashboard.jsx";

// ─── Scaled preview ───────────────────────────────────────────────────────────
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
    <div ref={outerRef} style={{ width:"100%", overflow:"hidden", position:"relative", background:"#0B1221" }}>
      <div ref={innerRef} style={{ width:dashboardWidth, height:dashboardHeight, transformOrigin:"top left", position:"absolute", top:0, left:0 }}>
        <S50Dashboard />
      </div>
    </div>
  );
}

// ─── LWC theme ────────────────────────────────────────────────────────────────
const LWC_THEME = {
  layout: {
    background: { type: ColorType.Solid, color: "#0f172a" },
    textColor: "#475569",
    fontSize: 10,
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: "rgba(255,255,255,0.03)" },
    horzLines: { color: "rgba(255,255,255,0.04)" },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: "#475569", labelBackgroundColor: "#0d1526" },
    horzLine: { color: "#475569", labelBackgroundColor: "#0d1526" },
  },
  rightPriceScale: { borderColor: "rgba(255,255,255,0.06)", textColor: "#475569" },
  timeScale: {
    borderColor: "rgba(255,255,255,0.06)",
    textColor: "#475569",
    fixLeftEdge: true,
    fixRightEdge: true,
    timeVisible: true,
    secondsVisible: false,
  },
};

// ─── Deterministic data generator ────────────────────────────────────────────
function generateSeriesData(seed = 1, totalPoints = 1000) {
  const now  = Math.floor(Date.now() / 1000);
  const snap = now - (now % 86400); // daily snaps
  const data = [];
  let value = 850 + seed * 10;
  for (let i = 0; i < totalPoints; i++) {
    const r = Math.sin(i * 0.7 + seed) * 10000;
    value += (r - Math.floor(r)) * 4 - 2;
    data.push({ time: snap - (totalPoints - 1 - i) * 86400, value: parseFloat(value.toFixed(2)) });
  }
  return data;
}

// ─── Skeleton (สมจริงแบบมีแกนราคาและแกนเวลา) ──────────────────────────
function ChartBodySkeleton({ delay = 0 }) {
  return (
    <div className="relative flex-1 bg-[#0f172a] min-h-0 overflow-hidden rounded-b-xl flex flex-col">
      <style>{`
        @keyframes shimmer-s50 { 
          0% { transform: translateX(-100%); } 
          100% { transform: translateX(100%); } 
        }
      `}</style>

      {/* 🟢 ส่วนที่ 1: พื้นที่กราฟหลัก + แกนราคา (Y-Axis) */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* พื้นที่กราฟ (Chart Area) */}
        <div className="flex-1 relative overflow-hidden">
          {/* เส้นตาราง (Grid Lines) */}
          <div className="absolute inset-0 flex flex-col justify-between py-5 opacity-[0.15] pointer-events-none z-0">
            {[...Array(5)].map((_, i) => <div key={`h-${i}`} className="w-full h-px bg-slate-500" />)}
          </div>
          <div className="absolute inset-0 flex justify-between px-10 opacity-[0.15] pointer-events-none z-0">
            {[...Array(6)].map((_, i) => <div key={`v-${i}`} className="h-full w-px bg-slate-500" />)}
          </div>

          {/* SVG กราฟเส้น (Line & Area) */}
          <div className="absolute inset-0 flex items-center justify-center pt-4 opacity-30 z-10">
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path 
                d="M0,80 L10,70 L25,75 L40,40 L55,50 L75,20 L85,35 L100,15" 
                fill="none" 
                stroke="#475569" 
                strokeWidth="1.5" 
                strokeLinejoin="round" 
              />
              <path 
                d="M0,80 L10,70 L25,75 L40,40 L55,50 L75,20 L85,35 L100,15 L100,100 L0,100 Z" 
                fill="url(#gradient-real)" 
                stroke="none" 
              />
              <defs>
                <linearGradient id="gradient-real" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#475569" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* 🟢 แกนราคาด้านขวา (Right Price Scale) */}
        <div className="w-[45px] sm:w-[55px] border-l border-slate-700/50 flex flex-col justify-between items-center py-5 bg-[#0a0f18] z-10 relative">
          {[...Array(5)].map((_, i) => (
            <div key={`y-${i}`} className="h-[6px] sm:h-2 w-6 sm:w-8 bg-slate-700/30 rounded-[2px]" />
          ))}
        </div>
      </div>

      {/* 🟢 ส่วนที่ 2: แกนเวลาด้านล่าง (Bottom Time Scale) */}
      <div className="h-[24px] sm:h-[28px] border-t border-slate-700/50 flex bg-[#0a0f18] z-10 relative shrink-0">
        <div className="flex-1 flex justify-between items-center px-10">
          {[...Array(6)].map((_, i) => (
            <div key={`x-${i}`} className="h-[6px] sm:h-2 w-10 sm:w-14 bg-slate-700/30 rounded-[2px]" />
          ))}
        </div>
        {/* มุมขวาล่าง (Corner Space) ทิ้งว่างไว้เหมือนของ TradingView */}
        <div className="w-[45px] sm:w-[55px] border-l border-slate-700/50" />
      </div>

      {/* 3. Sweeping Shimmer Effect (แสงสแกนวิ่งคลุมทั้งหมด) */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.03) 30%, rgba(6,182,212,0.12) 50%, rgba(6,182,212,0.03) 70%, transparent 100%)",
          animation: "shimmer-s50 1.5s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

// ─── LWC Chart Card ───────────────────────────────────────────────────────────
function ChartCard({
  title, chartId, seed, index, // 🟢 รับ index เพื่อตั้ง delay ให้ skeleton
  onCrosshairMove, externalTime,
  chartInstanceRefs,
  refreshKey, isRefreshing, onRefresh,
  toolHint = null,
}) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const seriesRef     = useRef(null);
  const isSyncingRef  = useRef(false);

  const seriesData = useMemo(() => generateSeriesData(seed, 1000), [seed, refreshKey]);

  // ── Mount chart ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || isRefreshing) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);

    const el    = containerRef.current;
    const chart = createChart(el, {
      ...LWC_THEME,
      handleScroll: true,
      handleScale:  true,
      width:  el.clientWidth,
      height: el.clientHeight,
    });
    chartRef.current = chart;
    if (chartInstanceRefs) chartInstanceRefs.current.set(chartId, chart);

    const isUp   = seriesData.at(-1).value >= seriesData[0].value;
    const color  = isUp ? "#22c55e" : "#ef4444";

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });
    series.setData(seriesData);
    seriesRef.current = series;

    chart.subscribeCrosshairMove(param => {
      if (!isSyncingRef.current && param.time && onCrosshairMove)
        onCrosshairMove(param.time);
    });

    requestAnimationFrame(() => {
      const last = seriesData[seriesData.length - 1].time;
  const from = seriesData[seriesData.length - 200].time;
  chart.timeScale().setVisibleRange({ from, to: last });
});

    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0 && e.contentRect.height > 0)
        chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current   = null;
      seriesRef.current  = null;
      if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, refreshKey, isRefreshing]);

  // ── Sync crosshair ────────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !externalTime) return;
    isSyncingRef.current = true;
    try {
      if (typeof chart.setCrosshairPosition === "function")
        chart.setCrosshairPosition(NaN, externalTime, chart.series?.()?.[0]);
    } catch (_) {}
    isSyncingRef.current = false;
  }, [externalTime]);

  return (
    <div className="relative bg-[#111827] border border-slate-700 rounded-xl flex flex-col h-full min-h-0">
      {toolHint && (
        <div className="absolute -top-3 -left-3 z-20 shadow-lg rounded-full">{toolHint}</div>
      )}

      {/* Header */}
      <div className="px-4 pl-6 py-3 bg-[#0f172a] border-b border-slate-700/50 flex justify-between items-center rounded-t-xl flex-shrink-0">
        <span className="text-sm font-bold text-slate-300">{title}</span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-7 h-7 rounded-md bg-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshIcon sx={{ fontSize: 16, color: "inherit" }} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Chart body */}
      {isRefreshing
        ? <ChartBodySkeleton delay={index * 0.2} /> // 🟢 ใส่ดีเลย์ให้แสงสแกนแต่ละกล่องเหลื่อมกัน
        : <div ref={containerRef} className="flex-1 min-h-0 bg-[#0f172a] rounded-b-xl" />
      }
    </div>
  );
}

// ─── Main S50 ─────────────────────────────────────────────────────────────────
export default function S50() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const { userData, currentUser, loading } = useAuth();

  const [isMember,    setIsMember]    = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft,    setShowLeft]    = useState(false);
  const [showRight,   setShowRight]   = useState(true);

  const [externalTime, setExternalTime] = useState(null);
  const chartInstanceRefs = useRef(new Map());

  const [refreshKey,   setRefreshKey]   = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollDirection = useRef(1);
  const isPaused        = useRef(false);

  // ── Member check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const toolId = "s50";
    if (userData?.subscriptions?.[toolId]) {
      const ts = userData.subscriptions[toolId];
      let exp;
      try { exp = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts); }
      catch { exp = new Date(0); }
      setIsMember(exp.getTime() > Date.now());
    } else {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        try { const p = JSON.parse(saved); setIsMember(p.role === "member" || p.role === "membership"); }
        catch { setIsMember(false); }
      } else { setIsMember(false); }
    }
  }, [userData, loading]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setTimeout(() => { setRefreshKey(k => k + 1); setIsRefreshing(false); }, 900);
  }, [isRefreshing]);

  const handleCrosshairMove = useCallback((time) => setExternalTime(time ?? null), []);

  // ── Landing scroll ───────────────────────────────────────────────────────
  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeft(scrollLeft > 1);
    setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
  }, []);

  const scroll = (dir) => {
    if (!scrollContainerRef.current) return;
    isPaused.current = true;
    scrollContainerRef.current.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
    scrollDirection.current = dir === "left" ? -1 : 1;
    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false; }, 500);
  };

  useEffect(() => {
    const c  = scrollContainerRef.current; if (!c) return;
    const id = setInterval(() => {
      if (isPaused.current || !c) return;
      const { scrollLeft, scrollWidth, clientWidth } = c;
      const max = scrollWidth - clientWidth;
      if      (scrollDirection.current ===  1 && Math.ceil(scrollLeft) >= max - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && scrollLeft <= 2)                  scrollDirection.current =  1;
      c.scrollLeft += scrollDirection.current;
      checkScroll();
    }, 15);
    return () => clearInterval(id);
  }, [isMember, enteredTool, checkScroll]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  // ── Shared landing JSX ───────────────────────────────────────────────────
  const features = [
    { title: "Last",                     desc: "Track the daily price action of the SET50 Index." },
    { title: "Confirm Up/Down S50",      desc: "Forecast bullish or bearish momentum." },
    { title: "Trend (Flow Analysis)",    desc: "Visualizes net buying/selling in SET50." },
    { title: "Mid-Trend (Market Sentiment)", desc: "Monitor overall SET market activity." },
  ];

  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
      <div className="relative group" onMouseEnter={() => { isPaused.current = true; }} onMouseLeave={() => { isPaused.current = false; }}>
        <button onClick={() => scroll("left")} aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1" style={{ msOverflowStyle:"none", scrollbarWidth:"none" }}>
          {features.map((item, i) => (
            <div key={i} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );

  const dashboardPreviewJSX = (
    <div className="relative group w-full max-w-5xl mb-16">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"/>
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"/><div className="w-3 h-3 rounded-full bg-yellow-500/80"/><div className="w-3 h-3 rounded-full bg-green-500/80"/>
          </div>
        </div>
        <div className="w-full bg-[#0B1221] relative overflow-hidden group">
          <div className="opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out origin-center">
            <ScaledDashboardPreview dashboardWidth={1200} dashboardHeight={625} />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Not member ───────────────────────────────────────────────────────────
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">S50</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Master the S50 Index Futures with absolute conviction</p>
          </div>
          {dashboardPreviewJSX}{featuresSectionJSX}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
            {!currentUser && <button onClick={() => navigate("/login")} className="px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 transition-all duration-300">Sign In</button>}
            <button onClick={() => navigate("/member-register")} className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg transition-all duration-300">Join Membership</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Member intro ──────────────────────────────────────────────────────────
  if (!enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">S50</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Master the S50 Index Futures with absolute conviction</p>
          </div>
          {dashboardPreviewJSX}{featuresSectionJSX}
          <button onClick={() => setEnteredTool(true)} className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300 mt-4">
            <span className="mr-2">Start Using Tool</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const CHARTS = [
    { id:"chart1", title:"1. Last",      seed:1 },
    { id:"chart2", title:"2. Confirm ",     seed:2 },
    { id:"chart3", title:"3. Trend (Volume Flow)",     seed:3 },
    { id:"chart4", title:"4. Mid-Trend ", seed:4 },
  ];

  return (
    <div className="w-full h-[100dvh] bg-[#0b111a] text-white px-3 sm:px-6 py-4 sm:py-6 flex flex-col overflow-hidden">
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-0" style={{ gridAutoRows:"minmax(0,1fr)" }}>
          {CHARTS.map(({ id, title, seed }, i) => (
            <ChartCard
              key={id}
              index={i} // 🟢 ส่ง index ลงไปเพื่อให้แสงสแกน (shimmer) เหลื่อมจังหวะกันสวยงาม
              title={title}
              chartId={id}
              seed={seed}
              onCrosshairMove={handleCrosshairMove}
              externalTime={externalTime}
              chartInstanceRefs={chartInstanceRefs}
              refreshKey={refreshKey}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              toolHint={i === 0
                ? <ToolHint detailsVariant="link" onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top:0 }); }}>
                    Monitor SET50 Index — zoom with mouse wheel, pan by dragging, crosshair synced across all 4 charts.
                  </ToolHint>
                : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}