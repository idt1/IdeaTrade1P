// ─── ALL CHARTS POWERED BY lightweight-charts (LWC) ─────────────────────────
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// 🟢 1. อิมพอร์ต useAuth เข้ามาใช้ตรวจสอบสิทธิ์จากศูนย์กลาง
import { useAuth } from "@/context/AuthContext"; // ⚠️ เช็ค Path ให้ตรงด้วยนะครับ

import FlowIntradayDashboard from "./components/FlowIntradayDashboard.jsx";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import RefreshIcon from "@mui/icons-material/Refresh";
import ToolHint from "@/components/ToolHint.jsx";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

const BASE_TS = (() => {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
})();

const LABELS = Array.from({ length: 150 }, (_, i) => BASE_TS + i * 5 * 60);

const STOCK_LIST = [
  "PTT","TOP","DELTA","AOT","ADVANC","SCB","KBANK","BBL","KTB","BAY",
  "CPALL","CPN","CRC","HMPRO","BJC","IVL","SCC","SCCC","TISCO","KKP",
  "MINT","ERW","CENTEL","AWC","DUSIT","TRUE","DTAC","JAS","THCOM","INTUCH",
  "PTTEP","PTTGC","IRPC","BCP","ESSO","SPRC","GULF","GPSC","RATCH","EGCO",
  "WHA","AMATA","STA","TFG","NRF","GFPT","CPF","TU","ICHI",
  "OSP","OISHI","SAPPE","MALEE","CBG","KCE","HANA","SVI","ADVICE",
  "BDMS","BH","BCH","CHG","RJH","VIBHA","PRINC","PR9","PHOL","NKI",
  "BTS","BEM","SINO","STEC","ITD","SEAFCO","PYLON","SYNTEC","NWR","CK",
  "MTC","SAWAD","TIDLOR","AEON","KTC","THANI","SELIC","ASK","MACO","VGI",
  "1DIV","PQS","JMART","JMT","SINGER","PLANB","MAJOR","RS","WORK",
];

const CHART_MODES = [
  { value: "flow",  label: "Flow"  },
  { value: "price", label: "Price" },
];

// ─── LWC THEME ────────────────────────────────────────────────────────────────
const LWC_THEME = {
  layout: {
    background: { type: ColorType.Solid, color: "#141b2d" },
    textColor: "#475569",
    fontSize: 9,
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(sym) {
  let h = 0x811c9dc5;
  for (let i = 0; i < sym.length; i++) { h ^= sym.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0); }
  return h;
}

// ─── DATA GENERATION (SMOOTH CUMULATIVE FLOW) ─────────────────────────────────
function generateFlowSeries(symbol) {
  if (!symbol) return null;
  const seed = hashSymbol(symbol);
  const rng = createRng(seed);

  const points = 150; 
  const basePrice = 10 + (seed % 400); 
  const volatility = 0.5 + rng() * 2; 
  const dailyTrend = (rng() - 0.5) * 2.5; 

  let cumBuy = 0;
  let cumSell = 0;
  let price = basePrice;
  let momentum = 0;

  const buyFlow = [];
  const sellFlow = [];
  const netFlow = [];
  const prices = [];

  for (let i = 0; i < points; i++) {
    const pct = i / (points - 1);
    const volumeMultiplier = 1 + Math.pow(pct - 0.5, 2) * 5; 

    momentum = momentum * 0.90 + (rng() - 0.5) * 1.5;
    
    const rawBuy = Math.max(0, (rng() * 4 + dailyTrend + momentum) * volumeMultiplier * volatility);
    const rawSell = Math.max(0, (rng() * 4 - dailyTrend - momentum) * volumeMultiplier * volatility);

    cumBuy += rawBuy * 1000;
    cumSell -= rawSell * 1000; 
    const net = cumBuy + cumSell;

    price += (rawBuy - rawSell) * 0.05 * (basePrice / 100);

    buyFlow.push(Math.round(cumBuy));
    sellFlow.push(Math.round(cumSell));
    netFlow.push(Math.round(net));
    prices.push(parseFloat(price.toFixed(2)));
  }

  return { buyFlow, sellFlow, netFlow, prices };
}

function toLineData(arr) {
  return arr.map((v, i) => ({ time: LABELS[i % LABELS.length], value: v }));
}

// ─── CHART SKELETON ───────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-[#141b2d] overflow-hidden relative">
      <style>{`@keyframes shimmerFlow{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 rounded-full bg-slate-800 w-20" /><div className="h-2 rounded-full bg-slate-800 w-12" />
        </div>
        <div className="flex-1 my-3 rounded bg-slate-800/60 relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {[0.2,0.4,0.6,0.8].map((y,i)=><line key={`h${i}`} x1="0" y1={`${y*100}%`} x2="100%" y2={`${y*100}%`} stroke="#1e293b" strokeWidth="1"/>)}
            {[0.2,0.4,0.6,0.8].map((x,i)=><line key={`v${i}`} x1={`${x*100}%`} y1="0" x2={`${x*100}%`} y2="100%" stroke="#1e293b" strokeWidth="1"/>)}
          </svg>
        </div>
        <div className="flex gap-2">{[...Array(6)].map((_,i)=><div key={i} className="h-2 rounded-full bg-slate-800 flex-1"/>)}</div>
      </div>
      <div className="absolute inset-0" style={{background:"linear-gradient(90deg,transparent 0%,rgba(56,189,248,0.08) 40%,rgba(125,211,252,0.18) 50%,rgba(56,189,248,0.08) 60%,transparent 100%)",animation:"shimmerFlow 1.8s ease-in-out infinite"}}/>
    </div>
  );
}

// ─── SYMBOL INPUT ─────────────────────────────────────────────────────────────
function SymbolInput({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => { if (value === "" && committed.current !== "") { setQuery(""); committed.current = ""; } }, [value]);

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    return [...STOCK_LIST.filter(s => s.startsWith(q)), ...STOCK_LIST.filter(s => !s.startsWith(q) && s.includes(q))].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase(); setQuery(v); committed.current = v; onChange(v); setOpen(false); setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open && e.key === "ArrowDown") { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(h => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx(h => Math.max(h - 1, -1)); return; }
    if (e.key === "Tab") { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter") { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 min-w-[70px]">
      <input value={query} onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }} onFocus={() => setOpen(true)} onKeyDown={handleKey} placeholder="Symbol..." className="w-full max-w-[80px] sm:w-[80px] bg-transparent text-xs sm:text-sm font-bold text-white outline-none placeholder-slate-600 tracking-wider cursor-text"/>
      <button onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 p-1">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d={open ? "M4 0L8 5H0Z" : "M4 5L0 0H8Z"}/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 sm:w-52 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-[200] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span className="text-[9px] text-slate-600 tracking-widest uppercase">{query ? `"${query}"` : "Popular"}</span>
          </div>
          <div className="max-h-48 overflow-y-auto" style={scrollbarHideStyle}>
            {filtered.length === 0
              ? <div className="px-3 py-3 text-slate-600 text-[10px] text-center">No match — press Enter to use "{query}"</div>
              : filtered.map((sym, idx) => {
                const isHi = idx === hiIdx;
                return (
                  <div key={sym} onMouseDown={() => commit(sym)} onMouseEnter={() => setHiIdx(idx)}
                    className={`flex items-center px-3 py-2 cursor-pointer transition-all ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400" : "border-l-2 border-transparent hover:bg-slate-800/40"}`}>
                    <span className={`text-[12px] font-bold tracking-wider ${isHi ? "text-white" : "text-slate-300"}`}>{sym}</span>
                  </div>
                );
              })}
          </div>
          {value && <div onMouseDown={() => commit("")} className="flex items-center justify-center gap-1 px-3 py-2 text-[9px] text-slate-700 hover:text-red-400 cursor-pointer border-t border-slate-800 transition-colors"><span>✕</span><span>Clear symbol</span></div>}
        </div>
      )}
    </div>
  );
}

// ─── CHART MODE DROPDOWN ──────────────────────────────────────────────────────
function ChartModeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = CHART_MODES.find(m => m.value === value) ?? CHART_MODES[0];

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className={`relative flex items-center bg-[#1f2937] border rounded-md pl-2 pr-6 py-[3px] text-[11px] sm:text-xs font-semibold transition-all min-w-[64px]
          ${open ? "border-slate-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"}`}
      >
        <span className="block truncate">{current.label}</span>

        <svg
          width="7"
          height="4"
          viewBox="0 0 8 5"
          fill="currentColor"
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 5L0 0H8Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-20 bg-[#0d1526] border border-slate-600/60 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.8)] z-[200] overflow-hidden py-0.5">
          {CHART_MODES.map(({ value: v, label }) => (
            <div
              key={v}
              onMouseDown={() => { onChange(v); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer text-xs font-bold transition-all ${
                v === value
                  ? "text-white bg-[#1e293b]"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FULLSCREEN SYMBOL INPUT ──────────────────────────────────────────────────
function FullscreenSymbolInput({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => { if (value === "" && committed.current !== "") { setQuery(""); committed.current = ""; } }, [value]);

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    return [...STOCK_LIST.filter(s => s.startsWith(q)), ...STOCK_LIST.filter(s => !s.startsWith(q) && s.includes(q))].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase(); setQuery(v); committed.current = v; onChange(v); setOpen(false); setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHiIdx(h => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx(h => Math.max(h - 1, -1)); return; }
    if (e.key === "Tab") { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter") { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center w-full max-w-[160px] sm:max-w-none sm:w-auto">
      <div className={`flex items-center gap-2 bg-[#1a2235] border rounded-lg px-2 sm:px-3 py-1.5 transition-all w-full sm:w-56 ${open ? "border-cyan-500/60" : "border-slate-700 hover:border-slate-500"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" className="flex-shrink-0 hidden sm:block"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={query} onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }} onFocus={() => setOpen(true)} onKeyDown={handleKey} placeholder="พิมพ์ชื่อหุ้น..." className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm outline-none placeholder-slate-600 pr-4 sm:pr-6 ${value && !open ? "font-bold text-white" : "text-white"}`}/>
        {query && <button onMouseDown={() => commit("")} className="absolute right-2 sm:right-3 text-slate-600 hover:text-slate-300 text-xs sm:text-sm transition-colors">✕</button>}
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-56 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-2xl z-[200] overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0
              ? <div className="px-3 py-3 text-slate-600 text-[11px] text-center">ไม่พบ — กด Enter เพื่อใช้ "{query}"</div>
              : filtered.map((sym, idx) => {
                const isHi = idx === hiIdx;
                return <div key={sym} onMouseDown={() => commit(sym)} onMouseEnter={() => setHiIdx(idx)} className={`px-4 py-2.5 cursor-pointer text-sm font-bold tracking-wider transition-all ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-white" : "border-l-2 border-transparent text-slate-300 hover:bg-slate-800/40"}`}>{sym}</div>;
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LWC CHART ────────────────────────────────────────────────────────────────
function LWCChart({
  symbol,
  chartId,
  chartType = "flow",
  chartInstanceRefs,
  onCrosshairMove,
  externalTime,
  isLoading = false,
  hlineValue = null,       
  drawingMode = false,     
  onChartClick = null,     
}) {
  const onChartClickRef = useRef(onChartClick);

  useEffect(() => {
    onChartClickRef.current = onChartClick;
  }, [onChartClick]);

  const series = useMemo(() => generateFlowSeries(symbol), [symbol]);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const primarySeriesRef = useRef(null);
  const isSyncingRef = useRef(false);
  
  const lwcData = useMemo(() => {
    if (!series) return null;
    return {
      net:   toLineData(series.netFlow),
      buy:   toLineData(series.buyFlow),
      sell:  toLineData(series.sellFlow),
      price: toLineData(series.prices),
    };
  }, [series]);

  useEffect(() => {
    if (!containerRef.current || !lwcData) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; primarySeriesRef.current = null; }
    if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);

    const el = containerRef.current;
    const chart = createChart(el, {
      ...LWC_THEME,
      leftPriceScale: chartType === "price"
        ? { visible: true, borderColor: "rgba(255,255,255,0.06)", textColor: "#475569" }
        : { visible: false },
      handleScroll: true,
      handleScale: true,
      width: el.clientWidth,
      height: el.clientHeight,
    });
    chartRef.current = chart;
    if (chartInstanceRefs) chartInstanceRefs.current.set(chartId, chart);

    let primarySeries = null;

    if (chartType === "flow") {
      const netS  = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      const buyS  = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      const sellS = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      
      netS.setData(lwcData.net); buyS.setData(lwcData.buy); sellS.setData(lwcData.sell);
      netS.createPriceLine({ price: 0, color: "#334155", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      primarySeries = netS;
    } else {
      const netS  = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2,   priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      const buyS  = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      const sellS = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      
      netS.setData(lwcData.net); buyS.setData(lwcData.buy); sellS.setData(lwcData.sell);
      netS.createPriceLine({ price: 0, color: "#334155", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      
      const priceS = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1.5, priceLineVisible: true, lastValueVisible: true, title: "Price", priceScaleId: "right" });
      priceS.setData(lwcData.price);
      primarySeries = netS;
    }

    primarySeriesRef.current = primarySeries;

    if (hlineValue != null && primarySeries) {
      primarySeries.createPriceLine({
        price: hlineValue,
        color: "#a78bfa",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, 
        title: "H-Line",        
        axisLabelColor: "#8b5cf6",   
        axisLabelTextColor: "#ffffff"
      });
    }

    chart.subscribeCrosshairMove(param => {
      if (!isSyncingRef.current && param.time && onCrosshairMove) onCrosshairMove(param.time);
    });

    chart.subscribeClick(param => {
      if (!param.point || !onChartClickRef.current || !primarySeriesRef.current) return;
      const price = primarySeriesRef.current.coordinateToPrice(param.point.y);
      if (price != null) onChartClickRef.current(price);
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0 && e.contentRect.height > 0)
        chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      primarySeriesRef.current = null;
      if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, chartType, hlineValue]);

  useEffect(() => {
    const chart = chartRef.current; if (!chart || !externalTime) return;
    isSyncingRef.current = true;
    try { if (typeof chart.setCrosshairPosition === "function") chart.setCrosshairPosition(NaN, externalTime, chart.series()?.[0]); } catch (_) {}
    isSyncingRef.current = false;
  }, [externalTime]);

  if (isLoading) return <div className="w-full h-full"><ChartSkeleton /></div>;
  if (!series) return (
    <div className="text-slate-600 text-xs font-semibold flex flex-col items-center justify-center w-full h-full gap-1 bg-[#141b2d]">
      <span className="text-2xl opacity-30">⌨</span><span className="text-center px-4">Type a symbol above</span>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: drawingMode ? "crosshair" : "default" }}
    />
  );
}

// ─── ALERT SETTINGS TOOLTIP ───────────────────────────────────────────────────
function AlertSettingsTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 320 });
  const [pointerConfig, setPointerConfig] = useState({ type: "left", offset: 0 });
  const [animClass, setAnimClass] = useState("popoverSlideIn");

  const POPOVER_H_ESTIMATE = 280;

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      let top, left, width, type, offset, anim;

      if (isMobile) {
        width = vw - 32;
        left = 16;
        top = rect.bottom + 12;
        type = "top";
        anim = "popoverSlideDown";
        const btnCenter = rect.left + rect.width / 2;
        offset = btnCenter - left;
      } else {
        width = 360;
        left = rect.right + 12;
        type = "left";
        anim = "popoverSlideIn";

        if (left + width > vw - 16) {
          left = rect.left - width - 12;
          type = "right";
          anim = "popoverSlideInRight";
        }

        top = rect.top - 8;

        if (top + POPOVER_H_ESTIMATE > vh - 8) {
          top = vh - POPOVER_H_ESTIMATE - 8;
        }
        if (top < 8) {
          top = 8;
        }

        offset = 0;
      }

      setPointerConfig({ type, offset });
      setPopoverPos({ top, left, width });
      setAnimClass(anim);
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsHovered(false);
  };

  useEffect(() => {
    if (isOpen) {
      const onScroll = () => setIsOpen(false);
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }
  }, [isOpen]);

  const getClipPath = () => {
    const arrowWidth = 14;
    const arrowHeight = 8;

    if (pointerConfig.type === "top") {
      const cx = pointerConfig.offset;
      return `polygon(
        0% ${arrowHeight}px,
        ${cx - arrowWidth / 2}px ${arrowHeight}px,
        ${cx}px 0%,
        ${cx + arrowWidth / 2}px ${arrowHeight}px,
        100% ${arrowHeight}px,
        100% 100%,
        0% 100%
      )`;
    } else if (pointerConfig.type === "left") {
      return `polygon(
        ${arrowHeight}px 0%,
        100% 0%,
        100% 100%,
        ${arrowHeight}px 100%,
        ${arrowHeight}px 24px,
        0% 16px,
        ${arrowHeight}px 8px
      )`;
    } else if (pointerConfig.type === "right") {
      return `polygon(
        0% 0%,
        calc(100% - ${arrowHeight}px) 0%,
        calc(100% - ${arrowHeight}px) 8px,
        100% 16px,
        calc(100% - ${arrowHeight}px) 24px,
        calc(100% - ${arrowHeight}px) 100%,
        0% 100%
      )`;
    }
    return "none";
  };

  return (
    <>
      {/* Alert Settings Button */}
      <button
        ref={buttonRef}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 text-xs cursor-pointer select-none transition-colors"
        onClick={handleButtonClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isOpen && setIsHovered(false)}
        title="Smart Flow Alerts Information"
      >
        <span className="font-medium">Alert Settings</span>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
          isOpen || isHovered 
            ? "bg-cyan-500/30 border border-cyan-500/60 text-cyan-400" 
            : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
        }`}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleClose}
          style={{ cursor: "default" }}
        />
      )}

      {/* Popover */}
      {isOpen && (
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: `${popoverPos.width}px`,
            animation: `${animClass} 0.2s ease-out forwards`,
            filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.6))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md relative"
            style={{
              clipPath: getClipPath(),
              paddingTop: pointerConfig.type === "top" ? "20px" : "16px",
              paddingBottom: "16px",
              paddingLeft: pointerConfig.type === "left" ? "24px" : "20px",
              paddingRight: pointerConfig.type === "right" ? "24px" : "20px",
            }}
          >
            <div className="absolute inset-0 border border-slate-600/50 rounded-xl mix-blend-overlay pointer-events-none" />
            <div className="relative z-20 space-y-3">
              {/* Header */}
              <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest">
                Smart Flow Alerts
              </h3>

              {/* Main Description */}
              <p className="text-slate-300 text-xs leading-relaxed">
                ระบบแจ้งเตือนอัจฉริยะที่คุณสามารถ
                <span className="text-cyan-300 font-semibold"> ตั้งเงื่อนไขได้เอง</span>
                ทั้ง<span className="text-cyan-300 font-semibold"> ระดับราคา</span>
                และ<span className="text-cyan-300 font-semibold"> สัญญาณเงินไหล</span> เมื่อถึงจุดที่กำหนด
                ระบบจะ<span className="text-cyan-300 font-semibold"> แจ้งเตือน(ในกลุ่มรวม telegram)ทันที</span>
              </p>

              {/* Features List */}
              <div className="space-y-2 pt-1">
                {[
                  {
                    icon: "⚙",
                    title: "ตั้งเงื่อนไขได้เอง",
                    desc: "กำหนดเงื่อนไขการแจ้งเตือนตามที่คุณต้องการ",
                  },
                  {
                    icon: "📊",
                    title: "ระดับราคา (Price Level)",
                    desc: "ตั้งราคาเป้าหมายและได้รับแจ้งเตือนทันที",
                  },
                  {
                    icon: "◈",
                    title: "สัญญาณเงินไหล (Flow Signal)",
                    desc: "ติดตามการเปลี่ยนแปลงของกระแสเงินไหล",
                  },
                  {
                    icon: "✈",
                    title: "แจ้งเตือน Telegram ทันที",
                    desc: "ส่งแจ้งเตือนไปยังกลุ่มรวม Telegram ทันที",
                  },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 text-sm font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {feature.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-200 leading-tight">
                        {feature.title}
                      </p>
                      <p className="text-[9px] text-slate-400 leading-snug">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View Details Link */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 group pt-1"
              >
                View feature details here
                <svg
                  className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popoverSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowIntraday() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  // 🟢 2. ดึงข้อมูล User จาก AuthContext
  const { userData, currentUser, loading } = useAuth();
  
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [isMember,         setIsMember]        = useState(false);
  const [enteredTool,     setEnteredTool]     = useState(false);
  const [layout,          setLayout]          = useState("12");
  const [symbols,         setSymbols]         = useState(Array(12).fill(""));
  const [chartModes,      setChartModes]      = useState(Array(12).fill("flow"));
  const [fullscreenIndex, setFullscreenIndex] = useState(null);
  const [fullscreenMode,  setFullscreenMode]  = useState("flow");
  const [showLeft,        setShowLeft]        = useState(false);
  const [showRight,       setShowRight]       = useState(true);
  const [externalTime,    setExternalTime]    = useState(null);
  const [watchlists,      setWatchlists]      = useState([]);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showWatchPanel,  setShowWatchPanel]  = useState(false);
  const [newListName,     setNewListName]     = useState("");
  const [activeWatchlist, setActiveWatchlist] = useState(null);
  const [loadingMap,      setLoadingMap]      = useState(Array(12).fill(false));

  const [hlineMap,        setHlineMap]        = useState({});
  const [drawingIndex,    setDrawingIndex]    = useState(null);
  const [fsHline,         setFsHline]         = useState(null);
  const [fsDrawing,       setFsDrawing]       = useState(false);

  // State for Rotate Device Warning Modal
  const [showRotateModal, setShowRotateModal] = useState(false);

  const chartInstanceRefs = useRef(new Map());

  const handleBellClick = useCallback((index, sym) => {
    if (!sym) return;
    if (hlineMap[index] != null) {
      setHlineMap(prev => ({ ...prev, [index]: null }));
      setDrawingIndex(null);
    } else if (drawingIndex === index) {
      setDrawingIndex(null);
    } else {
      setDrawingIndex(index);
    }
  }, [hlineMap, drawingIndex]);

  const makeChartClickHandler = useCallback((index) => (price) => {
    setHlineMap(prev => ({ ...prev, [index]: price }));
    setDrawingIndex(null);
  }, []);

  const handleFsBell = useCallback(() => {
    if (fsHline != null) {
      setFsHline(null);
      setFsDrawing(false);
    } else if (fsDrawing) {
      setFsDrawing(false);
    } else {
      setFsDrawing(true);
    }
  }, [fsHline, fsDrawing]);

  const handleFsChartClick = useCallback((price) => {
    setFsHline(price);
    setFsDrawing(false);
  }, []);

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);
  const loadingTimeoutsRef = useRef({});

  const selectedSymbols = useMemo(() => [...new Set(symbols.filter(s => s.trim() !== ""))], [symbols]);
  const boxCount = parseInt(layout);
  const boxes = Array.from({ length: boxCount });

  const gridCols = useMemo(() => {
    if (isMobile) return 1;
    if (layout === "12") return windowWidth >= 1280 ? 4 : windowWidth >= 1024 ? 3 : 2;
    if (layout === "6")  return windowWidth >= 1024 ? 3 : windowWidth >= 640 ? 2 : 1;
    return windowWidth >= 640 ? 2 : 1;
  }, [isMobile, layout, windowWidth]);
  const gridRows = Math.ceil(boxCount / gridCols);
  
  const minRowHeight = isMobile ? '280px' : '260px';

  const handleCrosshairMove = useCallback((time) => { setExternalTime(time ?? null); }, []);
  const handleModeChange    = useCallback((index, mode) => { setChartModes(prev => { const u = [...prev]; u[index] = mode; return u; }); }, []);
  const handleRefresh = useCallback((index) => {
    const chart = chartInstanceRefs.current.get(`grid-${index}`);
    if (chart) {
      chart.timeScale().scrollToRealTime();
      chart.timeScale().fitContent();
    }
  }, []);
  const handleFullscreenReset = useCallback(() => {
    const chart = chartInstanceRefs.current.get("fullscreen");
    if (chart) {
      chart.timeScale().scrollToRealTime();
      chart.timeScale().fitContent();
    }
  }, []);

  const handleOpenAddModal  = useCallback(() => { if (selectedSymbols.length === 0) return; setNewListName(""); setShowAddModal(true); }, [selectedSymbols]);
  const handleConfirmAdd    = useCallback(() => {
    const name = newListName.trim() || `Watchlist ${watchlists.length + 1}`;
    setWatchlists(prev => [...prev, { id: Date.now(), name, symbols: selectedSymbols }]);
    setShowAddModal(false);
  }, [newListName, watchlists.length, selectedSymbols]);
  const handleDeleteWatchlist = useCallback((id) => { setWatchlists(prev => prev.filter(w => w.id !== id)); setActiveWatchlist(prev => prev === id ? null : prev); }, []);

  // 🟢 3. ตรวจสอบสิทธิ์จาก userData.subscriptions ใน AuthContext
  useEffect(() => {
    if (loading) return; 

    const toolId = "flow";

    if (userData && userData.subscriptions && userData.subscriptions[toolId]) {
      const expireTimestamp = userData.subscriptions[toolId];
      let expireDate;
      try { 
        expireDate = typeof expireTimestamp.toDate === "function" 
          ? expireTimestamp.toDate() 
          : new Date(expireTimestamp); 
      } catch (e) { 
        expireDate = new Date(0); 
      }
      setIsMember(expireDate.getTime() > new Date().getTime());
    } else { 
      // Fallback
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setIsMember(parsed.role === "member" || parsed.role === "membership");
        } catch (error) {
          setIsMember(false);
        }
      } else {
        setIsMember(false);
      }
    }
  }, [userData, loading]);

  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeft(scrollLeft > 1); setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
  }, []);

  const scroll = (dir) => {
    if (!scrollContainerRef.current) return;
    isPaused.current = true;
    scrollContainerRef.current.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
    scrollDirection.current = dir === "left" ? -1 : 1;
    setTimeout(checkScroll, 300); setTimeout(() => { isPaused.current = false; }, 500);
  };

  useEffect(() => {
    const c = scrollContainerRef.current; if (!c) return;
    const id = setInterval(() => {
      if (isPaused.current || !c) return;
      const { scrollLeft, scrollWidth, clientWidth } = c;
      const max = scrollWidth - clientWidth;
      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= max - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && scrollLeft <= 2) scrollDirection.current = 1;
      c.scrollLeft += scrollDirection.current; checkScroll();
    }, 15);
    return () => clearInterval(id);
  }, [isMember, enteredTool, checkScroll]);

  useEffect(() => { checkScroll(); window.addEventListener("resize", checkScroll); return () => window.removeEventListener("resize", checkScroll); }, [checkScroll]);
  
  useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") {
        setFullscreenIndex(null);
        setDrawingIndex(null);
        setFsDrawing(false);
        setShowWatchPanel(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  
  useEffect(() => { if (!showWatchPanel) return; const fn = e => { if (!e.target.closest("[data-watchpanel]")) setShowWatchPanel(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, [showWatchPanel]);
  useEffect(() => { return () => { Object.values(loadingTimeoutsRef.current).forEach(clearTimeout); }; }, []);

  const handleSymbolChange = useCallback((index, value) => {
    const nextValue = value.toUpperCase().trim();
    if (loadingTimeoutsRef.current[index]) clearTimeout(loadingTimeoutsRef.current[index]);
    if (!nextValue) {
      setSymbols(prev => { const u = [...prev]; u[index] = ""; return u; });
      setLoadingMap(prev => { const u = [...prev]; u[index] = false; return u; });
      setHlineMap(prev => ({ ...prev, [index]: null }));
      if (drawingIndex === index) setDrawingIndex(null);
      return;
    }
    setLoadingMap(prev => { const u = [...prev]; u[index] = true; return u; });
    loadingTimeoutsRef.current[index] = setTimeout(() => {
      setSymbols(prev => { const u = [...prev]; u[index] = nextValue; return u; });
      setLoadingMap(prev => { const u = [...prev]; u[index] = false; return u; });
      delete loadingTimeoutsRef.current[index];
    }, 700);
  }, [drawingIndex]);

  const features = [
    { title: "Multi-Asset Flow Monitor", desc: "Monitor up to 12 stocks at once in a powerful grid layout." },
    { title: "Click-to-Place HLine Alert", desc: "Click the bell, then click the chart to drop a horizontal alert line instantly." },
    { title: "Customizable Layout", desc: "Switch layouts and adapt to your trading style." },
  ];

  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12 px-2 md:px-0">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">3 Main Features</h2>
      <div className="relative group" onMouseEnter={() => (isPaused.current = true)} onMouseLeave={() => (isPaused.current = false)}>
        <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full md:rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-4 md:gap-6 py-4 px-1" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {features.map((item, i) => (
            <div key={i} className="w-[300px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-6 md:p-8 rounded-xl hover:border-cyan-500/30 transition duration-300">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full md:rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );

  const dashboardPreviewJSX = (
    <div className="relative group w-full max-w-5xl mb-16 px-2 md:px-0">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"/>
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-3 md:px-4 py-2 md:py-3 flex items-center border-b border-slate-700/50">
          <div className="flex gap-1.5 md:gap-2"><div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80"/><div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80"/><div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80"/></div>
        </div>
        <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden"><FlowIntradayDashboard /></div>
      </div>
    </div>
  );

  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight"><span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Flow Intraday</span></h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Turn your trading screen into an elite surveillance system</p>
          </div>
          {dashboardPreviewJSX}{featuresSectionJSX}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!currentUser && <button onClick={() => navigate("/login")} className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">Sign In</button>}
              <button onClick={() => navigate("/member-register")} className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">Join Membership</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight"><span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Flow Intraday</span></h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Turn your trading screen into an elite surveillance system</p>
          </div>
          {dashboardPreviewJSX}{featuresSectionJSX}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <button onClick={() => setEnteredTool(true)} className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300">
              <span className="mr-2">Start Using Tool</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-screen bg-[#0b111a] text-white px-2 sm:px-3 py-2 sm:py-3 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0">

{/* Top Controls - Responsive Wrap */}
        <div className="flex flex-row items-center justify-between gap-2 mb-3 flex-shrink-0">
          
          {/* Left: ToolHint + Layout + Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                Intraday order flow monitor. Flow mode: Net/Buy/Sell lines. Price mode: dual-axis with price overlay. Click bell icon then click chart to place a horizontal alert line. Click bell again to remove it.
              </ToolHint>

              {/* Layout Toggle */}
              <div className="flex items-center gap-1.5 bg-[#111827] border border-slate-700 px-1.5 py-1 rounded-lg">
                <span className="text-[10px] text-slate-500 font-medium ml-1 hidden sm:inline">VIEW</span>
                <div className="flex gap-1">
                  {["12","6","4"].map(col => (
                    <button key={col} onClick={() => setLayout(col)} 
                      className={`w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center transition ${layout === col ? "bg-purple-600 text-white" : "bg-[#1f2937] text-slate-400 hover:text-white"}`}>
                      {col === "12" ? "▦" : col === "6" ? "▤" : "☰"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 sm:gap-6 text-[11px] sm:text-[13px] font-medium text-blue-200/80">
              <span className="flex items-center gap-1.5 sm:gap-2">
                Price
                <svg width="18" height="2" viewBox="0 0 24 2" className="sm:w-[24px]">
                  <line x1="0" y1="1" x2="24" y2="1" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                Value
                <div className="flex flex-col gap-[3px] sm:gap-[4px]">
                  <svg width="14" height="2" viewBox="0 0 20 2" className="sm:w-[20px]">
                    <line x1="0" y1="1" x2="20" y2="1" stroke="#4ade80" strokeWidth="2" />
                  </svg>
                  <svg width="14" height="2" viewBox="0 0 20 2" className="sm:w-[20px]">
                    <line x1="0" y1="1" x2="20" y2="1" stroke="#f87171" strokeWidth="2" />
                  </svg>
                </div>
              </span>
            </div>
          </div>
        
          
          {/* Right: Watchlist + ADD */}
          <div className="flex items-center gap-2">
            <div className="relative" data-watchpanel>
              <button onClick={() => setShowWatchPanel(v => !v)} className="flex items-center gap-1.5 bg-[#111827] border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded-lg text-xs transition-all">
                <span className="text-red-400">♥</span>
                <span className="text-slate-300">Watchlists</span>
                {watchlists.length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {watchlists.length}
                  </span>
                )}
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showWatchPanel ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </button>

              {/* Watchlist Modal Dropdown */}
              {showWatchPanel && (
                <div className="absolute right-0 top-full mt-2 w-[90vw] max-w-[300px] sm:w-72 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">My Watchlists</span>
                    <button onClick={() => setShowWatchPanel(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
                  </div>
                  {watchlists.length === 0
                    ? <div className="px-4 py-6 text-center text-slate-500 text-sm">No watchlists yet.<br/>Select symbols and press ♥ ADD.</div>
                    : <ul className="max-h-72 overflow-y-auto" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
                      {watchlists.map(wl => (
                        <li key={wl.id} className="border-b border-slate-800 last:border-0">
                          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#1e293b] cursor-pointer transition" onClick={() => setActiveWatchlist(activeWatchlist === wl.id ? null : wl.id)}>
                            <div className="flex items-center gap-2">
                              <svg className={`w-3 h-3 text-slate-400 transition-transform ${activeWatchlist === wl.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                              <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-[140px]">{wl.name}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{wl.symbols.length}</span>
                            </div>
                            <button onClick={e => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }} className="text-slate-600 hover:text-red-400 transition text-sm px-1">🗑</button>
                          </div>
                          {activeWatchlist === wl.id && (
                            <div className="bg-[#0b1220] px-4 py-2 flex flex-wrap gap-1.5">
                              {wl.symbols.map(sym => <span key={sym} className="text-[11px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded-full">{sym}</span>)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>}
                </div>
              )}
            </div>

            <button onClick={handleOpenAddModal} className="bg-red-500 hover:bg-red-600 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-red-500/10">
              <span>+</span><span>ADD</span>
            </button>
          </div>
        </div>

        {/* Watchlist Modal (Save Mode) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1c1c1e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden m-4">
              <div className="flex justify-end px-4 pt-4">
                <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-full bg-slate-700/60 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition text-sm">✕</button>
              </div>
              <div className="flex flex-col items-center px-6 pb-6 pt-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4"><span className="text-2xl">♥</span></div>
                <h3 className="text-xl font-bold text-white mb-1">Save Watchlist</h3>
                <p className="text-slate-400 text-sm text-center mb-5">Saving <span className="text-white font-semibold">{selectedSymbols.length} symbol{selectedSymbols.length !== 1 ? "s" : ""}</span> to a new watchlist.</p>
                <div className="flex flex-wrap justify-center gap-1.5 mb-5 w-full">
                  {selectedSymbols.map(sym => <span key={sym} className="text-[11px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded-full">{sym}</span>)}
                </div>
                <input autoFocus type="text" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConfirmAdd()} placeholder={`Watchlist ${watchlists.length + 1}`} className="w-full bg-[#0b1220] border border-slate-600 focus:border-amber-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 transition mb-4"/>
                <button onClick={handleConfirmAdd} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <span>⚙</span><span>Save Watchlist</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Chart Grid ── */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
          <div className="grid gap-2 sm:gap-3 min-h-full pb-2" style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, 
            gridTemplateRows: `repeat(${gridRows}, minmax(${minRowHeight}, 1fr))` 
          }}>
            {boxes.map((_, index) => {
              const sym       = symbols[index];
              const mode      = chartModes[index];
              const hline     = hlineMap[index] ?? null;
              const isDrawing = drawingIndex === index;
              const bellColor = isDrawing ? "#facc15" : hline != null ? "#a78bfa" : "#475569";

              return (
                <div key={index}
                     className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition flex flex-col min-h-[260px]">

                  {/* Card Header */}
                  <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-[#0f172a] border-b border-slate-700 flex-shrink-0">
                    <SymbolInput value={sym} onChange={v => handleSymbolChange(index, v)} />

                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <ChartModeDropdown value={mode} onChange={v => handleModeChange(index, v)} />

                      {/* Bell */}
                      <button
                        onClick={() => handleBellClick(index, sym)}
                        title={isDrawing ? "Click on chart to place HLine" : hline != null ? "Click to remove HLine" : "Click to place HLine"}
                        className={`relative flex items-center rounded p-1 sm:p-0.5 transition-all
                          ${!sym ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                          ${isDrawing ? "animate-pulse" : ""}`}
                        style={{ color: bellColor }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {hline != null && !isDrawing && (
                          <span className="absolute 0 sm:-top-1 sm:-right-1 w-2 h-2 rounded-full bg-violet-400 border border-[#0f172a]" />
                        )}
                      </button>

                      {/* Zoom */}
                      <button
                        onClick={() => { 
                          if (sym) { 
                            setFullscreenIndex(index); 
                            setFullscreenMode(mode); 
                            setFsHline(hline); 
                            setFsDrawing(false); 
                            // Show rotate modal on mobile
                            if (isMobile) {
                              setShowRotateModal(true);
                            }
                          } 
                        }}
                        title="Fullscreen"
                        className={`flex items-center rounded p-1 sm:p-0.5 transition-all ${!sym ? "opacity-30 cursor-not-allowed" : "text-slate-400 hover:text-cyan-400 cursor-pointer"}`}>
                        <span className="text-lg" style={{ lineHeight: '1' }}>⛶</span>
                      </button>

                      {/* Refresh */}
                      <button onClick={() => handleRefresh(index)} title="Refresh" className="flex items-center text-slate-400 hover:text-slate-200 transition-colors rounded p-1 sm:p-0.5">
                        <RefreshIcon sx={{ fontSize: isMobile ? 18 : 16 }}/>
                      </button>
                    </div>
                  </div>

                  {/* Drawing mode hint bar */}
                  {isDrawing && (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-semibold flex-shrink-0">
                      <span>✛</span>
                      <span>Click on chart to place HLine</span>
                    </div>
                  )}

                  <div className="flex-1 min-h-[200px]">
                    <LWCChart
                      symbol={sym}
                      chartId={`grid-${index}`}
                      chartType={mode}
                      chartInstanceRefs={chartInstanceRefs}
                      onCrosshairMove={handleCrosshairMove}
                      externalTime={externalTime}
                      isLoading={!!loadingMap[index]}
                      hlineValue={hline}
                      drawingMode={isDrawing}
                      onChartClick={isDrawing ? makeChartClickHandler(index) : null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal - Responsive Wrap */}
      {fullscreenIndex !== null && symbols[fullscreenIndex] && (
        <div className="fixed inset-0 bg-[#0d1117] z-[999] flex flex-col">
<div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border-b border-slate-800 flex-shrink-0 shadow-lg">

  {/* ซ้าย */}
  <div className="flex items-center gap-2 flex-shrink-0">

    {/* ? ToolHint */}
    <ToolHint onViewDetails={() => { setFullscreenIndex(null); setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
      Fullscreen chart view. Click bell to place horizontal alert line.
    </ToolHint>

    {/* ← back */}
    <button
      onClick={() => { setFullscreenIndex(null); setFsDrawing(false); setFsHline(null); }}
      className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      back
    </button>

    {/* Refresh */}
    <button
      onClick={handleFullscreenReset}
      className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1f2937] border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
    >
      <RefreshIcon sx={{ fontSize: 14 }} />
    </button>

    {/* Search input */}
    <FullscreenSymbolInput value={symbols[fullscreenIndex]} onChange={v => handleSymbolChange(fullscreenIndex, v)} />
  </div>

  {/* กลาง */}
  <div className="flex-1 flex items-center justify-center">
    <h2 className="text-base font-bold text-white tracking-widest uppercase">
      {symbols[fullscreenIndex]}
    </h2>
  </div>

  {/* ขวา */}
  <div className="flex items-center gap-3 flex-shrink-0">

    {/* Alert Settings ⓘ */}
    <AlertSettingsTooltip />

    {/* 🔔 Open H-line */}
    <button
      onClick={handleFsBell}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        fsDrawing
          ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400 animate-pulse"
          : fsHline != null
            ? "border-violet-500/60 bg-violet-500/10 text-violet-400"
            : "border-slate-700 bg-transparent text-slate-300 hover:text-white hover:border-slate-500"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span>{fsHline != null ? `${Math.round(fsHline).toLocaleString()}` : "Open H-line"}</span>
    </button>

    {/* Select Alert Type (ChartModeDropdown) */}
    <ChartModeDropdown value={fullscreenMode} onChange={v => setFullscreenMode(v)} />
  </div>
</div>

          {/* Fullscreen drawing hint */}
          {fsDrawing && (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-semibold flex-shrink-0">
              <span>✛</span><span>Click on chart to place HLine — {isMobile ? "Press button again" : "Press Esc"} to cancel</span>
            </div>
          )}

          <div className="flex-1 min-h-0 bg-[#0d1117]">
            <LWCChart
              symbol={symbols[fullscreenIndex]}
              chartId="fullscreen"
              chartType={fullscreenMode}
              chartInstanceRefs={chartInstanceRefs}
              onCrosshairMove={handleCrosshairMove}
              externalTime={externalTime}
              isLoading={!!loadingMap[fullscreenIndex]}
              hlineValue={fsHline}
              drawingMode={fsDrawing}
              onChartClick={fsDrawing ? handleFsChartClick : null}
            />
          </div>
        </div>
      )}

      {/* ── Rotate Device Warning Modal (Animated Rotation) ── */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden m-4 animate-fade-in">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setShowRotateModal(false)} className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition">✕</button>
            </div>
            <div className="flex flex-col items-center px-6 pb-6 pt-1">
              
              {/* Animated Phone Icon */}
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-5 overflow-hidden">
                <style>{`
                  @keyframes tiltPhone {
                    0%, 20% { transform: rotate(0deg); }
                    40%, 60% { transform: rotate(-90deg); }
                    80%, 100% { transform: rotate(0deg); }
                  }
                  .animate-tilt { animation: tiltPhone 2.5s ease-in-out infinite; }
                `}</style>
                <svg className="w-8 h-8 text-amber-400 animate-tilt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Rotate Device</h3>
              <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
                For the best fullscreen chart experience, <br/>please rotate your phone to <span className="text-white font-semibold">Landscape mode</span>.
              </p>
              <button onClick={() => setShowRotateModal(false)} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm transition-all flex items-center justify-center">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}