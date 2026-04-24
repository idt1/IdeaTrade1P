import React, { useState, useEffect, useRef, useCallback } from "react";
import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";

/* ================= COLORS ================= */
const SYMBOL_COLORS = [
  "#60a5fa","#f97316","#34d399","#a78bfa","#fbbf24",
  "#f472b6","#22d3ee","#fb7185","#86efac","#c084fc",
  "#fdba74","#67e8f9","#fde68a","#d9f99d","#fca5a5",
];

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
  { symbol: "BDMS",  outshort: 1.38 },
  { symbol: "CBG",   outshort: 1.36 },
  { symbol: "LH",    outshort: 1.36 },
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
  const containerRef = useRef(null);
  const [rowH, setRowH] = useState(15);
  const sorted = [...ALL_SYMBOLS].sort((a, b) => a.outshort - b.outshort);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setRowH(Math.floor(h / sorted.length));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sorted.length]);

  return (
    <div ref={containerRef} className="absolute top-0 bottom-0 right-0 flex items-center">
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {sorted.map((item, i) => {
          const color = BAR_COLORS[i % BAR_COLORS.length];
          return (
            <div key={item.symbol} style={{ display: "flex", height: rowH, flexShrink: 0 }}>
              {/* Label ซ้าย */}
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
              {/* Color block ขวา */}
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
  const [spinning, setSpinning] = useState(false);
  const [showHint, setShowHint] = useState(false);
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
    const symColor = SYMBOL_COLORS[symIdx % SYMBOL_COLORS.length];

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
      if (chartContainerRef.current)
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
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

  const filteredTable = MOCK_TABLE.filter(r =>
    r.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedIdx = selectedSymbol ? MOCK_TABLE.findIndex(r => r.symbol === selectedSymbol) : -1;
  const selectedColor = selectedIdx >= 0 ? SYMBOL_COLORS[selectedIdx % SYMBOL_COLORS.length] : null;

  return (
    <div className="flex flex-col text-white font-sans" style={{ height: "100vh", background: "#0d1117" }}>

      {/* ── HINT MODAL ── */}
      {showHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHint(false)}>
          <div className="bg-[#1a2035] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-[15px]">S50 Outstanding Short</h3>
              <button onClick={() => setShowHint(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="space-y-2.5 text-[13px] text-gray-400 leading-relaxed">
              <p>แสดงข้อมูล <span className="text-white font-medium">Outstanding Short Position</span> ของหุ้นใน SET50</p>
              <p>• กราฟเริ่มต้นแสดงเป็น <span className="text-white">Snapshot ล่าสุด</span> ทุก Symbol</p>
              <p>• กดเลือก Symbol ในตารางขวาเพื่อดู Outshort + Price เฉพาะตัว</p>
              <p>• กด Show All หรือกด Symbol เดิมอีกครั้งเพื่อกลับมาดูทั้งหมด</p>
              <p>• ปรับช่วงเวลาด้วยปุ่ม 1M / 3M / 6M / 1Y / YTD / MAX</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
        <button onClick={() => setShowHint(true)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-gray-400 hover:text-white transition-all shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          ?
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">Start Date</label>
            <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
              <CalendarIcon />
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setRange(""); }}
                className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                style={{ colorScheme: "dark" }}/>
            </div>
          </div>
          <span className="text-gray-600 text-sm">-</span>
          <div className="relative">
            <label className="absolute -top-[9px] left-3 text-[10px] text-gray-500 bg-[#0d1117] px-1 leading-none pointer-events-none">End Date</label>
            <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-[13px] text-gray-300">
              <CalendarIcon />
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setRange(""); }}
                className="bg-transparent outline-none text-[13px] text-gray-300 cursor-pointer"
                style={{ colorScheme: "dark" }}/>
            </div>
          </div>
        </div>

        <div className="ml-auto">
          <button onClick={() => setSelectedSymbol(null)}
            className="h-8 px-4 text-[12px] font-semibold tracking-wider uppercase rounded-lg transition-all"
            style={{
              background: !selectedSymbol ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: !selectedSymbol ? "#ffffff" : "#9ca3af",
            }}>
            Show All
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── CHART AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-white/90 tracking-tight">S50 Outstanding Short</span>
              {selectedSymbol && selectedColor && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: selectedColor }}/>
                    <span className="text-[12px] text-gray-400">Outshort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] inline-block"/>
                    <span className="text-[12px] text-gray-400">Price</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {RANGES.map(r => (
                <button key={r} onClick={() => applyRange(r)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-all font-medium
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
            {/* Stacked label chart — overlay ใน chart area, absolute right-0 */}
            {!selectedSymbol && (
              <div className="absolute inset-0 pointer-events-none">
                <StackedLabelChart />
              </div>
            )}
          </div>
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="w-[290px] shrink-0 flex flex-col border-l border-white/5" style={{ background: "#0b0e14" }}>
          <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 rounded-lg px-3 h-9"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-gray-500"><SearchIcon /></span>
              <input type="text" placeholder="Type a Symbol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-gray-300 placeholder-gray-600 outline-none"/>
            </div>
            <button onClick={() => setTableOpen(o => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <ChevronUpIcon open={tableOpen}/>
            </button>
            <button onClick={loadData}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <RefreshIcon spinning={spinning}/>
            </button>
          </div>

          {tableOpen && (
            <div className="flex items-center px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="flex-1 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">Symbol</span>
              <span className="text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase">Outshort %</span>
            </div>
          )}

          {tableOpen && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {filteredTable.map((row, i) => {
                const isSelected = selectedSymbol === row.symbol;
                const realIdx = MOCK_TABLE.findIndex(r => r.symbol === row.symbol);
                const dotColor = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                return (
                  <button key={i}
                    onClick={() => setSelectedSymbol(prev => prev === row.symbol ? null : row.symbol)}
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