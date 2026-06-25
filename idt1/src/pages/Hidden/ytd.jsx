import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

/* ================= COLORS ================= */
const SYMBOL_COLORS = [
  "#60a5fa","#f97316","#34d399","#a78bfa","#fbbf24",
  "#f472b6","#22d3ee","#fb7185","#86efac","#c084fc",
  "#fdba74","#67e8f9","#fde68a","#d9f99d","#fca5a5",
];

const MOCK_TABLE = [
  { symbol: "KCE",    ytd: 15.40 }, { symbol: "HANA",   ytd: 12.88 },
  { symbol: "BH",     ytd: 10.38 }, { symbol: "MTC",    ytd: 8.15 },
  { symbol: "MINIT",  ytd: 7.14 }, { symbol: "BTS",    ytd: 6.99 },
  { symbol: "BANPU",  ytd: 5.95 }, { symbol: "AMATA",  ytd: 5.91 },
  { symbol: "SCC",    ytd: 4.88 }, { symbol: "SPRC",   ytd: 3.64 },
  { symbol: "IRPC",   ytd: 3.41 }, { symbol: "BDMS",   ytd: 3.38 },
  { symbol: "CBG",    ytd: 2.36 }, { symbol: "LH",     ytd: 2.36 },
  { symbol: "DOHOME", ytd: 1.02 }, { symbol: "COM7",   ytd: 1.02 },
  { symbol: "GLOBAL", ytd: 1.00 }, { symbol: "TIDLOR", ytd: 0.99 },
  { symbol: "SIRI",   ytd: 0.99 }, { symbol: "BGRIM",  ytd: 0.98 },
  { symbol: "TISCO",  ytd: -0.96 }, { symbol: "BBL",    ytd: -1.93 },
  { symbol: "JMT",    ytd: -2.91 }, { symbol: "BCP",    ytd: -3.90 },
  { symbol: "JAS",    ytd: -4.90 }, { symbol: "AWC",    ytd: -5.88 },
  { symbol: "CHG",    ytd: -6.84 }, { symbol: "BEM",    ytd: -7.82 },
  { symbol: "BAM",    ytd: -8.82 }, { symbol: "PTTGC",  ytd: -9.81 },
  { symbol: "SPALI",  ytd: -10.80 }, { symbol: "RCL",    ytd: -11.78 },
  { symbol: "IVL",    ytd: -12.75 }, { symbol: "EGCO",   ytd: -13.75 },
  { symbol: "CK",     ytd: -14.69 }, { symbol: "SCB",    ytd: -15.67 },
  { symbol: "CPN",    ytd: -16.62 }, { symbol: "BJC",    ytd: -17.62 },
  { symbol: "TTB",    ytd: -18.61 }, { symbol: "CENTEL", ytd: -19.58 },
  { symbol: "JMART",  ytd: -20.57 }, { symbol: "BCPG",   ytd: -21.57 },
  { symbol: "AP",     ytd: -22.56 }, { symbol: "GPSC",   ytd: -23.55 },
  { symbol: "CCET",   ytd: -24.54 }, { symbol: "RATCH",  ytd: -25.53 },
  { symbol: "PRM",    ytd: -26.52 }, { symbol: "TASCO",  ytd: -27.50 },
  { symbol: "SCGP",   ytd: -28.49 }, { symbol: "M",      ytd: -29.48 },
];

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

/* ================= DATA GENERATION ================= */
const generateYTDData = (year, seed = 1, finalVal = 10) => {
  const data = [];
  const start = new Date(`${year}-01-01`);
  const today = new Date();
  const end = (year === today.getFullYear()) ? today : new Date(`${year}-12-31`);
  
  const tradingDays = [];
  let cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      tradingDays.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }

  const numDays = tradingDays.length;
  let val = 0;
  for (let i = 0; i < numDays; i++) {
    const r = ((Math.sin(seed * 9301 + i * 49297) + 1) / 2);
    // Add some drift towards finalVal
    const drift = (finalVal / numDays);
    val += drift + (r - 0.5) * 1.5;
    data.push({ time: tradingDays[i], value: parseFloat(val.toFixed(2)) });
  }
  return data;
};

/* ================= ICONS ================= */
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const SortIcon = ({ asc }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {asc ? (
      <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
    ) : (
      <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
    )}
  </svg>
);

const MaximizeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/>
    <polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20"/>
    <polyline points="20 10 14 10 14 4"/>
    <line x1="14" y1="10" x2="20" y2="4"/>
    <line x1="10" y1="14" x2="4" y2="20"/>
  </svg>
);

/* ================= LOADING SKELETONS ================= */
const shimmerStyle = {
  background: "linear-gradient(90deg,transparent 0%,rgba(56,189,248,0.08) 40%,rgba(125,211,252,0.18) 50%,rgba(56,189,248,0.08) 60%,transparent 100%)",
  animation: "shimmer 1.8s ease-in-out infinite",
};

function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-full bg-[#0f172a]/20 rounded-xl overflow-hidden relative border border-white/5">
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex gap-2">
          <div className="h-2 rounded-full bg-slate-800 w-1/4" />
          <div className="h-2 rounded-full bg-slate-800 w-1/6" />
        </div>
        <div className="flex-1 my-4 rounded bg-slate-800/20 border border-white/5" />
        <div className="flex gap-3 justify-between">
          {[...Array(8)].map((_, i) => (
            <div key={`skel-bar-${i}`} className="h-2 rounded-full bg-slate-800 flex-1" />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ ...shimmerStyle, animationDelay: `${delay}s` }} />
    </div>
  );
}

function TableRowSkeleton({ delay = 0 }) {
  return (
    <div className="relative overflow-hidden w-full flex items-center px-2 py-1 transition-all">
      <span className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full bg-slate-900/40 border border-white/5">
        <span className="shrink-0 w-3 h-3 rounded-full bg-slate-800" />
        <span className="flex-1 text-left text-[13px] font-semibold bg-slate-800 h-3 rounded-full" />
        <span className="text-[13px] font-semibold bg-slate-800 h-3 rounded-full w-12" />
      </span>
      <div className="absolute inset-0 pointer-events-none" style={{ ...shimmerStyle, animationDelay: `${delay}s` }} />
    </div>
  );
}

/* ================= MULTI LINE CHART (Show All) ================= */
function MultiLineChart({ allSeriesData }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const symbols = Object.keys(allSeriesData);
    if (symbols.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#6b7280",
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
        horzLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#6b7280",
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    symbols.forEach((sym, i) => {
      const color = SYMBOL_COLORS[i % SYMBOL_COLORS.length];
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1.5,
        priceScaleId: "right",
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: false,
        title: sym,
      });
      series.setData(allSeriesData[sym]);
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [allSeriesData]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div ref={containerRef} style={{ flex:1, minHeight:0 }}/>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function YTDPerformance() {
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);
  const ytdSeriesRef      = useRef(null);
  const dropdownRef       = useRef(null);
  const inputRef          = useRef(null);
  const chartAreaRef      = useRef(null);

  const currentYear = new Date().getFullYear();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!chartAreaRef.current) return;
    if (!document.fullscreenElement) {
      chartAreaRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const [selectedYear,    setSelectedYear]    = useState(currentYear);
  const [topK,            setTopK]            = useState(20);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [isShowAll,       setIsShowAll]       = useState(false);
  const [spinning,        setSpinning]        = useState(false);
  const [sortAsc,         setSortAsc]         = useState(false);
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);
  const [allSeriesData,   setAllSeriesData]   = useState({});
  const lastClickedRef    = useRef(null);

  const loadData = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      const ytdData = {};
      MOCK_TABLE.forEach((row, i) => {
        ytdData[row.symbol] = generateYTDData(selectedYear, i+1, row.ytd);
      });
      setAllSeriesData(ytdData);
      setSpinning(false);
    }, 800);
  }, [selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Single-symbol chart — only when exactly one is selected */
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      ytdSeriesRef.current = null;
    }
    if (selectedSymbols.length !== 1) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background:{ color:"transparent" }, textColor:"#6b7280", fontFamily:"inherit", fontSize:11 },
      grid: { vertLines:{ color:"rgba(255,255,255,0.04)" }, horzLines:{ color:"rgba(255,255,255,0.04)" } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine:{ color:"rgba(255,255,255,0.15)", style:LineStyle.Dashed, labelBackgroundColor:"#1e2330" },
        horzLine:{ color:"rgba(255,255,255,0.15)", style:LineStyle.Dashed, labelBackgroundColor:"#1e2330" },
      },
      rightPriceScale:{ borderColor:"rgba(255,255,255,0.06)", textColor:"#6b7280", scaleMargins:{ top:0.08, bottom:0.08 } },
      timeScale:{ borderColor:"rgba(255,255,255,0.06)", timeVisible:false, fixLeftEdge:true, fixRightEdge:true },
      handleScroll:true, handleScale:true,
    });
    chartRef.current = chart;

    ytdSeriesRef.current = chart.addSeries(LineSeries, {
      color:"#34d399", lineWidth:2, priceScaleId:"right",
      crosshairMarkerVisible:true, crosshairMarkerRadius:4,
      crosshairMarkerBackgroundColor:"#34d399",
      lastValueVisible:true, priceLineVisible:false,
    });

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current)
        chart.applyOptions({ width:chartContainerRef.current.clientWidth, height:chartContainerRef.current.clientHeight });
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [selectedSymbols]);

  useEffect(() => {
    if (!chartRef.current || selectedSymbols.length !== 1 || Object.keys(allSeriesData).length===0) return;
    if (ytdSeriesRef.current && allSeriesData[selectedSymbols[0]])
      ytdSeriesRef.current.setData(allSeriesData[selectedSymbols[0]]);
    chartRef.current?.timeScale().fitContent();
  }, [allSeriesData, selectedSymbols]);

  const handleReset = () => {
    setSelectedYear(currentYear);
    setTopK(20);
    setSearchQuery("");
    setSelectedSymbols([]);
    lastClickedRef.current = null;
    setIsShowAll(false);
    setSortAsc(false);
    loadData();
  };

  const filteredTable = useMemo(() => {
    return MOCK_TABLE
      .filter(r => r.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a,b) => sortAsc ? a.ytd-b.ytd : b.ytd-a.ytd)
      .slice(0, topK);
  }, [searchQuery, sortAsc, topK]);

  /* ── Data for the multi-line chart: Show All mode or multi-select ── */
  const chartMultiData = useMemo(() => {
    if (isShowAll && selectedSymbols.length === 0) {
      const data = {};
      filteredTable.forEach(row => {
        if (allSeriesData[row.symbol]) data[row.symbol] = allSeriesData[row.symbol];
      });
      return data;
    }
    if (selectedSymbols.length > 1) {
      const data = {};
      selectedSymbols.forEach(sym => {
        if (allSeriesData[sym]) data[sym] = allSeriesData[sym];
      });
      return data;
    }
    return {};
  }, [allSeriesData, filteredTable, isShowAll, selectedSymbols]);

  /* ── What the search input displays ── */
  const inputValue = useMemo(() => {
    if (isDropdownOpen) return searchQuery;
    if (selectedSymbols.length > 1) return `${selectedSymbols.length} selected`;
    if (selectedSymbols.length === 1) return selectedSymbols[0];
    return searchQuery;
  }, [isDropdownOpen, searchQuery, selectedSymbols]);

  return (
    <div className="flex flex-col text-slate-200 font-sans relative bg-slate-900" style={{ height:"100dvh" }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row md:items-end gap-2 px-4 pt-1 pb-2 border-b border-slate-500/30 shrink-0 z-20">
        <div className="flex flex-row items-end gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pt-0 pb-1 md:pb-0">
          <div className="shrink-0 mb-1">
            <ToolHint onViewDetails={() => { window.scrollTo({ top:0 }); }}>
              YTD Performance
            </ToolHint>
          </div>
          
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[10px] text-slate-500 font-sans tracking-wider ml-1 uppercase">Select Year</span>
            {spinning ? (
              <div className="h-9 w-32 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
            ) : (
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none bg-white/[0.03] border border-slate-500/30 rounded-lg px-4 pr-10 h-9 text-[13px] text-slate-200 outline-none focus:border-blue-400/50 transition-all cursor-pointer w-32"
                  style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
                >
                  {AVAILABLE_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 transition-colors">
                  <ChevronDownIcon />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[10px] text-slate-500 font-sans tracking-wider ml-1 uppercase">Show Top-K</span>
            {spinning ? (
              <div className="h-9 w-24 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
            ) : (
              <input
                type="number"
                min="1"
                max={MOCK_TABLE.length}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(MOCK_TABLE.length, parseInt(e.target.value) || 1)))}
                className="bg-white/[0.03] border border-slate-500/30 rounded-lg px-3 h-9 w-24 text-[13px] text-slate-200 outline-none focus:border-blue-400/50 transition-all"
                style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
              />
            )}
          </div>
        </div>

        <div className="md:ml-auto w-full md:w-auto flex mt-1 md:mt-0 shrink-0">
          {spinning ? (
            <div className="w-full md:w-24 h-9 md:h-8 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
          ) : (
            <button
              onClick={() => {
                if (isShowAll) {
                  setIsShowAll(false);
                } else {
                  setSelectedSymbols([]);
                  lastClickedRef.current = null;
                  setIsShowAll(true);
                  setSearchQuery("");
                }
              }}
              className="w-full md:w-auto h-9 md:h-8 px-4 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all"
              style={{
                background: isShowAll ? "linear-gradient(135deg,#3b82f6,#1d4ed8)" : "transparent",
                border: isShowAll ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(100,116,139,0.3)",
                color: isShowAll ? "#ffffff" : "#64748b",
              }}>
              Show All
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden relative z-10">

        {/* ── CHART AREA ── */}
        <div ref={chartAreaRef} className="flex flex-col flex-1 min-w-0 overflow-hidden fullscreen-container">
          <div className="flex flex-row items-center justify-between px-5 pt-4 pb-2 shrink-0 gap-3">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-slate-200/90 tracking-tight">YTD Performance (% Change)</span>
              {!spinning && selectedSymbols.length === 1 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background:"#34d399" }}/>
                    <span className="text-[12px] text-slate-500">{selectedSymbols[0]} Performance</span>
                  </div>
                </div>
              )}
              {!spinning && selectedSymbols.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-slate-500">{selectedSymbols.length} symbols selected</span>
                </div>
              )}
            </div>
            {!spinning && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 h-8 text-[12px] font-semibold tracking-wider uppercase rounded-lg transition-all bg-white/[0.04] border border-slate-500/30 hover:border-slate-500/60 text-slate-500 hover:text-slate-200"
                >
                  {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                </button>
              </div>
            )}
          </div>

          {/* ── CHART MOUNT ── */}
          <div className="flex-1 min-h-0 px-2 pb-3 relative">
            {spinning ? (
              <div className="w-full h-full p-4">
                <WaveSkeleton delay={0} />
              </div>
            ) : (
              <>
                {/* Single symbol chart (exactly one selected) */}
                <div ref={chartContainerRef} className="w-full h-full"
                  style={{ visibility: selectedSymbols.length === 1 ? "visible" : "hidden" }}/>

                {/* Multi-line chart: multi-select OR Show All */}
                {(selectedSymbols.length > 1 || (selectedSymbols.length === 0 && isShowAll)) &&
                  Object.keys(chartMultiData).length > 0 && (
                  <div className="absolute inset-0">
                    <MultiLineChart allSeriesData={chartMultiData} />
                  </div>
                )}

                {/* Empty state — no selection, not Show All */}
                {selectedSymbols.length === 0 && !isShowAll && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
                    <span className="text-[16px] text-slate-600 tracking-wide">
                      Select a symbol or click "Show All" to view chart.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="w-full md:w-[290px] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-l border-slate-500/15 bg-slate-800">

          <div className="flex items-center gap-1.5 px-4 md:px-2.5 pt-3 md:pt-2.5 pb-3 md:pb-2 shrink-0">
            {/* Search + Dropdown */}
            <div className="flex-1 relative min-w-0" ref={dropdownRef}>
              {spinning ? (
                <div className="h-9 w-full bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
              ) : (
                <div className="relative bg-white/[0.03] border border-slate-500/30 rounded-lg px-2.5 flex items-center h-9 transition-colors focus-within:border-blue-400/50 focus-within:bg-slate-800">
                  <SearchIcon/>
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => { setIsDropdownOpen(true); if (selectedSymbols.length === 1) setSearchQuery(""); }}
                    placeholder="Type a Symbol..."
                    className="flex-1 bg-transparent outline-none text-slate-200 text-[13px] placeholder:text-slate-500 min-w-0 pl-1.5 pr-1"
                  />
                  <div className="flex items-center shrink-0">
                    {searchQuery && (
                      <button
                        onClick={e => { e.stopPropagation(); setSearchQuery(""); inputRef.current?.focus(); }}
                        className="text-[10px] text-slate-500 hover:text-red-400 mr-1 px-1 flex items-center justify-center h-full transition-colors"
                      >✕</button>
                    )}
                    <span onClick={() => { setIsDropdownOpen(!isDropdownOpen); if (!isDropdownOpen) inputRef.current?.focus(); }}
                      className="text-slate-500 cursor-pointer flex items-center px-1">
                      <div style={{ transform:isDropdownOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}>
                        <ChevronDownIcon/>
                      </div>
                    </span>
                  </div>
                </div>
              )}

              {isDropdownOpen && !spinning && (
                <div className="absolute top-full mt-1.5 left-0 w-full min-w-[200px] bg-slate-900 border border-slate-500/30 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[60] custom-scrollbar">
                  {filteredTable.length > 0 ? (
                    filteredTable.map((item, index) => {
                      const isSelected = selectedSymbols.includes(item.symbol);
                      const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===item.symbol);
                      const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                      return (
                        <div key={index}
                          onClick={(e) => {
                            const { symbol } = item;
                            // Shift+click: range select (replace current selection)
                            if (e.shiftKey && lastClickedRef.current) {
                              const anchorIdx = filteredTable.findIndex(r => r.symbol === lastClickedRef.current);
                              const clickIdx  = filteredTable.findIndex(r => r.symbol === symbol);
                              if (anchorIdx !== -1 && clickIdx !== -1) {
                                const [lo, hi] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
                                const range = filteredTable.slice(lo, hi + 1).map(r => r.symbol);
                                setSelectedSymbols(range);
                                setIsShowAll(false);
                                return;
                              }
                            }
                            // Regular click (no Ctrl) sets the anchor for future Shift+click
                            if (!e.ctrlKey && !e.metaKey) {
                              lastClickedRef.current = symbol;
                            }
                            // Toggle the symbol in/out of selection
                            if (selectedSymbols.includes(symbol)) {
                              const next = selectedSymbols.filter(s => s !== symbol);
                              if (next.length === 0) {
                                setSelectedSymbols([]);
                                setIsShowAll(true);
                              } else {
                                setSelectedSymbols(next);
                                setIsShowAll(false);
                              }
                            } else {
                              const next = [...selectedSymbols, symbol];
                              setSelectedSymbols(next);
                              setIsShowAll(false);
                            }
                          }}
                          className={`px-4 py-3 text-[13px] transition flex items-center gap-3 cursor-pointer
                            ${isSelected ? "bg-blue-500/15 text-slate-200" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}>
                          <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background:dotColor }}/>
                          <span className="flex-1">{item.symbol}</span>
                          <span className={isSelected ? "text-blue-400" : (item.ytd >= 0 ? "text-green-400" : "text-red-400")}>{item.ytd.toFixed(2)}%</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-[13px] text-slate-500 text-center">No results found</div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setSortAsc(o=>!o)}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 transition-colors shrink-0 bg-white/[0.04] border border-slate-500/30 hover:border-slate-500/60"
              title={sortAsc ? "Sorted: Low→High" : "Sorted: High→Low"}>
              <SortIcon asc={sortAsc}/>
            </button>

            <button handleReset={handleReset}
              onClick={handleReset}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 transition-colors shrink-0 bg-white/[0.04] border border-slate-500/30 hover:border-slate-500/60">
              <RefreshIcon spinning={spinning}/>
            </button>
          </div>

          {/* Table Header (PC only) */}
          <div className="hidden md:flex items-center px-4 py-2 shrink-0" style={{ borderBottom:"1px solid rgba(100,116,139,0.15)" }}>
            <span className="flex-1 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Symbol</span>
            <button onClick={() => setSortAsc(o=>!o)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase hover:text-blue-300 transition-colors">
              YTD % <SortIcon asc={sortAsc}/>
            </button>
          </div>

          {/* Symbol List (PC only) */}
          {spinning ? (
            <div className="hidden md:block flex-1 overflow-hidden px-2 pt-2">
              {[...Array(12)].map((_, i) => (
                <TableRowSkeleton key={i} delay={i * 0.1} />
              ))}
            </div>
          ) : (
            <div className="hidden md:block flex-1 overflow-y-auto no-scrollbar pb-2 md:pb-0">
              {filteredTable.map((row, i) => {
                const isSelected = selectedSymbols.includes(row.symbol);
                const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===row.symbol);
                const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                return (
                  <button key={i}
                    onClick={(e) => {
                      const { symbol } = row;
                      // Shift+click: range select (replace current selection)
                      if (e.shiftKey && lastClickedRef.current) {
                        const anchorIdx = filteredTable.findIndex(r => r.symbol === lastClickedRef.current);
                        const clickIdx  = filteredTable.findIndex(r => r.symbol === symbol);
                        if (anchorIdx !== -1 && clickIdx !== -1) {
                          const [lo, hi] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
                          const range = filteredTable.slice(lo, hi + 1).map(r => r.symbol);
                          setSelectedSymbols(range);
                          setIsShowAll(false);
                          return;
                        }
                      }
                      // Regular click (no Ctrl) sets the anchor for future Shift+click
                      if (!e.ctrlKey && !e.metaKey) {
                        lastClickedRef.current = symbol;
                      }
                      // Toggle the symbol in/out of selection
                      if (selectedSymbols.includes(symbol)) {
                        const next = selectedSymbols.filter(s => s !== symbol);
                        if (next.length === 0) {
                          setSelectedSymbols([]);
                          setIsShowAll(true);
                        } else {
                          setSelectedSymbols(next);
                          setIsShowAll(false);
                        }
                      } else {
                        setSelectedSymbols([...selectedSymbols, symbol]);
                        setIsShowAll(false);
                      }
                    }}
                    className="w-full flex items-center px-2 py-1 transition-all cursor-pointer">
                    <span className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full transition-all"
                      style={{ background: isSelected ? "rgba(59,130,246,0.2)" : "transparent" }}>
                      <span className="shrink-0 w-3 h-3 rounded-full" style={{ background: dotColor }}/>
                      <span className="flex-1 text-left text-[13px] font-semibold" style={{ color: isSelected ? "#e2e8f0" : "#64748b" }}>
                        {row.symbol}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: isSelected ? "#34d399" : (row.ytd >= 0 ? "#10b981" : "#ef4444") }}>
                        {row.ytd.toFixed(2)}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .custom-scrollbar::-webkit-scrollbar { width:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#475569; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#64748b; }
        
        .fullscreen-container:-webkit-full-screen {
          background-color: #0f172a !important;
          padding: 16px;
        }
        .fullscreen-container:fullscreen {
          background-color: #0f172a !important;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}
