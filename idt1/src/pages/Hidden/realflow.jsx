import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

/* ================= CONSTANTS ================= */
const CATEGORIES = ["SET100", "NON-SET100", "MAI", "WARRANT"];
const PALETTE = ["#3b82f6", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];
const EXTRA_COLOR = "#94a3b8";
const SYMS = [
  "PTT","AOT","CPALL","ADVANC","GULF","SCB","KBANK","TRUE","MINT","BDMS",
  "BH","CPN","MAJOR","HANA","SCC","BEM","WHA","TU","BEAUTY","ESSO",
];

/* ================= TIME PERIODS ================= */
const TIME_PERIODS = [
  { key: "start", label: "Start",    sub: "10:00-12:30" },
  { key: "half",  label: "Half-Day", sub: "12:00-14:30" },
  { key: "end",   label: "End-Day",  sub: "14:15-16:30" },
  { key: "all",   label: "All Day",  sub: "10:00-16:30" },
];

const MAX_SELECT = 5;

/* ================= RNG + DATA ================= */
function rng(s) {
  let x = s >>> 0;
  return () => {
    x += 0x6d2b79f5;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mkFlowData(seed, count = 20) {
  const r = rng(seed);
  return SYMS.slice(0, count).map((sym, i) => {
    const val = (r() * 1000 + 50).toFixed(2);
    const raw = (r() - 0.45) * 5;
    return {
      rank: i + 1, symbol: sym, value: val,
      change: raw.toFixed(2),
      isUp: raw > 0.05 ? true : raw < -0.05 ? false : null,
    };
  });
}

const BASE_TS = 1736128800;
const STEP = 60;

function mkLWCData(seed, count = 20, points = 390, isUp = true) {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    let v = 50 + (r() - 0.5) * 20;
    return Array.from({ length: points }, (_, i) => {
      v += (r() - 0.48 + (isUp ? 0.025 : -0.025)) * 6;
      v = Math.max(5, Math.min(95, v));
      return { time: BASE_TS + i * STEP, value: +v.toFixed(2) };
    });
  });
}

function mkChartFlipSparklines(seed, count = 20) {
  const r = rng(seed + 9999);
  return Array.from({ length: count }, () => {
    let v = 50;
    return Array.from({ length: 20 }, () => {
      v += (r() - 0.5) * 12;
      v = Math.max(5, Math.min(95, v));
      return +v.toFixed(2);
    });
  });
}

/* ================= CHARTFLIP ICON ================= */
const ChartFlipIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={color} strokeWidth="1.2"/>
    <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={color}/>
    <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={color}/>
    <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={color}/>
    <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={color}/>
    <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={color} strokeWidth="0.8" strokeLinecap="round"/>
  </svg>
);

/* ================= CHARTFLIP HINT ================= */
const ChartFlipHint = () => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!visible && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right });
    }
    setVisible(p => !p);
  };

  useEffect(() => {
    if (!visible) return;
    const close = () => setVisible(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [visible]);

  return (
    <div className="relative inline-flex items-center">
      <button ref={btnRef} onClick={toggle}
        className="flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
          <line x1="12" y1="12" x2="12" y2="16" />
        </svg>
      </button>
      {visible && (
        <div onClick={e => e.stopPropagation()} className="fixed z-[9999] whitespace-nowrap"
          style={{ top: pos.top, left: pos.left, transform: "translate(-95%, -130%)" }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", position: "relative" }}>
            <p style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 500, margin: 0 }}>
              คลิกที่ icon เพื่อไปหน้า ChartFlip ของหุ้นนั้น
            </p>
            <div style={{ position: "absolute", bottom: -8, right: 14, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #1e293b" }} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= ANIMATED NUMBER ================= */
function useAnimatedValue(target, duration = 400) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(parseFloat(target));
  const rafRef  = useRef(null);
  useEffect(() => {
    const from = fromRef.current;
    const to   = parseFloat(target);
    if (Math.abs(from - to) < 0.001) return;
    const start   = performance.now();
    const animate = (now) => {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur  = from + (to - from) * ease;
      setDisplay(cur.toFixed(2));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else { fromRef.current = to; setDisplay(target); }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}

const AnimatedCell = ({ value, flash }) => {
  const display  = useAnimatedValue(value, 400);
  const [color, setColor] = useState("#e2e8f0");
  const timerRef = useRef(null);
  useEffect(() => {
    if (!flash) return;
    clearTimeout(timerRef.current);
    setColor(flash === "up" ? "#4ade80" : "#f87171");
    timerRef.current = setTimeout(() => setColor("#e2e8f0"), 2000);
    return () => clearTimeout(timerRef.current);
  }, [flash]);
  return (
    <span style={{ fontFamily: "monospace", fontSize: 11, color, transition: "color 1.2s ease", fontWeight: flash ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
};

/* ================= LIVE UPDATE HOOK ================= */
function useLiveData(initialData, cardKey) {
  const [liveData,  setLiveData]  = useState(initialData);
  const [flashMap,  setFlashMap]  = useState({});
  const [recentMap, setRecentMap] = useState({});
  const timerRef = useRef(null);
  const liveRef  = useRef(liveData);
  liveRef.current = liveData;

  const scheduleNext = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const current = liveRef.current;
      const count   = Math.floor(Math.random() * 3) + 1;
      const indices = [];
      while (indices.length < count) {
        const idx = Math.floor(Math.random() * current.length);
        if (!indices.includes(idx)) indices.push(idx);
      }
      const newFlash = {};
      const updated  = current.map((row, i) => {
        if (!indices.includes(i)) return row;
        const oldVal    = parseFloat(row.value);
        const delta     = (Math.random() - 0.5) * oldVal * 0.03;
        const newVal    = Math.max(1, oldVal + delta);
        const newChange = parseFloat(row.change) + (Math.random() - 0.5) * 1.2;
        const clamped   = Math.max(-15, Math.min(15, newChange));
        newFlash[i]     = delta > 0 ? "up" : "down";
        return { ...row, value: newVal.toFixed(2), change: clamped.toFixed(2), isUp: clamped > 0.05 ? true : clamped < -0.05 ? false : null };
      });
      setLiveData(updated);
      setFlashMap(newFlash);
      setRecentMap(newFlash);
      setTimeout(() => setFlashMap({}),  3000);
      setTimeout(() => setRecentMap({}), 8000);
      scheduleNext();
    }, (10 + Math.random() * 5) * 1000);
  }, []);

  useEffect(() => {
    setLiveData(initialData);
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [cardKey, initialData, scheduleNext]);

  return { liveData, flashMap, recentMap };
}

const CtrlTooltip = ({ max }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setVisible(true);
  };

  return (
    <div
      ref={triggerRef}
      style={{ display: "inline-flex", alignItems: "center" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {/* ⓘ ไม่มีวงกลม */}
      <span style={{
        color: "#64748b", fontSize: 22,
        cursor: "default", userSelect: "none",
        lineHeight: 1,
      }}>ⓘ</span>

      {visible && (
        <div style={{
          position: "fixed",
          top:   pos.top,
          right: pos.right,
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "8px 14px",
          whiteSpace: "nowrap",
          fontSize: 12, color: "#f1f5f9", fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          zIndex: 99999,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: -7, right: 10,
            width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "7px solid #1e293b",
          }} />
          Ctrl+คลิก เพื่อเพิ่มหุ้นเปรียบเทียบ (รวมไม่เกิน {max} เส้น)
        </div>
      )}
    </div>
  );
};

/* ================= RANK TABLE ================= */
const RankTable = ({
  data, flashMap = {}, recentMap = {},
  top5Len,
  highlighted = [],
  extraVisibleSet = [],
  onRowClick, onChartFlipClick,
  compact = false, sparklines = [],
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleData = compact && !expanded ? data.slice(0, top5Len) : data;
  const hiArr       = Array.isArray(highlighted) ? highlighted : (highlighted != null ? [highlighted] : []);
  const allSelected = new Set([...hiArr, ...extraVisibleSet]);

  return (
    <div className={`bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden flex flex-col ${compact ? "w-full max-h-[220px] sm:max-h-[260px]" : "h-full"}`}>
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-2.5 pl-3 pr-2 text-center" style={{ width: 28 }}>#</th>
              <th className="py-2.5 pl-1 pr-1 text-left" style={{ width: "22%" }}>Symbol</th>
              <th className="py-2.5 pl-1 pr-1 text-right" style={{ width: "25%" }}>Value</th>
              <th className="py-2.5 pl-1 pr-4 text-right" style={{ width: "25%" }}>%Chg</th>
              <th className="py-2.5 pl-1 pr-3 text-right" style={{ width: 90 }}>
                <span className="flex items-center justify-end gap-1 text-slate-400">
                  <span>Chart flip</span>
                  <ChartFlipHint />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, i) => {
              const isTop5  = i < top5Len;
              const isHi    = isTop5 && hiArr.includes(i);
              const isExtra = !isTop5 && extraVisibleSet.includes(i);
              const isSel   = allSelected.has(i);
              const flash   = flashMap[i];
              const recent  = recentMap[i];
              const cc = row.isUp === true ? "text-green-400" : row.isUp === false ? "text-red-400" : "text-slate-400";
              const rowOpacity = allSelected.size > 0 && !isSel ? 0.25 : 1;
              let bg = "hover:bg-slate-700/30";
              if (isHi)    bg = "bg-blue-900/20 border-l-2 border-l-blue-500";
              if (isExtra) bg = "bg-slate-600/20 border-l-2 border-l-slate-400";
              if (flash === "up")   bg += " flash-up";
              if (flash === "down") bg += " flash-down";
              return (
                <tr key={i} onClick={(e) => onRowClick?.(i, e.ctrlKey || e.metaKey)}
                  className={`border-b border-slate-700/50 cursor-pointer transition-colors ${bg}`}
                  style={{ opacity: rowOpacity, transition: "opacity 0.3s" }}>
                  <td className="py-2.5 pl-3 pr-2 text-center text-slate-500 text-[11px]">{row.rank}</td>
                  <td className="py-2.5 pl-1 pr-1 font-semibold text-white max-w-0">
                    <span className="flex items-center gap-1">
                      {isTop5  && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i] }} />}
                      {isExtra && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: EXTRA_COLOR }} />}
                      <span className="text-[11px] truncate">{row.symbol}</span>
                      {recent && !flash && (
                        <span className={`text-[8px] sm:text-[9px] font-bold px-0.5 sm:px-1 py-0.5 rounded ml-0.5 ${recent === "up" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {recent === "up" ? "▲" : "▼"}
                        </span>
                      )}
                      {flash && (
                        <span className={`text-[9px] sm:text-[10px] font-bold ml-0.5 animate-bounce-icon ${flash === "up" ? "text-green-300" : "text-red-300"}`}>
                          {flash === "up" ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pl-1 pr-1 text-right">
                    <AnimatedCell value={row.value} flash={flash} />
                  </td>
                  <td className={`py-2.5 pl-1 pr-4 text-right font-semibold text-[11px] tabular-nums ${cc}`}>
                    {row.isUp === true ? "+" : ""}{row.change}%
                  </td>
                  <td className="py-1.5 pl-1 pr-3 text-right" style={{ width: 90 }}>
                    <button onClick={e => { e.stopPropagation(); onChartFlipClick?.(row.symbol); }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/70 hover:bg-blue-900/40 hover:border-blue-500/60 transition-all group"
                      style={{ width: 30, height: 30 }} title={`ChartFlip: ${row.symbol}`}>
                      <ChartFlipIcon size={14} color={row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b"} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {compact && data.length > top5Len && (
        <button onClick={() => setExpanded(p => !p)}
          className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300 border-t border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/30 transition-all">
          {expanded ? (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>Show less</>
          ) : (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>+{data.length - top5Len} more stocks</>
          )}
        </button>
      )}
    </div>
  );
};

/* ================= LIGHTWEIGHT CHART COMPONENT ================= */
const LWCChart = ({
  seriesData, allSeriesData, extraVisibleSet = [], highlighted = [],
  height = 256, fullWidth = false,
  chartId, chartRefs,
  onZoom, globalLogical, setGlobalLogical,
}) => {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const linesRef      = useRef([]);
  const extraLinesRef = useRef(new Map());
  const isDragging    = useRef(false);
  const dragStart     = useRef({ lastX: 0 });
  const suppressSync  = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: typeof height === "number" ? height : containerRef.current.clientHeight || 256,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1e2e" },
        textColor:  "#64748b",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize:   10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.25)", style: LineStyle.Dashed, width: 1, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, width: 1, labelBackgroundColor: "#1e293b" },
      },
      timeScale: {
        timeVisible: true, secondsVisible: false,
        borderColor: "rgba(255,255,255,0.08)",
        barSpacing: 80,
        tickMarkFormatter: (time) => {
          const d = new Date((time + 7 * 3600) * 1000);
          return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale:  { mouseWheel: false, pinch: false },
    });
    chartRef.current = chart;
    if (chartRefs) chartRefs.current[chartId] = chart;

    linesRef.current = (seriesData || []).map((pts, i) => {
      const s = chart.addSeries(LineSeries, {
        color: PALETTE[i], lineWidth: 2,
        lastValueVisible: true, priceLineVisible: false,
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
      });
      if (pts) s.setData(pts);
      return s;
    });

    chart.timeScale().scrollToRealTime();

    chart.subscribeCrosshairMove((param) => {
      if (suppressSync.current) return;
      if (param.logical !== undefined && param.logical !== null) setGlobalLogical?.(param.logical);
      else setGlobalLogical?.(null);
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      extraLinesRef.current.clear();
      chart.remove();
      if (chartRefs) delete chartRefs.current[chartId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    suppressSync.current = true;
    if (globalLogical !== null && globalLogical !== undefined) chart.setCrosshairPosition(undefined, undefined, globalLogical);
    else chart.clearCrosshairPosition();
    suppressSync.current = false;
  }, [globalLogical]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); onZoom?.(e.deltaY, chartRef.current); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e) => { isDragging.current = true; dragStart.current = { lastX: e.clientX }; el.style.cursor = "grabbing"; };
    const onMove = (e) => {
      if (!isDragging.current || !chartRef.current) return;
      const dx = e.clientX - dragStart.current.lastX;
      dragStart.current.lastX = e.clientX;
      const ts = chartRef.current.timeScale();
      const barSpacing = ts.options().barSpacing || 12;
      ts.scrollToPosition(ts.scrollPosition() - dx / barSpacing, false);
    };
    const onUp = () => { isDragging.current = false; el.style.cursor = "default"; };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const newSet = new Set(extraVisibleSet);
    extraLinesRef.current.forEach((series, dataIdx) => {
      if (!newSet.has(dataIdx)) {
        try { chart.removeSeries(series); } catch (_) {}
        extraLinesRef.current.delete(dataIdx);
      }
    });
    newSet.forEach(dataIdx => {
      if (!extraLinesRef.current.has(dataIdx) && allSeriesData?.[dataIdx]) {
        const s = chart.addSeries(LineSeries, {
          color: EXTRA_COLOR, lineWidth: 2.2,
          lastValueVisible: true, priceLineVisible: false,
          crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        });
        s.setData(allSeriesData[dataIdx]);
        extraLinesRef.current.set(dataIdx, s);
      }
    });
  }, [extraVisibleSet, allSeriesData]);

  useEffect(() => {
    const hiArr = Array.isArray(highlighted) ? highlighted : (highlighted != null ? [highlighted] : []);
    const allSelected = new Set([...hiArr, ...extraVisibleSet]);
    linesRef.current.forEach((s, i) => {
      const isHi  = hiArr.includes(i);
      const isDim = allSelected.size > 0 && !isHi;
      s.applyOptions({
        color:     isDim ? PALETTE[i] + "28" : PALETTE[i],
        lineWidth: isHi ? 3 : isDim ? 1 : 2,
      });
    });
  }, [highlighted, extraVisibleSet]);

  return (
    <div ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-slate-600/60"
      style={{ height: typeof height === "number" ? height : "100%", cursor: "default" }}
    />
  );
};

/* ================= SPIN BUTTON ================= */
const SpinButton = ({ onClick, title, label }) => {
  const iconRef = useRef(null);
  const handle  = () => {
    onClick?.();
    if (iconRef.current) {
      iconRef.current.classList.remove("spin-once");
      void iconRef.current.offsetWidth;
      iconRef.current.classList.add("spin-once");
    }
  };
  return label ? (
    <button onClick={handle} title={title} style={{
      display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
      background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
      color: "#ffffff", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "monospace", flexShrink: 0, transition: "all .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
      <span ref={iconRef} style={{ display: "inline-flex" }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
        </svg>
      </span>
      {label}
    </button>
  ) : (
    <button onClick={handle} title={title}
      className="w-8 h-8 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-400 transition-all">
      <span ref={iconRef} style={{ display: "inline-flex" }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
        </svg>
      </span>
    </button>
  );
};

/* ================= LAST UPDATE BADGE ================= */
const LastUpdateBadge = ({ lastUpdated }) => {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!lastUpdated) return;
    const fmt = () => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diff < 5) setDisplay("just now");
      else if (diff < 60) setDisplay(`${diff}s ago`);
      else setDisplay(`${Math.floor(diff / 60)}m ago`);
    };
    fmt();
    const t = setInterval(fmt, 5000);
    return () => clearInterval(t);
  }, [lastUpdated]);
  if (!lastUpdated) return null;
  return <span className="text-[10px] text-slate-500 font-mono">updated {display}</span>;
};

/* ================= BREAKPOINT HOOK ================= */
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "lg";
    const w = window.innerWidth;
    if (w < 480) return "xs";
    if (w < 640) return "sm";
    if (w < 768) return "md";
    if (w < 1024) return "lg";
    return "xl";
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setBp("xs");
      else if (w < 640) setBp("sm");
      else if (w < 768) setBp("md");
      else if (w < 1024) setBp("lg");
      else setBp("xl");
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

/* ================= FULLSCREEN RANKINGS PANEL ================= */
const FullscreenRankings = ({
  data, flashMap = {}, recentMap = {}, totalCount,
  highlighted = [], extraVisibleSet = [],
  onRowClick, onChartFlipClick,
}) => {
  const top5    = data.slice(0, Math.min(5, totalCount));
  const others  = data.slice(5, totalCount);
  const hiArr   = Array.isArray(highlighted) ? highlighted : (highlighted != null ? [highlighted] : []);
  const allSelected = new Set([...hiArr, ...extraVisibleSet]);

  const RankRow = ({ row, i, isTop }) => {
    const flash   = flashMap[i];
    const recent  = recentMap[i];
    const isHi    = isTop && hiArr.includes(i);
    const isExtra = !isTop && extraVisibleSet.includes(i);
    const isSel   = allSelected.has(i);
    const cc      = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";
    const rowOpacity = allSelected.size > 0 && !isSel ? 0.18 : 1;
    const rowBg      = flash === "up" ? "rgba(34,197,94,0.08)" : flash === "down" ? "rgba(239,68,68,0.08)" : isHi ? "rgba(59,130,246,0.08)" : isExtra ? "rgba(148,163,184,0.07)" : "transparent";
    const dotColor   = isTop ? PALETTE[i] : isExtra ? EXTRA_COLOR : "#334155";
    const borderLeft = isHi ? `3px solid ${PALETTE[i]}` : isExtra ? `3px solid ${EXTRA_COLOR}` : "3px solid transparent";

    return (
      <div onClick={(e) => onRowClick?.(i, e.ctrlKey || e.metaKey)} style={{
        display: "grid", gridTemplateColumns: "28px 16px 1fr 80px 60px 52px",
        alignItems: "center", padding: "0 14px",
        height: isTop ? 46 : 40,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: rowBg, borderLeft,
        cursor: "pointer", opacity: rowOpacity,
        transition: "background 0.3s, opacity 0.3s",
      }}>
        <span style={{ fontSize: isTop ? 13 : 12, color: isTop ? "#64748b" : "#334155", fontWeight: 600, textAlign: "center", fontFamily: "monospace" }}>{row.rank}</span>
        <span style={{ width: isTop ? 10 : 8, height: isTop ? 10 : 8, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
        <span style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 6 }}>
          <span style={{ fontSize: isTop ? 14 : 13, fontWeight: isTop ? 800 : 600, color: isTop || isExtra ? "#e2e8f0" : "#94a3b8", letterSpacing: "0.04em", fontFamily: "monospace" }}>{row.symbol}</span>
          {flash  && <span style={{ fontSize: 9, color: flash === "up" ? "#4ade80" : "#f87171" }}>{flash === "up" ? "▲" : "▼"}</span>}
          {!flash && recent && <span style={{ fontSize: 8, color: recent === "up" ? "#4ade80" : "#f87171", opacity: 0.6 }}>{recent === "up" ? "▲" : "▼"}</span>}
        </span>
        <span style={{ textAlign: "right", fontSize: isTop ? 13 : 12, color: isTop ? "#cbd5e1" : "#64748b", fontFamily: "monospace", paddingRight: 8 }}>
          <AnimatedCell value={row.value} flash={flash} />
        </span>
        <span style={{ textAlign: "right", fontSize: isTop ? 13 : 12, fontWeight: 700, color: cc, fontFamily: "monospace" }}>
          {row.isUp === true ? "+" : ""}{row.change}%
        </span>
        <span style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <button onClick={e => { e.stopPropagation(); onChartFlipClick?.(row.symbol); }} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 4, padding: "4px 7px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} title={`Chart Flip — ${row.symbol}`}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}>
            <ChartFlipIcon size={14} color={cc} />
          </button>
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: 44, borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>RANKINGS</span>
        {allSelected.size > 0 && (
          <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{allSelected.size}/{MAX_SELECT} selected</span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {top5.map((row, i) => <RankRow key={i} row={row} i={i} isTop />)}
        {others.length > 0 && (
          <div style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "#0a1525" }}>
            OTHER
          </div>
        )}
        {others.map((row, j) => {
          const i = j + 5;
          return <RankRow key={i} row={row} i={i} isTop={false} />;
        })}
      </div>
    </div>
  );
};

/* ================= SECTION CARD ================= */
const SectionCard = ({
  category, type, seed: initSeed,
  chartRefs, globalLogical, setGlobalLogical, onZoom,
}) => {
  const navigate = useNavigate();
  const [selectedSet,  setSelectedSet]  = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timePeriod,   setTimePeriod]   = useState("all");
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const bp        = useBreakpoint();
  const isMobile  = bp === "xs" || bp === "sm";
  const isTablet  = bp === "md";
  const isDesktop = !isMobile && !isTablet;
  const isNarrowFS = bp === "xs" || bp === "sm" || bp === "md";

  const isPos      = type === "+";
  const POINTS     = 390;
  const totalCount = 20;

  const baseData      = useMemo(() => mkFlowData(initSeed), [initSeed]);
  const allSeriesData = useMemo(() => mkLWCData(initSeed, 20, POINTS, isPos), [initSeed, isPos]);
  const sparklines    = useMemo(() => mkChartFlipSparklines(initSeed), [initSeed]);
  const cardKey       = `${category}-${type}-${initSeed}`;
  const chartId       = `card-${category}-${type}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  const highlighted     = [...selectedSet].filter(i => i < 5);
  const extraVisibleSet = [...selectedSet].filter(i => i >= 5);

  const handleChartFlipClick = useCallback((symbol) => {
    navigate("/chartflipid", { state: { symbol, from: "realflow" } });
  }, [navigate]);

  useEffect(() => {
    if (Object.keys(flashMap).length > 0) setLastUpdated(Date.now());
  }, [flashMap]);

  const handleRowClick = useCallback((rowIdx, isCtrl) => {
    if (isCtrl) {
      setSelectedSet(prev => {
        const next = new Set(prev);
        if (next.has(rowIdx)) next.delete(rowIdx);
        else if (next.size < MAX_SELECT) next.add(rowIdx);
        return next;
      });
    } else {
      setSelectedSet(prev => prev.size === 1 && prev.has(rowIdx) ? new Set() : new Set([rowIdx]));
    }
  }, []);

  const handleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  const handleRefresh = useCallback(() => {
    setSelectedSet(new Set());
    setTimePeriod("all");
    const fsId = isFullscreen ? `${chartId}-fs` : chartId;
    if (chartRefs?.current?.[fsId]) chartRefs.current[fsId].timeScale().scrollToRealTime();
  }, [chartRefs, chartId, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const chartHeight = isMobile ? 180 : isTablet ? 220 : 256;

  /* ── FULLSCREEN LAYOUT ── */
  if (isFullscreen) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#060e1a", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          minHeight: 52, background: "#07111c",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", flexShrink: 0, flexWrap: "wrap",
        }}>
          <ToolHint onViewDetails={() => window.scrollTo({ top: 0 })}>
            Real Flow tracks stock market money flow in real-time.
          </ToolHint>

          <button onClick={() => setIsFullscreen(false)} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6, padding: "5px 12px",
            color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5"/>
            </svg>
            back
          </button>

          <button onClick={handleRefresh} style={{
            width: 30, height: 30, borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b",
          }} title="Reset"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#64748b"; }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
            </svg>
          </button>

          <span style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.04em" }}>{category}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99,
            background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: isPos ? "#4ade80" : "#f87171",
            border: `1px solid ${isPos ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 9 }}>{isPos ? "▲" : "▼"}</span>
            {isPos ? "BUY FLOW" : "SELL FLOW"}
          </span>

          {selectedSet.size > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
              background: "rgba(59,130,246,0.12)", color: "#60a5fa",
              border: "1px solid rgba(96,165,250,0.3)",
              fontFamily: "monospace", whiteSpace: "nowrap",
            }}>
              {selectedSet.size}/{MAX_SELECT} เส้น
            </span>
          )}

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px", flexShrink: 0 }} />

          {/* ── TIME PERIOD BUTTONS ── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>

            {/* ⓘ inline tooltip */}
            <CtrlTooltip max={MAX_SELECT} />
            
            {TIME_PERIODS.map(({ key, label, sub }) => {
              const isActive = timePeriod === key;
              return (
                <button key={key} onClick={() => setTimePeriod(key)} style={{
                  background: isActive ? "#1d4ed8" : "transparent",
                  border: isActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 6,
                  padding: "4px 14px",
                  cursor: "pointer",
                  color: isActive ? "#fff" : "#64748b",
                  fontSize: 12,
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.3,
                  transition: "all 0.15s",
                  boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.3)" : "none",
                  whiteSpace: "nowrap",
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#94a3b8"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#64748b"; } }}>
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: isNarrowFS ? "column" : "row", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: isNarrowFS ? "8px 8px 0" : "12px 0 12px 12px", display: "flex" }}>
            <LWCChart
              seriesData={allSeriesData.slice(0, 5)}
              allSeriesData={allSeriesData}
              extraVisibleSet={extraVisibleSet}
              highlighted={highlighted}
              height="100%"
              fullWidth
              chartId={`${chartId}-fs`}
              chartRefs={chartRefs}
              onZoom={onZoom}
              globalLogical={globalLogical}
              setGlobalLogical={setGlobalLogical}
            />
          </div>
          <div style={{
            width: isNarrowFS ? "100%" : 300,
            height: isNarrowFS ? 260 : undefined,
            flexShrink: 0, background: "#07111c",
            borderLeft: isNarrowFS ? "none" : "1px solid rgba(255,255,255,0.07)",
            borderTop:  isNarrowFS ? "1px solid rgba(255,255,255,0.10)" : "none",
            overflow: "hidden",
          }}>
            <FullscreenRankings
              data={liveData} flashMap={flashMap} recentMap={recentMap}
              totalCount={totalCount}
              highlighted={highlighted}
              extraVisibleSet={extraVisibleSet}
              onRowClick={handleRowClick}
              onChartFlipClick={handleChartFlipClick}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── NORMAL (card) LAYOUT ── */
  return (
    <div className="bg-[#1e293b] rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-700/60 shadow-lg hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white shrink-0">{category}</h3>
          <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${isPos ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
            {isMobile ? (isPos ? "▲ BUY" : "▼ SELL") : (isPos ? "▲ BUY FLOW" : "▼ SELL FLOW")}
          </span>
          <LastUpdateBadge lastUpdated={lastUpdated} />
        </div>
        <div className="flex gap-1 sm:gap-1.5 shrink-0">
          <button onClick={handleFullscreen}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-400 transition-all"
            title="Fullscreen">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
            </svg>
          </button>
          <SpinButton onClick={handleRefresh} title="Refresh" />
        </div>
      </div>

      {isDesktop ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 12, height: 256 }}>
          <LWCChart
            seriesData={allSeriesData.slice(0, 5)}
            allSeriesData={allSeriesData}
            extraVisibleSet={extraVisibleSet}
            highlighted={highlighted}
            height={256}
            chartId={chartId}
            chartRefs={chartRefs}
            onZoom={onZoom}
            globalLogical={globalLogical}
            setGlobalLogical={setGlobalLogical}
          />
          <RankTable
            data={liveData} flashMap={flashMap} recentMap={recentMap}
            top5Len={5}
            highlighted={highlighted}
            extraVisibleSet={extraVisibleSet}
            onRowClick={handleRowClick}
            onChartFlipClick={handleChartFlipClick}
            compact={false}
            sparklines={sparklines}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <LWCChart
            seriesData={allSeriesData.slice(0, 5)}
            allSeriesData={allSeriesData}
            extraVisibleSet={extraVisibleSet}
            highlighted={highlighted}
            height={chartHeight}
            chartId={chartId}
            chartRefs={chartRefs}
            onZoom={onZoom}
            globalLogical={globalLogical}
            setGlobalLogical={setGlobalLogical}
          />
          <RankTable
            data={liveData} flashMap={flashMap} recentMap={recentMap}
            top5Len={5}
            highlighted={highlighted}
            extraVisibleSet={extraVisibleSet}
            onRowClick={handleRowClick}
            onChartFlipClick={handleChartFlipClick}
            compact={true}
            sparklines={sparklines}
          />
        </div>
      )}
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */
export default function RealFlow() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [globalLogical,  setGlobalLogical]  = useState(null);
  const chartRefs = useRef({});
  const [barWidth, setBarWidth] = useState(80);
  const bp = useBreakpoint();

  const handleZoom = useCallback((deltaY) => {
    setBarWidth(prev => {
      const factor = deltaY > 0 ? 0.82 : 1.22;
      const next = Math.max(3, Math.min(200, prev * factor));
      Object.values(chartRefs.current).forEach(c => {
        c?.timeScale().applyOptions({ barSpacing: next });
      });
      return next;
    });
  }, []);

  const allSections = useMemo(() => {
    const result = [];
    CATEGORIES.forEach(cat => {
      result.push({ category: cat, type: "+" });
      result.push({ category: cat, type: "-" });
    });
    return result;
  }, []);

  const visibleSections = useMemo(() => allSections.filter(({ category }) => {
    const matchCat    = activeCategory === null || activeCategory === category;
    const matchSearch = searchQuery.trim() === "" || category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }), [allSections, activeCategory, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-white">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        @keyframes flash-up   { 0% { background-color: rgba(34,197,94,0.45); } 40% { background-color: rgba(34,197,94,0.2); } 100% { background-color: transparent; } }
        @keyframes flash-down { 0% { background-color: rgba(239,68,68,0.45); } 40% { background-color: rgba(239,68,68,0.2); } 100% { background-color: transparent; } }
        .flash-up   { animation: flash-up   3s ease-out forwards; }
        .flash-down { animation: flash-down 3s ease-out forwards; }
        @keyframes bounce-icon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-bounce-icon { animation: bounce-icon 0.4s ease-in-out 3; }
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spin-once 0.5s ease-in-out; }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .mobile-menu-enter { animation: slide-down 0.18s ease-out forwards; }
        .cat-pill-active { box-shadow: 0 0 0 1px rgba(59,130,246,0.5), 0 2px 8px rgba(59,130,246,0.2); }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3">
            <div className="order-1 shrink-0">
              <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
                Real Flow tracks stock market money flow in real-time.
                Prices update automatically every 10–15 seconds.
              </ToolHint>
            </div>
            <div className="order-2 relative flex-1 min-w-0 max-w-[160px] sm:max-w-[200px] lg:max-w-[220px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input type="text" placeholder="Search..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b] rounded-lg py-1.5 sm:py-2 pl-8 sm:pl-9 pr-7 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs transition-colors">✕</button>
              )}
            </div>
            <button onClick={() => navigate("/hisrealflow")}
              className="order-3 lg:order-4 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white focus:outline-none ml-auto shrink-0"
              title="View History">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="hidden sm:inline">History</span>
            </button>
            <div className="order-4 lg:order-3 w-full lg:w-auto mt-2 lg:mt-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar lg:min-w-0">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button key={cat} onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                    className={`px-3 lg:px-5 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border focus:outline-none whitespace-nowrap flex-shrink-0
                      ${isActive
                        ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/50 cat-pill-active"
                        : "bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"}`}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="space-y-4 sm:space-y-6 pb-12">
          {visibleSections.length > 0 ? (
            visibleSections.map(({ category, type }) => {
              const seed = (CATEGORIES.indexOf(category) * 2 + (type === "+" ? 0 : 1) + 1) * 37;
              return (
                <SectionCard
                  key={`${category}-${type}`}
                  category={category} type={type} seed={seed}
                  chartRefs={chartRefs}
                  globalLogical={globalLogical}
                  setGlobalLogical={setGlobalLogical}
                  onZoom={handleZoom}
                />
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No sections found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}