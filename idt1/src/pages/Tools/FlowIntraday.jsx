// ─── ALL CHARTS POWERED BY lightweight-charts (LWC) ─────────────────────────
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// ── Firestore ──────────────────────────────────────────────────────────────
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

import FlowIntradayDashboard from "./components/FlowIntradayDashboard.jsx";
import {
  createChart, ColorType, CrosshairMode,
  LineSeries, LineStyle,
} from "lightweight-charts";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon  from "@mui/icons-material/Search";
import ToolHint    from "@/components/ToolHint.jsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

function buildInitialLabels() {
  const now  = Math.floor(Date.now() / 1000);
  const snap = now - (now % 300);
  return Array.from({ length: 150 }, (_, i) => snap - (149 - i) * 300);
}

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
    textColor: "#475569", fontSize: 9, attributionLogo: false,
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
    borderColor: "rgba(255,255,255,0.06)", textColor: "#475569",
    fixLeftEdge: true, fixRightEdge: true,
    timeVisible: true, secondsVisible: false,
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
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
  for (let i = 0; i < sym.length; i++) {
    h ^= sym.charCodeAt(i);
    h  = (Math.imul(h, 0x01000193) >>> 0);
  }
  return h;
}

// ─── LIVE SERIES STORE ────────────────────────────────────────────────────────
const liveSeriesStore = new Map();

function buildBaseSeries(symbol) {
  const seed      = hashSymbol(symbol);
  const rng       = createRng(seed);
  const points    = 150;
  const basePrice = 10 + (seed % 400);
  const volatility= 0.5 + rng() * 2;
  const dailyTrend= (rng() - 0.5) * 2.5;
  const labels    = buildInitialLabels();

  let cumBuy = 0, cumSell = 0, price = basePrice, momentum = 0;
  const net = [], buy = [], sell = [], pr = [];

  for (let i = 0; i < points; i++) {
    const pct  = i / (points - 1);
    const vMul = 1 + Math.pow(pct - 0.5, 2) * 5;
    momentum   = momentum * 0.85 + (rng() - 0.5) * 2.5;

    const spike      = rng() < 0.15 ? (rng() - 0.3) * 20 : 0;
    const microNoise = (rng() - 0.5) * 4;
    const cyclical   = Math.sin(i * 0.18) * 1.5;

    const rB = Math.max(0, (rng() * 5 + dailyTrend + momentum + spike + microNoise + cyclical) * vMul * volatility);
    const rS = Math.max(0, (rng() * 5 - dailyTrend - momentum * 0.8 + (rng() - 0.5) * 3) * vMul * volatility);

    cumBuy  += rB * 1000;
    cumSell -= rS * 1000;
    price   += (rB - rS) * 0.05 * (basePrice / 100);
    const t  = labels[i];
    net.push({ time: t, value: Math.round(cumBuy + cumSell) });
    buy.push({ time: t, value: Math.round(cumBuy) });
    sell.push({ time: t, value: Math.round(cumSell) });
    pr.push({ time: t, value: parseFloat(price.toFixed(2)) });
  }
  return { net, buy, sell, price: pr };
}

function getOrInitLiveSeries(symbol) {
  if (!liveSeriesStore.has(symbol)) {
    liveSeriesStore.set(symbol, buildBaseSeries(symbol));
  }
  return liveSeriesStore.get(symbol);
}

function appendLivePoint(symbol) {
  const s     = getOrInitLiveSeries(symbol);
  const len   = s.net.length;
  const seed  = hashSymbol(symbol) * 1000003 + len;
  const rng   = createRng(seed);

  const lastNet   = s.net.at(-1).value;
  const lastBuy   = s.buy.at(-1).value;
  const lastSell  = s.sell.at(-1).value;
  const lastPrice = s.price.at(-1).value;
  const lastTs    = s.net.at(-1).time;

  const trend    = Math.sin(len * 0.08) * 1.5;
  const cycle    = Math.sin(len * 0.3 + rng() * 0.5) * 2;
  const spike    = rng() < 0.12 ? (rng() - 0.4) * 18 : 0;
  const noise    = (rng() - 0.5) * 6;
  const momentum = trend + cycle + spike + noise;

  const rawBuy  = Math.max(0, rng() * 5 + momentum) * 1000;
  const rawSell = Math.max(0, rng() * 5 - momentum * 0.7) * 1000;
  const newTs   = lastTs + 300;

  const newNet   = { time: newTs, value: Math.round(lastNet   + rawBuy - rawSell) };
  const newBuy   = { time: newTs, value: Math.round(lastBuy   + rawBuy) };
  const newSell  = { time: newTs, value: Math.round(lastSell  - rawSell) };
  const newPrice = { time: newTs, value: parseFloat((lastPrice + (rawBuy - rawSell) * 0.00008).toFixed(2)) };

  s.net.push(newNet);
  s.buy.push(newBuy);
  s.sell.push(newSell);
  s.price.push(newPrice);

  return { newNet, newBuy, newSell, newPrice };
}

const TICK_MS = 30_000;

// ─── CHART SKELETON ───────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-[#141b2d] overflow-hidden relative">
      <style>{`@keyframes shimmerFlow{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 rounded-full bg-slate-800 w-20"/><div className="h-2 rounded-full bg-slate-800 w-12"/>
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

// ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[3000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const isUp = t.direction === "up";
        return (
          <div key={t.id}
            className={`pointer-events-auto flex items-start gap-3 bg-[#0d1526]/95 border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm max-w-xs ${isUp ? "border-green-500/40" : "border-red-500/40"}`}
            style={{ animation: "toastIn 0.3s ease-out" }}>
            <span className={`text-lg flex-shrink-0 mt-0.5 ${isUp ? "text-green-400" : "text-red-400"}`}>
              {isUp ? "🔔" : "⚠"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold mb-0.5">
                {t.symbol} — {isUp ? "Congratulations!" : "Warning!"}
              </p>
              <p className="text-slate-400 text-[10px] leading-snug">
                Net Flow <span className={`font-semibold ${isUp ? "text-green-300" : "text-red-300"}`}>{Math.round(t.value).toLocaleString()}</span> ชน H-Line <span className="text-violet-300 font-semibold">{Math.round(t.hline).toLocaleString()}</span>
              </p>
              <p className="text-slate-600 text-[9px] mt-0.5">{t.time}</p>
            </div>
            <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-white transition flex-shrink-0">✕</button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─── SYMBOL INPUT ─────────────────────────────────────────────────────────────
function SymbolInput({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (value === "" && committed.current !== "") {
      setQuery(""); committed.current = "";
    } else if (value !== "" && value !== committed.current) {
      setQuery(value); committed.current = value;
    }
  }, [value]);

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    return [...STOCK_LIST.filter(s => s.startsWith(q)), ...STOCK_LIST.filter(s => !s.startsWith(q) && s.includes(q))].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase();
    setQuery(v); committed.current = v; onChange(v); setOpen(false); setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open && e.key === "ArrowDown") { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(h => Math.min(h+1, filtered.length-1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx(h => Math.max(h-1, -1)); return; }
    if (e.key === "Tab")   { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter") { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 min-w-[70px]">
      <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fontSize="small"/>
      <input value={query} onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }}
        onFocus={() => setOpen(true)} onKeyDown={handleKey}
        placeholder="Symbol..." className="w-full max-w-[80px] sm:w-[80px] bg-transparent text-xs sm:text-sm font-bold text-white outline-none placeholder-slate-600 tracking-wider cursor-text pl-6"/>
      <button onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 p-1">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d={open ? "M4 0L8 5H0Z" : "M4 5L0 0H8Z"}/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 sm:w-52 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-[200] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50">
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
          {value && (
            <div onMouseDown={() => commit("")} className="flex items-center justify-center gap-1 px-3 py-2 text-[9px] text-slate-700 hover:text-red-400 cursor-pointer border-t border-slate-800 transition-colors">
              <span>✕</span><span>Clear symbol</span>
            </div>
          )}
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
      <button onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className={`relative flex items-center bg-[#1f2937] border rounded-md pl-2 pr-6 py-[3px] text-[11px] sm:text-xs font-semibold transition-all min-w-[64px]
          ${open ? "border-slate-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"}`}>
        <span className="block truncate">{current.label}</span>
        <svg width="7" height="4" viewBox="0 0 8 5" fill="currentColor"
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M4 5L0 0H8Z"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-20 bg-[#0d1526] border border-slate-600/60 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.8)] z-[200] overflow-hidden py-0.5">
          {CHART_MODES.map(({ value: v, label }) => (
            <div key={v} onMouseDown={() => { onChange(v); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer text-xs font-bold transition-all ${v === value ? "text-white bg-[#1e293b]" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"}`}>
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
  const [open,  setOpen]  = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (value === "" && committed.current !== "") { setQuery(""); committed.current = ""; }
  }, [value]);

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    return [...STOCK_LIST.filter(s => s.startsWith(q)), ...STOCK_LIST.filter(s => !s.startsWith(q) && s.includes(q))].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase();
    setQuery(v); committed.current = v; onChange(v); setOpen(false); setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHiIdx(h => Math.min(h+1, filtered.length-1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx(h => Math.max(h-1, -1)); return; }
    if (e.key === "Tab")   { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter") { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center w-full max-w-[160px] sm:max-w-none sm:w-auto">
      <div className={`relative flex items-center bg-[#1a2235] border rounded-lg px-2 sm:px-3 py-1.5 transition-all w-full sm:w-56 ${open ? "border-cyan-500/60" : "border-slate-700 hover:border-slate-500"}`}>
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none hidden sm:block" fontSize="small"/>
        <input value={query} onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }}
          onFocus={() => setOpen(true)} onKeyDown={handleKey} placeholder="พิมพ์ชื่อหุ้น..."
          className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm outline-none placeholder-slate-600 sm:pl-7 pr-4 sm:pr-6 ${value && !open ? "font-bold text-white" : "text-white"}`}/>
        {query && <button onMouseDown={() => commit("")} className="absolute right-2 sm:right-3 text-slate-600 hover:text-slate-300 text-xs sm:text-sm transition-colors">✕</button>}
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-56 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-2xl z-[200] overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0
              ? <div className="px-3 py-3 text-slate-600 text-[11px] text-center">ไม่พบ — กด Enter เพื่อใช้ "{query}"</div>
              : filtered.map((sym, idx) => {
                  const isHi = idx === hiIdx;
                  return (
                    <div key={sym} onMouseDown={() => commit(sym)} onMouseEnter={() => setHiIdx(idx)}
                      className={`px-4 py-2.5 cursor-pointer text-sm font-bold tracking-wider transition-all ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-white" : "border-l-2 border-transparent text-slate-300 hover:bg-slate-800/40"}`}>
                      {sym}
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LWC CHART ────────────────────────────────────────────────────────────────
function LWCChart({
  symbol, chartId, chartType = "flow",
  chartInstanceRefs, onCrosshairMove, externalTime,
  isLoading = false, hlineValue = null,
  drawingMode = false, onChartClick = null,
  tickCount = 0,
  onAlertTriggered = null,
}) {
  const onChartClickRef     = useRef(onChartClick);
  const onAlertTriggeredRef = useRef(onAlertTriggered);
  useEffect(() => { onChartClickRef.current     = onChartClick; },     [onChartClick]);
  useEffect(() => { onAlertTriggeredRef.current = onAlertTriggered; }, [onAlertTriggered]);

  const containerRef   = useRef(null);
  const chartRef       = useRef(null);
  const netSeriesRef   = useRef(null);
  const buySeriesRef   = useRef(null);
  const sellSeriesRef  = useRef(null);
  const priceSeriesRef = useRef(null);
  const isSyncingRef   = useRef(false);
  const alertFiredRef  = useRef(null); // stores "up" | "down" | null per hline

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);
    alertFiredRef.current = null;

    const el    = containerRef.current;
    const chart = createChart(el, {
      ...LWC_THEME,
      leftPriceScale: chartType === "price"
        ? { visible: true, borderColor: "rgba(255,255,255,0.06)", textColor: "#475569" }
        : { visible: false },
      handleScroll: true, handleScale: true,
      width: el.clientWidth, height: el.clientHeight,
    });
    chartRef.current = chart;
    if (chartInstanceRefs) chartInstanceRefs.current.set(chartId, chart);

    const liveData = getOrInitLiveSeries(symbol);

    if (chartType === "flow") {
      const netS  = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2,   priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      const buyS  = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      const sellS = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "right" });
      netS.setData([...liveData.net]);
      buyS.setData([...liveData.buy]);
      sellS.setData([...liveData.sell]);
      netS.createPriceLine({ price: 0, color: "#334155", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      netSeriesRef.current   = netS;
      buySeriesRef.current   = buyS;
      sellSeriesRef.current  = sellS;
      priceSeriesRef.current = null;
    } else {
      const netS  = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2,   priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      const buyS  = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      const sellS = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, priceScaleId: "left" });
      const prS   = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1.5, priceLineVisible: true,  lastValueVisible: true,  title: "Price", priceScaleId: "right" });
      netS.setData([...liveData.net]);
      buyS.setData([...liveData.buy]);
      sellS.setData([...liveData.sell]);
      prS.setData([...liveData.price]);
      netS.createPriceLine({ price: 0, color: "#334155", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      netSeriesRef.current   = netS;
      buySeriesRef.current   = buyS;
      sellSeriesRef.current  = sellS;
      priceSeriesRef.current = prS;
    }

    if (hlineValue != null && netSeriesRef.current) {
      netSeriesRef.current.createPriceLine({
        price: hlineValue, color: "#a78bfa", lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "H-Line",
        axisLabelColor: "#8b5cf6", axisLabelTextColor: "#ffffff",
      });
    }

    chart.subscribeCrosshairMove(param => {
      if (!isSyncingRef.current && param.time && onCrosshairMove) onCrosshairMove(param.time);
    });

    chart.subscribeClick(param => {
      if (!param.point || !onChartClickRef.current || !netSeriesRef.current) return;
      const price = netSeriesRef.current.coordinateToPrice(param.point.y);
      if (price != null) onChartClickRef.current(price);
    });

    requestAnimationFrame(() => {
      chart.timeScale().fitContent();
      chart.timeScale().scrollToRealTime();
    });

    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0 && e.contentRect.height > 0)
        chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      netSeriesRef.current = buySeriesRef.current = sellSeriesRef.current = priceSeriesRef.current = null;
      if (chartInstanceRefs) chartInstanceRefs.current.delete(chartId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, chartType, hlineValue]);

  useEffect(() => {
    if (!symbol || tickCount === 0) return;
    if (!netSeriesRef.current || !chartRef.current) return;

    const { newNet, newBuy, newSell, newPrice } = appendLivePoint(symbol);

    netSeriesRef.current.update(newNet);
    buySeriesRef.current.update(newBuy);
    sellSeriesRef.current.update(newSell);
    if (priceSeriesRef.current) priceSeriesRef.current.update(newPrice);

    chartRef.current.timeScale().scrollToRealTime();

    // ─── BIDIRECTIONAL ALERT CHECK ────────────────────────────────────────
    if (hlineValue != null && onAlertTriggeredRef.current) {
      const series  = getOrInitLiveSeries(symbol);
      const prevNet = series.net.at(-2)?.value ?? 0;
      const curNet  = newNet.value;

      const crossUp   = prevNet < hlineValue && curNet >= hlineValue;
      const crossDown = prevNet > hlineValue && curNet <= hlineValue;
      const direction = crossUp ? "up" : crossDown ? "down" : null;

      if (direction && alertFiredRef.current !== direction) {
        alertFiredRef.current = direction;
        onAlertTriggeredRef.current({ value: curNet, time: newNet.time, direction });
      }

      // reset fired state when price moves away from hline (allows re-trigger)
      const threshold = Math.abs(hlineValue) * 0.02;
      const awayUp    = curNet > hlineValue + threshold;
      const awayDown  = curNet < hlineValue - threshold;
      if ((alertFiredRef.current === "up" && awayUp) ||
          (alertFiredRef.current === "down" && awayDown)) {
        alertFiredRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !externalTime) return;
    isSyncingRef.current = true;
    try { if (typeof chart.setCrosshairPosition === "function") chart.setCrosshairPosition(NaN, externalTime, chart.series()?.[0]); } catch (_) {}
    isSyncingRef.current = false;
  }, [externalTime]);

  if (isLoading) return <div className="w-full h-full"><ChartSkeleton/></div>;
  if (!symbol) return (
    <div className="text-slate-600 text-xs font-semibold flex flex-col items-center justify-center w-full h-full gap-1 bg-[#141b2d]">
      <span className="text-2xl opacity-30">⌨</span>
      <span className="text-center px-4">Type a symbol above</span>
    </div>
  );
  return (
    <div ref={containerRef} className="w-full h-full"
      style={{ cursor: drawingMode ? "crosshair" : "default" }}/>
  );
}

// ─── ALERT SETTINGS TOOLTIP ───────────────────────────────────────────────────
function AlertSettingsTooltip() {
  const [isOpen,    setIsOpen]    = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);
  const [popoverPos,    setPopoverPos]    = useState({ top: 0, left: 0, width: 320 });
  const [pointerConfig, setPointerConfig] = useState({ type: "left", offset: 0 });
  const [animClass,     setAnimClass]     = useState("popoverSlideIn");
  const POPOVER_H_ESTIMATE = 280;

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const isMobile = vw < 640;
      let top, left, width, type, offset, anim;
      if (isMobile) {
        width = vw - 32; left = 16; top = rect.bottom + 12; type = "top"; anim = "popoverSlideDown";
        const btnCenter = rect.left + rect.width / 2; offset = btnCenter - left;
      } else {
        width = 360; left = rect.right + 12; type = "left"; anim = "popoverSlideIn";
        if (left + width > vw - 16) { left = rect.left - width - 12; type = "right"; anim = "popoverSlideInRight"; }
        top = rect.top - 8;
        if (top + POPOVER_H_ESTIMATE > vh - 8) top = vh - POPOVER_H_ESTIMATE - 8;
        if (top < 8) top = 8; offset = 0;
      }
      setPointerConfig({ type, offset }); setPopoverPos({ top, left, width }); setAnimClass(anim);
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => { setIsOpen(false); setIsHovered(false); };

  useEffect(() => {
    if (isOpen) {
      const onScroll = () => setIsOpen(false);
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }
  }, [isOpen]);

  const getClipPath = () => {
    const aw = 14, ah = 8;
    if (pointerConfig.type === "top") {
      const cx = pointerConfig.offset;
      return `polygon(0% ${ah}px,${cx-aw/2}px ${ah}px,${cx}px 0%,${cx+aw/2}px ${ah}px,100% ${ah}px,100% 100%,0% 100%)`;
    }
    if (pointerConfig.type === "left")  return `polygon(${ah}px 0%,100% 0%,100% 100%,${ah}px 100%,${ah}px 24px,0% 16px,${ah}px 8px)`;
    if (pointerConfig.type === "right") return `polygon(0% 0%,calc(100% - ${ah}px) 0%,calc(100% - ${ah}px) 8px,100% 16px,calc(100% - ${ah}px) 24px,calc(100% - ${ah}px) 100%,0% 100%)`;
    return "none";
  };

  return (
    <>
      <button ref={buttonRef}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 text-xs cursor-pointer select-none transition-colors"
        onClick={handleButtonClick} onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isOpen && setIsHovered(false)}>
        <span className="font-medium">Alert Settings</span>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen||isHovered ? "bg-cyan-500/30 border border-cyan-500/60 text-cyan-400" : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </button>
      {isOpen && <div className="fixed inset-0 z-[9998]" onClick={handleClose}/>}
      {isOpen && (
        <div className="fixed z-[9999] pointer-events-auto"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px`, width: `${popoverPos.width}px`, animation: `${animClass} 0.2s ease-out forwards`, filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.6))" }}
          onClick={e => e.stopPropagation()}>
          <div className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md relative"
            style={{ clipPath: getClipPath(), paddingTop: pointerConfig.type==="top"?"20px":"16px", paddingBottom:"16px", paddingLeft: pointerConfig.type==="left"?"24px":"20px", paddingRight: pointerConfig.type==="right"?"24px":"20px" }}>
            <div className="absolute inset-0 border border-slate-600/50 rounded-xl mix-blend-overlay pointer-events-none"/>
            <div className="relative z-20 space-y-3">
              <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Smart Flow Alerts</h3>
              <p className="text-slate-300 text-xs leading-relaxed">ระบบแจ้งเตือนอัจฉริยะ<span className="text-cyan-300 font-semibold"> ตั้งเงื่อนไขได้เอง</span>ทั้ง<span className="text-cyan-300 font-semibold"> ระดับราคา</span>และ<span className="text-cyan-300 font-semibold"> สัญญาณเงินไหล</span></p>
              <div className="space-y-2 pt-1">
                {[
                  { icon:"⚙",  title:"ตั้งเงื่อนไขได้เอง",           desc:"กำหนดเงื่อนไขการแจ้งเตือนตามที่คุณต้องการ" },
                  { icon:"📊", title:"ระดับราคา (Price Level)",       desc:"ตั้งราคาเป้าหมายและได้รับแจ้งเตือนทันที" },
                  { icon:"◈",  title:"สัญญาณเงินไหล (Flow Signal)", desc:"ติดตามการเปลี่ยนแปลงของกระแสเงินไหล" },
                  { icon:"✈",  title:"แจ้งเตือน Telegram ทันที",     desc:"ส่งแจ้งเตือนไปยังกลุ่มรวม Telegram ทันที" },
                ].map((f,i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 text-sm font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-200 leading-tight">{f.title}</p>
                      <p className="text-[9px] text-slate-400 leading-snug">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={e => { e.stopPropagation(); handleClose(); }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 group pt-1">
                View feature details here
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes popoverSlideIn      { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes popoverSlideInRight { from{opacity:0;transform:translateX(12px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes popoverSlideDown    { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}

// ─── ALERT POPUP ──────────────────────────────────────────────────────────────
function AlertPopup({ data, onClose, onTryAgain, watchlists, chartInstanceRefs, globalTickCount }) {
  if (!data) return null;
  const { symbol, flowValue, hlineValue, pctChange, direction } = data;
  const isUp = direction !== "down"; // default to up for backwards compat

  // theme tokens
  const clr = isUp ? {
    bg:      "#0d1f0f",
    border:  "#1e3d1e",
    iconBg:  "radial-gradient(circle,#16a34a 0%,#14532d 60%,#052e16 100%)",
    iconBdr: "#22c55e",
    iconShadow: "rgba(34,197,94,0.45)",
    iconFill: "#22c55e",
    title:   "text-green-400",
    sub:     "text-green-300/80",
    valClr:  "text-green-400",
    valLabel:"text-green-400",
    btnPrimary: "bg-green-500 hover:bg-green-400 text-black",
    chartBorder: "#1e3d1e",
    chartBg: "#061008",
    chartTag: "bg-[#1e2d1e] text-green-300 border-[#2d4a2d]",
    badgeBg: "bg-green-900/60 text-green-400",
  } : {
    bg:      "#1f0d0d",
    border:  "#3d1e1e",
    iconBg:  "radial-gradient(circle,#dc2626 0%,#7f1d1d 60%,#450a0a 100%)",
    iconBdr: "#ef4444",
    iconShadow: "rgba(239,68,68,0.45)",
    iconFill: "#ef4444",
    title:   "text-red-400",
    sub:     "text-red-300/80",
    valClr:  "text-red-400",
    valLabel:"text-red-400",
    btnPrimary: "bg-red-500 hover:bg-red-400 text-white",
    chartBorder: "#3d1e1e",
    chartBg: "#160808",
    chartTag: "bg-[#2d1e1e] text-red-300 border-[#4a2d2d]",
    badgeBg: "bg-red-900/60 text-red-400",
  };

  const allWatchlistSymbols = watchlists.flatMap(w => w.symbols);
  const otherSymbols        = allWatchlistSymbols.filter(s => s !== symbol);
  const displayItems        = [symbol, ...otherSymbols].slice(0, 3);
  const mockPct = { [symbol]: pctChange };
  otherSymbols.forEach(s => { const seed = hashSymbol(s); mockPct[s] = ((seed % 100) - 45) / 10; });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="relative rounded-2xl w-full max-w-[700px] overflow-hidden shadow-2xl"
        style={{ background: clr.bg, border: `1px solid ${clr.border}` }}>
        <button onClick={onClose}
          className="absolute top-3.5 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-lg flex items-center justify-center z-10 transition-all">×</button>

        {/* Header */}
        <div className="flex flex-col items-center pt-7 pb-5 px-6">
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4"
            style={{ background: clr.iconBg, border: `2.5px solid ${clr.iconBdr}`, boxShadow: `0 0 28px ${clr.iconShadow}` }}>
            {isUp ? (
              // Bell icon for profit
              <svg width="32" height="32" viewBox="0 0 24 24" fill={clr.iconFill} stroke={clr.iconFill} strokeWidth="0.3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <circle cx="18" cy="5" r="3" fill="#ef4444" stroke="none"/>
              </svg>
            ) : (
              // Warning triangle icon for drop
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={clr.iconFill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            )}
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${clr.title}`}>
            {isUp ? "Congratulations!" : "Warning!"}
          </h2>
          <p className={`text-sm ${clr.sub}`}>
            {isUp ? "You've made a profit this round." : "Your stock price has dropped."}
          </p>
        </div>

        {/* Body */}
        <div className="flex gap-3 px-5 pb-4 flex-wrap">
          {/* Chart */}
          <div className="flex-[1.4] min-w-[220px] rounded-xl overflow-hidden"
            style={{ background: clr.chartBg, border: `1px solid ${clr.chartBorder}` }}>
            <div className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: `1px solid ${clr.chartBorder}` }}>
              <span className="text-sm font-bold text-white tracking-widest">{symbol}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${clr.chartTag}`}>Flow ▾</span>
            </div>
            <div className="h-[160px]">
              <LWCChart
                symbol={symbol} chartId={`alert-popup-${symbol}`} chartType="flow"
                chartInstanceRefs={chartInstanceRefs} onCrosshairMove={() => {}}
                externalTime={null} hlineValue={hlineValue}
                tickCount={globalTickCount}
              />
            </div>
            <div className="flex justify-between px-3 pb-2 pt-1 text-[9px] text-slate-600">
              <span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span><span>14:00</span><span>15:00</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-[160px] flex flex-col gap-3">
            <div className="rounded-xl px-4 py-3" style={{ background: clr.chartBg, border: `1px solid ${clr.chartBorder}` }}>
              <p className={`text-[11px] font-medium mb-1 ${clr.valLabel}`}>Current Value</p>
              <p className={`text-2xl font-bold leading-none mb-1 ${clr.valClr}`}>{Math.round(flowValue).toLocaleString()}</p>
              <p className={`text-[11px] ${clr.valClr}`}>{pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}% ({isUp ? "H-Line Crossed ↑" : "H-Line Crossed ↓"})</p>
            </div>
            <div className="rounded-xl px-4 py-3 flex-1" style={{ background: clr.chartBg, border: `1px solid ${clr.chartBorder}` }}>
              <div className="flex items-center gap-1.5 mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span className="text-xs font-semibold text-white">My watchlists</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${clr.badgeBg}`}>{displayItems.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {displayItems.map(sym => {
                  const pct = mockPct[sym] ?? 0, up = pct >= 0, isAlertSym = sym === symbol;
                  return (
                    <div key={sym} className="flex items-center justify-between rounded-lg px-2.5 py-2"
                      style={{ background: isUp ? "#0a1a0a" : "#1a0a0a" }}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${up ? "bg-green-400" : "bg-red-400"}`}/>
                        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${isAlertSym ? (isUp ? "bg-[#0f2e1a]" : "bg-[#2e0f0f]") : up ? "" : "bg-[#2d1a1a]"}`}>{sym}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>{up?"+":""}{pct.toFixed(2)}%</span>
                        <div className={`w-5 h-[18px] rounded flex items-center justify-center ${up?"bg-green-900/70":"bg-red-900/70"}`}>
                          {up
                            ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                            : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-5 pb-4">
          <button onClick={onTryAgain}
            className={`flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${clr.btnPrimary}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
            ตั้ง H-Line ใหม่
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-full bg-transparent border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            ดูหุ้นอื่น
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-600 pb-4">Expired on: 1 Mar 2026</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowIntraday() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const { userData, currentUser, loading } = useAuth();
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 640;

  const [isMember,   setIsMember]   = useState(false);
  const [enteredTool,setEnteredTool]= useState(false);

  const [layout,          setLayout]          = useState("12");
  const [symbols,         setSymbols]         = useState(Array(12).fill(""));
  const [chartModes,      setChartModes]      = useState(Array(12).fill("flow"));
  const [fullscreenIndex, setFullscreenIndex] = useState(null);
  const [fullscreenMode,  setFullscreenMode]  = useState("flow");
  const [showLeft,        setShowLeft]        = useState(false);
  const [showRight,       setShowRight]       = useState(true);
  const [externalTime,    setExternalTime]    = useState(null);
  const [loadingMap,      setLoadingMap]      = useState(Array(12).fill(false));
  const [drawingIndex,    setDrawingIndex]    = useState(null);
  const [fsHline,         setFsHline]         = useState(null);
  const [fsDrawing,       setFsDrawing]       = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);

  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showWatchPanel, setShowWatchPanel] = useState(false);
  const [newListName,    setNewListName]    = useState("");
  const [activeWatchlist,setActiveWatchlist]= useState(null);

  const [alertPopup, setAlertPopup] = useState(null);

  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((symbol, value, hline, direction) => {
    const id   = Date.now();
    const time = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    setToasts(prev => [...prev.slice(-4), { id, symbol, value, hline, time, direction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000);
  }, []);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const [globalTickCount, setGlobalTickCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setGlobalTickCount(c => c + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const chartInstanceRefs  = useRef(new Map());
  const scrollDirection    = useRef(1);
  const isPaused           = useRef(false);
  const loadingTimeoutsRef = useRef({});

  // ══════════════════════════════════════════════════════════════════════════
  // ─── FIRESTORE: Watchlists
  // ══════════════════════════════════════════════════════════════════════════
  const [watchlists, setWatchlists] = useState([]);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) { setWatchlists([]); return; }
    const ref   = collection(db, "users", uid, "watchlists");
    const unsub = onSnapshot(ref, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setWatchlists(docs);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const saveWatchlistToFirestore = useCallback(async (name, syms) => {
    const uid = currentUser?.uid; if (!uid) return;
    const id  = `wl_${Date.now()}`;
    await setDoc(doc(db, "users", uid, "watchlists", id), { name, symbols: syms, createdAt: serverTimestamp() });
  }, [currentUser?.uid]);

  const deleteWatchlistFromFirestore = useCallback(async (id) => {
    const uid = currentUser?.uid; if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "watchlists", id));
  }, [currentUser?.uid]);

  // ══════════════════════════════════════════════════════════════════════════
  // ─── FIRESTORE: HLine Alerts
  // ══════════════════════════════════════════════════════════════════════════
  const [hlineMap, setHlineMap] = useState({});

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) { setHlineMap({}); return; }
    const ref   = collection(db, "users", uid, "alerts");
    const unsub = onSnapshot(ref, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.gridIndex != null && data.hline != null) map[data.gridIndex] = data.hline;
      });
      setHlineMap(map);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const updateHline = useCallback(async (index, value) => {
    setHlineMap(prev => {
      const next = { ...prev };
      if (value == null) delete next[index]; else next[index] = value;
      return next;
    });
    const uid = currentUser?.uid; if (!uid) return;
    const ref = doc(db, "users", uid, "alerts", `alert_${index}`);
    if (value == null) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { symbol: symbols[index] ?? "", gridIndex: index, hline: value, createdAt: serverTimestamp() });
    }
  }, [currentUser?.uid, symbols]);

  // ─── Alert callback — now receives direction ───────────────────────────────
  const makeAlertHandler = useCallback((index, sym, hline) => ({ value, time, direction }) => {
    addToast(sym, value, hline, direction);
    const series   = getOrInitLiveSeries(sym);
    const startNet = series.net[0]?.value ?? 0;
    const pct      = startNet !== 0 ? ((value - startNet) / Math.abs(startNet)) * 100 : 0;
    setAlertPopup({ symbol: sym, index, flowValue: value, hlineValue: hline, pctChange: pct, direction });
  }, [addToast]);

  // ─── Bell click ───────────────────────────────────────────────────────────
  const handleBellClick = useCallback((index, sym) => {
    if (!sym) return;
    if (hlineMap[index] != null) { updateHline(index, null); setDrawingIndex(null); }
    else if (drawingIndex === index) { setDrawingIndex(null); }
    else { setDrawingIndex(index); }
  }, [hlineMap, drawingIndex, updateHline]);

  const makeChartClickHandler = useCallback((index) => (price) => {
    updateHline(index, price); setDrawingIndex(null);
  }, [updateHline]);

  const handleFsBell = useCallback(() => {
    if (fsHline != null) {
      setFsHline(null);
      setFsDrawing(false);
      if (fullscreenIndex !== null) updateHline(fullscreenIndex, null);
    } else if (fsDrawing) {
      setFsDrawing(false);
    } else {
      setFsDrawing(true);
    }
  }, [fsHline, fsDrawing, fullscreenIndex, updateHline]);

  const handleFsChartClick = useCallback((price) => {
    setFsHline(price);
    setFsDrawing(false);
    if (fullscreenIndex !== null) updateHline(fullscreenIndex, price);
  }, [fullscreenIndex, updateHline]);

  // ─── Membership ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const toolId = "flow";
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

  // ─── Scroll helpers ────────────────────────────────────────────────────────
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

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") { setFullscreenIndex(null); setDrawingIndex(null); setFsDrawing(false); setShowWatchPanel(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (!showWatchPanel) return;
    const fn = e => { if (!e.target.closest("[data-watchpanel]")) setShowWatchPanel(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showWatchPanel]);

  useEffect(() => { return () => { Object.values(loadingTimeoutsRef.current).forEach(clearTimeout); }; }, []);

  // ─── Symbol change ─────────────────────────────────────────────────────────
  const handleSymbolChange = useCallback((index, value) => {
    const nextValue = value.toUpperCase().trim();
    if (loadingTimeoutsRef.current[index]) clearTimeout(loadingTimeoutsRef.current[index]);
    if (!nextValue) {
      setSymbols(prev => { const u = [...prev]; u[index] = ""; return u; });
      setLoadingMap(prev => { const u = [...prev]; u[index] = false; return u; });
      updateHline(index, null);
      if (drawingIndex === index) setDrawingIndex(null);
      return;
    }
    setLoadingMap(prev => { const u = [...prev]; u[index] = true; return u; });
    loadingTimeoutsRef.current[index] = setTimeout(() => {
      setSymbols(prev => { const u = [...prev]; u[index] = nextValue; return u; });
      setLoadingMap(prev => { const u = [...prev]; u[index] = false; return u; });
      delete loadingTimeoutsRef.current[index];
    }, 700);
  }, [drawingIndex, updateHline]);

  // ─── Watchlist handlers ────────────────────────────────────────────────────
  const selectedSymbols = useMemo(() => [...new Set(symbols.filter(s => s.trim() !== ""))], [symbols]);
  const boxCount = parseInt(layout);

  const handleLoadWatchlist = useCallback((wl) => {
    const next = Array(boxCount).fill("");
    wl.symbols.forEach((sym, i) => { if (i < boxCount) next[i] = sym; });
    setSymbols(next);
    setShowWatchPanel(false);
  }, [boxCount]);

  const handleOpenAddModal = useCallback(() => {
    if (selectedSymbols.length === 0) return;
    setNewListName(""); setShowAddModal(true);
  }, [selectedSymbols]);

  const handleConfirmAdd = useCallback(async () => {
    const name = newListName.trim() || `Watchlist ${watchlists.length + 1}`;
    await saveWatchlistToFirestore(name, selectedSymbols);
    setShowAddModal(false);
  }, [newListName, watchlists.length, selectedSymbols, saveWatchlistToFirestore]);

  const handleDeleteWatchlist = useCallback(async (id) => {
    await deleteWatchlistFromFirestore(id);
    setActiveWatchlist(prev => prev === id ? null : prev);
  }, [deleteWatchlistFromFirestore]);

  // ─── Chart helpers ─────────────────────────────────────────────────────────
  const handleCrosshairMove = useCallback((time) => { setExternalTime(time ?? null); }, []);
  const handleModeChange    = useCallback((index, mode) => { setChartModes(prev => { const u = [...prev]; u[index] = mode; return u; }); }, []);
  const handleRefresh       = useCallback((index) => {
    const chart = chartInstanceRefs.current.get(`grid-${index}`);
    if (chart) { chart.timeScale().scrollToRealTime(); chart.timeScale().fitContent(); }
  }, []);
  const handleFullscreenReset = useCallback(() => {
    const chart = chartInstanceRefs.current.get("fullscreen");
    if (chart) { chart.timeScale().scrollToRealTime(); chart.timeScale().fitContent(); }
  }, []);

  // ─── Grid layout ───────────────────────────────────────────────────────────
  const boxes    = Array.from({ length: boxCount });
  const gridCols = useMemo(() => {
    if (isMobile) return 1;
    if (layout === "12") return windowWidth >= 1280 ? 4 : windowWidth >= 1024 ? 3 : 2;
    if (layout === "6")  return windowWidth >= 1024 ? 3 : windowWidth >= 640  ? 2 : 1;
    return windowWidth >= 640 ? 2 : 1;
  }, [isMobile, layout, windowWidth]);
  const gridRows     = Math.ceil(boxCount / gridCols);
  const minRowHeight = isMobile ? "280px" : "260px";

  // ─── Landing features ──────────────────────────────────────────────────────
  const features = [
    { title: "Multi-Asset Flow Monitor",     desc: "Monitor up to 12 stocks at once in a powerful grid layout." },
    { title: "Live Feed Simulation",          desc: "Charts update every 5 minutes with new data points — just like real trading." },
    { title: "Click-to-Place HLine Alert",   desc: "Click the bell, then click the chart to drop a horizontal alert line instantly." },
    { title: "Instant Alert Popup + Toast",  desc: "When Net Flow crosses your H-Line — popup and toast fire immediately." },
  ];

  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
      <div className="relative group"
        onMouseEnter={() => { isPaused.current = true; }}
        onMouseLeave={() => { isPaused.current = false; }}>
        <button onClick={() => scroll("left")} aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1" style={scrollbarHideStyle}>
          {features.map((item, index) => (
            <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
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
    <div className="relative group w-full max-w-5xl mb-16 px-2 md:px-0">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"/>
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-3 md:px-4 py-2 md:py-3 flex items-center border-b border-slate-700/50">
          <div className="flex gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80"/>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80"/>
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80"/>
          </div>
        </div>
        <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden"><FlowIntradayDashboard/></div>
      </div>
    </div>
  );

  // ─── Non-member landing ────────────────────────────────────────────────────
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Flow Intraday</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Turn your trading screen into an elite surveillance system</p>
          </div>
          {dashboardPreviewJSX}{featuresSectionJSX}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!currentUser && <button onClick={() => navigate("/login")} className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 transition-all duration-300">Sign In</button>}
              <button onClick={() => navigate("/member-register")} className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg transition-all duration-300">Join Membership</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Member intro ──────────────────────────────────────────────────────────
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"/>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Flow Intraday</span>
            </h1>
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

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-screen bg-[#0b111a] text-white px-2 sm:px-3 py-2 sm:py-3 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0">

        {/* Top Controls */}
        <div className="flex flex-row items-center justify-between gap-2 mb-3 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <ToolHint detailsVariant="link" onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                 Monitor real-time institutional fund flow and sector rotation throughout the day.
              </ToolHint>
              <div className="flex items-center gap-1.5 bg-[#111827] border border-slate-700 px-1.5 py-1 rounded-lg">
                <span className="text-[10px] text-slate-500 font-medium ml-1 hidden sm:inline">LAYOUT</span>
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
            <div className="hidden sm:flex items-center gap-3 sm:gap-6 text-[11px] sm:text-[13px] font-medium text-blue-200/80">
              <span className="flex items-center gap-1.5">Net<svg width="18" height="2" viewBox="0 0 24 2"><line x1="0" y1="1" x2="24" y2="1" stroke="#ffffff" strokeWidth="2"/></svg></span>
              <span className="flex items-center gap-1.5">Flow<div className="flex flex-col gap-[3px]">
                <svg width="14" height="2" viewBox="0 0 20 2"><line x1="0" y1="1" x2="20" y2="1" stroke="#4ade80" strokeWidth="2"/></svg>
                <svg width="14" height="2" viewBox="0 0 20 2"><line x1="0" y1="1" x2="20" y2="1" stroke="#f87171" strokeWidth="2"/></svg>
              </div></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Watchlist Panel */}
            <div className="relative" data-watchpanel>
              <button onClick={() => setShowWatchPanel(v => !v)} className="flex items-center gap-1.5 bg-[#111827] border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded-lg text-xs transition-all">
                <span className="text-red-400">♥</span>
                <span className="text-slate-300">Watchlists</span>
                {watchlists.length > 0 && <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{watchlists.length}</span>}
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showWatchPanel ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              {showWatchPanel && (
                <div className="absolute right-0 top-full mt-2 w-[90vw] max-w-[300px] sm:w-72 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">My Watchlists</span>
                    <button onClick={() => setShowWatchPanel(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
                  </div>
                  {watchlists.length === 0
                    ? <div className="px-4 py-6 text-center text-slate-500 text-sm">No watchlists yet.<br/>Select symbols and press ♥ ADD.</div>
                    : <ul className="max-h-72 overflow-y-auto" style={scrollbarHideStyle}>
                        {watchlists.map(wl => (
                          <li key={wl.id} className="border-b border-slate-800 last:border-0">
                            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#1e293b] cursor-pointer transition"
                              onClick={() => setActiveWatchlist(activeWatchlist === wl.id ? null : wl.id)}>
                              <div className="flex items-center gap-2">
                                <svg className={`w-3 h-3 text-slate-400 transition-transform ${activeWatchlist === wl.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                                <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-[140px]">{wl.name}</span>
                                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{wl.symbols.length}</span>
                              </div>
                              <button onClick={e => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }} className="text-slate-600 hover:text-red-400 transition text-sm px-1">🗑</button>
                            </div>
                            {activeWatchlist === wl.id && (
                              <div className="bg-[#0b1220] px-4 py-2 flex flex-col gap-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {wl.symbols.map(sym => (
                                    <span key={sym} className="text-[11px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded-full">{sym}</span>
                                  ))}
                                </div>
                                <button onClick={() => handleLoadWatchlist(wl)}
                                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                  Load to Grid
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                  }
                </div>
              )}
            </div>
            <button onClick={handleOpenAddModal} className="bg-red-500 hover:bg-red-600 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-red-500/10">
              <span>+</span><span>ADD</span>
            </button>
          </div>
        </div>

        {/* Save Watchlist Modal */}
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
                <input autoFocus type="text" value={newListName} onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConfirmAdd()}
                  placeholder={`Watchlist ${watchlists.length + 1}`}
                  className="w-full bg-[#0b1220] border border-slate-600 focus:border-amber-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 transition mb-4"/>
                <button onClick={handleConfirmAdd} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <span>⚙</span><span>Save Watchlist</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={scrollbarHideStyle}>
          <div className="grid gap-2 sm:gap-3 min-h-full pb-2" style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gridTemplateRows:    `repeat(${gridRows}, minmax(${minRowHeight}, 1fr))`,
          }}>
            {boxes.map((_, index) => {
              const sym       = symbols[index];
              const mode      = chartModes[index];
              const hline     = hlineMap[index] ?? null;
              const isDrawing = drawingIndex === index;
              const bellColor = isDrawing ? "#facc15" : hline != null ? "#a78bfa" : "#475569";

              return (
                <div key={index} className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition flex flex-col min-h-[260px]">
                  <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-[#0f172a] border-b border-slate-700 flex-shrink-0">
                    <SymbolInput value={sym} onChange={v => handleSymbolChange(index, v)}/>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <ChartModeDropdown value={mode} onChange={v => handleModeChange(index, v)}/>
                      <button onClick={() => handleBellClick(index, sym)}
                        title={isDrawing ? "Click on chart to place HLine" : hline != null ? "Click to remove HLine" : "Click to place HLine"}
                        className={`relative flex items-center rounded p-1 sm:p-0.5 transition-all ${!sym ? "opacity-30 cursor-not-allowed" : "cursor-pointer"} ${isDrawing ? "animate-pulse" : ""}`}
                        style={{ color: bellColor }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {hline != null && !isDrawing && <span className="absolute sm:-top-1 sm:-right-1 w-2 h-2 rounded-full bg-violet-400 border border-[#0f172a]"/>}
                      </button>
                      <button
                        onClick={() => {
                          if (sym) {
                            setFullscreenIndex(index);
                            setFullscreenMode(mode);
                            setFsHline(hline);
                            setFsDrawing(false);
                            if (isMobile) setShowRotateModal(true);
                            setTimeout(() => {
                              const chart = chartInstanceRefs.current.get("fullscreen");
                              if (chart) { chart.timeScale().fitContent(); chart.timeScale().scrollToRealTime(); }
                            }, 100);
                          }
                        }}
                        className={`flex items-center rounded p-1 sm:p-0.5 transition-all ${!sym ? "opacity-30 cursor-not-allowed" : "text-slate-400 hover:text-cyan-400 cursor-pointer"}`}>
                        <span className="text-lg" style={{ lineHeight: "1" }}>⛶</span>
                      </button>
                      <button onClick={() => handleRefresh(index)} className="flex items-center text-slate-400 hover:text-slate-200 transition-colors rounded p-1 sm:p-0.5">
                        <RefreshIcon sx={{ fontSize: isMobile ? 18 : 16 }}/>
                      </button>
                    </div>
                  </div>
                  {isDrawing && (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-semibold flex-shrink-0">
                      <span>✛</span><span>Click on chart to place HLine</span>
                    </div>
                  )}
                  <div className="flex-1 min-h-[200px]">
                    <LWCChart
                      symbol={sym} chartId={`grid-${index}`} chartType={mode}
                      chartInstanceRefs={chartInstanceRefs}
                      onCrosshairMove={handleCrosshairMove}
                      externalTime={externalTime}
                      isLoading={!!loadingMap[index]}
                      hlineValue={hline}
                      drawingMode={isDrawing}
                      onChartClick={isDrawing ? makeChartClickHandler(index) : null}
                      tickCount={globalTickCount}
                      onAlertTriggered={hline != null && sym ? makeAlertHandler(index, sym, hline) : null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenIndex !== null && symbols[fullscreenIndex] && (
        <div className="fixed inset-0 bg-[#0d1117] z-[999] flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border-b border-slate-800 flex-shrink-0 shadow-lg">
            <div className="flex items-center gap-2 flex-shrink-0">
              <ToolHint onViewDetails={() => { setFullscreenIndex(null); setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                Fullscreen live chart. กราฟอัปเดตทุก 30 วิ. Click bell → chart to place H-Line.
              </ToolHint>
              <button onClick={() => { setFullscreenIndex(null); setFsDrawing(false); setFsHline(null); }}
                className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                back
              </button>
              <button onClick={handleFullscreenReset} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1f2937] border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
                <RefreshIcon sx={{ fontSize: 14 }}/>
              </button>
              <FullscreenSymbolInput value={symbols[fullscreenIndex]} onChange={v => handleSymbolChange(fullscreenIndex, v)}/>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-base font-bold text-white tracking-widest uppercase">{symbols[fullscreenIndex]}</h2>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <AlertSettingsTooltip/>
              <button onClick={handleFsBell}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${fsDrawing ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400 animate-pulse" : fsHline != null ? "border-violet-500/60 bg-violet-500/10 text-violet-400" : "border-slate-700 bg-transparent text-slate-300 hover:text-white hover:border-slate-500"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span>{fsHline != null ? `${Math.round(fsHline).toLocaleString()}` : "Open H-line"}</span>
              </button>
              <ChartModeDropdown value={fullscreenMode} onChange={v => setFullscreenMode(v)}/>
            </div>
          </div>
          {fsDrawing && (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-semibold flex-shrink-0">
              <span>✛</span><span>Click on chart to place HLine — {isMobile ? "Press button again" : "Press Esc"} to cancel</span>
            </div>
          )}
          <div className="flex-1 min-h-0 bg-[#0d1117]">
            <LWCChart
              symbol={symbols[fullscreenIndex]} chartId="fullscreen" chartType={fullscreenMode}
              chartInstanceRefs={chartInstanceRefs} onCrosshairMove={handleCrosshairMove}
              externalTime={externalTime} isLoading={!!loadingMap[fullscreenIndex]}
              hlineValue={fsHline} drawingMode={fsDrawing}
              onChartClick={fsDrawing ? handleFsChartClick : null}
              tickCount={globalTickCount}
              onAlertTriggered={
                fsHline != null && symbols[fullscreenIndex]
                  ? makeAlertHandler(fullscreenIndex, symbols[fullscreenIndex], fsHline)
                  : null
              }
            />
          </div>
        </div>
      )}

      {/* Rotate Device Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden m-4 animate-fade-in">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setShowRotateModal(false)} className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition">✕</button>
            </div>
            <div className="flex flex-col items-center px-6 pb-6 pt-1">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-5 overflow-hidden">
                <style>{`@keyframes tiltPhone{0%,20%{transform:rotate(0deg)}40%,60%{transform:rotate(-90deg)}80%,100%{transform:rotate(0deg)}}.animate-tilt{animation:tiltPhone 2.5s ease-in-out infinite}`}</style>
                <svg className="w-8 h-8 text-amber-400 animate-tilt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Rotate Device</h3>
              <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">For the best fullscreen chart experience, <br/>please rotate your phone to <span className="text-white font-semibold">Landscape mode</span>.</p>
              <button onClick={() => setShowRotateModal(false)} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm transition-all">Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Popup */}
      <AlertPopup
        data={alertPopup}
        watchlists={watchlists}
        chartInstanceRefs={chartInstanceRefs}
        globalTickCount={globalTickCount}
        onClose={() => setAlertPopup(null)}
        onTryAgain={() => {
          if (!alertPopup) return;
          updateHline(alertPopup.index, null);
          setAlertPopup(null);
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast}/>
    </div>
  );
}