import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
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

  const currentYear = new Date().getFullYear();

  const [selectedYear,    setSelectedYear]    = useState(currentYear);
  const [topK,            setTopK]            = useState(20);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [selectedSymbol,  setSelectedSymbol]  = useState(null);
  const [isShowAll,       setIsShowAll]       = useState(false);
  const [spinning,        setSpinning]        = useState(false);
  const [sortAsc,         setSortAsc]         = useState(false);
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);
  const [allSeriesData,   setAllSeriesData]   = useState({});

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
        setSearchQuery(selectedSymbol || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSymbol]);

  /* Single-symbol chart */
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      ytdSeriesRef.current = null;
    }
    if (!selectedSymbol) return;

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
  }, [selectedSymbol]);

  useEffect(() => {
    if (!chartRef.current || !selectedSymbol || Object.keys(allSeriesData).length===0) return;
    if (ytdSeriesRef.current && allSeriesData[selectedSymbol])
      ytdSeriesRef.current.setData(allSeriesData[selectedSymbol]);
    chartRef.current?.timeScale().fitContent();
  }, [allSeriesData, selectedSymbol]);

  const handleReset = () => {
    setSelectedYear(currentYear);
    setTopK(20);
    setSearchQuery("");
    setSelectedSymbol(null);
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

  const visibleSeriesData = useMemo(() => {
    if (!isShowAll) return {};
    const data = {};
    filteredTable.forEach(row => {
      if (allSeriesData[row.symbol]) {
        data[row.symbol] = allSeriesData[row.symbol];
      }
    });
    return data;
  }, [allSeriesData, filteredTable, isShowAll]);

  const selectedIdx   = selectedSymbol ? MOCK_TABLE.findIndex(r => r.symbol===selectedSymbol) : -1;
  const selectedColor = selectedIdx >= 0 ? SYMBOL_COLORS[selectedIdx % SYMBOL_COLORS.length] : null;

  return (
    <div className="flex flex-col text-white font-sans relative" style={{ height:"100dvh", background:"#0d1117" }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row md:items-end gap-2 px-4 pt-1 pb-2 border-b border-white/5 shrink-0 z-20">
        <div className="flex flex-row items-end gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pt-0 pb-1 md:pb-0">
          <div className="shrink-0 mb-1">
            <ToolHint onViewDetails={() => { window.scrollTo({ top:0 }); }}>
              YTD Performance
            </ToolHint>
          </div>
          
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider ml-1 uppercase">Select Year</span>
            {spinning ? (
              <div className="h-9 w-24 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
            ) : (
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none bg-[#111827] border border-slate-700 rounded-lg px-4 pr-10 h-9 text-[13px] font-mono text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-lg"
                >
                  {AVAILABLE_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-white transition-colors">
                  <ChevronDownIcon />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider ml-1 uppercase">Show Top-K</span>
            {spinning ? (
              <div className="h-9 w-20 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
            ) : (
              <input
                type="number"
                min="1"
                max={MOCK_TABLE.length}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(MOCK_TABLE.length, parseInt(e.target.value) || 1)))}
                className="bg-[#111827] border border-slate-700 rounded-lg px-3 h-9 w-20 text-[13px] font-mono text-white outline-none focus:border-blue-500/50 transition-all shadow-lg"
              />
            )}
          </div>
        </div>

        <div className="md:ml-auto w-full md:w-auto flex mt-1 md:mt-0 shrink-0">
          {spinning ? (
            <div className="w-full md:w-24 h-9 md:h-8 bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
          ) : (
            <button
              onClick={() => { setSelectedSymbol(null); setIsShowAll(true); setSearchQuery(""); }}
              className="w-full md:w-auto h-9 md:h-8 px-4 text-[12px] font-semibold tracking-wider uppercase rounded-lg transition-all"
              style={{
                background: (!selectedSymbol && isShowAll) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.1)",
                color: (!selectedSymbol && isShowAll) ? "#ffffff" : "#9ca3af",
              }}>
              Show All
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden relative z-10">

        {/* ── CHART AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-5 pt-4 pb-2 shrink-0 gap-3 md:gap-0">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-white/90 tracking-tight">YTD Performance (% Change)</span>
              {!spinning && selectedSymbol && selectedColor && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background:"#34d399" }}/>
                    <span className="text-[12px] text-gray-400">{selectedSymbol} Performance</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CHART MOUNT ── */}
          <div className="flex-1 min-h-0 px-2 pb-3 relative">
            {spinning ? (
              <div className="w-full h-full p-4">
                <div className="w-full h-full bg-slate-800/40 animate-pulse rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3">
                   <div className="w-1/2 h-4 bg-slate-700/50 rounded-full animate-pulse" />
                   <div className="w-1/3 h-3 bg-slate-700/30 rounded-full animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Single symbol chart */}
                <div ref={chartContainerRef} className="w-full h-full"
                  style={{ visibility: selectedSymbol ? "visible" : "hidden" }}/>

                {/* Show All — multi-line chart */}
                {!selectedSymbol && isShowAll && Object.keys(visibleSeriesData).length > 0 && (
                  <div className="absolute inset-0">
                    <MultiLineChart allSeriesData={visibleSeriesData} />
                  </div>
                )}

                {/* Empty state */}
                {!selectedSymbol && !isShowAll && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
                    <span className="text-[16px] text-gray-600 tracking-wide">
                      Select a symbol or click "Show All" to view chart.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="w-full md:w-[290px] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-l border-white/5" style={{ background:"#0b0e14" }}>

          <div className="flex items-center gap-1.5 px-4 md:px-2.5 pt-3 md:pt-2.5 pb-3 md:pb-2 shrink-0">
            {/* Search + Dropdown */}
            <div className="flex-1 relative min-w-0" ref={dropdownRef}>
              {spinning ? (
                <div className="h-9 w-full bg-slate-800/50 animate-pulse rounded-lg border border-white/5" />
              ) : (
                <div className="relative bg-[#111827] border border-slate-700 rounded-lg px-2.5 flex items-center shadow-inner h-9 transition-colors focus-within:border-blue-500/50 focus-within:bg-[#1e293b]">
                  <SearchIcon/>
                  <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => { setIsDropdownOpen(true); if (selectedSymbol) setSearchQuery(""); }}
                    placeholder="Type a Symbol..."
                    className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-slate-500 min-w-0 pl-1.5 pr-1"
                  />
                  <div className="flex items-center shrink-0">
                    {searchQuery && (
                      <button
                        onClick={e => { e.stopPropagation(); setSearchQuery(""); inputRef.current?.focus(); }}
                        className="text-[10px] text-slate-400 hover:text-white mr-1 px-1 flex items-center justify-center h-full"
                      >✕</button>
                    )}
                    <span onClick={() => { setIsDropdownOpen(!isDropdownOpen); if (!isDropdownOpen) inputRef.current?.focus(); }}
                      className="text-slate-400 cursor-pointer flex items-center px-1">
                      <div style={{ transform:isDropdownOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}>
                        <ChevronDownIcon/>
                      </div>
                    </span>
                  </div>
                </div>
              )}

              {isDropdownOpen && !spinning && (
                <div className="absolute top-full mt-1.5 left-0 w-full min-w-[200px] bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[60] custom-scrollbar">
                  {filteredTable.length > 0 ? (
                    filteredTable.map((item, index) => {
                      const isSelected = selectedSymbol === item.symbol;
                      const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===item.symbol);
                      const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                      return (
                        <div key={index}
                          onClick={() => {
                            setSelectedSymbol(item.symbol);
                            setSearchQuery(item.symbol);
                            setIsShowAll(false);
                            setIsDropdownOpen(false);
                          }}
                          className={`px-4 py-3 text-[13px] transition flex items-center gap-3 cursor-pointer
                            ${isSelected ? "bg-cyan-500/20 text-white" : "text-slate-300 hover:bg-[#1e293b] hover:text-white"}`}>
                          <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background:dotColor }}/>
                          <span className="flex-1">{item.symbol}</span>
                          <span className={isSelected ? "text-cyan-400" : (item.ytd >= 0 ? "text-green-400" : "text-red-400")}>{item.ytd.toFixed(2)}%</span>
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
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 bg-[#111827] border border-slate-700"
              title={sortAsc ? "Sorted: Low→High" : "Sorted: High→Low"}>
              <SortIcon asc={sortAsc}/>
            </button>

            <button handleReset={handleReset}
              onClick={handleReset}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 bg-[#111827] border border-slate-700">
              <RefreshIcon spinning={spinning}/>
            </button>
          </div>

          {/* Table Header (PC only) */}
          <div className="hidden md:flex items-center px-4 py-2 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span className="flex-1 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">Symbol</span>
            <button onClick={() => setSortAsc(o=>!o)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase hover:text-blue-300 transition-colors">
              YTD % <SortIcon asc={sortAsc}/>
            </button>
          </div>

          {/* Symbol List (PC only) */}
          {spinning ? (
            <div className="hidden md:block flex-1 overflow-hidden px-2 pt-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 mb-1 animate-pulse">
                  <div className="w-3 h-3 rounded-full bg-slate-800/60" />
                  <div className="flex-1 h-3.5 bg-slate-800/60 rounded-full w-24" />
                  <div className="h-3.5 bg-slate-800/40 rounded-full w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden md:block flex-1 overflow-y-auto no-scrollbar pb-2 md:pb-0">
              {filteredTable.map((row, i) => {
                const isSelected = selectedSymbol === row.symbol;
                const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===row.symbol);
                const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                return (
                  <button key={i}
                    onClick={() => {
                      if (selectedSymbol===row.symbol) { setSelectedSymbol(null); setIsShowAll(true); }
                      else { setSelectedSymbol(row.symbol); setIsShowAll(false); }
                    }}
                    className="w-full flex items-center px-2 py-1 transition-all cursor-pointer">
                    <span className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full transition-all"
                      style={{ background: isSelected ? "rgba(59,130,246,0.2)" : "transparent" }}>
                      <span className="shrink-0 w-3 h-3 rounded-full" style={{ background: isSelected ? "#60a5fa" : dotColor }}/>
                      <span className="flex-1 text-left text-[13px] font-semibold" style={{ color: isSelected ? "#ffffff" : "#9ca3af" }}>
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
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .custom-scrollbar::-webkit-scrollbar { width:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#475569; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#64748b; }
      `}</style>
    </div>
  );
}