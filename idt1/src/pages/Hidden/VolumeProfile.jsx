import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ToolHint from "@/components/ToolHint.jsx";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TIMEFRAMES = ["Daily", "Weekly", "Monthly"];
const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const POPULAR_SYMBOLS = [
  "PTT","PTTEP","AOT","CPALL","BDMS","SCB","KBANK","BBL",
  "SCC","GULF","ADVANC","TRUE","INTUCH","DTAC","CPN","LH",
  "BH","BGH","MINT","CRC","HMPRO","MAKRO","BJC","GLOBAL",
  "AWC","WHA","AMATA","IRPC","TPIPL","TISCO","KTB","BAY",
];

/* ─────────────────────────────────────────────
   MOCK DATA GENERATOR
───────────────────────────────────────────── */
function generateVolumeProfile(symbol, year, timeframe, use5000tick) {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + year;
  const rand = (n) => {
    const x = Math.sin(n + seed * 9301) * 43758.5453123;
    return x - Math.floor(x);
  };

  const basePrice = 20 + rand(seed) * 200;
  const range = basePrice * (use5000tick ? 0.18 : 0.12);
  const numLevels = timeframe === "Daily" ? 40 : timeframe === "Weekly" ? 50 : 60;
  const step = range / numLevels;

  const levels = [];
  let maxVol = 0;

  for (let i = 0; i < numLevels; i++) {
    const price = parseFloat((basePrice - range / 2 + i * step).toFixed(2));
    // bell-curve-ish distribution around middle
    const mid = numLevels / 2;
    const dist = Math.abs(i - mid) / mid;
    const baseVol = (1 - dist * 0.7) * (0.5 + rand(i * 7 + 1) * 0.5);
    const vol = Math.round(baseVol * (use5000tick ? 5000 : 1000) * (500 + rand(i * 3) * 4500));
    levels.push({ price, vol, i });
    if (vol > maxVol) maxVol = vol;
  }

  // POC = highest volume
  const poc = levels.reduce((a, b) => (b.vol > a.vol ? b : a));
  // Value Area = ~70% of total volume around POC
  const totalVol = levels.reduce((a, b) => a + b.vol, 0);
  const target = totalVol * 0.7;
  let cumVol = poc.vol;
  let lo = poc.i, hi = poc.i;
  while (cumVol < target && (lo > 0 || hi < levels.length - 1)) {
    const addLo = lo > 0 ? levels[lo - 1].vol : 0;
    const addHi = hi < levels.length - 1 ? levels[hi + 1].vol : 0;
    if (addLo >= addHi && lo > 0) { lo--; cumVol += levels[lo].vol; }
    else if (hi < levels.length - 1) { hi++; cumVol += levels[hi].vol; }
    else break;
  }

  return {
    levels,
    maxVol,
    totalVol,
    poc,
    vah: levels[hi],
    val: levels[lo],
    basePrice,
    lastPrice: parseFloat((basePrice + (rand(seed + 1) - 0.5) * range * 0.4).toFixed(2)),
  };
}

/* ─────────────────────────────────────────────
   CANVAS CHART COMPONENT
───────────────────────────────────────────── */
function VolumeProfileChart({ data, hoveredLevel, setHoveredLevel }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    const { levels, maxVol, poc, vah, val, lastPrice } = data;
    const n = levels.length;
    if (n === 0) return;

    const PADDING_BOTTOM = 22; // For X-axis labels
    const CHART_H = H - PADDING_BOTTOM;
    const BAR_AREA_W = W - 95; // Give more room on right for larger fonts
    const BAR_H = CHART_H / n;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const x = (BAR_AREA_W / 4) * g;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CHART_H); ctx.stroke();
    }

    // Draw bars (bottom-up = low price at bottom)
    const reversedLevels = [...levels].reverse();
    reversedLevels.forEach((lv, idx) => {
      const barW = (lv.vol / maxVol) * BAR_AREA_W * 0.92;
      const y = idx * BAR_H;
      const isPOC = lv.i === poc.i;
      const isVA = lv.i >= val.i && lv.i <= vah.i;
      const isHovered = hoveredLevel?.i === lv.i;

      // Bar color
      let color;
      if (isPOC) color = "#facc15";
      else if (isVA) color = "rgba(96,165,250,0.55)";
      else color = "rgba(96,165,250,0.22)";

      if (isHovered) color = "rgba(251,191,36,0.75)";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(0, y + 1, barW, BAR_H - 2, 2);
      ctx.fill();

      // Price label on the right
      const isKey = isPOC || lv.i === vah.i || lv.i === val.i;
      if (isKey || isHovered || idx % Math.ceil(n / 10) === 0) {
        ctx.fillStyle = isPOC ? "#facc15" : (lv.i === vah.i || lv.i === val.i) ? "#60a5fa" : "rgba(156,163,175,0.6)";
        ctx.font = `${isPOC || isKey ? "bold " : ""}12px 'Inter', sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(lv.price.toFixed(2), BAR_AREA_W + 8, y + BAR_H / 2 + 4);
      }
    });

    // Last price horizontal line
    const priceMin = levels[0].price;
    const priceMax = levels[n - 1].price;
    const priceRange = priceMax - priceMin;
    const lastY = CHART_H - ((lastPrice - priceMin) / priceRange) * CHART_H;
    if (lastY >= 0 && lastY <= CHART_H) {
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(BAR_AREA_W, lastY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 12px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`▶ ${lastPrice.toFixed(2)}`, BAR_AREA_W + 6, lastY + 4);
    }

    // --- Draw X-axis Volume Scale ---
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, CHART_H); ctx.lineTo(BAR_AREA_W, CHART_H); ctx.stroke();
    
    ctx.fillStyle = "rgba(156,163,175,0.7)";
    ctx.font = "11px 'Inter', sans-serif";
    for (let g = 0; g <= 4; g++) {
      const x = (BAR_AREA_W / 4) * g;
      const volAtX = (maxVol / 4) * g;
      ctx.textAlign = g === 0 ? "left" : g === 4 ? "right" : "center";
      
      let volStr = "";
      if (volAtX >= 1000000) volStr = (volAtX / 1000000).toFixed(1) + "M";
      else if (volAtX >= 1000) volStr = (volAtX / 1000).toFixed(0) + "K";
      else volStr = volAtX.toFixed(0);
      
      ctx.fillText(volStr, x, H - 5);
    }

  }, [data, hoveredLevel]);

  const handleMouseMove = useCallback((e) => {
    if (!data) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    const PADDING_BOTTOM = 22;
    const chartRenderH = rect.height - PADDING_BOTTOM;
    if (y > chartRenderH) { setHoveredLevel(null); return; } // Hovering over x-axis

    const idx = Math.floor((y / chartRenderH) * data.levels.length);
    const reversed = [...data.levels].reverse();
    if (reversed[idx]) setHoveredLevel(reversed[idx]);
  }, [data, setHoveredLevel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredLevel(null)}
    />
  );
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const RefreshIcon = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={spinning ? "animate-spin" : ""}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
function StatCard({ label, value, color = "#60a5fa", sub }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px", minWidth: 100 }}>
      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function VolumeProfile() {
  const [symbol, setSymbol]             = useState("PTT");
  const [searchQuery, setSearchQuery]   = useState("PTT");
  const [year, setYear]                 = useState(2025);
  const [timeframe, setTimeframe]       = useState("Daily");
  const [use5000tick, setUse5000tick]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [data, setData]                 = useState(null);
  const [hoveredLevel, setHoveredLevel] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tfOpen, setTfOpen]             = useState(false);
  const [yearOpen, setYearOpen]         = useState(false);
  const dropdownRef = useRef(null);
  const inputRef    = useRef(null);

  const filteredSymbols = useMemo(() =>
    POPULAR_SYMBOLS.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const loadData = useCallback(() => {
    setLoading(true);
    setData(null);
    setTimeout(() => {
      setData(generateVolumeProfile(symbol, year, timeframe, use5000tick));
      setLoading(false);
    }, 700);
  }, [symbol, year, timeframe, use5000tick]);

  useEffect(() => { loadData(); }, [loadData]);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setTfOpen(false);
        setYearOpen(false);
        if (!symbol) setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [symbol]);

  const selectSymbol = (s) => {
    setSymbol(s);
    setSearchQuery(s);
    setDropdownOpen(false);
  };

  const fmtVol = (v) => {
    if (!v && v !== 0) return "—";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
    return v.toLocaleString();
  };

  return (
    <div className="flex flex-col text-white font-sans relative" style={{ height: "100dvh", background: "#0d1117" }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row md:items-end gap-2 px-4 pt-1 pb-2 border-b border-white/5 shrink-0 z-30"
        ref={dropdownRef}>
        <div className="flex flex-row items-end gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">

          {/* Tool title */}
          <div className="shrink-0 mb-1">
            <ToolHint onViewDetails={() => {}}>Volume Profile</ToolHint>
          </div>

          {/* Symbol Combobox */}
          <div className="flex flex-col gap-1 mb-1 relative min-w-[140px]">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase ml-1">Symbol</span>
            <div className="relative bg-[#111827] border border-slate-700 rounded-lg px-2.5 flex items-center h-9 focus-within:border-blue-500/50 transition-colors shadow-inner">
              <SearchIcon />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                onFocus={() => { setDropdownOpen(true); setSearchQuery(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim() !== "") {
                    selectSymbol(searchQuery.trim().toUpperCase());
                    inputRef.current?.blur();
                  }
                }}
                placeholder="Search symbol..."
                className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-slate-500 pl-1.5 min-w-0"
              />
              <span onClick={() => setDropdownOpen(o => !o)} className="cursor-pointer text-slate-400 px-1">
                <ChevronIcon open={dropdownOpen} />
              </span>
            </div>
            {dropdownOpen && (
              <div className="absolute top-full mt-1 left-0 w-full min-w-[160px] bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-[60] custom-scrollbar">
                {filteredSymbols.length > 0 ? filteredSymbols.map(s => (
                  <div key={s} onClick={() => selectSymbol(s)}
                    className={`px-4 py-2.5 text-[13px] cursor-pointer transition ${s === symbol ? "bg-blue-500/20 text-white" : "text-slate-300 hover:bg-[#1e293b] hover:text-white"}`}>
                    {s}
                  </div>
                )) : (
                  <div className="px-4 py-3 text-[13px] text-slate-500 text-center">No results</div>
                )}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1 mb-1 relative">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase ml-1">Year</span>
            <div className="relative group">
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="appearance-none bg-[#111827] border border-slate-700 rounded-lg px-4 pr-8 h-9 text-[13px] font-mono text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-lg"
              >
                {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronIcon open={false} />
              </div>
            </div>
          </div>

          {/* Timeframe */}
          <div className="flex flex-col gap-1 mb-1 relative">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase ml-1">Timeframe</span>
            <div className="relative">
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                className="appearance-none bg-[#111827] border border-slate-700 rounded-lg px-4 pr-8 h-9 text-[13px] font-mono text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-lg"
              >
                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronIcon open={false} />
              </div>
            </div>
          </div>

          {/* 5000 Tick Toggle */}
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase ml-1">5000 Tick</span>
            <button
              onClick={() => setUse5000tick(o => !o)}
              className="h-9 px-4 rounded-lg text-[13px] font-semibold transition-all border"
              style={{
                background: use5000tick ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
                borderColor: use5000tick ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.1)",
                color: use5000tick ? "#60a5fa" : "#6b7280",
              }}
            >
              {use5000tick ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Refresh */}
        <div className="md:ml-auto mb-1 shrink-0">
          <button onClick={loadData}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#111827] border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshIcon spinning={loading} />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── CHART ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Stats Row */}
          <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 shrink-0">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-28 bg-slate-800/50 animate-pulse rounded-xl border border-white/5" />
              ))
            ) : data ? (
              <>
                <StatCard label="Symbol" value={symbol} color="#e2e8f0" />
                <StatCard label="POC" value={data.poc.price.toFixed(2)} color="#facc15" sub={`Vol: ${fmtVol(data.poc.vol)}`} />
                <StatCard label="VAH" value={data.vah.price.toFixed(2)} color="#34d399" sub="Value Area High" />
                <StatCard label="VAL" value={data.val.price.toFixed(2)} color="#f87171" sub="Value Area Low" />
                <StatCard label="Total Vol" value={fmtVol(data.totalVol)} color="#a78bfa" />
                {hoveredLevel && (
                  <StatCard label="Hovered" value={hoveredLevel.price.toFixed(2)} color="#fbbf24" sub={`Vol: ${fmtVol(hoveredLevel.vol)}`} />
                )}
              </>
            ) : null}
          </div>

          {/* Legend */}
          {!loading && data && (
            <div className="flex items-center gap-4 px-5 pb-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: "#facc15" }} />
                <span className="text-[11px] text-gray-400">POC (Point of Control)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(96,165,250,0.55)" }} />
                <span className="text-[11px] text-gray-400">Value Area (70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded" style={{ background: "#34d399" }} />
                <span className="text-[11px] text-gray-400">Last Price</span>
              </div>
            </div>
          )}

          {/* Chart Canvas */}
          <div className="flex-1 min-h-0 px-4 pb-4 relative">
            {loading ? (
              <div className="w-full h-full bg-slate-800/40 animate-pulse rounded-2xl border border-white/5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-40 h-4 bg-slate-700/50 rounded-full animate-pulse" />
                  <div className="w-24 h-3 bg-slate-700/30 rounded-full animate-pulse" />
                </div>
              </div>
            ) : data ? (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5" style={{ background: "#090c12" }}>
                <VolumeProfileChart data={data} hoveredLevel={hoveredLevel} setHoveredLevel={setHoveredLevel} />
              </div>
            ) : null}
          </div>
        </div>

        {/* ── RIGHT PANEL — Level Table (PC only) ── */}
        {!loading && data && (
          <div className="hidden lg:flex flex-col w-56 shrink-0 border-l border-white/5 overflow-hidden" style={{ background: "#0b0e14" }}>
            <div className="px-3 pt-3 pb-2 shrink-0">
              <span className="text-[11px] font-semibold text-gray-500 tracking-wider uppercase">Price Levels</span>
            </div>
            {/* Header */}
            <div className="flex items-center px-3 py-1.5 shrink-0 border-b border-white/5">
              <span className="flex-1 text-[10px] text-gray-600 uppercase tracking-wider">Price</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Volume</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {[...data.levels].reverse().map((lv, i) => {
                const isPOC = lv.i === data.poc.i;
                const isVAH = lv.i === data.vah.i;
                const isVAL = lv.i === data.val.i;
                const isVA  = lv.i >= data.val.i && lv.i <= data.vah.i;
                const isHov = hoveredLevel?.i === lv.i;
                return (
                  <div key={i} onMouseEnter={() => setHoveredLevel(lv)} onMouseLeave={() => setHoveredLevel(null)}
                    className="flex items-center px-3 py-1 cursor-default transition-colors"
                    style={{ background: isHov ? "rgba(251,191,36,0.1)" : isPOC ? "rgba(250,204,21,0.08)" : isVA ? "rgba(96,165,250,0.05)" : "transparent" }}>
                    <span className="flex-1 text-[12px] font-mono"
                      style={{ color: isPOC ? "#facc15" : isVAH ? "#34d399" : isVAL ? "#f87171" : isVA ? "#93c5fd" : "#6b7280" }}>
                      {lv.price.toFixed(2)}
                      {isPOC && <span className="ml-1 text-[9px] font-bold text-yellow-400">POC</span>}
                      {isVAH && <span className="ml-1 text-[9px] font-bold text-green-400">VAH</span>}
                      {isVAL && <span className="ml-1 text-[9px] font-bold text-red-400">VAL</span>}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">{fmtVol(lv.vol)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}
