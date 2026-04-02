import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";
import { InfoTooltip } from "@/components/ToolHint.jsx";

/* ================= CONSTANTS ================= */
const CATEGORIES = ["SET100", "NON-SET100", "MAI", "WARRANT"];
const PALETTE = ["#3b82f6", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#38bdf8", "#facc15", "#e879f9", "#4ade80", "#f87171", "#fb923c", "#a3e635", "#34d399", "#60a5fa", "#c084fc", "#f472b6", "#94a3b8", "#fbbf24", "#2dd4bf", "#818cf8"];
const EXTRA_COLOR = "#94a3b8";
const SYMS = [
  "PTT","AOT","CPALL","ADVANC","GULF","SCB","KBANK","TRUE","MINT","BDMS",
  "BH","CPN","MAJOR","HANA","SCC","BEM","WHA","TU","BEAUTY","ESSO",
];

const TIME_PERIODS = [
  { key: "start",   label: "Start Graph",  sub: "10:00-12:30", from: 0,   to: 150 },
  { key: "half",    label: "Half Graph",   sub: "12:00-14:30", from: 120, to: 270 },
  { key: "end",     label: "End Graph",    sub: "14:15-16:30", from: 255, to: 390 },
  { key: "all",     label: "All Day",      sub: "10:00-16:30", from: 0,   to: 390 },
];

const ROW_COUNTS = {
  "SET100-+": 12, "SET100--": 7,
};

function getRowCount(category, type) {
  return ROW_COUNTS[`${category}-${type}`] ?? 20;
}

const VISIBLE_ROWS = 5;
const MAX_SELECT   = 5;

/* ================= RNG + FLOW DATA ================= */
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
    const val = (r() * 600 + 50).toFixed(2);
    const raw = (r() - 0.45) * 5;
    return {
      rank: i + 1, symbol: sym, value: val,
      change: raw.toFixed(2),
      isUp: raw > 0.05 ? true : raw < -0.05 ? false : null,
    };
  });
}

/* ================= LWC DATA ================= */
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
    <span style={{ fontFamily: "monospace", fontSize: 13, color, transition: "color 1.2s ease", fontWeight: flash ? 700 : 400 }}>
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
  return (
    <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
      updated {display}
    </span>
  );
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

/* ================= AVOID COLLISIONS ================= */
const avoidCollisions = (tags, tagH = 24) => {
  const sorted = [...tags].sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 4; pass++) {
    for (let k = 1; k < sorted.length; k++) {
      const diff = sorted[k].y - sorted[k - 1].y;
      if (diff < tagH) {
        const push = (tagH - diff) / 2 + 1;
        sorted[k - 1].y -= push;
        sorted[k].y     += push;
      }
    }
  }
  return sorted;
};

/* ================= LWC CHART COMPONENT ================= */
const LWCChart = ({
  seriesData, highlighted, extraVisibleSet = [], allData,
  height = 200, chartId, chartRefs,
  onZoom, globalLogical, setGlobalLogical,
  showLabels = false, labelData = [],
  timePeriod = "all",
}) => {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const linesRef      = useRef([]);
  const extraLinesRef = useRef(new Map());
  const isDragging    = useRef(false);
  const dragStart     = useRef({ lastX: 0 });
  const suppressSync  = useRef(false);
  const labelsDOMRef  = useRef({});
  const rafRef        = useRef(null);
  const priceRangeRef = useRef({ min: 0, max: 100 });
  const animRafRef    = useRef(null);

  const periodConfig = TIME_PERIODS.find(p => p.key === timePeriod) || TIME_PERIODS[3];

  const slicedSeriesData = useMemo(() => {
    if (!seriesData) return [];
    return seriesData.map(pts =>
      pts ? pts.slice(periodConfig.from, periodConfig.to) : pts
    );
  }, [seriesData, periodConfig]);

  const animatePriceRange = useCallback((targetMin, targetMax) => {
    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
    const startMin  = priceRangeRef.current.min;
    const startMax  = priceRangeRef.current.max;
    const startTime = performance.now();
    const DURATION  = 800;

    const tick = (now) => {
      const t    = Math.min((now - startTime) / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      priceRangeRef.current = {
        min: startMin + (targetMin - startMin) * ease,
        max: startMax + (targetMax - startMax) * ease,
      };
      const s = linesRef.current[0];
      if (s) {
        const cur = s.options().lineWidth ?? 2;
        s.applyOptions({ lineWidth: cur === 2 ? 2.01 : 2 });
      }
      if (t < 1) {
        animRafRef.current = requestAnimationFrame(tick);
      } else {
        if (linesRef.current[0]) linesRef.current[0].applyOptions({ lineWidth: 2 });
      }
    };
    animRafRef.current = requestAnimationFrame(tick);
  }, []);

  const updateFloatLabels = useCallback(() => {
    if (!showLabels || !chartRef.current || !linesRef.current.length) return;
    const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
    const rawLabels = [];

    linesRef.current.slice(0, VISIBLE_ROWS).forEach((series, i) => {
      const pts = slicedSeriesData?.[i];
      if (!pts || pts.length === 0) return;
      let rightmostIdx = pts.length - 1;
      if (logicalRange) {
        rightmostIdx = Math.floor(logicalRange.to);
        rightmostIdx = Math.max(0, Math.min(pts.length - 1, rightmostIdx));
      }
      const currentVal = pts[rightmostIdx].value;
      const y = series.priceToCoordinate(currentVal);
      if (y !== null && y !== undefined) {
        rawLabels.push({ y, value: currentVal.toFixed(2), index: i });
      }
    });

    extraLinesRef.current.forEach((series, dataIdx) => {
      const pts = slicedSeriesData?.[dataIdx];
      if (!pts || pts.length === 0) return;
      let rightmostIdx = pts.length - 1;
      if (logicalRange) {
        rightmostIdx = Math.floor(logicalRange.to);
        rightmostIdx = Math.max(0, Math.min(pts.length - 1, rightmostIdx));
      }
      const currentVal = pts[rightmostIdx].value;
      const y = series.priceToCoordinate(currentVal);
      if (y !== null && y !== undefined) {
        rawLabels.push({ y, value: currentVal.toFixed(2), index: `extra-${dataIdx}` });
      }
    });

    const adjustedLabels = avoidCollisions(rawLabels, 24);
    Object.values(labelsDOMRef.current).forEach(el => { if (el) el.style.opacity = 0; });
    adjustedLabels.forEach(({ y, value, index }) => {
      const el = labelsDOMRef.current[index];
      if (el) {
        el.style.transform = `translateY(${y - 11}px)`;
        el.style.opacity = 1;
        const valNode = el.querySelector(".label-val");
        if (valNode && valNode.textContent !== value) valNode.textContent = value;
      }
    });
  }, [showLabels, slicedSeriesData, extraVisibleSet]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateFloatLabels);
  }, [updateFloatLabels]);

  useEffect(() => {
    if (showLabels) scheduleUpdate();
  }, [extraVisibleSet, showLabels, scheduleUpdate]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: typeof height === "number" ? height : containerRef.current.clientHeight || 200,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1e2e" },
        textColor:  "#4a6080",
        fontFamily: "monospace",
        fontSize:   10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.20)", style: LineStyle.Dashed, width: 1, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "rgba(255,255,255,0.12)", style: LineStyle.Dashed, width: 1, labelBackgroundColor: "#1e293b" },
      },
      timeScale: {
        timeVisible: true, secondsVisible: false,
        borderColor: "rgba(255,255,255,0.08)",
        barSpacing: 20,
        tickMarkFormatter: (time) => {
          const d = new Date((time + 7 * 3600) * 1000);
          return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
        },
      },
      rightPriceScale: {
        visible: true,
        minimumWidth: 70,
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
        entireTextOnly: true,
        ticksVisible: false,
      },
      leftPriceScale: { visible: false },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale:  { mouseWheel: false, pinch: false },
    });
    chartRef.current = chart;
    if (chartRefs) chartRefs.current[chartId] = chart;
    const allVals = (slicedSeriesData || []).slice(0, VISIBLE_ROWS).flat().map(p => p?.value).filter(v => v != null);
    if (allVals.length) {
      priceRangeRef.current = { min: Math.min(...allVals), max: Math.max(...allVals) };
    }
    linesRef.current = (slicedSeriesData || []).slice(0, VISIBLE_ROWS).map((pts, i) => {
      const s = chart.addSeries(LineSeries, {
        color: PALETTE[i],
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        ...(i === 0 ? {
          autoscaleInfoProvider: () => {
            const { min, max } = priceRangeRef.current;
            const pad = (max - min) * 0.15;
            return { priceRange: { minValue: min - pad, maxValue: max + pad }, margins: { above: 8, below: 8 } };
          },
        } : {}),
      });
      if (pts) s.setData(pts);
      return s;
    });
    chart.timeScale().applyOptions({ barSpacing: 20 });
    chart.timeScale().scrollToRealTime();
    chart.subscribeCrosshairMove((param) => {
      if (suppressSync.current) return;
      if (param.logical !== undefined && param.logical !== null) setGlobalLogical?.(param.logical);
      else setGlobalLogical?.(null);
      if (showLabels) scheduleUpdate();
    });
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (showLabels) scheduleUpdate();
    });
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        if (showLabels) scheduleUpdate();
      }
    });
    ro.observe(containerRef.current);
    if (showLabels) setTimeout(scheduleUpdate, 100);
    return () => {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      extraLinesRef.current.clear();
      ro.disconnect();
      chart.remove();
      if (chartRefs) delete chartRefs.current[chartId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod]);

  useEffect(() => {
    if (!linesRef.current.length || !allData?.length) return;
    const vals = (slicedSeriesData || []).slice(0, VISIBLE_ROWS).flat().map(p => p?.value).filter(v => v != null);
    if (!vals.length) return;
    const targetMin = Math.min(...vals);
    const targetMax = Math.max(...vals);
    const cur = priceRangeRef.current;
    const rangeDiff = Math.abs(targetMax - targetMin);
    const threshold = rangeDiff * 0.005;
    if (Math.abs(targetMin - cur.min) > threshold || Math.abs(targetMax - cur.max) > threshold) {
      animatePriceRange(targetMin, targetMax);
    }
  }, [allData, slicedSeriesData, animatePriceRange]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    suppressSync.current = true;
    if (globalLogical !== null && globalLogical !== undefined) chart.setCrosshairPosition(undefined, undefined, globalLogical);
    else chart.clearCrosshairPosition();
    suppressSync.current = false;
  }, [globalLogical]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const newSet = new Set(extraVisibleSet);
    extraLinesRef.current.forEach((series, idx) => {
      if (!newSet.has(idx)) {
        try { chart.removeSeries(series); } catch (_) {}
        extraLinesRef.current.delete(idx);
      }
    });
    newSet.forEach(dataIdx => {
      if (!extraLinesRef.current.has(dataIdx) && seriesData?.[dataIdx]) {
        const pts = seriesData[dataIdx].slice(periodConfig.from, periodConfig.to);
        const s = chart.addSeries(LineSeries, {
          color: EXTRA_COLOR,
          lineWidth: 2.2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
        });
        s.setData(pts);
        extraLinesRef.current.set(dataIdx, s);
      }
    });
    if (showLabels) scheduleUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraVisibleSet, periodConfig]);

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
      const barSpacing = ts.options().barSpacing || 3;
      ts.scrollToPosition(ts.scrollPosition() - dx / barSpacing, false);
    };
    const onUp = () => { isDragging.current = false; el.style.cursor = "grab"; };
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
    const allSelected = new Set([...highlighted, ...extraVisibleSet]);
    linesRef.current.forEach((s, i) => {
      const isHi  = allSelected.has(i);
      const isDim = allSelected.size > 0 && !isHi;
      s.applyOptions({
        color:     isDim ? PALETTE[i] + "18" : PALETTE[i],
        lineWidth: isHi ? 3 : isDim ? 1 : 2,
      });
    });
  }, [highlighted, extraVisibleSet]);

  const labelsToRender = Array.from({ length: VISIBLE_ROWS }).map((_, i) => i);
  extraVisibleSet.forEach(idx => labelsToRender.push(`extra-${idx}`));

  return (
    <div style={{ flex: 1, minWidth: 0, position: "relative", height: typeof height === "number" ? height : "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%", height: "100%",
          borderRadius: 4, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          cursor: "grab",
        }}
      />
      {showLabels && labelsToRender.map(key => {
        const isExtra = typeof key === "string" && key.startsWith("extra-");
        const dataIdx = isExtra ? parseInt(key.split("-")[1], 10) : key;
        const sym     = labelData?.[dataIdx]?.symbol ?? SYMS[dataIdx] ?? "UNK";
        const color   = isExtra ? EXTRA_COLOR : PALETTE[key];
        const initPts = slicedSeriesData?.[dataIdx];
        const initVal = initPts?.[initPts.length - 1]?.value?.toFixed(2) ?? "";
        return (
          <div
            key={key}
            ref={el => labelsDOMRef.current[key] = el}
            style={{
              position: "absolute", right: 4, top: 0, opacity: 0,
              display: "flex", alignItems: "center", gap: 0,
              pointerEvents: "none", zIndex: 10, willChange: "transform",
            }}
          >
            <div style={{
              background: color, color: "#fff",
              fontSize: 10, fontWeight: 800, fontFamily: "monospace",
              padding: "2px 6px", borderRadius: "5px 0 0 5px",
              height: 22, display: "flex", alignItems: "center",
            }}>
              {sym}
            </div>
            <div className="label-val" style={{
              background: "#0d1b2a", color: color,
              fontSize: 11, fontWeight: 700, fontFamily: "monospace",
              padding: "2px 6px", borderRadius: "0 5px 5px 0",
              border: `1px solid ${color}60`, borderLeft: "none",
              height: 22, display: "flex", alignItems: "center",
            }}>
              {initVal}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ================= RANK TABLE ================= */
const ROW_H   = 40;
const TABLE_H = 36 + VISIBLE_ROWS * ROW_H;

const RankTable = ({ data, flashMap = {}, recentMap = {}, highlighted, extraVisibleSet = [], totalCount, onRowClick, onChartFlipClick }) => {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(460);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isTiny = containerW < 360;
  const COL    = isTiny ? "30px 1fr 90px 72px" : "36px 1fr 90px 80px 48px";
  const hiArr  = Array.isArray(highlighted) ? highlighted : (highlighted != null ? [highlighted] : []);
  const allSelected = new Set([...hiArr, ...extraVisibleSet]);

  return (
    <div ref={containerRef} style={{
        width: "100%", background: "#0d1b2a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 4, overflow: "hidden",
        display: "flex", flexDirection: "column",
        height: "100%",
      }}>
      <div style={{
        display: "grid", gridTemplateColumns: COL,
        alignItems: "center", padding: "0 10px", height: 36,
        background: "#0a1525",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "center" }}>#</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, paddingLeft: 8 }}>SYMBOL</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "center", paddingRight: 8 }}>VALUE</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "center", paddingRight: 0 }}>%CHG</span>
        {!isTiny && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.2 }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>CHART</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>FLIP</span>
          </div>
        )}
      </div>
      <div className="custom-scrollbar" style={{ overflowY: "auto", flex: 1, maxHeight: VISIBLE_ROWS * ROW_H }}>
        {data.slice(0, totalCount).map((row, i) => {
          const isTop5  = i < 5;
          const isHi    = isTop5 && hiArr.includes(i);
          const isExtra = !isTop5 && extraVisibleSet.includes(i);
          const isSel   = allSelected.has(i);
          const flash   = flashMap[i];
          const recent  = recentMap[i];
          const cc      = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";

          const rowOpacity = allSelected.size > 0 && !isSel ? 0.18 : 1;
          const rowBg      = flash === "up" ? "rgba(34,197,94,0.10)"
                           : flash === "down" ? "rgba(239,68,68,0.10)"
                           : isHi    ? "rgba(59,130,246,0.07)"
                           : isExtra ? "rgba(148,163,184,0.07)"
                           : "transparent";
          const borderLeft = isHi    ? `3px solid ${PALETTE[i]}`
                           : isExtra ? `3px solid ${EXTRA_COLOR}`
                           : "3px solid transparent";

          return (
            <div
              key={i}
              onClick={(e) => onRowClick?.(i, e.ctrlKey || e.metaKey)}
              style={{
                display: "grid", gridTemplateColumns: COL,
                alignItems: "center", padding: "0 10px", height: ROW_H,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: rowBg, borderLeft,
                cursor: "pointer", opacity: rowOpacity,
                transition: "background 0.3s, opacity 0.3s",
              }}
            >
              <span style={{ textAlign: "center", fontSize: 11, color: "#475569", fontWeight: 500 }}>{row.rank}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8, minWidth: 0 }}>
                {isTop5  && <span style={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE[i], flexShrink: 0 }} />}
                {isExtra && <span style={{ width: 7, height: 7, borderRadius: "50%", background: EXTRA_COLOR, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.symbol}
                  {flash  && <span style={{ marginLeft: 3, fontSize: 9, color: flash === "up" ? "#4ade80" : "#f87171" }}>{flash === "up" ? "▲" : "▼"}</span>}
                  {!flash && recent && <span style={{ marginLeft: 3, fontSize: 8, color: recent === "up" ? "#4ade80" : "#f87171", opacity: 0.7 }}>{recent === "up" ? "▲" : "▼"}</span>}
                </span>
              </span>
              <span style={{ textAlign: "center", fontSize: 12, color: "#cbd5e1", paddingRight: 0 }}>
                <AnimatedCell value={row.value} flash={flash} />
              </span>
              <span style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: cc, paddingRight: 0, whiteSpace: "nowrap" }}>
                {row.isUp === true ? "+" : ""}{row.change}%
              </span>
              {!isTiny && (
                <span style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <button
                    onClick={e => { e.stopPropagation(); onChartFlipClick?.(row.symbol); }}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title={`Chart Flip — ${row.symbol}`}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={cc} strokeWidth="1.5"/>
                      <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={cc}/>
                      <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={cc}/>
                      <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={cc}/>
                      <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={cc}/>
                      <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={cc} strokeWidth="0.8"/>
                    </svg>
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ================= FULLSCREEN RANKINGS PANEL ================= */
const FullscreenRankings = ({ data, flashMap = {}, recentMap = {}, totalCount, highlighted, extraVisibleSet = [], onRowClick, onChartFlipClick }) => {
  const top5   = data.slice(0, Math.min(5, totalCount));
  const others = data.slice(5, totalCount);
  const hiArr  = Array.isArray(highlighted) ? highlighted : (highlighted != null ? [highlighted] : []);
  const allSelected = new Set([...hiArr, ...extraVisibleSet]);

  const RankRow = ({ row, i, isTop }) => {
    const flash   = flashMap[i];
    const recent  = recentMap[i];
    const isHi    = isTop && hiArr.includes(i);
    const isExtra = !isTop && extraVisibleSet.includes(i);
    const isSel   = allSelected.has(i);
    const cc      = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";

    const rowOpacity = allSelected.size > 0 && !isSel ? 0.18 : 1;
    const rowBg      = flash === "up" ? "rgba(34,197,94,0.08)"
                     : flash === "down" ? "rgba(239,68,68,0.08)"
                     : isHi    ? "rgba(59,130,246,0.08)"
                     : isExtra ? "rgba(148,163,184,0.07)"
                     : "transparent";
    const dotColor   = isTop ? PALETTE[i] : isExtra ? EXTRA_COLOR : "#334155";
    const borderLeft = isHi    ? `3px solid ${PALETTE[i]}`
                     : isExtra ? `3px solid ${EXTRA_COLOR}`
                     : "3px solid transparent";

    return (
      <div
        onClick={(e) => onRowClick?.(i, e.ctrlKey || e.metaKey)}
        style={{
          display: "grid",
          gridTemplateColumns: "28px 16px 1fr 80px 60px 52px",
          alignItems: "center", padding: "0 14px",
          height: isTop ? 46 : 40,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: rowBg, borderLeft,
          cursor: "pointer", opacity: rowOpacity,
          transition: "background 0.3s, opacity 0.3s",
        }}
      >
        <span style={{ fontSize: isTop ? 13 : 12, color: isTop ? "#64748b" : "#334155", fontWeight: 600, textAlign: "center", fontFamily: "monospace" }}>
          {row.rank}
        </span>
        <span style={{ width: isTop ? 10 : 8, height: isTop ? 10 : 8, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
        <span style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 6 }}>
          <span style={{ fontSize: isTop ? 14 : 13, fontWeight: isTop ? 800 : 600, color: isTop || isExtra ? "#e2e8f0" : "#94a3b8", letterSpacing: "0.04em", fontFamily: "monospace" }}>
            {row.symbol}
          </span>
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
          <button
            onClick={e => { e.stopPropagation(); onChartFlipClick?.(row.symbol); }}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title={`Chart Flip — ${row.symbol}`}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={cc} strokeWidth="1.5"/>
              <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={cc}/>
              <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={cc}/>
              <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={cc}/>
              <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={cc}/>
              <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={cc} strokeWidth="0.8"/>
            </svg>
          </button>
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", height: 44,
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>RANKINGS</span>
        {allSelected.size > 0 && (
          <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
            {allSelected.size}/{MAX_SELECT} selected
          </span>
        )}
      </div>
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
        {top5.map((row, i) => <RankRow key={i} row={row} i={i} isTop />)}
        {others.length > 0 && (
          <div style={{
            padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#334155",
            letterSpacing: "0.1em",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "#0a1525",
          }}>
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
const SectionCard = ({ category, type, seed: initSeed, onChartFlipClick, chartRefs, globalLogical, setGlobalLogical, onZoom }) => {
  const [selectedSet,  setSelectedSet]  = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timePeriod,   setTimePeriod]   = useState("all");
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const bp       = useBreakpoint();
  const isMobile = bp === "xs" || bp === "sm";
  const isPos    = type === "+";

  if (category === "WARRANT" && type === "+") {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="bg-[#1e293b] rounded-xl border border-slate-700/60 shadow-lg"
        style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace" }}>WARRANT</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: "rgba(34,197,94,0.12)", color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.3)",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 8 }}>▲</span> BUY FLOW
          </span>
        </div>

        {/* โครงกราฟเปล่า */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{
            flex: 1, height: TABLE_H,
            background: "#0f1e2e", borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.06)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Grid lines แนวนอน */}
            {[0.2, 0.4, 0.6, 0.8].map((p, i) => (
              <div key={i} style={{
                position: "absolute", left: 0, right: 70,
                top: `${p * 100}%`,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }} />
            ))}
            {/* Grid lines แนวตั้ง */}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((p, i) => (
              <div key={i} style={{
                position: "absolute", top: 0, bottom: 40,
                left: `${p * 100}%`,
                borderLeft: "1px solid rgba(255,255,255,0.04)",
              }} />
            ))}
            {/* แกน X */}
            <div style={{
              position: "absolute", bottom: 40, left: 0, right: 70,
              borderTop: "1px solid rgba(255,255,255,0.15)",
            }} />
            {/* No Data label */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 8,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                <path d="M3 3v13a2 2 0 002 2h16M8 16l3-4 3 3 3-5"/>
              </svg>
              <span style={{ fontSize: 11, color: "#1e3a5f", fontWeight: 600, letterSpacing: "0.08em" }}>
                NO DATA AVAILABLE
              </span>
            </div>
          </div>

          {/* โครง table เปล่า */}
          <div style={{
            width: 460, flexShrink: 0, height: TABLE_H,
            background: "#0d1b2a", borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}>
            {/* header */}
            <div style={{
              height: 36, background: "#0a1525",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "grid", gridTemplateColumns: "36px 1fr 90px 80px 48px",
              alignItems: "center", padding: "0 10px",
            }}>
              {["#", "SYMBOL", "VALUE", "%CHG", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 10, color: "#1e3a5f", fontWeight: 600, textAlign: "center" }}>{h}</span>
              ))}
            </div>
            {/* rows เปล่า */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: ROW_H, borderBottom: "1px solid rgba(255,255,255,0.03)",
                display: "grid", gridTemplateColumns: "36px 1fr 90px 80px 48px",
                alignItems: "center", padding: "0 10px", gap: 8,
              }}>
                <div style={{ height: 8, width: 16, background: "rgba(255,255,255,0.04)", borderRadius: 4, margin: "0 auto" }} />
                <div style={{ height: 8, width: "60%", background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
                <div style={{ height: 8, width: "70%", background: "rgba(255,255,255,0.04)", borderRadius: 4, margin: "0 auto" }} />
                <div style={{ height: 8, width: "50%", background: "rgba(255,255,255,0.04)", borderRadius: 4, margin: "0 auto" }} />
                <div style={{ height: 8, width: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4, margin: "0 auto" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

  const totalCount    = getRowCount(category, type);
  const baseData      = useMemo(() => mkFlowData(initSeed, 20), [initSeed]);
  const allSeriesData = useMemo(() => mkLWCData(initSeed, 20, 390, isPos), [initSeed, isPos]);
  const cardKey = `${category}-${type}-${initSeed}`;
  const chartId = `card-${category}-${type}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  useEffect(() => {
    if (Object.keys(flashMap).length > 0) setLastUpdated(Date.now());
  }, [flashMap]);

  const highlighted     = [...selectedSet].filter(i => i < VISIBLE_ROWS);
  const extraVisibleSet = [...selectedSet].filter(i => i >= VISIBLE_ROWS);

  const handleRowClick = useCallback((rowIdx, isCtrl) => {
    if (isCtrl) {
      setSelectedSet(prev => {
        const next = new Set(prev);
        if (next.has(rowIdx)) {
          next.delete(rowIdx);
        } else if (next.size < MAX_SELECT) {
          next.add(rowIdx);
        }
        return next;
      });
    } else {
      setSelectedSet(prev => {
        if (prev.size === 1 && prev.has(rowIdx)) return new Set();
        return new Set([rowIdx]);
      });
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

  /* ── FULLSCREEN LAYOUT ── */
  if (isFullscreen) {
    const isNarrowFS = bp === "xs" || bp === "sm" || bp === "md";

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#060e1a", display: "flex", flexDirection: "column" }}>
        <div style={{
          minHeight: 52, background: "#07111c",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", flexShrink: 0, flexWrap: "wrap",
        }}>
          <ToolHint onViewDetails={() => window.scrollTo({ top: 0 })}>
            ---
          </ToolHint>
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6, padding: "5px 12px",
              color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5"/>
            </svg>
            back
          </button>
          <button
            onClick={handleRefresh}
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b",
            }}
            title="Reset"
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#64748b"; }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {category}
          </span>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
            <InfoTooltip
              text={`Ctrl+คลิก เพื่อเพิ่มหุ้นเปรียบเทียบ (รวมไม่เกิน ${MAX_SELECT} เส้น)`}
              placement="bottom"
            />
            {TIME_PERIODS.map(({ key, label, sub }) => {
              const isActive = timePeriod === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimePeriod(key)}
                  style={{
                    background: isActive ? "#1d4ed8" : "transparent",
                    border: isActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6, padding: isNarrowFS ? "4px 10px" : "4px 14px",
                    cursor: "pointer", color: isActive ? "#fff" : "#64748b",
                    fontSize: 12, fontFamily: "inherit",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    lineHeight: 1.3, transition: "all 0.15s",
                    boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.3)" : "none",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#94a3b8"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#64748b"; } }}
                >
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  {!isNarrowFS && <span style={{ fontSize: 10, opacity: 0.8 }}>{sub}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: isNarrowFS ? "column" : "row", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: isNarrowFS ? "8px 8px 0" : "12px 0 12px 12px", display: "flex" }}>
            <LWCChart
              seriesData={allSeriesData}
              highlighted={highlighted}
              extraVisibleSet={extraVisibleSet}
              allData={liveData}
              height="100%"
              chartId={`${chartId}-fs`}
              chartRefs={chartRefs}
              onZoom={onZoom}
              globalLogical={globalLogical}
              setGlobalLogical={setGlobalLogical}
              showLabels={true}
              labelData={liveData}
              timePeriod={timePeriod}
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
              data={liveData}
              flashMap={flashMap}
              recentMap={recentMap}
              totalCount={totalCount}
              highlighted={highlighted}
              extraVisibleSet={extraVisibleSet}
              onRowClick={handleRowClick}
              onChartFlipClick={onChartFlipClick}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── NORMAL (card) LAYOUT ── */
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="bg-[#1e293b] rounded-xl border border-slate-700/60 shadow-lg"
        style={{ padding: "16px 20px", display: "flex", flexDirection: "column" }}
      >
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12, flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.04em", fontFamily: "monospace" }}>{category}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: isPos ? "#4ade80" : "#f87171",
              border: `1px solid ${isPos ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
              display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 8 }}>{isPos ? "▲" : "▼"}</span>
              {isPos ? "BUY FLOW" : "SELL FLOW"}
            </span>
            <LastUpdateBadge lastUpdated={lastUpdated} />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={handleFullscreen}
              style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
              title="Fullscreen"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
              </svg>
            </button>
            <button
              onClick={handleRefresh}
              style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
              title="Refresh"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
              </svg>
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0, height: TABLE_H }}>
            <LWCChart
              seriesData={allSeriesData}
              highlighted={highlighted}
              extraVisibleSet={extraVisibleSet}
              allData={liveData}
              height={TABLE_H}
              chartId={chartId}
              chartRefs={chartRefs}
              onZoom={onZoom}
              globalLogical={globalLogical}
              setGlobalLogical={setGlobalLogical}
              timePeriod="all"
              showLabels={true}
              labelData={liveData}
            />
          </div>
          <div style={{ width: isMobile ? "100%" : 460, flexShrink: 0, height: TABLE_H, overflow: "hidden" }}>
            <RankTable
              data={liveData}
              flashMap={flashMap}
              recentMap={recentMap}
              highlighted={highlighted}
              extraVisibleSet={extraVisibleSet}
              totalCount={totalCount}
              onRowClick={handleRowClick}
              onChartFlipClick={onChartFlipClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= DATE HELPERS ================= */
function getTradingDates(numDays = 2087) {
  const dates = [];
  const base = new Date("2019-01-02");
  let day = 0;
  while (dates.length < numDays) {
    const d = new Date(base);
    d.setDate(base.getDate() + day);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(2);
      dates.push(`${dd}/${mm}/${yy}`);
    }
    day++;
  }
  return dates;
}
function parseKey(key) {
  const [dd, mm, yy] = key.split("/");
  return { day: +dd, month: +mm, year: 2000 + +yy };
}
function toKey(year, month, day) {
  return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${String(year).slice(2)}`;
}
function formatDisplay(key) {
  if (!key) return "";
  const { day, month, year } = parseKey(key);
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(day).padStart(2,"0")} ${M[month-1]} ${year}`;
}
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ================= DATE PICKER ================= */
const DatePicker = memo(({ dates, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("day");
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const FULL_MONTH  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const initView = useMemo(() => {
    if (selected) { const p = parseKey(selected); return { month: p.month, year: p.year }; }
    return { month: 1, year: 2025 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [viewMonth, setViewMonth] = useState(initView.month);
  const [viewYear,  setViewYear]  = useState(initView.year);

  const tradableSet     = useMemo(() => new Set(dates), [dates]);
  const availableYears  = useMemo(() => {
    const ys = new Set(dates.map(k => 2000 + +k.split("/")[2]));
    return [...ys].sort((a, b) => a - b);
  }, [dates]);
  const availableMonths = useMemo(() => {
    return new Set(dates.filter(k => 2000 + +k.split("/")[2] === viewYear).map(k => +k.split("/")[1]));
  }, [dates, viewYear]);

  const decadeStart = Math.floor(viewYear / 10) * 10;
  const decadeYears = useMemo(() => Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i), [decadeStart]);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const canPrev = useCallback(() => {
    if (!dates[0]) return false;
    const p = parseKey(dates[0]);
    return viewYear > p.year || (viewYear === p.year && viewMonth > p.month);
  }, [dates, viewYear, viewMonth]);

  const canNext = useCallback(() => {
    if (!dates[dates.length - 1]) return false;
    const p = parseKey(dates[dates.length - 1]);
    return viewYear < p.year || (viewYear === p.year && viewMonth < p.month);
  }, [dates, viewYear, viewMonth]);

  const calDays = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
    const total    = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const popup = {
    position: "fixed", top: popupPos.top, left: popupPos.left, zIndex: 9999,
    width: 252, background: "#0f172a",
    border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 12,
    boxShadow: "0 16px 40px rgba(0,0,0,0.6)", fontFamily: "monospace",
    overflow: "hidden", maxHeight: `calc(100vh - ${popupPos.top}px - 8px)`, overflowY: "auto",
  };
  const dpHeader = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px 8px", borderBottom: "0.5px solid rgba(255,255,255,0.07)",
  };
  const navBtn = (active) => ({
    width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent",
    color: active ? "#94a3b8" : "#1e293b", cursor: active ? "pointer" : "default",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "background .1s",
  });
  const titleBtn = {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#e2e8f0", fontSize: 13, fontWeight: 500, fontFamily: "monospace",
    letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 3,
    padding: "2px 4px", borderRadius: 5,
  };
  const body   = { padding: "8px 12px 10px" };
  const footer = {
    borderTop: "0.5px solid rgba(255,255,255,0.07)", padding: "6px 14px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };
  const Chev = ({ d }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {d === "left"  && <polyline points="15 18 9 12 15 6" />}
      {d === "right" && <polyline points="9 18 15 12 9 6" />}
      {d === "down"  && <polyline points="6 9 12 15 18 9" />}
    </svg>
  );

  return (
    <div ref={ref} style={{ flexShrink: 0 }}>
      <button onClick={() => {
        if (!open && selected) { const p = parseKey(selected); setViewMonth(p.month); setViewYear(p.year); }
        if (!open && ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const POPUP_W = 252;
          const clampedLeft = Math.min(rect.left, window.innerWidth - POPUP_W - 8);
          const clampedTop  = Math.min(rect.bottom + 8, window.innerHeight - 8);
          setPopupPos({ top: clampedTop, left: Math.max(8, clampedLeft) });
        }
        setOpen(o => !o); setView("day");
      }} style={{
        display: "flex", alignItems: "center", gap: 7, padding: "0 12px", height: 34,
        background: open ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)",
        border: `0.5px solid ${open ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.25)"}`,
        borderRadius: 8, cursor: "pointer", color: "#93c5fd", fontSize: 12, fontWeight: 500,
        fontFamily: "monospace", transition: "all .15s",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {formatDisplay(selected)}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: .6, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={popup}>
          {view === "year" && (<>
            <div style={dpHeader}>
              <button style={navBtn(decadeStart > (availableYears[0] ?? 2025))} onClick={() => setViewYear(decadeStart - 1)}
                onMouseEnter={e => { if (decadeStart > (availableYears[0] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="left" />
              </button>
              <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>
                {decadeStart} – {decadeStart + 9}
              </span>
              <button style={navBtn(decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025))} onClick={() => setViewYear(decadeStart + 10)}
                onMouseEnter={e => { if (decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="right" />
              </button>
            </div>
            <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
              {decadeYears.map(yr => {
                const avail = availableYears.includes(yr);
                const isCur = yr === viewYear;
                const isOut = yr < decadeStart || yr > decadeStart + 9;
                return (
                  <button key={yr} onClick={() => { if (avail) { setViewYear(yr); setView("month"); } }}
                    style={{
                      height: 30, borderRadius: 6, border: "none",
                      cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                      fontSize: 12, fontWeight: isCur ? 600 : 400,
                      background: isCur ? "#3b82f6" : "transparent",
                      color: isCur ? "#fff" : avail ? (isOut ? "#475569" : "#cbd5e1") : "#1e3a5f",
                      transition: "all .1s",
                    }}
                    onMouseEnter={e => { if (avail && !isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { if (avail && !isCur) e.currentTarget.style.background = "transparent"; }}
                  >{yr}</button>
                );
              })}
            </div>
          </>)}

          {view === "month" && (<>
            <div style={dpHeader}>
              <button style={navBtn(availableYears.includes(viewYear - 1))} onClick={() => setViewYear(y => y - 1)}
                onMouseEnter={e => { if (availableYears.includes(viewYear - 1)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="left" />
              </button>
              <button style={titleBtn} onClick={() => setView("year")}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {viewYear} <Chev d="down" />
              </button>
              <button style={navBtn(availableYears.includes(viewYear + 1))} onClick={() => setViewYear(y => y + 1)}
                onMouseEnter={e => { if (availableYears.includes(viewYear + 1)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="right" />
              </button>
            </div>
            <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
              {SHORT_MONTH.map((m, idx) => {
                const mNum  = idx + 1;
                const avail = availableMonths.has(mNum);
                const isCur = mNum === viewMonth;
                return (
                  <button key={m} onClick={() => { if (avail) { setViewMonth(mNum); setView("day"); } }}
                    style={{
                      height: 32, borderRadius: 6, border: "none",
                      cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                      fontSize: 12, fontWeight: isCur ? 600 : 400,
                      background: isCur ? "#3b82f6" : "transparent",
                      color: isCur ? "#fff" : avail ? "#cbd5e1" : "#1e3a5f",
                      transition: "all .1s",
                    }}
                    onMouseEnter={e => { if (avail && !isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { if (avail && !isCur) e.currentTarget.style.background = "transparent"; }}
                  >{m}</button>
                );
              })}
            </div>
          </>)}

          {view === "day" && (<>
            <div style={dpHeader}>
              <button style={navBtn(canPrev())} onClick={prevMonth}
                onMouseEnter={e => { if (canPrev()) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="left" />
              </button>
              <button style={titleBtn} onClick={() => setView("month")}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {FULL_MONTH[viewMonth - 1]} {viewYear} <Chev d="down" />
              </button>
              <button style={navBtn(canNext())} onClick={nextMonth}
                onMouseEnter={e => { if (canNext()) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Chev d="right" />
              </button>
            </div>
            <div style={body}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                {DAY_NAMES.map(n => (
                  <div key={n} style={{
                    textAlign: "center", fontSize: 10, fontWeight: 500,
                    color: n === "Sun" || n === "Sat" ? "#1e3a5f" : "#475569",
                    padding: "2px 0", letterSpacing: "0.06em",
                  }}>{n}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                {calDays.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const key       = toKey(viewYear, viewMonth, day);
                  const isTrade   = tradableSet.has(key);
                  const isSel     = key === selected;
                  const isWeekend = new Date(viewYear, viewMonth - 1, day).getDay() % 6 === 0;
                  return (
                    <button key={key} onClick={() => { if (isTrade) { onChange(key); setOpen(false); } }}
                      style={{
                        height: 28, borderRadius: 6, border: "none",
                        cursor: isTrade ? "pointer" : "default", fontFamily: "monospace",
                        fontSize: 11, fontWeight: isSel ? 600 : 400,
                        background: isSel ? "#3b82f6" : "transparent",
                        color: isSel ? "#fff" : isTrade ? "#e2e8f0" : isWeekend ? "#1e3a5f" : "#334155",
                        transition: "all .1s", position: "relative",
                      }}
                      onMouseEnter={e => { if (isTrade && !isSel) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={e => { if (isTrade && !isSel) e.currentTarget.style.background = "transparent"; }}
                    >
                      {day}
                      {isTrade && !isSel && (
                        <span style={{
                          position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                          width: 3, height: 3, borderRadius: "50%", background: "#3b82f6",
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={footer}>
              <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase" }}>Trading Days</span>
              <span style={{
                fontSize: 11, fontWeight: 500, color: "#60a5fa",
                background: "rgba(59,130,246,0.1)", padding: "1px 8px", borderRadius: 99,
                border: "0.5px solid rgba(59,130,246,0.2)",
              }}>{dates.length}</span>
            </div>
          </>)}
        </div>
      )}
    </div>
  );
});

/* ================= HIS IDEATRADE POINT ================= */
function HisIdeatradePoint({ onChartFlipClick }) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [globalLogical,  setGlobalLogical]  = useState(null);
  const tradingDates   = useMemo(() => getTradingDates(), []);
  const [selectedDate, setSelectedDate] = useState(() => tradingDates[tradingDates.length - 1] ?? null);
  const chartRefs = useRef({});
  const [barWidth, setBarWidth] = useState(3);

  // seed ผูกกับวันที่เลือก — เปลี่ยนวันแล้วข้อมูลและ chart เปลี่ยนตาม
  const dateSeed = useMemo(() => {
    if (!selectedDate) return 0;
    const { day, month, year } = parseKey(selectedDate);
    return day + month * 31 + (year - 2019) * 372;
  }, [selectedDate]);

  const handleZoom = useCallback((deltaY) => {
    setBarWidth(prev => {
      const factor = deltaY > 0 ? 0.82 : 1.22;
      const next   = Math.max(1, Math.min(60, prev * factor));
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
    <div
      className="w-full min-h-screen bg-[#0f172a] text-white"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        @keyframes flash-up   { 0% { background-color: rgba(34,197,94,0.45); } 100% { background-color: transparent; } }
        @keyframes flash-down { 0% { background-color: rgba(239,68,68,0.45); } 100% { background-color: transparent; } }
        .flash-up   { animation: flash-up   3s ease-out forwards; }
        .flash-down { animation: flash-down 3s ease-out forwards; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px" }}>
        {/* ── Header bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap", rowGap: 8 }}>
          <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
            Historical Ideatradepoint
          </ToolHint>

          {/* Search */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: "#0f1c2e", borderRadius: 8, padding: "8px 26px 8px 32px", fontSize: 14, color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", outline: "none", width: 200, fontFamily: "inherit" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>✕</button>
            )}
          </div>

          {/* DatePicker */}
          <DatePicker
            dates={tradingDates}
            selected={selectedDate}
            onChange={setSelectedDate}
          />

          {/* Category filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                  style={{
                    padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: isActive ? "#1d4ed8" : "transparent",
                    border: isActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.25)",
                    color: isActive ? "#fff" : "#cbd5e1",
                    transition: "all 0.15s", fontFamily: "inherit",
                    boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.4), 0 2px 8px rgba(59,130,246,0.2)" : "none",
                    whiteSpace: "nowrap", letterSpacing: "0.02em",
                  }}
                >{cat}</button>
              );
            })}
          </div>

          {/* Back button → navigate ไปหน้า live */}
          <button
            onClick={() => navigate("/ideatradepoint")}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
              padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: "transparent", border: "1px solid rgba(255,255,255,0.25)",
              color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#cbd5e1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5"/>
            </svg>
            Back 
          </button>
        </div>

        {/* ── Section Cards ── */}
        <div>
          {visibleSections.length > 0 ? (
            visibleSections.map(({ category, type }) => {
              const baseSeed = (CATEGORIES.indexOf(category) * 2 + (type === "+" ? 0 : 1) + 1) * 37;
              const seed = baseSeed + dateSeed; 
              return (
                <SectionCard
                  key={`${category}-${type}-${selectedDate}`}  
                  category={category}
                  type={type}
                  seed={seed}
                  onChartFlipClick={onChartFlipClick}
                  chartRefs={chartRefs}
                  globalLogical={globalLogical}
                  setGlobalLogical={setGlobalLogical}
                  onZoom={handleZoom}
                />
              );
            })
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#475569" }}>
              <p style={{ fontSize: 14 }}>No sections found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN APP ================= */
export default function App() {
  const navigate = useNavigate();
  const navigateToChartFlip = useCallback((symbol) => {
    navigate("/chart-flip-id", { state: { symbol } });
  }, [navigate]);
  return <HisIdeatradePoint onChartFlipClick={navigateToChartFlip} />;
}