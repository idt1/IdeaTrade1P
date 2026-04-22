import React, { useState, useEffect, useRef, useCallback } from "react";

import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";

/* ================= MOCK DATA HELPERS ================= */
// Replace these with your real API calls
const generateOutshortData = (days = 90) => {
  const data = [];
  let val = 22;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    val += (Math.random() - 0.48) * 0.4;
    val = Math.max(16, Math.min(29, val));
    data.push({
      time: d.toISOString().slice(0, 10),
      value: parseFloat(val.toFixed(2)),
    });
  }
  return data;
};

const generatePriceData = (days = 90) => {
  const data = [];
  let val = 3.8;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    val += (Math.random() - 0.49) * 0.05;
    val = Math.max(3.2, Math.min(4.4, val));
    data.push({
      time: d.toISOString().slice(0, 10),
      value: parseFloat(val.toFixed(2)),
    });
  }
  return data;
};

const MOCK_TABLE = [
  { symbol: "KCE",   outshort: 3.90 },
  { symbol: "HANA",  outshort: 2.88 },
  { symbol: "BH",    outshort: 2.38 },
  { symbol: "MTC",   outshort: 2.15 },
  { symbol: "MINIT", outshort: 2.14 },
  { symbol: "BTS",   outshort: 1.99 },
  { symbol: "BANPU", outshort: 1.95 },
  { symbol: "AMATA", outshort: 1.91 },
  { symbol: "SCC",   outshort: 1.88 },
  { symbol: "SPRC",  outshort: 1.64 },
  { symbol: "IRPC",  outshort: 1.41 },
  { symbol: "IRPC",  outshort: 1.38 },
];

const RANGE_DAYS = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "YTD": 100, "MAX": 730 };

const fmt = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

/* ================= ICONS ================= */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={spinning ? "animate-spin" : ""}
    style={{ transition: "transform 0.3s" }}
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronUpIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

/* ================= MAIN COMPONENT ================= */
export default function S50OutstandingShort() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const outshortSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);

  const [range, setRange] = useState("3M");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [outshortData, setOutshortData] = useState([]);
  const [priceData, setPriceData] = useState([]);

  /* ── Load data ── */
  const loadData = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      const days = RANGE_DAYS[range] || 90;
      setOutshortData(generateOutshortData(days));
      if (selectedSymbol) setPriceData(generatePriceData(days));
      else setPriceData([]);
      setSpinning(false);
    }, 400);
  }, [range, selectedSymbol]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Build / update chart ── */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      outshortSeriesRef.current = null;
      priceSeriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
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
        vertLine: { color: "rgba(255,255,255,0.2)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
        horzLine: { color: "rgba(255,255,255,0.2)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#6b7280",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      leftPriceScale: {
        visible: !!selectedSymbol,
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#6b7280",
        scaleMargins: { top: 0.1, bottom: 0.1 },
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

    // Outshort series (right scale)
    const outshortSeries = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: "#f97316",
      lastValueVisible: true,
      priceLineVisible: false,
    });
    outshortSeriesRef.current = outshortSeries;

    // Price series (left scale) — only when symbol selected
    if (selectedSymbol) {
      const priceSeries = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 2,
        priceScaleId: "left",
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: "#60a5fa",
        lastValueVisible: true,
        priceLineVisible: false,
      });
      priceSeriesRef.current = priceSeries;
    }

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  /* ── Feed data into chart ── */
  useEffect(() => {
    if (!outshortSeriesRef.current || outshortData.length === 0) return;
    outshortSeriesRef.current.setData(outshortData);
    if (priceSeriesRef.current && priceData.length > 0) {
      priceSeriesRef.current.setData(priceData);
    }
    chartRef.current?.timeScale().fitContent();
  }, [outshortData, priceData]);

  /* ── Range → date helpers ── */
  const applyRange = (r) => {
    setRange(r);
    const d = new Date();
    const days = RANGE_DAYS[r] || 90;
    const s = new Date(d);
    s.setDate(d.getDate() - days);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(d.toISOString().slice(0, 10));
  };

  const handleSymbolClick = (sym) => {
    setSelectedSymbol(prev => prev === sym ? null : sym);
  };

  const filteredTable = MOCK_TABLE.filter(r =>
    r.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const RANGES = ["1M", "3M", "6M", "1Y", "YTD", "MAX"];

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden font-sans">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
        {/* Date pickers */}
        <div className="flex items-center gap-2 ml-2">
          {/* Start */}
          <div className="relative">
            <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">
              Start Date
            </label>
            <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
              <CalendarIcon />
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setRange(""); }}
                className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
          <span className="text-gray-600 text-sm">-</span>
          {/* End */}
          <div className="relative">
            <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">
              End Date
            </label>
            <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
              <CalendarIcon />
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setRange(""); }}
                className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: CHART AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Chart header row */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            {/* Title + legend */}
            <div className="flex items-center gap-4">
              <span className="text-[15px] font-semibold text-white/90 tracking-tight">
                S50 Outstanding Short
              </span>
              {selectedSymbol && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block" />
                    <span className="text-[12px] text-gray-400">Outshort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] inline-block" />
                    <span className="text-[12px] text-gray-400">Price</span>
                  </div>
                </div>
              )}
            </div>

            {/* Range buttons */}
            <div className="flex items-center gap-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => applyRange(r)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-all font-medium
                    ${range === r
                      ? "bg-white/10 text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 px-2 pb-4">
            <div ref={chartContainerRef} className="w-full h-full" />
          </div>
        </div>

        {/* ── RIGHT: TABLE PANEL ── */}
        <div className="w-[320px] shrink-0 flex flex-col border-l border-white/5 bg-[#0b0e14]">

          {/* Search + refresh */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 h-9">
              <span className="text-gray-500"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Type a Symbol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-gray-300 placeholder-gray-600 outline-none"
              />
            </div>

            {/* Legend toggle */}
            <button
              onClick={() => setLegendOpen(o => !o)}
              title="Toggle legend"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
            >
              <ChevronUpIcon open={legendOpen} />
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
            >
              <RefreshIcon spinning={spinning} />
            </button>
          </div>

          {/* Column header */}
          <div className="flex items-center px-4 py-2 border-b border-white/5 shrink-0">
            <span className="flex-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">Symbol</span>
            <span className="text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase">Outshort %</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredTable.map((row, i) => {
              const isSelected = selectedSymbol === row.symbol;
              return (
                <button
                  key={i}
                  onClick={() => handleSymbolClick(row.symbol)}
                  className={`w-full flex items-center px-4 py-3 transition-all cursor-pointer border-b border-white/[0.03]
                    ${isSelected
                      ? "bg-white/8 border-l-2 border-l-[#60a5fa]"
                      : "hover:bg-white/4"
                    }`}
                >
                  {/* Blue dot when selected */}
                  {isSelected
                    ? <span className="w-2 h-2 rounded-full bg-[#60a5fa] mr-3 shrink-0" />
                    : <span className="w-2 h-2 mr-3 shrink-0" />
                  }
                  <span className={`flex-1 text-left text-[13px] font-medium ${isSelected ? "text-white" : "text-gray-300"}`}>
                    {row.symbol}
                  </span>
                  <span className="text-[13px] font-semibold text-emerald-400">
                    {row.outshort.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
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