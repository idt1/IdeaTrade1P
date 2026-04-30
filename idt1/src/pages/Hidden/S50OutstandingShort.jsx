import React, { useState, useEffect, useRef, useCallback } from "react";
import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

/* ================= COLORS ================= */
const SYMBOL_COLORS = [
  "#60a5fa","#f97316","#34d399","#a78bfa","#fbbf24",
  "#f472b6","#22d3ee","#fb7185","#86efac","#c084fc",
  "#fdba74","#67e8f9","#fde68a","#d9f99d","#fca5a5",
];

const MOCK_TABLE = [
  { symbol: "KCE",    outshort: 3.90 }, { symbol: "HANA",   outshort: 2.88 },
  { symbol: "BH",     outshort: 2.38 }, { symbol: "MTC",    outshort: 2.15 },
  { symbol: "MINIT",  outshort: 2.14 }, { symbol: "BTS",    outshort: 1.99 },
  { symbol: "BANPU",  outshort: 1.95 }, { symbol: "AMATA",  outshort: 1.91 },
  { symbol: "SCC",    outshort: 1.88 }, { symbol: "SPRC",   outshort: 1.64 },
  { symbol: "IRPC",   outshort: 1.41 }, { symbol: "BDMS",   outshort: 1.38 },
  { symbol: "CBG",    outshort: 1.36 }, { symbol: "LH",     outshort: 1.36 },
  { symbol: "DOHOME", outshort: 1.02 }, { symbol: "COM7",   outshort: 1.02 },
  { symbol: "GLOBAL", outshort: 1.00 }, { symbol: "TIDLOR", outshort: 0.99 },
  { symbol: "SIRI",   outshort: 0.99 }, { symbol: "BGRIM",  outshort: 0.98 },
  { symbol: "TISCO",  outshort: 0.96 }, { symbol: "BBL",    outshort: 0.93 },
  { symbol: "JMT",    outshort: 0.91 }, { symbol: "BCP",    outshort: 0.90 },
  { symbol: "JAS",    outshort: 0.90 }, { symbol: "AWC",    outshort: 0.88 },
  { symbol: "CHG",    outshort: 0.84 }, { symbol: "BEM",    outshort: 0.82 },
  { symbol: "BAM",    outshort: 0.82 }, { symbol: "PTTGC",  outshort: 0.81 },
  { symbol: "SPALI",  outshort: 0.80 }, { symbol: "RCL",    outshort: 0.78 },
  { symbol: "IVL",    outshort: 0.75 }, { symbol: "EGCO",   outshort: 0.75 },
  { symbol: "CK",     outshort: 0.69 }, { symbol: "SCB",    outshort: 0.67 },
  { symbol: "CPN",    outshort: 0.62 }, { symbol: "BJC",    outshort: 0.62 },
  { symbol: "TTB",    outshort: 0.61 }, { symbol: "CENTEL", outshort: 0.58 },
  { symbol: "JMART",  outshort: 0.57 }, { symbol: "BCPG",   outshort: 0.57 },
  { symbol: "AP",     outshort: 0.56 }, { symbol: "GPSC",   outshort: 0.55 },
  { symbol: "CCET",   outshort: 0.54 }, { symbol: "RATCH",  outshort: 0.53 },
  { symbol: "PRM",    outshort: 0.52 }, { symbol: "TASCO",  outshort: 0.50 },
  { symbol: "SCGP",   outshort: 0.49 }, { symbol: "M",      outshort: 0.48 },
];

const ALL_SYMBOLS = [
  { symbol: "KCE",    outshort: 3.90 }, { symbol: "HANA",   outshort: 2.88 },
  { symbol: "BH",     outshort: 2.38 }, { symbol: "MTC",    outshort: 2.15 },
  { symbol: "MINIT",  outshort: 2.14 }, { symbol: "BTS",    outshort: 1.99 },
  { symbol: "BANPU",  outshort: 1.95 }, { symbol: "AMATA",  outshort: 1.91 },
  { symbol: "SCC",    outshort: 1.88 }, { symbol: "SPRC",   outshort: 1.64 },
  { symbol: "IRPC",   outshort: 1.41 }, { symbol: "BDMS",   outshort: 1.38 },
  { symbol: "CBG",    outshort: 1.36 }, { symbol: "LH",     outshort: 1.36 },
  { symbol: "DOHOME", outshort: 1.02 }, { symbol: "COM7",   outshort: 1.02 },
  { symbol: "GLOBAL", outshort: 1.00 }, { symbol: "TIDLOR", outshort: 0.99 },
  { symbol: "SIRI",   outshort: 0.99 }, { symbol: "BGRIM",  outshort: 0.98 },
  { symbol: "TISCO",  outshort: 0.96 }, { symbol: "BBL",    outshort: 0.93 },
  { symbol: "JMT",    outshort: 0.91 }, { symbol: "BCP",    outshort: 0.90 },
  { symbol: "JAS",    outshort: 0.90 }, { symbol: "AWC",    outshort: 0.88 },
  { symbol: "CHG",    outshort: 0.84 }, { symbol: "BEM",    outshort: 0.82 },
  { symbol: "BAM",    outshort: 0.82 }, { symbol: "PTTGC",  outshort: 0.81 },
  { symbol: "SPALI",  outshort: 0.80 }, { symbol: "RCL",    outshort: 0.78 },
  { symbol: "IVL",    outshort: 0.75 }, { symbol: "EGCO",   outshort: 0.75 },
  { symbol: "CK",     outshort: 0.69 }, { symbol: "SCB",    outshort: 0.67 },
  { symbol: "CPN",    outshort: 0.62 }, { symbol: "BJC",    outshort: 0.62 },
  { symbol: "TTB",    outshort: 0.61 }, { symbol: "CENTEL", outshort: 0.58 },
  { symbol: "JMART",  outshort: 0.57 }, { symbol: "BCPG",   outshort: 0.57 },
  { symbol: "AP",     outshort: 0.56 }, { symbol: "GPSC",   outshort: 0.55 },
  { symbol: "CCET",   outshort: 0.54 }, { symbol: "RATCH",  outshort: 0.53 },
  { symbol: "PRM",    outshort: 0.52 }, { symbol: "TASCO",  outshort: 0.50 },
  { symbol: "SCGP",   outshort: 0.49 }, { symbol: "M",      outshort: 0.48 },
];

const RANGE_DAYS = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "YTD": 100, "MAX": 730 };
const RANGES = ["1M", "3M", "6M", "1Y", "YTD", "MAX"];

const BAR_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#8b5cf6","#ec4899","#f43f5e","#10b981",
  "#f59e0b","#6366f1","#84cc16","#06b6d4","#a855f7",
  "#fb923c","#4ade80","#38bdf8","#c084fc","#fbbf24",
];

const generateSeriesData = (days = 90, seed = 1, base = 20, amplitude = 4) => {
  const data = [];
  let val = base;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const r = ((Math.sin(seed * 9301 + i * 49297) + 1) / 2);
    val += (r - 0.49) * (amplitude / 25);
    val = Math.max(base - amplitude * 1.5, Math.min(base + amplitude * 1.5, val));
    data.push({ time: d.toISOString().slice(0, 10), value: parseFloat(val.toFixed(2)) });
  }
  return data;
};

const generatePriceData = (days = 90, seed = 1) => {
  const data = [];
  let val = 3.2 + (seed % 5) * 0.15;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const r = ((Math.sin(seed * 1234 + i * 5678) + 1) / 2);
    val += (r - 0.49) * 0.06;
    val = Math.max(2.4, Math.min(5.2, val));
    data.push({ time: d.toISOString().slice(0, 10), value: parseFloat(val.toFixed(2)) });
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

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ChevronUpIcon = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}>
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

/* ================= STACKED LABEL CHART ================= */
function StackedLabelChart() {
  const sorted = [...ALL_SYMBOLS].sort((a, b) => a.outshort - b.outshort);

  return (
    <div className="absolute top-0 bottom-0 right-0 left-0 md:left-auto flex items-stretch overflow-y-auto no-scrollbar md:overflow-visible">
      <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingBottom: 24, minWidth: "100%", alignItems: "flex-end" }}>
        {sorted.map((item, i) => {
          const color = BAR_COLORS[i % BAR_COLORS.length];
          return (
            <div key={item.symbol} style={{ display: "flex", flex: 1, minHeight: "24px" }}>
              <div style={{
                width: 64, height: "100%",
                background: "#0d1117",
                display: "flex", alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 6,
                borderRight: `2px solid ${color}`,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.03em" }}>
                  {item.symbol}
                </span>
              </div>
              <div style={{
                width: 44, height: "100%",
                background: color,
                display: "flex", alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#000" }}>
                  {item.outshort.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function S50OutstandingShort() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const outshortSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);

  const [range, setRange] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  
  const [isShowAll, setIsShowAll] = useState(false);

  const [spinning, setSpinning] = useState(false);
  const [tableOpen, setTableOpen] = useState(true);
  const [allSeriesData, setAllSeriesData] = useState({});
  const [allPriceData, setAllPriceData] = useState({});

  const loadData = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      const days = RANGE_DAYS[range] || 90;
      const outshort = {};
      const price = {};
      MOCK_TABLE.forEach((row, i) => {
        outshort[row.symbol] = generateSeriesData(days, i + 1, row.outshort * 7, row.outshort * 1.5);
        price[row.symbol] = generatePriceData(days, i + 1);
      });
      setAllSeriesData(outshort);
      setAllPriceData(price);
      setSpinning(false);
    }, 400);
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      outshortSeriesRef.current = null;
      priceSeriesRef.current = null;
    }
    if (!selectedSymbol) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#6b7280", fontFamily: "inherit", fontSize: 11 },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
        horzLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)", textColor: "#6b7280", scaleMargins: { top: 0.08, bottom: 0.08 } },
      leftPriceScale: { visible: true, borderColor: "rgba(255,255,255,0.06)", textColor: "#6b7280", scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: true, handleScale: true,
    });
    chartRef.current = chart;

    const symIdx = MOCK_TABLE.findIndex(r => r.symbol === selectedSymbol);
    const symColor = "#f97316";

    outshortSeriesRef.current = chart.addSeries(LineSeries, {
      color: symColor, lineWidth: 2, priceScaleId: "right",
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: symColor,
      lastValueVisible: true, priceLineVisible: false,
    });

    priceSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#60a5fa", lineWidth: 2, priceScaleId: "left",
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: "#60a5fa",
      lastValueVisible: true, priceLineVisible: false,
    });

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [selectedSymbol]);

  useEffect(() => {
    if (!chartRef.current || !selectedSymbol || Object.keys(allSeriesData).length === 0) return;
    if (outshortSeriesRef.current && allSeriesData[selectedSymbol])
      outshortSeriesRef.current.setData(allSeriesData[selectedSymbol]);
    if (priceSeriesRef.current && allPriceData[selectedSymbol])
      priceSeriesRef.current.setData(allPriceData[selectedSymbol]);
    chartRef.current?.timeScale().fitContent();
  }, [allSeriesData, allPriceData, selectedSymbol]);

  const applyRange = (r) => {
    setRange(r);
    const d = new Date();
    const days = RANGE_DAYS[r] || 90;
    const s = new Date(d); s.setDate(d.getDate() - days);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(d.toISOString().slice(0, 10));
  };

  const handleReset = () => {
    setRange("");
    setStartDate("");
    setEndDate(new Date().toISOString().slice(0, 10));
    setSearchQuery(""); // Reset query
    setSelectedSymbol(null);
    setIsShowAll(false); 
    loadData(); 
  };

  // กรองตารางสำหรับใช้บน PC Search
  const filteredTable = MOCK_TABLE.filter(r =>
    r.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedIdx = selectedSymbol ? MOCK_TABLE.findIndex(r => r.symbol === selectedSymbol) : -1;
  const selectedColor = selectedIdx >= 0 ? SYMBOL_COLORS[selectedIdx % SYMBOL_COLORS.length] : null;

  return (
    <div className="flex flex-col text-white font-sans" style={{ height: "100dvh", background: "#0d1117" }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 px-4 pt-3 pb-2 border-b border-white/5 shrink-0">
        
        <div className="flex flex-row items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pt-[10px] pb-1 md:pb-0">
          
          <div className="shrink-0 mt-0.5">
            <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
              S50 Outstanding Short
            </ToolHint>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative shrink-0">
              <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">Start Date</label>
              <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
                <CalendarIcon />
                <input type="date" value={startDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setStartDate(e.target.value); setRange(""); }}
                  className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                  style={{ colorScheme: "dark" }}/>
              </div>
            </div>
            
            <span className="text-gray-600 text-sm shrink-0">-</span>
            
            <div className="relative shrink-0">
              <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">End Date</label>
              <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
                <CalendarIcon />
                <input type="date" value={endDate} 
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setEndDate(e.target.value); setRange(""); }}
                  className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                  style={{ colorScheme: "dark" }}/>
              </div>
            </div>
          </div>
        </div>

        <div className="md:ml-auto w-full md:w-auto flex mt-1 md:mt-0 shrink-0">
          <button onClick={() => { setSelectedSymbol(null); setIsShowAll(true); }}
            className="w-full md:w-auto h-9 md:h-8 px-4 text-[12px] font-semibold tracking-wider uppercase rounded-lg transition-all"
            style={{
              background: (!selectedSymbol && isShowAll) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: (!selectedSymbol && isShowAll) ? "#ffffff" : "#9ca3af",
            }}>
            Show All
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden">

        {/* ── CHART AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-5 pt-4 pb-2 shrink-0 gap-3 md:gap-0">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-white/90 tracking-tight">S50 Outstanding Short</span>
              {selectedSymbol && selectedColor && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#f97316" }}/>
                    <span className="text-[12px] text-gray-400">Outshort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] inline-block"/>
                    <span className="text-[12px] text-gray-400">Price</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
              {RANGES.map(r => (
                <button key={r} onClick={() => applyRange(r)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-all font-medium shrink-0
                    ${range === r ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ── CHART MOUNT ── */}
          <div className="flex-1 min-h-0 px-2 pb-3 relative">
            <div ref={chartContainerRef} className="w-full h-full"
              style={{ visibility: selectedSymbol ? "visible" : "hidden" }}/>
            
            {!selectedSymbol && isShowAll && (
              <div className="absolute inset-0 overflow-y-auto no-scrollbar">
                <StackedLabelChart />
              </div>
            )}

            {!selectedSymbol && !isShowAll && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-[16px] text-gray-600 tracking-wide">
                  Select a symbol or click "Show All" to view chart.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="w-full md:w-[290px] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-l border-white/5" style={{ background: "#0b0e14" }}>
          
          <div className="flex items-center gap-1.5 px-4 md:px-2.5 pt-3 md:pt-2.5 pb-3 md:pb-2 shrink-0">
            
            {/* ── Dropdown (Mobile เท่านั้น) ── */}
            <div className="flex md:hidden flex-1 items-center gap-2 rounded-lg px-3 h-10 relative"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <select
                value={selectedSymbol || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setSelectedSymbol(null);
                    setIsShowAll(true);
                  } else {
                    setSelectedSymbol(val);
                    setIsShowAll(false);
                    applyRange("MAX");
                  }
                }}
                className="w-full bg-transparent text-[14px] text-gray-300 outline-none appearance-none cursor-pointer z-10 h-full"
              >
                <option value="" className="bg-[#0b0e14] text-gray-400">Select a Symbol...</option>
                {MOCK_TABLE.map(row => (
                  <option key={row.symbol} value={row.symbol} className="bg-[#0b0e14] text-white">
                    {row.symbol} &nbsp;—&nbsp; {row.outshort.toFixed(2)}%
                  </option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-gray-500">
                <ChevronDownIcon />
              </div>
            </div>

            {/* ── Search Input (PC เท่านั้น) ── */}
            <div className="hidden md:flex flex-1 items-center gap-2 rounded-lg px-3 h-9"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-gray-500"><SearchIcon /></span>
              <input type="text" placeholder="Type a Symbol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-gray-300 placeholder-gray-600 outline-none"/>
            </div>

            {/* ปุ่มเปิดปิดตาราง (PC เท่านั้น) */}
            <button onClick={() => setTableOpen(o => !o)}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <ChevronUpIcon open={tableOpen}/>
            </button>

            {/* ปุ่ม Refresh */}
            <button onClick={handleReset}
              className="w-10 h-10 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <RefreshIcon spinning={spinning}/>
            </button>
          </div>

          {/* ซ่อน Header ตารางบน Mobile */}
          {tableOpen && (
            <div className="hidden md:flex items-center px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="flex-1 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">Symbol</span>
              <span className="text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase">Outshort %</span>
            </div>
          )}

          {/* ซ่อน List ทั้งหมดบน Mobile, แสดงและเชื่อมกับระบบ Filter บน PC */}
          {tableOpen && (
            <div className="hidden md:block flex-1 overflow-y-auto no-scrollbar pb-2 md:pb-0">
              {filteredTable.map((row, i) => {
                const isSelected = selectedSymbol === row.symbol;
                const realIdx = MOCK_TABLE.findIndex(r => r.symbol === row.symbol);
                const dotColor = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                return (
                  <button key={i}
                    onClick={() => {
                      if (selectedSymbol === row.symbol) {
                        setSelectedSymbol(null);
                        setIsShowAll(false);
                      } else {
                        setSelectedSymbol(row.symbol);
                        setIsShowAll(false);
                        applyRange("MAX");
                      }
                    }}
                    className="w-full flex items-center px-2 py-1 transition-all cursor-pointer">
                    <span className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full transition-all"
                      style={{ background: isSelected ? "rgba(59,130,246,0.2)" : "transparent" }}>
                      <span className="shrink-0 w-3 h-3 rounded-full"
                        style={{ background: isSelected ? "#60a5fa" : dotColor }}/>
                      <span className="flex-1 text-left text-[13px] font-semibold"
                        style={{ color: isSelected ? "#ffffff" : "#9ca3af" }}>
                        {row.symbol}
                      </span>
                      <span className="text-[13px] font-semibold"
                        style={{ color: isSelected ? "#34d399" : "#6b7280" }}>
                        {row.outshort.toFixed(2)}%
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
      `}</style>
    </div>
  );
}