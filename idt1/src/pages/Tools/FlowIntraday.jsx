// src/pages/tools/FlowIntraday.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import FlowIntradayDashboard from "./components/FlowIntradayDashboard.jsx";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

// ─── CHART CONFIG ───────────────────────────────────────────
const CHART_CONFIG = {
  paddingLeft: 10, paddingRight: 45,
  paddingTop: 15,  paddingBottom: 20,
  pointGap: 25,    minWidth: 400,
};

const LABELS = Array.from({ length: 150 }, (_, i) => {
  const t = 10 * 60 + i * 5;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
});

// ── Stock list for autocomplete ──────────────────────────────
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
  return sym.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1) * 97, 7919);
}

function getProfile(symbol) {
  const h = hashSymbol(symbol);
  return { trend: ((h % 200) - 100) / 200 };
}

// Intraday volume curve: open spike, lunch dip, close spike
function intradayVolumeCurve(i, total) {
  const pct   = i / (total - 1);
  const open  = Math.exp(-Math.pow((pct - 0.05) / 0.06, 2));
  const lunch = 1 - 0.55 * Math.exp(-Math.pow((pct - 0.50) / 0.07, 2));
  const close = Math.exp(-Math.pow((pct - 0.94) / 0.05, 2));
  return (0.35 + open * 0.9 + close * 0.8) * lunch;
}

function generateFlowSeries(symbol, points = 78) {
  if (!symbol) return null;

  const seed  = hashSymbol(symbol);
  const rngB  = createRng(seed ^ 0xdeadbeef);
  const rngS  = createRng(seed ^ 0xc0ffee42);
  const rngN  = createRng(seed ^ 0xabcd1234);

  const scale    = 200 + (seed % 1800);
  const spikePct = 0.08 + (seed % 20) / 100;

  const buyFlow = [], sellFlow = [], netFlow = [];
  let buyVal  =  (rngB() * 0.5 + 0.2) * scale;
  let sellVal = -(rngS() * 0.5 + 0.2) * scale;

  for (let i = 0; i < points; i++) {
    const volMult = intradayVolumeCurve(i, points);

    buyVal  += (rngB() - 0.48) * scale * 0.30 * volMult;
    sellVal += (rngS() - 0.52) * scale * 0.30 * volMult;

    buyVal  = Math.max(0, buyVal);
    sellVal = Math.min(0, sellVal);

    if (rngB() < spikePct * volMult) buyVal  += rngB() * scale * 2.0;
    if (rngS() < spikePct * volMult) sellVal -= rngS() * scale * 1.8;

    const net = buyVal + sellVal + (rngN() - 0.5) * scale * 0.2;

    buyFlow.push(Math.round(buyVal));
    sellFlow.push(Math.round(sellVal));
    netFlow.push(Math.round(net));
  }

  const prices = generatePriceSeries(netFlow, seed);
  return { buyFlow, sellFlow, netFlow, prices };
}

function calcYScaleFlow({ buyFlow, sellFlow, netFlow }) {
  const all = [...buyFlow, ...sellFlow, ...netFlow];
  const rawMax = Math.max(...all), rawMin = Math.min(...all);
  const range  = rawMax - rawMin || 1;
  return { max: rawMax + range * 0.12, min: rawMin - range * 0.12 };
}

function calcYScalePrice(prices) {
  const rawMax = Math.max(...prices), rawMin = Math.min(...prices);
  const range  = rawMax - rawMin || rawMax * 0.02;
  return { max: rawMax + range * 0.15, min: rawMin - range * 0.15 };
}

function makeNY(height, paddingTop, paddingBottom, { max, min }) {
  return (v) => height - paddingBottom - ((v - min) / (max - min)) * (height - paddingTop - paddingBottom);
}

function buildLinePath(dataset, ny, paddingLeft, pointGap) {
  if (!dataset || !dataset.length) return "";
  return dataset.map((v, i) => `${i === 0 ? "M" : "L"} ${paddingLeft + i * pointGap},${ny(v)}`).join(" ");
}

function formatYLabel(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

function generatePriceSeries(netFlow, seed) {
  const rng    = createRng(seed ^ 0x99887766);
  const base   = 10 + (seed % 490);
  const volPct = 0.0008 + (seed % 30) / 100000;
  let price    = base;
  let momentum = 0;
  return netFlow.map((net, i) => {
    const netSignal = i > 0 ? (net - netFlow[i - 1]) / (Math.abs(netFlow[i - 1]) || 1) : 0;
    momentum = momentum * 0.7 + netSignal * 0.0003;
    price += momentum * base + (rng() - 0.495) * base * volPct;
    price  = Math.max(base * 0.7, price);
    return parseFloat(price.toFixed(2));
  });
}

// ─── SYMBOL INPUT (typeahead autocomplete) ───────────────────
function SymbolInput({ value, onChange }) {
  const [query,     setQuery]     = useState(value || "");
  const [open,      setOpen]      = useState(false);
  const [hiIdx,     setHiIdx]     = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (value === "" && committed.current !== "") {
      setQuery("");
      committed.current = "";
    }
  }, [value]);

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    const starts   = STOCK_LIST.filter((s) => s.startsWith(q));
    const contains = STOCK_LIST.filter((s) => !s.startsWith(q) && s.includes(q));
    return [...starts, ...contains].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase();
    setQuery(v);
    committed.current = v;
    onChange(v);
    setOpen(false);
    setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape")    { setOpen(false); return; }
    if (!open && e.key === "ArrowDown") { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx((h) => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx((h) => Math.max(h - 1, -1)); return; }
    if (e.key === "Tab")       { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter") {
      if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]);
      else if (query.trim()) commit(query.trim());
    }
  };

  useEffect(() => {
    const fn = (e) => {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
        setQuery(committed.current);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.toUpperCase());
          setOpen(true);
          setHiIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Symbol..."
        className="w-[80px] bg-transparent text-xs font-bold text-white outline-none placeholder-slate-600 tracking-wider cursor-text"
      />

      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"
      >
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
          <path d={open ? "M4 0L8 5H0Z" : "M4 5L0 0H8Z"} />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-[200] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-[9px] text-slate-600 tracking-widest uppercase">
              {query ? `"${query}"` : "Popular"}
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto" style={scrollbarHideStyle}>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-slate-600 text-[10px] text-center">
                No match — press Enter to use "{query}"
              </div>
            ) : (
              filtered.map((sym, idx) => {
                const isHi = idx === hiIdx;
                return (
                  <div
                    key={sym}
                    onMouseDown={() => commit(sym)}
                    onMouseEnter={() => setHiIdx(idx)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all
                      ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400" : "border-l-2 border-transparent hover:bg-slate-800/40"}`}
                  >
                    <span className={`text-[12px] font-bold tracking-wider ${isHi ? "text-white" : "text-slate-300"}`}>
                      {sym}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {value && (
            <div
              onMouseDown={() => commit("")}
              className="flex items-center justify-center gap-1 px-3 py-2 text-[9px] text-slate-700 hover:text-red-400 cursor-pointer border-t border-slate-800 transition-colors"
            >
              <span>✕</span><span>Clear symbol</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChartSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-full bg-[#141b2d] rounded-lg overflow-hidden relative">
      <style>{`
        @keyframes shimmerFlowIntraday {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 rounded-full bg-slate-800 w-20" />
          <div className="h-2 rounded-full bg-slate-800 w-12" />
        </div>

        <div className="flex-1 my-3 rounded bg-slate-800/60 relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {[0.2, 0.4, 0.6, 0.8].map((y, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={`${y * 100}%`}
                x2="100%"
                y2={`${y * 100}%`}
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}
            {[0.2, 0.4, 0.6, 0.8].map((x, i) => (
              <line
                key={`v-${i}`}
                x1={`${x * 100}%`}
                y1="0"
                x2={`${x * 100}%`}
                y2="100%"
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>

        <div className="flex gap-2 justify-between">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2 rounded-full bg-slate-800 flex-1" />
          ))}
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
          animation: "shimmerFlowIntraday 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

// ─── INTERACTIVE GRID CHART ──────────────────────────────────
function InteractiveGridChart({ symbol, chartId, refreshKey = 0, globalHoverIndex, setGlobalHoverIndex, chartRefs, isLoading = false }) {
  const series = useMemo(() => generateFlowSeries(symbol), [symbol]);

  const scrollRef    = useRef(null);
  const containerRef = useRef(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragStartX,     setDragStartX]     = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(180);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => { if (e.contentRect.height > 0) setMeasuredHeight(e.contentRect.height); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs, series]);

if (isLoading) {
  return (
    <div ref={containerRef} className="w-full h-full p-2 bg-[#141b2d]">
      <ChartSkeleton />
    </div>
  );
}

  if (!series) {
    return (
      <div ref={containerRef} className="text-slate-600 text-xs font-semibold flex flex-col items-center justify-center w-full h-full gap-1">
        <span className="text-2xl opacity-30">⌨</span>
        <span>Type a symbol above</span>
      </div>
    );
  }

  const { buyFlow, sellFlow, netFlow, prices } = series;

  const height = measuredHeight;
  const { paddingLeft, paddingRight, paddingTop, paddingBottom, pointGap, minWidth } = CHART_CONFIG;
  const PL = 4, PR = 52, PT = paddingTop, PB = paddingBottom;
  const LEFT_W = 52;
  const chartWidth = Math.max(minWidth, PL + (netFlow.length - 1) * pointGap);

  const flowScale = calcYScaleFlow(series);
  const nyFlow    = makeNY(height, PT, PB, flowScale);

  const priceScale = calcYScalePrice(prices);
  const nyPrice    = makeNY(height, PT, PB, priceScale);

  const buyPath   = buildLinePath(buyFlow,  nyFlow,  PL, pointGap);
  const sellPath  = buildLinePath(sellFlow, nyFlow,  PL, pointGap);
  const netPath   = buildLinePath(netFlow,  nyFlow,  PL, pointGap);
  const pricePath = buildLinePath(prices,   nyPrice, PL, pointGap);

  const avgNet  = netFlow.reduce((a, v) => a + v, 0) / netFlow.length;
  const refY    = nyFlow(avgNet);
  const zeroY   = nyFlow(0);
  const lastIdx = netFlow.length - 1;

  const lastNet   = netFlow[lastIdx];
  const netColor  = lastNet >= 0 ? "#22c55e" : "#ef4444";
  const lastNetY  = nyFlow(lastNet);

  const lastPrice  = prices[lastIdx];
  const lastPriceY = nyPrice(lastPrice);

  const flowTicks = [0,1,2,3,4].map((i) => {
    const v = flowScale.max - i * (flowScale.max - flowScale.min) / 4;
    return { v, y: nyFlow(v) };
  });
  const priceTicks = [0,1,2,3,4].map((i) => {
    const v = priceScale.max - i * (priceScale.max - priceScale.min) / 4;
    return { v, y: nyPrice(v) };
  });

  const syncScroll = (el) => {
    Object.values(chartRefs.current).forEach((n) => {
      if (n && n !== el && Math.abs(n.scrollLeft - el.scrollLeft) > 1) n.scrollLeft = el.scrollLeft;
    });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStartX(e.pageX - scrollRef.current.offsetLeft);
    setDragScrollLeft(scrollRef.current.scrollLeft);
    setGlobalHoverIndex(null);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      scrollRef.current.scrollLeft = dragScrollLeft - (e.pageX - scrollRef.current.offsetLeft - dragStartX) * 1.5;
      setGlobalHoverIndex(null);
      return;
    }
    const mouseX = e.clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft;
    setGlobalHoverIndex(Math.max(0, Math.min(Math.round((mouseX - PL) / pointGap), netFlow.length - 1)));
  };

  const isHovering = globalHoverIndex !== null && !isDragging && globalHoverIndex < netFlow.length;
  const hoverX     = isHovering ? PL + globalHoverIndex * pointGap : null;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#141b2d] overflow-hidden flex">

      {/* ── LEFT AXIS PANEL ── */}
      <div className="relative flex-shrink-0 bg-[#141b2d] z-10 border-r border-slate-700/30" style={{ width: LEFT_W }}>
        <svg width={LEFT_W} height={height} className="overflow-visible pointer-events-none">
          {flowTicks.map(({ v, y }, i) => (
            <text key={i} x={LEFT_W - 6} y={y} fill="#64748b" fontSize="9"
              textAnchor="end" dominantBaseline="central">
              {formatYLabel(v)}
            </text>
          ))}
          <g transform={`translate(2, ${lastNetY})`}>
            <rect x="0" y="-8" width={LEFT_W - 4} height="16" fill={netColor} rx="3" />
            <text x={(LEFT_W - 4) / 2} y="0" fill="#fff" fontSize="9" textAnchor="middle"
              dominantBaseline="central" fontWeight="bold">
              {formatYLabel(lastNet)}
            </text>
          </g>
        </svg>
      </div>

      {/* ── SCROLLABLE CHART AREA ── */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          className={`w-full h-full relative overflow-x-auto overflow-y-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          onScroll={(e) => syncScroll(e.target)}
          onMouseDown={handleMouseDown}
          onMouseLeave={() => { setIsDragging(false); setGlobalHoverIndex(null); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
        >
          <svg width={chartWidth} height={height} className="overflow-visible pointer-events-none">

            {flowTicks.map(({ y }, i) => (
              <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1e2d45" strokeWidth="1" />
            ))}

            {zeroY >= PT && zeroY <= height - PB && (
              <line x1={0} y1={zeroY} x2={chartWidth} y2={zeroY} stroke="#334155" strokeWidth="1" />
            )}

            <line x1={0} y1={refY} x2={chartWidth} y2={refY}
              stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

            {netFlow.map((_, i) => {
              if (i % 6 !== 0) return null;
              return (
                <text key={i} x={PL + i * pointGap} y={height - PB + 14}
                  fill="#4a5568" fontSize="8" textAnchor="middle">
                  {LABELS[i % LABELS.length]}
                </text>
              );
            })}

            <path d={sellPath} fill="none" stroke="#ef4444" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" />
            <path d={buyPath} fill="none" stroke="#22c55e" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" />
            <path d={netPath} fill="none" stroke="#ffffff" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
            <path d={pricePath} fill="none" stroke="#94a3b8" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />

            {isHovering && (
              <g>
                <line x1={hoverX} y1={PT} x2={hoverX} y2={height - PB}
                  stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={hoverX} cy={nyFlow(netFlow[globalHoverIndex])}
                  r="3.5" fill="#ffffff" stroke="#141b2d" strokeWidth="1.5" />
                <circle cx={hoverX} cy={nyFlow(buyFlow[globalHoverIndex])}
                  r="3" fill="#22c55e" stroke="#141b2d" strokeWidth="1.5" />
                <circle cx={hoverX} cy={nyFlow(sellFlow[globalHoverIndex])}
                  r="3" fill="#ef4444" stroke="#141b2d" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        </div>

        {/* RIGHT: Price axis + price tag */}
        <div className="absolute right-0 top-0 w-[52px] h-full pointer-events-none bg-[#141b2d] z-10 border-l border-slate-700/40">
          <svg className="w-full h-full absolute inset-0 overflow-visible">
            {priceTicks.map(({ v, y }, i) => (
              <text key={i} x="46" y={y} fill="#64748b" fontSize="9"
                textAnchor="end" dominantBaseline="central">
                {v.toFixed(2)}
              </text>
            ))}
            <g transform={`translate(4, ${lastPriceY})`}>
              <rect x="0" y="-8" width="44" height="16" fill="#ffffff" rx="3" />
              <text x="22" y="0" fill="#111827" fontSize="9" textAnchor="middle"
                dominantBaseline="central" fontWeight="bold">
                {lastPrice.toFixed(2)}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── FULLSCREEN SYMBOL INPUT ─────────────────────────────────
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
    const starts   = STOCK_LIST.filter((s) => s.startsWith(q));
    const contains = STOCK_LIST.filter((s) => !s.startsWith(q) && s.includes(q));
    return [...starts, ...contains].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase();
    setQuery(v); committed.current = v; onChange(v); setOpen(false); setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape")    { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHiIdx((h) => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx((h) => Math.max(h - 1, -1)); return; }
    if (e.key === "Tab")       { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter")     { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* ✅ เพิ่ม relative wrapper */}
      <div className="relative w-56">
        <div className={`flex items-center gap-2 bg-[#1a2235] border rounded-lg px-3 py-1.5 transition-all ${
          open ? "border-cyan-500/60" : "border-slate-700 hover:border-slate-500"
        }`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder="พิมพ์ชื่อหุ้น..."
            className={`flex-1 bg-transparent text-sm outline-none placeholder-slate-600 pr-6 ${
              value && !open ? "font-bold text-white" : "text-white"
            }`}
          />
          {/* ✅ ปุ่ม ✕ ใช้ absolute positioning */}
          {query && (
            <button 
              onMouseDown={() => commit("")} 
              className="absolute right-3 text-slate-600 hover:text-slate-300 text-sm transition-colors flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-2xl z-[200] overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-slate-600 text-[11px] text-center">ไม่พบ — กด Enter เพื่อใช้ "{query}"</div>
            ) : filtered.map((sym, idx) => {
              const isHi = idx === hiIdx;
              return (
                <div key={sym} onMouseDown={() => commit(sym)} onMouseEnter={() => setHiIdx(idx)}
                  className={`px-4 py-2.5 cursor-pointer text-sm font-bold tracking-wider transition-all
                    ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-white" : "border-l-2 border-transparent text-slate-300 hover:bg-slate-800/40"}`}>
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

// ─── FULLSCREEN CHART ─────────────────────────────────────────
function FullscreenChart({ symbol, chartId, chartRefs }) {
  const loadingTimeoutsRef = useRef({});
  const series = useMemo(() => generateFlowSeries(symbol), [symbol]);
  const containerRef = useRef(null);
  const scrollRef    = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(500);
  const [hoverIdx,       setHoverIdx]       = useState(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragStartX,     setDragStartX]     = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => { if (e.contentRect.height > 0) setMeasuredHeight(e.contentRect.height); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    chartRefs.current[chartId] = scrollRef.current;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs, series]);

  if (!series) return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center text-slate-600">เลือกหุ้นด้านบน</div>
  );

  const { buyFlow, sellFlow, netFlow, prices } = series;
  const height = measuredHeight;
  const PL = 60, PR = 16, PT = 20, PB = 30;
  const pointGap = 35;
  const chartWidth = Math.max(800, PL + PR + (netFlow.length - 1) * pointGap);

  const flowScale = calcYScaleFlow(series);
  const nyFlow    = makeNY(height, PT, PB, flowScale);

  const buyPath  = buildLinePath(buyFlow,  nyFlow, PL, pointGap);
  const sellPath = buildLinePath(sellFlow, nyFlow, PL, pointGap);
  const netPath  = buildLinePath(netFlow,  nyFlow, PL, pointGap);

  const avgNet   = netFlow.reduce((a, v) => a + v, 0) / netFlow.length;
  const refY     = nyFlow(avgNet);
  const zeroY    = nyFlow(0);
  const lastIdx  = netFlow.length - 1;
  const lastNet  = netFlow[lastIdx];
  const netColor = lastNet >= 0 ? "#22c55e" : "#ef4444";
  const lastNetY = nyFlow(lastNet);

  const flowTicks = [0,1,2,3,4,5,6].map((i) => {
    const v = flowScale.max - i * (flowScale.max - flowScale.min) / 6;
    return { v, y: nyFlow(v) };
  });

  const isHovering = hoverIdx !== null && !isDragging && hoverIdx < netFlow.length;
  const hoverX     = isHovering ? PL + hoverIdx * pointGap : null;

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      scrollRef.current.scrollLeft = dragScrollLeft - (e.pageX - scrollRef.current.offsetLeft - dragStartX) * 1.5;
      setHoverIdx(null);
      return;
    }
    const mouseX = e.clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft;
    setHoverIdx(Math.max(0, Math.min(Math.round((mouseX - PL) / pointGap), netFlow.length - 1)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0d1117] overflow-hidden flex">
      {/* Left axis */}
      <div className="relative flex-shrink-0 bg-[#0d1117] z-10" style={{ width: PL }}>
        <svg width={PL} height={height} className="overflow-visible pointer-events-none">
          {flowTicks.map(({ v, y }, i) => (
            <text key={i} x={PL - 8} y={y} fill="#4a5568" fontSize="11"
              textAnchor="end" dominantBaseline="central">
              {formatYLabel(v)}
            </text>
          ))}
          <g transform={`translate(2, ${lastNetY})`}>
            <rect x="0" y="-9" width={PL - 4} height="18" fill={netColor} rx="4" />
            <text x={(PL - 4) / 2} y="0" fill="#fff" fontSize="10" textAnchor="middle"
              dominantBaseline="central" fontWeight="bold">
              {formatYLabel(lastNet)}
            </text>
          </g>
        </svg>
      </div>

      {/* Scrollable chart */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          className={`w-full h-full overflow-x-auto overflow-y-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          onMouseDown={(e) => { setIsDragging(true); setDragStartX(e.pageX - scrollRef.current.offsetLeft); setDragScrollLeft(scrollRef.current.scrollLeft); setHoverIdx(null); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => { setIsDragging(false); setHoverIdx(null); }}
          onMouseMove={handleMouseMove}
        >
          <svg width={chartWidth} height={height} className="overflow-visible pointer-events-none">
            {flowTicks.map(({ y }, i) => (
              <line key={i} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#1a2535" strokeWidth="1" />
            ))}
            {zeroY >= PT && zeroY <= height - PB && (
              <line x1={0} y1={zeroY} x2={chartWidth} y2={zeroY} stroke="#334155" strokeWidth="1" />
            )}
            <line x1={0} y1={refY} x2={chartWidth} y2={refY}
              stroke="#22c55e" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
            {netFlow.map((_, i) => {
              if (i % 4 !== 0) return null;
              return (
                <text key={i} x={PL + i * pointGap} y={height - PB + 16}
                  fill="#374151" fontSize="10" textAnchor="middle">
                  {LABELS[i % LABELS.length]}
                </text>
              );
            })}
            <path d={sellPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={buyPath}  fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={netPath}  fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {!isHovering && (
              <circle cx={PL + lastIdx * pointGap} cy={nyFlow(lastNet)} r="5" fill="#ffffff" stroke="#0d1117" strokeWidth="2" />
            )}
            {isHovering && (
              <g>
                <line x1={hoverX} y1={PT} x2={hoverX} y2={height - PB} stroke="#374151" strokeWidth="1" strokeDasharray="4 3" />
                <circle cx={hoverX} cy={nyFlow(netFlow[hoverIdx])}  r="5" fill="#ffffff" stroke="#0d1117" strokeWidth="2" />
                <circle cx={hoverX} cy={nyFlow(buyFlow[hoverIdx])}  r="4" fill="#22c55e" stroke="#0d1117" strokeWidth="2" />
                <circle cx={hoverX} cy={nyFlow(sellFlow[hoverIdx])} r="4" fill="#ef4444" stroke="#0d1117" strokeWidth="2" />
              </g>
            )}
          </svg>

          {/* Tooltip */}
          {isHovering && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: hoverX,
                top: "30%",
                transform: hoverIdx > netFlow.length - 10 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
              }}
            >
              <div className="bg-[#111827] border border-slate-700 rounded-xl p-3 shadow-2xl min-w-[140px]">
                <div className="text-white text-xs font-bold mb-2 border-b border-slate-700 pb-1.5">
                  {LABELS[hoverIdx % LABELS.length]}
                </div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-3 h-3 rounded-sm bg-white flex-shrink-0" />
                  <span className="text-slate-400">Price:</span>
                  <span className="text-white font-bold ml-auto">{prices[hoverIdx]?.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-3 h-3 rounded-sm bg-red-500 flex-shrink-0" />
                  <span className="text-slate-400">Flow:</span>
                  <span className="text-white font-bold ml-auto">{formatYLabel(netFlow[hoverIdx])}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-sm bg-green-500 flex-shrink-0" />
                  <span className="text-slate-400">Limit:</span>
                  <span className="text-white font-bold ml-auto">{formatYLabel(buyFlow[hoverIdx])}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function FlowIntraday() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const { accessData, isFreeAccess } = useSubscription();

  const [isMember,    setIsMember]    = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  const [layout,          setLayout]          = useState("12");
  const [symbols,         setSymbols]         = useState(Array(12).fill(""));
  const [refreshKeys,     setRefreshKeys]     = useState(Array(12).fill(0));
  const [fullscreenIndex, setFullscreenIndex] = useState(null);

  const [showLeft,  setShowLeft]  = useState(false);
  const [showRight, setShowRight] = useState(true);
  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const chartRefs = useRef({});

  const [watchlists,      setWatchlists]      = useState([]);
  const [showAddModal,    setShowAddModal]     = useState(false);
  const [showWatchPanel,  setShowWatchPanel]   = useState(false);
  const [newListName,     setNewListName]      = useState("");
  const [activeWatchlist, setActiveWatchlist]  = useState(null);

  const [loadingMap, setLoadingMap] = useState(Array(12).fill(false));

  const selectedSymbols = useMemo(
    () => [...new Set(symbols.filter((s) => s.trim() !== ""))],
    [symbols]
  );

  const boxCount = parseInt(layout);
  const boxes = Array.from({ length: boxCount });

  const handleRefresh = (index, isFullscreen = false) => {
    const key = isFullscreen ? "fullscreen-chart" : `grid-chart-${index}`;
    const targetRef = chartRefs.current[key];
    if (targetRef) targetRef.scrollTo({ left: targetRef.scrollWidth, behavior: "smooth" });
  };

  const handleOpenAddModal = useCallback(() => {
    if (selectedSymbols.length === 0) return;
    setNewListName("");
    setShowAddModal(true);
  }, [selectedSymbols]);

  const handleConfirmAdd = useCallback(() => {
    const name = newListName.trim() || `Watchlist ${watchlists.length + 1}`;
    setWatchlists((prev) => [...prev, { id: Date.now(), name, symbols: selectedSymbols }]);
    setShowAddModal(false);
  }, [newListName, watchlists.length, selectedSymbols]);

  const handleDeleteWatchlist = useCallback((id) => {
    setWatchlists((prev) => prev.filter((w) => w.id !== id));
    setActiveWatchlist((prev) => prev === id ? null : prev);
  }, []);

  useEffect(() => {
    if (isFreeAccess) { setIsMember(true); return; }
    const toolId = "flow";
    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
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
      setIsMember(false);
    }
  }, [accessData, isFreeAccess]);

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
    const c = scrollContainerRef.current;
    if (!c) return;
    const id = setInterval(() => {
      if (isPaused.current || !c) return;
      const { scrollLeft, scrollWidth, clientWidth } = c;
      const max = scrollWidth - clientWidth;
      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= max - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && scrollLeft <= 2) scrollDirection.current = 1;
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

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setFullscreenIndex(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (!showWatchPanel) return;
    const fn = (e) => { if (!e.target.closest("[data-watchpanel]")) setShowWatchPanel(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showWatchPanel]);

  const loadingTimeoutsRef = useRef({});

const handleSymbolChange = useCallback((index, value) => {
  const nextValue = value.toUpperCase().trim();

  setGlobalHoverIndex(null);

  if (loadingTimeoutsRef.current[index]) {
    clearTimeout(loadingTimeoutsRef.current[index]);
  }

  if (!nextValue) {
    setSymbols((prev) => {
      const updated = [...prev];
      updated[index] = "";
      return updated;
    });

    setLoadingMap((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });

    return;
  }

  setLoadingMap((prev) => {
    const updated = [...prev];
    updated[index] = true;
    return updated;
  });

  loadingTimeoutsRef.current[index] = setTimeout(() => {
    setSymbols((prev) => {
      const updated = [...prev];
      updated[index] = nextValue;
      return updated;
    });

    setLoadingMap((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });

    delete loadingTimeoutsRef.current[index];
  }, 700);
}, []);

  const features = [
    { title: "Multi-Asset Flow Monitor", desc: "Monitor up to 12 stocks at once in a powerful grid layout." },
    { title: "Smart Flow Alerts",        desc: "Set custom triggers and receive instant notifications." },
    { title: "Customizable Layout",      desc: "Switch layouts and adapt to your trading style." },
  ];

  // ── PREVIEW ─────────────────────────────────────────────────
  if (!isMember || !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">Flow Intraday</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Turn your trading screen into an elite surveillance system</p>
          </div>

          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
              </div>
              <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden">
                <FlowIntradayDashboard />
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">3 Main Features</h2>
            <div className="relative group" onMouseEnter={() => (isPaused.current = true)} onMouseLeave={() => (isPaused.current = false)}>
              <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
                {features.map((item, i) => (
                  <div key={i} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:border-cyan-500/30 transition duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {!isMember ? (
              <>
                <button onClick={() => navigate("/login")} className="px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 transition-all duration-300">Sign In</button>
                <button onClick={() => navigate("/member-register")} className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg transition-all duration-300">Join Membership</button>
              </>
            ) : (
              <button onClick={() => setEnteredTool(true)} className="group inline-flex items-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition-all duration-300">
                <span className="mr-2">Start Using Tool</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ────────────────────────────────────────────────
  return (
    <div className="w-full h-screen bg-[#0b111a] text-white px-3 py-3 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0">

        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">

          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-[#111827] border border-slate-700 px-4 py-2 rounded-lg">
              <span className="text-sm text-slate-400">Select Layout :</span>
              <div className="flex gap-2">
                {["12", "6", "4"].map((col) => (
                  <button key={col} onClick={() => setLayout(col)}
                    className={`w-7 h-7 rounded text-xs flex items-center justify-center transition ${layout === col ? "bg-purple-600 text-white" : "bg-[#1f2937] text-slate-400 hover:text-white"}`}>
                    {col === "12" ? "▦" : col === "6" ? "▤" : "☰"}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm text-slate-400">
              <span>Price</span><div className="w-8 h-[2px] bg-white" /><span>Value</span>
              <div className="flex gap-1"><div className="w-3 h-[2px] bg-green-400" /><div className="w-3 h-[2px] bg-red-400" /></div>
            </div>
          </div>

          {/* Right */}
          <div className="relative flex items-center gap-3" data-watchpanel>
            <button onClick={() => setShowWatchPanel((v) => !v)}
              className="flex items-center gap-2 bg-[#111827] border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg text-sm transition-all">
              <span className="text-slate-400">♥ Watchlists</span>
              {watchlists.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{watchlists.length}</span>}
              <svg className={`w-3 h-3 text-slate-400 transition-transform ${showWatchPanel ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {showWatchPanel && (
              <div className="absolute right-[90px] top-full mt-2 w-72 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">My Watchlists</span>
                  <button onClick={() => setShowWatchPanel(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
                </div>
                {watchlists.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm">No watchlists yet.<br />Select symbols and press ♥ ADD.</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto">
                    {watchlists.map((wl) => (
                      <li key={wl.id} className="border-b border-slate-800 last:border-0">
                        <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[#1e293b] cursor-pointer transition"
                          onClick={() => setActiveWatchlist(activeWatchlist === wl.id ? null : wl.id)}>
                          <div className="flex items-center gap-2">
                            <svg className={`w-3 h-3 text-slate-400 transition-transform ${activeWatchlist === wl.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            <span className="text-sm font-semibold text-white truncate max-w-[140px]">{wl.name}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{wl.symbols.length}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }} className="text-slate-600 hover:text-red-400 transition text-sm px-1">🗑</button>
                        </div>
                        {activeWatchlist === wl.id && (
                          <div className="bg-[#0b1220] px-4 py-2 flex flex-wrap gap-1.5">
                            {wl.symbols.map((sym) => (
                              <span key={sym} className="text-[11px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded-full">{sym}</span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button onClick={handleOpenAddModal} className="bg-red-500 hover:bg-red-600 active:scale-95 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5">
              <span>♥</span><span>ADD</span>
            </button>
          </div>
        </div>

        {/* Add Watchlist Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
            <div className="bg-[#1c1c1e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-end px-4 pt-4">
                <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-full bg-slate-700/60 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition text-sm">✕</button>
              </div>
              <div className="flex flex-col items-center px-6 pb-6 pt-1">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4">
                  <span className="text-2xl">♥</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Save Watchlist</h3>
                <p className="text-slate-400 text-sm text-center mb-5">
                  Saving <span className="text-white font-semibold">{selectedSymbols.length} symbol{selectedSymbols.length !== 1 ? "s" : ""}</span> to a new watchlist.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mb-5 w-full">
                  {selectedSymbols.map((sym) => (
                    <span key={sym} className="text-[11px] font-bold text-cyan-400 bg-cyan-900/30 border border-cyan-800/50 px-2 py-0.5 rounded-full">{sym}</span>
                  ))}
                </div>
                <input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmAdd()}
                  placeholder={`Watchlist ${watchlists.length + 1}`}
                  className="w-full bg-[#0b1220] border border-slate-600 focus:border-amber-500 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 transition mb-4" />
                <button onClick={handleConfirmAdd} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <span>⚙</span><span>Save Watchlist</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div
          className={`grid gap-3 flex-1 min-h-0 transition-all duration-300
            ${layout === "12" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
              : layout === "6" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2"}`}
          style={{ gridAutoRows: "1fr" }}
        >
          {boxes.map((_, index) => (
            <div key={index} className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition flex flex-col min-h-0">
             {/* Card header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-slate-700 flex-shrink-0">
                <SymbolInput
                  value={symbols[index]}
                  onChange={(v) => handleSymbolChange(index, v)}
                />
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <select className="bg-[#1f2937] px-2 py-0.5 rounded text-xs outline-none cursor-pointer">
                    <option>Flow</option><option>Price</option>
                  </select>
                  <button 
                    className="hover:text-cyan-400 transition text-slate-400"
                    title="Notifications"
                  >
                    <NotificationsNoneIcon sx={{ fontSize: 18 }} />
                  </button>
                  {symbols[index] && (
                    <ZoomInIcon onClick={() => setFullscreenIndex(index)}
                      sx={{ fontSize: 18, color: "#94a3b8", cursor: "pointer", transition: "all 0.2s ease", "&:hover": { color: "#00d4ff", transform: "scale(1.1)" } }} />
                  )}
                  <button 
                    onClick={() => handleRefresh(index)}
                    className="hover:text-cyan-400 transition text-slate-400"
                    title="Go to latest"
                  >
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 min-h-0">
                <InteractiveGridChart
                  symbol={symbols[index]}
                  chartId={`grid-chart-${index}`}
                  refreshKey={refreshKeys[index]}
                  globalHoverIndex={globalHoverIndex}
                  setGlobalHoverIndex={setGlobalHoverIndex}
                  chartRefs={chartRefs}
                  isLoading={!!loadingMap[index]}
                />
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Fullscreen Modal (UI จากไฟล์ 4) ── */}
      {fullscreenIndex !== null && symbols[fullscreenIndex] && (
        <div className="fixed inset-0 bg-[#0d1117] z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-slate-800 flex-shrink-0">
            <button
              onClick={() => setFullscreenIndex(null)}
              className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all flex-shrink-0"
            >
              ← Back
            </button>
            <button
              onClick={() => handleRefresh(fullscreenIndex, true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-all flex-shrink-0"
            >
              🔄
            </button>
            <FullscreenSymbolInput
              value={symbols[fullscreenIndex]}
              onChange={(v) => handleSymbolChange(fullscreenIndex, v)}
            />
            <h2 className="flex-1 text-center text-lg font-bold text-white tracking-widest uppercase">
              {symbols[fullscreenIndex]}
            </h2>
          </div>

          {/* Chart — ใช้ InteractiveGridChart เดียวกับด้านนอก */}
          <div className="flex-1 min-h-0 bg-[#0d1117]">
            <InteractiveGridChart
              symbol={symbols[fullscreenIndex]}
              chartId="fullscreen-chart"
              refreshKey={refreshKeys[fullscreenIndex] ?? 0}
              globalHoverIndex={globalHoverIndex}
              setGlobalHoverIndex={setGlobalHoverIndex}
              chartRefs={chartRefs}
              isLoading={!!loadingMap[fullscreenIndex]}
            />
          </div>
        </div>
      )}
    </div>
  );
}