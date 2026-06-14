// src/pages/tools/StockFortuneTeller.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ToolHint from "@/components/ToolHint.jsx";
import StockFortuneTellerDashboard from "./components/StockFortuneTellerDashboard.jsx";
import SearchIcon from "@mui/icons-material/Search";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Papa from "papaparse";

// ────────────────────────────────────────────────────────────────
// TradingView Lightweight Charts — loaded via CDN script tag
// ────────────────────────────────────────────────────────────────
let _tvReady = null;
function loadTVCharts() {
  if (_tvReady) return _tvReady;
  _tvReady = new Promise((resolve) => {
    if (window.LightweightCharts) {
      resolve(window.LightweightCharts);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js";
    script.async = true;
    script.onload = () => resolve(window.LightweightCharts);
    document.head.appendChild(script);
  });
  return _tvReady;
}

const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

// ====================================================
// Toast System
// ====================================================
function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium
            backdrop-blur-md transition-all duration-300
            ${
              toast.type === "success"
                ? "bg-[#0a1628]/90 border-cyan-500/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                : toast.type === "error"
                ? "bg-[#0a1628]/90 border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                : "bg-[#0a1628]/90 border-slate-500/40 text-slate-300"
            }`}
          style={{ animation: "toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
        >
          {toast.type === "success" && (
            <CheckCircleOutlineIcon fontSize="small" className="text-cyan-400 flex-shrink-0" />
          )}
          {toast.type === "error" && (
            <ErrorOutlineIcon fontSize="small" className="text-red-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  };
  return { toasts, showToast };
}

// ====================================================
// ScaledDashboardPreview
// ====================================================
function ScaledDashboardPreview({ dashboardWidth = 1400, dashboardHeight = 850 }) {
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
    <div ref={outerRef} className="w-full bg-[#0b1221]" style={{ overflow: "hidden", position: "relative" }}>
      <div
        ref={innerRef}
        style={{ width: dashboardWidth, height: dashboardHeight, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}
      >
        <StockFortuneTellerDashboard />
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC DATA GENERATOR
// ============================================================
function symbolToSeed(sym) {
  return sym.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 0);
}
function createRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MOCK_CACHE = {};
function generateMockData(symbol) {
  if (!symbol) return null;
  if (MOCK_CACHE[symbol]) return MOCK_CACHE[symbol];
  const seed = symbolToSeed(symbol);
  const rng = createRng(seed);
  const n = 60;

  const baseTime = Math.floor(new Date("2025-01-02").getTime() / 1000);
  const DAY = 86400;
  const times = [];
  let t = baseTime;
  while (times.length < n) {
    const d = new Date(t * 1000);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) times.push(t);
    t += DAY;
  }

  const priceBase = 20 + rng() * 180;
  const priceTrend = (rng() - 0.48) * 0.12;
  const priceVol = priceBase * (0.012 + rng() * 0.02);
  let pv = priceBase;

  const candles = times.map((time) => {
    const open = pv;
    pv += (rng() - 0.5) * priceVol * 2 + priceTrend;
    pv = Math.max(priceBase * 0.4, Math.min(priceBase * 2.4, pv));
    const close = pv;
    const high = Math.max(open, close) + rng() * priceVol;
    const low = Math.min(open, close) - rng() * priceVol;
    const volume = Math.floor(500000 + rng() * 4000000);
    return { time, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), value: volume };
  });

  const shortBase = 10 + rng() * 15;
  const shortTrend = (rng() - 0.5) * 0.3;
  let saVal = shortBase, sbVal = shortBase + rng() * 4 - 2;
  const shortA = times.map((time) => {
    saVal += (rng() - 0.5) * 2.5 + shortTrend;
    saVal = Math.max(5, Math.min(35, saVal));
    return { time, value: +saVal.toFixed(2) };
  });
  const shortB = times.map((time) => {
    sbVal += (rng() - 0.5) * 2.0 + shortTrend * 0.8;
    sbVal = Math.max(4, Math.min(32, sbVal));
    return { time, value: +sbVal.toFixed(2) };
  });

  const ptBase = 20 + rng() * 15;
  const ptTrend = (rng() - 0.4) * 0.5;
  let ptVal = ptBase;
  const predictTrend = times.map((time) => {
    const surge = rng() < 0.15 ? (rng() - 0.3) * 4 : 0;
    ptVal += (rng() - 0.5) * 2.5 + ptTrend + surge;
    ptVal = Math.max(ptBase * 0.5, Math.min(ptBase * 2.5, ptVal));
    return { time, value: +ptVal.toFixed(2) };
  });

  const peakBase = 4 + rng() * 4;
  const peak = times.map((time) => {
    const isSpike = rng() < 0.2;
    const value = isSpike ? +(peakBase + rng() * 14).toFixed(2) : +(peakBase + rng() * 3).toFixed(2);
    return { time, value, color: value > peakBase + 8 ? "#f59e0b" : value > peakBase + 4 ? "#fb923c" : "#1d4ed8" };
  });

  const shBase = 8 + rng() * 5;
  const shLevels = [+shBase.toFixed(2), +(shBase + 0.01 + rng() * 0.05).toFixed(2), +(shBase + 0.1 + rng() * 0.1).toFixed(2)];
  let shIdx = 0, shCounter = 0;
  const shHold = Math.floor(5 + rng() * 6);
  const shareholder = times.map((time) => {
    shCounter++;
    if (shCounter >= shHold && shIdx < shLevels.length - 1 && rng() < 0.4) { shIdx++; shCounter = 0; }
    return { time, value: shLevels[shIdx] };
  });

  const managerBases = [+(2 + rng() * 4).toFixed(2), +(0.5 + rng() * 2).toFixed(2), +((rng() - 0.5) * 1.5).toFixed(2), -(1 + rng() * 4).toFixed(2), -(4 + rng() * 6).toFixed(2)];
  const manager = managerBases.map((base, mi) => {
    const rngM = createRng(seed + mi * 997 + 1);
    const shift1 = Math.floor(rngM() * (n - 4)) + 2;
    const delta1 = (rngM() - 0.5) * Math.abs(base) * 0.3;
    return times.map((time, i) => ({ time, value: i < shift1 ? base : +(base + delta1).toFixed(2) }));
  });

  const result = { candles, shortA, shortB, predictTrend, peak, shareholder, manager, times };
  MOCK_CACHE[symbol] = result;
  return result;
}

// ============================================================
// CONSTANTS
// ============================================================
const MANAGER_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#0ea5e9", "#eab308"];
const CHART_TYPES = ["Last", "%Short", "PredictTrend", "Peak", "Shareholder", "Manger"];

const SHAREHOLDER_NAMES = {
  BANPU: "บ้านปู จำกัด (มหาชน)", BGRIM: "บี.กริม เพาเวอร์", EGCO: "ผลิตไฟฟ้า จำกัด (มหาชน)",
  GPSC: "โกลบอล เพาเวอร์ ซินเนอร์ยี่", GULF: "กัลฟ์ เอ็นเนอร์จี ดีเวลลอปเมนท์", OR: "ปตท. น้ำมันและการค้าปลีก",
  PTT: "ปตท. จำกัด (มหาชน)", PTTEP: "ปตท.สผ. จำกัด (มหาชน)", PTTGC: "พีทีที โกลบอล เคมิคอล",
  RATCH: "ราช กรุ๊ป จำกัด (มหาชน)", TOP: "ไทยออยล์ จำกัด (มหาชน)", IVL: "อินโดรามา เวนเจอร์ส",
  BBL: "ธนาคารกรุงเทพ", KBANK: "ธนาคารกสิกรไทย", KTB: "ธนาคารกรุงไทย", SCB: "ธนาคารไทยพาณิชย์",
  TISCO: "ทิสโก้ไฟแนนเชียลกรุ๊ป", TTB: "ธนาคารทหารไทยธนชาต", KTC: "บัตรกรุงไทย จำกัด (มหาชน)",
  SAWAD: "ศรีสวัสดิ์ คอร์ปอเรชั่น", MTC: "เมืองไทย แคปปิตอล", TLI: "ไทยประกันชีวิต",
  ADVANC: "แอดวานซ์ อินโฟร์ เซอร์วิส", DELTA: "เดลต้า อีเลคโทรนิคส์", COM7: "คอม เซเว่น จำกัด (มหาชน)",
  CCET: "ช ทวี จำกัด (มหาชน)", TRUE: "ทรู คอร์ปอเรชั่น", CPALL: "ซีพี ออลล์ จำกัด (มหาชน)",
  CPF: "เจริญโภคภัณฑ์อาหาร", CBG: "คาราบาวกรุ๊ป", OSP: "โอสถสภา จำกัด (มหาชน)",
  GLOBAL: "สยามโกลบอลเฮ้าส์", HMPRO: "โฮม โปรดักส์ เซ็นเตอร์", BJC: "เบอร์ลี่ ยุคเกอร์ จำกัด (มหาชน)",
  CRC: "เซ็นทรัล รีเทล คอร์ปอเรชั่น", ITC: "อิตาเลียนไทย ดีเวล๊อปเมนต์", TU: "ไทยยูเนี่ยน กรุ๊ป",
  AOT: "ท่าอากาศยานไทย", AWC: "แอสเสท เวิรด์ คอร์ป", BDMS: "กรุงเทพดุสิตเวชการ",
  BH: "โรงพยาบาลบำรุงราษฎร์", BEM: "ทางด่วนและรถไฟฟ้ากรุงเทพ", BTS: "บีทีเอส กรุ๊ป โฮลดิ้งส์",
  CPN: "เซ็นทรัลพัฒนา", LH: "แลนด์ แอนด์ เฮ้าส์", MINT: "ไมเนอร์ อินเตอร์เนชั่นแนล", SCGP: "เอสซีจี แพคเกจจิ้ง",
};

const MANAGER_NAMES_BY_SYMBOL = {
  BANPU: ["วเศษ วิศิษฎ์วิญญ", "ศุภชัย เจียรวนนท์", "อิสระ ว่องกุศลกิจ", "ก่อศักดิ์ ไชยรัศมีศักดิ์", "ประทีป ตั้งมติธรรม"],
  KBANK: ["ตระกูลล่ำซำ", "กบข.", "กองทุนบัวหลวง", "Vanguard Group", "กองทุน ThaiNVDR"],
  PTT: ["กระทรวงการคลัง", "กบข.", "กองทุนวายุภักษ์", "BlackRock", "กองทุน ThaiNVDR"],
  SCB: ["ตระกูลโสภณพนิช", "กบข.", "กองทุนบัวหลวง", "Morgan Stanley", "กองทุน ThaiNVDR"],
  CPALL: ["ตระกูลเจียรวนนท์", "CP Group", "กบข.", "Goldman Sachs", "กองทุน ThaiNVDR"],
  DEFAULT: ["กลุ่มผู้ก่อตั้ง", "กบข.", "กองทุนรวมในประเทศ", "กองทุนต่างประเทศ", "กองทุน ThaiNVDR"],
};

// ============================================================
// TV CHART COMMON OPTIONS
// ============================================================
function getTVChartOptions(container) {
  const { width, height } = container.getBoundingClientRect();
  return {
    width: width || 400,
    height: height || 230,
    layout: {
      background: { color: "#0f172a" },
      textColor: "#64748b",
      fontSize: 10,
    },
    grid: {
      vertLines: { color: "#1e293b" },
      horzLines: { color: "#1e293b" },
    },
    crosshair: {
      vertLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
      horzLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
    },
    rightPriceScale: {
      borderColor: "#1e293b",
      textColor: "#64748b",
      scaleMargins: { top: 0.08, bottom: 0.08 },
    },
    timeScale: {
      borderColor: "#1e293b",
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time) => {
        const d = new Date(time * 1000);
        return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`;
      },
    },
    handleScroll: true,
    handleScale: true,
    watermark: { visible: false },
    attributionLogo: { visible: false },
  };
}

// ============================================================
// TVChartCard
// ============================================================
function TVChartCard({ title, type, onChange, selectedSymbol, dataVersion, managerVisibility, onToggleManagerLines }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRefs = useRef([]);
  const resizeObserverRef = useRef(null);

  const data = useMemo(() => generateMockData(selectedSymbol), [selectedSymbol, dataVersion]);

  // Apply visibility changes to manager series without rebuilding chart
  useEffect(() => {
    if (type !== "Manger" || !seriesRefs.current.length || !managerVisibility) return;
    seriesRefs.current.forEach((s, i) => {
      if (!s) return;
      try {
        s.applyOptions({ visible: managerVisibility[i] !== false });
      } catch (_) {}
    });
  }, [managerVisibility, type]);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    let destroyed = false;

    loadTVCharts().then((LW) => {
      if (destroyed || !containerRef.current) return;

      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (_) {}
        chartRef.current = null;
        seriesRefs.current = [];
      }

      const chart = LW.createChart(containerRef.current, getTVChartOptions(containerRef.current));
      chartRef.current = chart;

      setTimeout(() => {
        if (!containerRef.current) return;
        const links = containerRef.current.querySelectorAll('a[href*="tradingview"]');
        links.forEach((el) => { el.style.display = "none"; });
        const imgs = containerRef.current.querySelectorAll('img[src*="tradingview"]');
        imgs.forEach((el) => { el.style.display = "none"; });
        const divs = containerRef.current.querySelectorAll("div[style*='z-index']");
        divs.forEach((el) => {
          if (el.innerHTML && el.innerHTML.toLowerCase().includes("tradingview")) {
            el.style.display = "none";
          }
        });
      }, 300);

      if (type === "Last") {
        const candleSeries = chart.addCandlestickSeries({
          upColor: "#22c55e", downColor: "#ef4444",
          borderUpColor: "#22c55e", borderDownColor: "#ef4444",
          wickUpColor: "#22c55e", wickDownColor: "#ef4444",
        });
        candleSeries.setData(data.candles);

        const volSeries = chart.addHistogramSeries({
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
          color: "#1d4ed8",
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volSeries.setData(data.candles.map((c) => ({
          time: c.time,
          value: c.value,
          color: c.close >= c.open ? "#16a34a55" : "#dc262655",
        })));
        seriesRefs.current = [candleSeries, volSeries];

      } else if (type === "%Short") {
        const sA = chart.addAreaSeries({ lineColor: "#0ea5e9", topColor: "#0ea5e920", bottomColor: "#0ea5e900", lineWidth: 2, title: "%Short A" });
        const sB = chart.addAreaSeries({ lineColor: "#f97316", topColor: "#f9731620", bottomColor: "#f9731600", lineWidth: 2, title: "%Short B" });
        sA.setData(data.shortA);
        sB.setData(data.shortB);
        seriesRefs.current = [sA, sB];

      } else if (type === "PredictTrend") {
        const s = chart.addAreaSeries({ lineColor: "#f59e0b", topColor: "#f59e0b25", bottomColor: "#f59e0b00", lineWidth: 2.5, title: "PredictTrend" });
        s.setData(data.predictTrend);
        seriesRefs.current = [s];

      } else if (type === "Peak") {
        const s = chart.addHistogramSeries({ color: "#1d4ed8", title: "Peak" });
        s.setData(data.peak);
        seriesRefs.current = [s];

      } else if (type === "Shareholder") {
        const s = chart.addLineSeries({ color: "#ef4444", lineWidth: 2.5, lineType: 1, title: "Shareholder" });
        s.setData(data.shareholder);
        seriesRefs.current = [s];

      } else if (type === "Manger") {
        const names = MANAGER_NAMES_BY_SYMBOL[selectedSymbol] || MANAGER_NAMES_BY_SYMBOL.DEFAULT;
        const series = MANAGER_COLORS.map((color, i) => {
          const s = chart.addLineSeries({
            color,
            lineWidth: 1.8,
            lineType: 1,
            title: names[i],
            visible: managerVisibility ? managerVisibility[i] !== false : true,
          });
          s.setData(data.manager[i]);
          return s;
        });
        seriesRefs.current = series;
      }

      chart.timeScale().fitContent();

      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      resizeObserverRef.current = new ResizeObserver(() => {
        if (chartRef.current && containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          chartRef.current.applyOptions({ width, height });
        }
      });
      resizeObserverRef.current.observe(containerRef.current);
    });

    return () => {
      destroyed = true;
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (_) {}
        chartRef.current = null;
      }
    };
  }, [type, selectedSymbol, dataVersion, data]);

  const isManager = type === "Manger";

  return (
    <div className="bg-[#111827] rounded-xl border border-slate-700 p-3 flex flex-col" style={{ height: 290 }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <div className="relative inline-block">
          <select
            value={type}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-[#1f2937] text-xs border border-slate-600 rounded-md px-2 py-1 pr-6 focus:outline-none focus:border-cyan-500 text-white"
          >
            {CHART_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs">▾</span>
        </div>
        {isManager ? (
          <span
            className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 hover:underline transition-colors"
            onClick={() => onToggleManagerLines?.()}
          >
            Show/Hide All
          </span>
        ) : (
          <span className="text-xs text-slate-400">{title}</span>
        )}
      </div>

      {/* Chart container */}
      <div className="relative flex-1 rounded-lg overflow-hidden bg-[#0f172a]" style={{ minHeight: 0 }}>
        <div ref={containerRef} className="w-full h-full" />
        {!selectedSymbol && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/90 rounded-lg">
            <span className="text-slate-400 text-sm font-medium">Please select symbol</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// WaveSkeleton
// ============================================================
function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-[240px] bg-[#0f172a] rounded-lg overflow-hidden relative">
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex gap-2">
          <div className="h-2 rounded-full bg-slate-800 w-1/3" />
          <div className="h-2 rounded-full bg-slate-800 w-1/5" />
        </div>
        <div className="flex-1 my-3 rounded bg-slate-800/60" />
        <div className="flex gap-3 justify-between">
          {[...Array(5)].map((_, i) => <div key={i} className="h-2 rounded-full bg-slate-800 flex-1" />)}
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

// Empty placeholder card
function EmptyChartPanel({ title, value, onChange }) {
  const isManager = value === "Manger";
  return (
    <div className="bg-[#111827] border border-slate-700/60 rounded-xl p-3" style={{ height: 290 }}>
      <div className="flex justify-between items-center mb-2">
        <div className="relative inline-block">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-[#1f2937] text-xs border border-slate-600 rounded-md px-2 py-1 pr-6 text-white focus:outline-none focus:border-cyan-500"
          >
            {CHART_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs">▾</span>
        </div>
        {isManager ? (
          <span className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 hover:underline transition-colors">
            Show/Hide All
          </span>
        ) : (
          <span className="text-xs text-slate-400">{title}</span>
        )}
      </div>
      <div className="relative flex-1 rounded-lg bg-[#111418] border border-slate-800 overflow-hidden flex items-center justify-center" style={{ height: 220 }}>
        <span className="text-white text-base font-medium tracking-wide">Please select symbol</span>
      </div>
    </div>
  );
}

// ============================================================
// CSV helpers
// ============================================================
const REQUIRED_CSV_COLUMNS = ["Date", "Open", "High", "Low", "Close", "Volume"];
function normalizeHeader(h) { return String(h || "").trim().toLowerCase(); }
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: (results) => {
        const fields = (results.meta.fields || []).map(normalizeHeader);
        const missing = REQUIRED_CSV_COLUMNS.filter((c) => !fields.includes(c.toLowerCase()));
        if (missing.length) { reject(new Error(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`)); return; }
        const keyMap = {};
        (results.meta.fields || []).forEach((f) => { keyMap[normalizeHeader(f)] = f; });
        const rows = results.data.map((row) => {
          const date = row[keyMap["date"]];
          const close = Number(row[keyMap["close"]]);
          if (!date || Number.isNaN(close)) return null;
          return { date: String(date), open: Number(row[keyMap["open"]]), high: Number(row[keyMap["high"]]), low: Number(row[keyMap["low"]]), close, volume: Number(row[keyMap["volume"]]) };
        }).filter(Boolean);
        if (!rows.length) { reject(new Error("No valid data rows found in file")); return; }
        resolve({ name: file.name, size: file.size, uploadedAt: new Date(), rows });
      },
      error: (err) => reject(err),
    });
  });
}
function formatTimestamp(date) {
  const dd = String(date.getDate()).padStart(2,"0"), mm = String(date.getMonth()+1).padStart(2,"0");
  const hh = String(date.getHours()).padStart(2,"0"), min = String(date.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${min}`;
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

// ============================================================
// SelectFilesModal — fixed casing to match screenshot
// ============================================================
function SelectFilesModal({ open, onClose, onConfirm, pendingFiles, onAddFiles, onRemoveFile }) {
  const fileInputRef = useRef(null);
  if (!open) return null;
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onAddFiles(files);
    e.target.value = "";
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (files.length) onAddFiles(files);
  };
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl p-6">
        {/* ── Title: "Select Files" (capital F to match screenshot) ── */}
        <h2 className="text-base font-semibold text-white mb-1">Select Files</h2>
        {/* ── Subtitle: lowercase to match screenshot ── */}
        <p className="text-xs text-slate-400 mb-4">you can select multiple files</p>
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
          className="border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center py-10 bg-[#0b1221]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-cyan-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
          </svg>
          <button onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium px-4 py-1.5 rounded-md border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 transition">
            Choose File
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden" onChange={handleFileChange} />
          <span className="text-[11px] text-slate-500 mt-2">
            {pendingFiles.length > 0 ? pendingFiles[pendingFiles.length - 1].file.name : "data.csv"}
          </span>
        </div>
        {pendingFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              {/* ── "Selected Files (N)" — capital F to match screenshot ── */}
              <span className="text-xs font-medium text-cyan-300">Selected Files ({pendingFiles.length})</span>
              {/* ── "Clear List" — capital L to match screenshot ── */}
              <button onClick={() => onAddFiles([], true)} className="text-[11px] text-slate-400 hover:text-red-400 transition">Clear List</button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1f2937] rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-200 truncate">{pf.file.name}</div>
                      <div className="text-[10px] text-slate-500">{formatTimestamp(pf.addedAt)}</div>
                    </div>
                  </div>
                  <button onClick={() => onRemoveFile(i)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            <span className="text-cyan-300 font-medium">Example columns: </span>Date, Open, High, Low, Close, Volume
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-xs font-medium px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 transition">Cancel</button>
          <button onClick={onConfirm} disabled={pendingFiles.length === 0}
            className={`text-xs font-medium px-4 py-2 rounded-md transition ${pendingFiles.length === 0 ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-cyan-600 text-white hover:bg-cyan-500"}`}>
            Select ({pendingFiles.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CsvPreviewChart
// ============================================================
function CsvPreviewChart({ dataset }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!dataset || !containerRef.current) return;
    let destroyed = false;

    loadTVCharts().then((LW) => {
      if (destroyed || !containerRef.current) return;
      if (chartRef.current) { try { chartRef.current.remove(); } catch (_) {} chartRef.current = null; }

      const chart = LW.createChart(containerRef.current, {
        ...getTVChartOptions(containerRef.current),
        height: 220,
        watermark: { visible: false },
        attributionLogo: { visible: false },
      });
      chartRef.current = chart;

      setTimeout(() => {
        if (!containerRef.current) return;
        containerRef.current.querySelectorAll('a[href*="tradingview"]').forEach((el) => { el.style.display = "none"; });
      }, 300);

      const candles = dataset.rows
        .map((r) => {
          const parts = r.date.split(/[-/]/);
          let ts;
          if (parts.length === 3) {
            const y = parts[0].length === 4 ? parseInt(parts[0]) : parseInt(parts[2]);
            const m = parts[0].length === 4 ? parseInt(parts[1]) - 1 : parseInt(parts[1]) - 1;
            const d = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
            ts = Math.floor(new Date(Date.UTC(y, m, d)).getTime() / 1000);
          }
          if (!ts || isNaN(ts)) return null;
          return { time: ts, open: r.open, high: r.high, low: r.low, close: r.close, value: r.volume };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);

      if (!candles.length) return;

      const cs = chart.addCandlestickSeries({ upColor: "#22c55e", downColor: "#ef4444", borderUpColor: "#22c55e", borderDownColor: "#ef4444", wickUpColor: "#22c55e", wickDownColor: "#ef4444" });
      cs.setData(candles);

      const vs = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", scaleMargins: { top: 0.8, bottom: 0 } });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vs.setData(candles.map((c) => ({ time: c.time, value: c.value, color: c.close >= c.open ? "#16a34a55" : "#dc262655" })));
      chart.timeScale().fitContent();
    });

    return () => {
      destroyed = true;
      if (chartRef.current) { try { chartRef.current.remove(); } catch (_) {} chartRef.current = null; }
    };
  }, [dataset]);

  if (!dataset) return null;
  return (
    <div className="bg-[#111827] rounded-xl border border-slate-700 p-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{dataset.name}</h3>
          <p className="text-[11px] text-slate-500">{dataset.rows.length} rows · {formatSize(dataset.size)} · uploaded {formatTimestamp(dataset.uploadedAt)}</p>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden bg-[#0f172a]" style={{ height: 220 }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// ============================================================
// SymbolDataPanel
// ============================================================
function SymbolDataPanel({ symbols = [], onSelectSymbol, selectedSymbol = "" }) {
  const [searchValue, setSearchValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [error, setError] = useState(null);
  const [parsing, setParsing] = useState(false);

  const filteredSymbols = useMemo(
    () => symbols.filter((s) => s.toLowerCase().includes(searchValue.toLowerCase())),
    [symbols, searchValue]
  );

  const handleAddFiles = (files, clearAll = false) => {
    if (clearAll) { setPendingFiles([]); return; }
    const csvFiles = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setPendingFiles((prev) => [...prev, ...csvFiles.map((f) => ({ file: f, addedAt: new Date() }))]);
  };
  const handleRemoveFile = (idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirmSelect = async () => {
    setError(null); setParsing(true);
    const results = [], errors = [];
    for (const pf of pendingFiles) {
      try { results.push(await parseCsvFile(pf.file)); }
      catch (e) { errors.push(`${pf.file.name}: ${e.message}`); }
    }
    setParsing(false); setModalOpen(false); setPendingFiles([]);
    if (errors.length) setError(errors.join(" · "));
    if (results.length) {
      setRecentFiles((prev) => [...results, ...prev].slice(0, 5));
      setActiveDataset(results[0]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Enter symbol */}
      <div className="bg-[#111827] rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Enter symbol</h3>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
          <input
            type="text" value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Enter symbol..."
            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm leading-none">▾</span>
          {showDropdown && (
            <div className="absolute mt-1.5 w-full bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50">
              {filteredSymbols.length > 0 ? filteredSymbols.map((item) => (
                <div key={item} onMouseDown={() => { setSearchValue(item); setShowDropdown(false); onSelectSymbol?.(item); }}
                  className={`px-3 py-2 text-sm cursor-pointer transition ${item === selectedSymbol ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300 hover:bg-cyan-500/10 hover:text-white"}`}>
                  {item}
                </div>
              )) : <div className="px-3 py-2 text-sm text-slate-500">No results</div>}
            </div>
          )}
        </div>
      </div>

      {/* Choose a file */}
      <div className="bg-[#111827] rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Choose a file</h3>
        <p className="text-[11px] text-slate-500 mb-3">Upload CSV files only. Use stock data files in .csv format.</p>
        <button onClick={() => setModalOpen(true)}
          className="w-full border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center py-6 bg-[#0b1221] hover:border-cyan-500/60 hover:bg-[#0d182c] transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
          </svg>
          <span className="text-xs font-medium text-cyan-300 border border-cyan-500/50 rounded-md px-3 py-1">Choose file</span>
          <span className="text-[11px] text-slate-500 mt-2">{activeDataset ? activeDataset.name : "data.csv"}</span>
        </button>
        {parsing && <p className="text-[11px] text-cyan-300 mt-2">Parsing file...</p>}
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
        <div className="mt-3 text-[11px] text-slate-500">
          <span className="text-cyan-300 font-medium">Example columns: </span>Date, Open, High, Low, Close, Volume
        </div>
      </div>

      {/* Recent files */}
      <div className="bg-[#111827] rounded-xl border border-slate-700 p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-white">Recent files</h3>
          {recentFiles.length > 0 && <span className="text-[11px] text-cyan-400 cursor-pointer hover:underline">View all</span>}
        </div>
        {recentFiles.length === 0 ? (
          <p className="text-[11px] text-slate-500">No files uploaded yet</p>
        ) : (
          <div className="space-y-1.5">
            {recentFiles.map((f, i) => (
              <button key={i} onClick={() => setActiveDataset(f)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left transition ${activeDataset === f ? "bg-cyan-500/15 border border-cyan-500/40" : "bg-[#0f172a] border border-slate-700 hover:border-slate-600"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                  </svg>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-200 truncate">{f.name}</div>
                    <div className="text-[10px] text-slate-500">{formatTimestamp(f.uploadedAt)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CsvPreviewChart dataset={activeDataset} />

      <SelectFilesModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPendingFiles([]); }}
        onConfirm={handleConfirmSelect}
        pendingFiles={pendingFiles}
        onAddFiles={handleAddFiles}
        onRemoveFile={handleRemoveFile}
      />
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================
const SYMBOLS = [
  "BANPU","BGRIM","EGCO","GPSC","GULF","OR","PTT","PTTEP","PTTGC","RATCH","TOP","IVL",
  "BBL","KBANK","KTB","SCB","TISCO","TTB","KTC","SAWAD","MTC","TLI","ADVANC","DELTA",
  "COM7","CCET","TRUE","CPALL","CPF","CBG","OSP","GLOBAL","HMPRO","BJC","CRC","ITC",
  "TU","AOT","AWC","BDMS","BH","BEM","BTS","CPN","LH","MINT","SCGP",
];

// Initial 5 visible + 1 hidden for manager lines (all visible by default)
const DEFAULT_MANAGER_VISIBILITY = [true, true, true, true, true];

export default function StockFortuneTeller() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const scrollDirection = useRef(1);
  const isPaused = useRef(false);
  const searchInputRef = useRef(null);

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Manager line visibility state (5 lines)
  const [managerVisibility, setManagerVisibility] = useState(DEFAULT_MANAGER_VISIBILITY);
  // Right panel collapsed state
  const [panelOpen, setPanelOpen] = useState(true);
  // Track whether all lines are currently shown or hidden (for toggle)
  const managerAllVisible = managerVisibility.every(Boolean);

  const defaultFilters = {
    chart1: "Last", chart2: "%Short", chart3: "PredictTrend",
    chart4: "Peak", chart5: "Shareholder", chart6: "Manger",
  };

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem("stockFortuneFilters");
      return saved ? JSON.parse(saved) : defaultFilters;
    } catch { return defaultFilters; }
  });

  const [refreshing, setRefreshing] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const { toasts, showToast } = useToast();
  const { userData, currentUser, loading } = useAuth();

  const filteredSymbols = SYMBOLS.filter((s) => s.toLowerCase().includes(symbol.toLowerCase()));

  // Auth check
  useEffect(() => {
    if (loading) return;
    const toolId = "fortune";
    if (userData?.subscriptions?.[toolId]) {
      const ts = userData.subscriptions[toolId];
      let expireDate;
      try { expireDate = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts); }
      catch { expireDate = new Date(0); }
      setIsMember(expireDate.getTime() > Date.now());
    } else {
      try {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
          const p = JSON.parse(saved);
          setIsMember(p.role === "member" || p.role === "membership");
        }
      } catch { setIsMember(false); }
    }
  }, [userData, loading]);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 1);
    setShowRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2);
  }, []);

  const scroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isPaused.current = true;
    el.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
    scrollDirection.current = direction === "left" ? -1 : 1;
    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false; }, 500);
  };

  useEffect(() => {
    const id = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el || isPaused.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (scrollDirection.current === 1 && Math.ceil(el.scrollLeft) >= maxScroll - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && el.scrollLeft <= 2) scrollDirection.current = 1;
      el.scrollLeft += scrollDirection.current;
      checkScroll();
    }, 15);
    return () => clearInterval(id);
  }, [isMember, enteredTool, checkScroll]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const handleSaveLayout = () => {
    try { localStorage.setItem("stockFortuneFilters", JSON.stringify(filters)); showToast("Layout saved successfully!"); }
    catch { /* noop */ }
  };

  const resolveFilters = (currentFilters, changedKey, newValue) => {
    const allOptions = [...CHART_TYPES];
    const updated = { ...currentFilters, [changedKey]: newValue };
    const conflictKey = Object.entries(updated).find(([k, v]) => k !== changedKey && v === newValue)?.[0];
    if (conflictKey) {
      const usedValues = Object.values(updated);
      const unused = allOptions.find((opt) => !usedValues.includes(opt));
      updated[conflictKey] = unused ?? currentFilters[changedKey];
    }
    return updated;
  };

  const handleSymbolSelect = (item) => {
    setSymbol(item);
    setShowDropdown(false);
    setRefreshing(true);
    setTimeout(() => { setSelectedSymbol(item); setDataVersion((v) => v + 1); setRefreshing(false); }, 700);
  };

  const handleSymbolFromPanel = (item) => handleSymbolSelect(item);

  // Toggle all manager lines on/off
  const handleToggleManagerLines = useCallback(() => {
    setManagerVisibility((prev) => {
      const allOn = prev.every(Boolean);
      return prev.map(() => !allOn);
    });
  }, []);

  // ── Features list ──────────────────────────────────────────
  const features = [
    { title: "Last", desc: "Stay updated with intuitive, real-time daily price action charts." },
    { title: "PredictTrend", desc: "Visualizes the pulse of the market by tracking real-time capital inflows and outflows." },
    { title: "Volume Analysis", desc: "Deep dive into volume patterns to confirm trend strength." },
    { title: "Smart Signals", desc: "AI-driven entry and exit points." },
    { title: "Sector Rotation", desc: "Identify which sectors are leading the market in real-time." },
    { title: "Risk Management", desc: "Calculated risk metrics to help you protect your capital." },
  ];

  const windowChrome = (
    <div className="bg-[#0f172a] px-4 py-3 flex items-center border-b border-slate-700/50">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>
    </div>
  );

  const featuresSection = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">6 Main Features</h2>
      <div className="relative group" onMouseEnter={() => { isPaused.current = true; }} onMouseLeave={() => { isPaused.current = false; }}>
        <button onClick={() => scroll("left")} aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
          {features.map((item, index) => (
            <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  // ── NON-MEMBER VIEW ────────────────────────────────────────
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;} select{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:none;}`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Stock Fortune Teller</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop guessing, start calculating</p>
          </div>
          <div className="relative group w-full max-w-6xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={770} />
            </div>
          </div>
          {featuresSection}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!currentUser && (
                <button onClick={() => navigate("/welcome")} className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">Sign In</button>
              )}
              <button onClick={() => navigate("/member-register")} className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">Join Membership</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MEMBER LANDING VIEW ────────────────────────────────────
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;} select{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:none;}`}</style>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Stock Fortune Teller</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Stop guessing, start calculating</p>
          </div>
          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {windowChrome}
              <ScaledDashboardPreview dashboardWidth={1280} dashboardHeight={770} />
            </div>
          </div>
          {featuresSection}
          <button onClick={() => setEnteredTool(true)}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300">
            <span className="mr-2">Start Using Tool</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN TOOL VIEW ─────────────────────────────────────────
  if (isMember && enteredTool) {
    return (
      <div className="w-full min-h-screen bg-[#0B1221] text-white px-6 py-6">
        <style>{`
          .hide-scrollbar::-webkit-scrollbar{display:none;}
          select{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:none;}
          a[href*="tradingview"]{display:none!important;}
          img[src*="tradingview"]{display:none!important;}
        `}</style>

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <ToolHint detailsVariant="link" onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
            Predict stock price trends with AI analytics, track short interest levels, monitor peak value milestones, and analyze historical prediction patterns
          </ToolHint>

          {/* Symbol search */}
          <div className="relative w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
            <input
              ref={searchInputRef} type="text" value={symbol}
              onChange={(e) => { setSymbol(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Type a Symbol..."
              className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            {symbol && (
              <button onClick={() => { setSymbol(""); setSelectedSymbol(""); setShowDropdown(false); }}
                className="absolute right-3 inset-y-0 flex items-center text-slate-400 hover:text-red-400 transition">
                <CloseIcon fontSize="small" />
              </button>
            )}
            {showDropdown && (
              <div className="absolute mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50">
                {filteredSymbols.length > 0
                  ? filteredSymbols.map((item, index) => (
                    <div key={index} onMouseDown={() => handleSymbolSelect(item)}
                      className="px-4 py-2.5 text-sm text-slate-300 hover:bg-cyan-500/20 hover:text-white cursor-pointer transition">
                      {item}
                    </div>
                  ))
                  : <div className="px-4 py-2 text-sm text-slate-500">No results</div>}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleSaveLayout} title="Save Layout"
              className="w-10 h-10 bg-[#0f172a] border border-slate-700 rounded-lg flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 transition">
              <SaveOutlinedIcon fontSize="small" />
            </button>
            <button
              onClick={() => {
                if (!selectedSymbol) return;
                setRefreshing(true);
                setTimeout(() => { setDataVersion((v) => v + 1); setRefreshing(false); }, 700);
              }}
              title="Refresh"
              className="w-10 h-10 bg-[#0f172a] border border-slate-700 rounded-lg flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 transition">
              <RefreshIcon fontSize="small" className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Charts grid + right panel */}
        <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${panelOpen ? "lg:grid-cols-[1fr_340px]" : "lg:grid-cols-[1fr]"}`}>
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle panel button — sticks to right edge of chart area */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              title={panelOpen ? "Hide panel" : "Show panel"}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-[#1e293b] border border-slate-600 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500 hover:bg-[#0f172a] transition-all duration-200 hidden lg:flex"
            >
              <svg className={`w-3 h-3 transition-transform duration-300 ${panelOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {refreshing
              ? Object.entries(filters).map(([key, value], idx) => {
                  const isManager = value === "Manger";
                  return (
                    <div key={key} className="bg-[#111827] rounded-xl border border-slate-700/60 p-3" style={{ height: 290 }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="relative inline-block">
                          <select value={value} onChange={(e) => setFilters((prev) => resolveFilters(prev, key, e.target.value))}
                            className="appearance-none bg-[#1f2937] text-xs border border-slate-600 rounded-md px-2 py-1 pr-6 text-white focus:outline-none">
                            {CHART_TYPES.map((o) => <option key={o}>{o}</option>)}
                          </select>
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs">▾</span>
                        </div>
                        {isManager ? (
                          <span className="text-xs text-cyan-400 cursor-pointer hover:underline" onClick={handleToggleManagerLines}>
                            Show/Hide All
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{key}</span>
                        )}
                      </div>
                      <WaveSkeleton delay={idx * 0.2} />
                    </div>
                  );
                })
              : selectedSymbol
              ? Object.entries(filters).map(([key, value]) => (
                <TVChartCard
                  key={`${key}-${value}-${selectedSymbol}-${dataVersion}`}
                  title={key}
                  type={value}
                  selectedSymbol={selectedSymbol}
                  dataVersion={dataVersion}
                  managerVisibility={value === "Manger" ? managerVisibility : undefined}
                  onToggleManagerLines={value === "Manger" ? handleToggleManagerLines : undefined}
                  onChange={(newValue) => setFilters((prev) => resolveFilters(prev, key, newValue))}
                />
              ))
              : Object.entries(filters).map(([key, value]) => (
                <EmptyChartPanel key={key} title={key} value={value}
                  onChange={(newValue) => setFilters((prev) => resolveFilters(prev, key, newValue))} />
              ))}
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${panelOpen ? "opacity-100 w-full" : "opacity-0 w-0 pointer-events-none"}`}
          >
            <SymbolDataPanel symbols={SYMBOLS} selectedSymbol={selectedSymbol} onSelectSymbol={handleSymbolFromPanel} />
          </div>
        </div>

        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return null;
}