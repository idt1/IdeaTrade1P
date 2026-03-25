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

function filterLWCByTime(seriesData, fromH, fromM, toH, toM) {
  const fromSec = (fromH * 60 + fromM) * 60;
  const toSec   = (toH   * 60 + toM  ) * 60;
  return seriesData.map(pts =>
    pts.filter(({ time }) => {
      const ict    = time + 7 * 3600;
      const secDay = ict % 86400;
      return secDay >= fromSec && secDay <= toSec;
    })
  );
}

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
    <span style={{ fontFamily: "monospace", fontSize: 12, color, transition: "color 1.2s ease", fontWeight: flash ? 700 : 400 }}>
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
        const oldVal   = parseFloat(row.value);
        const delta    = (Math.random() - 0.5) * oldVal * 0.03;
        const newVal   = Math.max(1, oldVal + delta);
        const newChange = parseFloat(row.change) + (Math.random() - 0.5) * 1.2;
        const clamped  = Math.max(-15, Math.min(15, newChange));
        newFlash[i]    = delta > 0 ? "up" : "down";
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

/* ================= INFO TOOLTIP ================= */
const InfoTooltip = ({ children, lines = [], linkText = "", linkHref = "#" }) => {
  const [visible, setVisible] = useState(false);
  const t = useRef(null);
  const show = () => { clearTimeout(t.current); setVisible(true); };
  const hide = () => { t.current = setTimeout(() => setVisible(false), 100); };
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <div className="relative inline-flex items-center">
      <div onMouseEnter={show} onMouseLeave={hide}>{children}</div>
      {visible && (
        <div onMouseEnter={show} onMouseLeave={hide}
          className="absolute left-full top-0 ml-3 z-[9999] w-64 bg-[#1a2235] border border-slate-600/70 rounded-xl shadow-2xl px-4 py-3 pointer-events-auto">
          <div className="absolute -left-[7px] w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-[#1a2235]" style={{ top: "calc(18px - 7px)" }} />
          <div className="absolute -left-[9px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-slate-600/70" style={{ top: "calc(18px - 8px)" }} />
          <div className="text-slate-200 text-[13px] leading-relaxed space-y-0.5 mb-2">
            {lines.map((l, i) => <p key={i}>{l}</p>)}
          </div>
          {linkText && (
            <a href={linkHref} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-[13px] underline">{linkText}</a>
          )}
        </div>
      )}
    </div>
  );
};

/* ================= RANK TABLE ================= */
/**
 * Responsive variants:
 *  mobile  → collapsed: show only top-5, max-height ~200px, compact rows
 *  tablet+ → full list with toggle-expand
 *  lg+     → full sidebar (35% width)
 */
const RankTable = ({ data, flashMap = {}, recentMap = {}, top5Len, highlighted, extraVisible, onRowClick, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  // On mobile we only show top-5 by default; user can expand
  const visibleData = compact && !expanded ? data.slice(0, top5Len) : data;

  return (
    <div className={`
      w-full bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden flex flex-col
      ${compact ? "max-h-[220px] sm:max-h-[260px]" : "lg:w-[35%]"}
    `}
      style={compact ? undefined : undefined}
    >
      <div className={`overflow-y-auto flex-1 custom-scrollbar ${compact ? "" : ""}`}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 text-[10px] sm:text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
              <th className="py-2 sm:py-3 px-1 sm:px-2 text-center font-semibold w-8 sm:w-10">#</th>
              <th className="py-2 sm:py-3 px-1 sm:px-2 text-left font-semibold">Symbol</th>
              <th className="py-2 sm:py-3 px-1 sm:px-2 text-right font-semibold">Value</th>
              <th className="py-2 sm:py-3 px-1 sm:px-2 text-right font-semibold">%Chg</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, i) => {
              const isTop5  = i < top5Len;
              const isHi    = isTop5 && highlighted === i;
              const isExtra = !isTop5 && extraVisible === i;
              const flash   = flashMap[i];
              const recent  = recentMap[i];
              const cc = row.isUp === true ? "text-green-400" : row.isUp === false ? "text-red-400" : "text-slate-400";
              let bg = "hover:bg-slate-700/30";
              if (isHi)    bg = "bg-blue-900/20 border-l-2 border-l-blue-500";
              if (isExtra) bg = "bg-slate-600/20 border-l-2 border-l-slate-400";
              if (flash === "up")   bg += " flash-up";
              if (flash === "down") bg += " flash-down";
              return (
                <tr key={i} onClick={() => onRowClick?.(i)}
                  className={`border-b border-slate-700/50 cursor-pointer transition-colors ${bg}`}>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-slate-400 text-xs w-8 sm:w-10">{row.rank}</td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 font-bold text-white">
                    <span className="flex items-center gap-1">
                      {isTop5  && <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i] }} />}
                      {isExtra && <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ background: EXTRA_COLOR }} />}
                      <span className="text-xs sm:text-sm">{row.symbol}</span>
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
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-right">
                    <AnimatedCell value={row.value} flash={flash} />
                  </td>
                  <td className={`py-1.5 sm:py-2 px-1 sm:px-2 text-right font-semibold text-xs ${cc}`}>
                    {row.isUp === true ? "+" : ""}{row.change}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand/collapse toggle — only in compact mode */}
      {compact && data.length > top5Len && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300 border-t border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/30 transition-all"
        >
          {expanded ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              Show less
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              +{data.length - top5Len} more stocks
            </>
          )}
        </button>
      )}
    </div>
  );
};

/* ================= LIGHTWEIGHT CHART COMPONENT ================= */
const LWCChart = ({
  seriesData, highlighted, extraData,
  height = 256, fullWidth = false,
  chartId, chartRefs,
  onZoom, globalLogical, setGlobalLogical,
}) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const linesRef     = useRef([]);
  const extraLineRef = useRef(null);
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x: 0, from: 0 });
  const suppressSync = useRef(false);

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

    const ex = chart.addSeries(LineSeries, {
      color: "transparent", lineWidth: 2.2,
      lastValueVisible: true, priceLineVisible: false,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
    });
    extraLineRef.current = ex;
    chart.timeScale().scrollToRealTime();

    chart.subscribeCrosshairMove((param) => {
      if (suppressSync.current) return;
      if (param.logical !== undefined && param.logical !== null) {
        setGlobalLogical?.(param.logical);
      } else {
        setGlobalLogical?.(null);
      }
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      if (chartRefs) delete chartRefs.current[chartId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    suppressSync.current = true;
    if (globalLogical !== null && globalLogical !== undefined) {
      chart.setCrosshairPosition(undefined, undefined, globalLogical);
    } else {
      chart.clearCrosshairPosition();
    }
    suppressSync.current = false;
  }, [globalLogical]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      onZoom?.(e.deltaY, chartRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e) => {
      isDragging.current = true;
      dragStart.current  = { x: e.clientX, lastX: e.clientX };
      el.style.cursor    = "grabbing";
    };
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
    window.addEventListener("mouseup",   onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  useEffect(() => {
    linesRef.current.forEach((s, i) => {
      const isHi  = highlighted === i;
      const isDim = highlighted !== null && !isHi;
      s.applyOptions({ color: isDim ? PALETTE[i] + "28" : PALETTE[i], lineWidth: isHi ? 3 : 2 });
    });
  }, [highlighted]);

  useEffect(() => {
    const showExtra = !!extraData;
    linesRef.current.forEach((s, i) => {
      s.applyOptions({
        color: showExtra
          ? "transparent"
          : (highlighted === null ? PALETTE[i] : highlighted === i ? PALETTE[i] : PALETTE[i] + "28"),
      });
    });
    if (extraLineRef.current) {
      if (showExtra && extraData?.data?.length) {
        extraLineRef.current.setData(extraData.data);
        extraLineRef.current.applyOptions({ color: EXTRA_COLOR });
      } else {
        extraLineRef.current.applyOptions({ color: "transparent" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraData]);

  return (
    <div
      ref={containerRef}
      className={`${fullWidth ? "w-full" : "w-full lg:w-[65%]"} rounded-lg overflow-hidden border border-slate-600/60`}
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
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
    >
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

/* ================= TIME FILTERS ================= */
const TIME_FILTERS = [
  { key: "start", label: "Start",    range: "10:00–12:30", fromH: 10, fromM: 0,  toH: 12, toM: 30 },
  { key: "half",  label: "Half-Day", range: "12:00–14:30", fromH: 12, fromM: 0,  toH: 14, toM: 30 },
  { key: "end",   label: "End-Day",  range: "14:15–16:30", fromH: 14, fromM: 15, toH: 16, toM: 30 },
  { key: "all",   label: "All",      range: "10:00–16:30", fromH:  9, fromM: 0,  toH: 23, toM: 59 },
];

/* ================= ZOOM MODAL ================= */
const ZoomModal = ({
  card, onClose,
  highlighted, extraVisible, onRowClick, onReset,
  flashMap, recentMap = {},
  globalLogical, setGlobalLogical,
}) => {
  const [timeFilter, setTimeFilter] = useState("all");
  const modalChartRefs   = useRef({});
  const [modalBarWidth, setModalBarWidth] = useState(12);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!card) return null;
  const { category, type, data, allSeriesData } = card;
  const isPos = type === "+";
  const modalBp = useBreakpoint();
  const modalIsMobile = modalBp === "xs" || modalBp === "sm";

  const f = TIME_FILTERS.find(x => x.key === timeFilter) || TIME_FILTERS[3];
  const filteredSeries = useMemo(
    () => filterLWCByTime(allSeriesData, f.fromH, f.fromM, f.toH, f.toM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSeriesData, timeFilter]
  );

  const extraSliced = extraVisible != null
    ? { data: filteredSeries[extraVisible], symbol: data[extraVisible]?.symbol }
    : null;

  const handleModalZoom = useCallback((deltaY, chartApi) => {
    setModalBarWidth(prev => {
      const factor = deltaY > 0 ? 0.82 : 1.22;
      const next = Math.max(3, Math.min(200, prev * factor));
      Object.values(modalChartRefs.current).forEach(c => {
        c?.timeScale().applyOptions({ barSpacing: next });
      });
      return next;
    });
  }, []);

  const handleModalReset = useCallback(() => {
    onReset?.();
    requestAnimationFrame(() => {
      Object.values(modalChartRefs.current).forEach(c => {
        if (!c) return;
        c.timeScale().scrollToRealTime();
      });
    });
  }, [onReset]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#060d16", display: "flex", flexDirection: "column", fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Modal topbar — responsive: single row on desktop, two rows on mobile */}
      <div style={{ flexShrink: 0, background: "#07111c", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Row 1: Back | Title | BUY/SELL | (spacer) | Reset */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 12px", height: 44, gap: 8, overflow: "hidden" }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "monospace", flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </button>
          <span style={{ color: "#e2e8f0", fontSize: modalIsMobile ? 13 : 15, fontWeight: 800, letterSpacing: "0.08em", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: modalIsMobile ? 80 : "none" }}>{category}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0, background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: isPos ? "#4ade80" : "#f87171", border: `1px solid ${isPos ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`, whiteSpace: "nowrap" }}>
            {isPos ? (modalIsMobile ? "▲ BUY" : "▲ BUY FLOW") : (modalIsMobile ? "▼ SELL" : "▼ SELL FLOW")}
          </span>
          {/* Time filters inline on desktop */}
          {!modalIsMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
              {TIME_FILTERS.map(tf => {
                const active = timeFilter === tf.key;
                return (
                  <button key={tf.key} onClick={() => setTimeFilter(tf.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", flexShrink: 0, background: active ? "rgba(59,130,246,0.18)" : "transparent", border: `1px solid ${active ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`, transition: "all .15s" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#93c5fd" : "#64748b", lineHeight: 1.3 }}>{tf.label}</span>
                    <span style={{ fontSize: 9, color: active ? "#60a5fa" : "#334155", lineHeight: 1.2 }}>{tf.range}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <SpinButton onClick={handleModalReset} title="Reset" label="Reset" />
        </div>
        {/* Row 2 (mobile only): time filter pills */}
        {modalIsMobile && (
          <div style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            {TIME_FILTERS.map(tf => {
              const active = timeFilter === tf.key;
              return (
                <button key={tf.key} onClick={() => setTimeFilter(tf.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", flexShrink: 0, background: active ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.06)"}`, transition: "all .15s" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#93c5fd" : "#64748b", lineHeight: 1.3 }}>{tf.label}</span>
                  <span style={{ fontSize: 9, color: active ? "#60a5fa" : "#334155", lineHeight: 1.2 }}>{tf.range}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Body — stacked on mobile, side-by-side on desktop */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", flexDirection: modalIsMobile ? "column" : "row" }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: modalIsMobile ? 0 : "auto", padding: modalIsMobile ? 6 : 8, display: "flex", flexDirection: "column" }}>
          <LWCChart
            key={`modal-chart-${timeFilter}`}
            seriesData={filteredSeries.slice(0, 5)}
            highlighted={highlighted}
            extraData={extraSliced}
            height="100%"
            fullWidth
            chartId={`modal-${category}-${type}`}
            chartRefs={modalChartRefs}
            onZoom={handleModalZoom}
            globalLogical={globalLogical}
            setGlobalLogical={setGlobalLogical}
          />
        </div>

        <div style={{ width: modalIsMobile ? "100%" : 300, height: modalIsMobile ? 220 : "auto", flexShrink: modalIsMobile ? 0 : 0, display: "flex", flexDirection: "column", minHeight: 0, border: "1px solid rgba(255,255,255,0.15)", margin: modalIsMobile ? "0 6px 6px 6px" : "8px 8px 8px 0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px 8px", borderBottom: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
            <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Rankings</span>
            <span style={{ color: "#1e3a5f", fontSize: 10 }}>{data.length} stocks</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="custom-scrollbar">
            {data.map((row, i) => {
              const isTop5   = i < 5;
              const isHi     = isTop5 && highlighted === i;
              const isExtra  = !isTop5 && extraVisible === i;
              const flash    = flashMap?.[i];
              const recent   = recentMap?.[i];
              const dotColor = isTop5 ? PALETTE[i] : isExtra ? EXTRA_COLOR : "#1e3a5f";
              const rowBg    = flash === "up" ? "rgba(34,197,94,0.12)" : flash === "down" ? "rgba(239,68,68,0.12)" : isHi ? "rgba(59,130,246,0.07)" : "transparent";
              const leftBorder = isHi ? `2px solid ${PALETTE[i]}` : isExtra ? `2px solid ${EXTRA_COLOR}` : "2px solid transparent";
              const cc = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#334155";
              return (
                <React.Fragment key={i}>
                  {i === 5 && <div style={{ margin: "4px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center" }}><span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", letterSpacing: "0.1em" }}>OTHER</span></div>}
                  <div onClick={() => onRowClick?.(i)} style={{ display: "grid", gridTemplateColumns: "32px 10px 1fr auto auto", alignItems: "center", gap: "0 10px", padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.15)", borderLeft: leftBorder, background: rowBg, cursor: "pointer", transition: "background .3s" }}>
                    <span style={{ color: isTop5 ? "#94a3b8" : "#334155", fontSize: isTop5 ? 12 : 11, fontWeight: isTop5 ? 700 : 400, textAlign: "right", fontFamily: "monospace", borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 6 }}>{row.rank}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, justifySelf: "center" }} />
                    <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "monospace" }}>
                      {row.symbol}
                      {(flash || recent) && <span style={{ marginLeft: 5, fontSize: 9, color: (flash || recent) === "up" ? "#4ade80" : "#f87171" }}>{(flash || recent) === "up" ? "▲" : "▼"}</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", textAlign: "right", color: flash === "up" ? "#86efac" : flash === "down" ? "#fca5a5" : "#64748b", borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 8 }}>{row.value}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", textAlign: "right", minWidth: 56, color: cc }}>{row.isUp === true ? "+" : ""}{row.change}%</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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

/* ================= TOPBAR HOOK: ตรวจจับขนาดหน้าจอ ================= */
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

/* ================= SECTION CARD ================= */
const SectionCard = ({
  category, type, seed: initSeed,
  chartRefs, globalLogical, setGlobalLogical, onZoom,
}) => {
  const [highlighted, setHighlighted]   = useState(null);
  const [extraVisible, setExtraVisible] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(null);

  const bp       = useBreakpoint();
  const isMobile = bp === "xs" || bp === "sm";
  const isTablet = bp === "md";

  const isPos  = type === "+";
  const POINTS = 390;

  const baseData      = useMemo(() => mkFlowData(initSeed), [initSeed]);
  const allSeriesData = useMemo(() => mkLWCData(initSeed, 20, POINTS, isPos), [initSeed, isPos]);
  const cardKey       = `${category}-${type}-${initSeed}`;
  const chartId       = `card-${category}-${type}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  useEffect(() => {
    if (Object.keys(flashMap).length > 0) setLastUpdated(Date.now());
  }, [flashMap]);

  const handleRefresh = useCallback(() => {
    setHighlighted(null);
    setExtraVisible(null);
    Object.values(chartRefs.current).forEach(c => c?.timeScale().fitContent());
  }, [chartRefs]);

  const handleLegendClick = useCallback(idx => {
    setHighlighted(prev => prev === idx ? null : idx);
  }, []);

  const handleRowClick = useCallback(rowIdx => {
    if (rowIdx < 5) { setExtraVisible(null); handleLegendClick(rowIdx); }
    else { setHighlighted(null); setExtraVisible(prev => prev === rowIdx ? null : rowIdx); }
  }, [handleLegendClick]);

  const extraData = extraVisible != null
    ? { data: allSeriesData[extraVisible], symbol: liveData[extraVisible]?.symbol }
    : null;

  const chartHeight = isMobile ? 180 : isTablet ? 220 : 256;

  return (
    <>
      <div className="bg-[#1e293b] rounded-xl p-3 sm:p-4 lg:p-5 border border-slate-700/60 shadow-lg hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white shrink-0">{category}</h3>
            <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${isPos ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
              {isMobile ? (isPos ? "\u25b2 BUY" : "\u25bc SELL") : (isPos ? "\u25b2 BUY FLOW" : "\u25bc SELL FLOW")}
            </span>
            <LastUpdateBadge lastUpdated={lastUpdated} />
          </div>
          <div className="flex gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-400 transition-all"
              title="Fullscreen">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
              </svg>
            </button>
            <SpinButton onClick={handleRefresh} title="Refresh" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 lg:gap-4 lg:h-64">
          <LWCChart
            seriesData={allSeriesData.slice(0, 5)}
            highlighted={highlighted}
            extraData={extraData}
            height={chartHeight}
            chartId={chartId}
            chartRefs={chartRefs}
            onZoom={onZoom}
            globalLogical={globalLogical}
            setGlobalLogical={setGlobalLogical}
          />
          <RankTable
            data={liveData} flashMap={flashMap} recentMap={recentMap}
            top5Len={5} highlighted={highlighted} extraVisible={extraVisible}
            onRowClick={handleRowClick}
            compact={isMobile || isTablet}
          />
        </div>
      </div>

      {modalOpen && (
        <ZoomModal
          card={{ category, type, data: liveData, allSeriesData }}
          onClose={() => setModalOpen(false)}
          highlighted={highlighted} extraVisible={extraVisible}
          onRowClick={handleRowClick} onReset={handleRefresh}
          flashMap={flashMap} recentMap={recentMap}
          globalLogical={globalLogical}
          setGlobalLogical={setGlobalLogical}
        />
      )}
    </>
  );
};

/* ================= MAIN COMPONENT ================= */
export default function RealFlow() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery]        = useState("");

  const [globalLogical, setGlobalLogical] = useState(null);
  const chartRefs = useRef({});
  const [barWidth, setBarWidth] = useState(80);

  const bp = useBreakpoint();

  const handleZoom = useCallback((deltaY, _chartApi) => {
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

        /* Mobile menu slide-down */
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mobile-menu-enter { animation: slide-down 0.18s ease-out forwards; }

        /* Category pill active indicator */
        .cat-pill-active { box-shadow: 0 0 0 1px rgba(59,130,246,0.5), 0 2px 8px rgba(59,130,246,0.2); }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* ══════════════════════════════════════════════════════
            TOPBAR — Responsive Layout
            xs/sm  : [? icon] [Search__________] [☰ menu]
                     Row2 (expanded): category pills + History
            md     : [? icon] [Search____] [S100][NON][MAI][WAR] [History]
            lg/xl  : [? icon] [Search________] [SET100][NON-SET100][MAI][WARRANT] [History]
        ══════════════════════════════════════════════════════ */}

 <header className="mb-6 sm:mb-8">
  {/* ── Main Container: ห่อทุกอย่างไว้ด้วยกัน ── */}
  {/* มือถือใช้ flex-wrap เพื่อปัดบรรทัด, Desktop ใช้ flex-nowrap ให้อยู่บรรทัดเดียว */}
  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3">

    {/* 1. ToolHint (อยู่ซ้ายสุดเสมอ) */}
    <div className="order-1 shrink-0">
      <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
        Real Flow tracks stock market money flow in real-time.
        Prices update automatically every 10–15 seconds.
      </ToolHint>
    </div>

    {/* 2. Search Box (อยู่ถัดมา) */}
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

    {/* 3. History button 
        มือถือ (order-3): อยู่บรรทัดบน ชิดขวา
        Desktop (lg:order-4): ย้ายไปอยู่ท้ายสุดของแถว และใช้ ml-auto ดันชิดขวา 
    */}
    <button
      onClick={() => navigate("/hisrealflow")}
      className="order-3 lg:order-4 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white focus:outline-none ml-auto shrink-0"
      title="View History">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span className="hidden sm:inline">History</span>
    </button>

    {/* 4. Category pills 
        มือถือ (order-4): บังคับขึ้นบรรทัดใหม่ด้วย w-full
        Desktop (lg:order-3): แทรกกลางระหว่าง Search กับ History และแก้ความกว้างเป็น w-auto 
    */}
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
      
        {/* ── Sections ── */}
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