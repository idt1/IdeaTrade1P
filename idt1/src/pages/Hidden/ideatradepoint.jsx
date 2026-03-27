import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

/* ================= CONSTANTS ================= */
const CATEGORIES = ["SET100", "NON-SET100", "MAI", "WARRANT"];
const PALETTE = ["#3b82f6", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#38bdf8", "#facc15", "#e879f9", "#4ade80", "#f87171", "#fb923c", "#a3e635", "#34d399", "#60a5fa", "#c084fc", "#f472b6", "#94a3b8", "#fbbf24", "#2dd4bf", "#818cf8"];
const EXTRA_COLOR = "#94a3b8";
const SYMS = [
  "PTT","AOT","CPALL","ADVANC","GULF","SCB","KBANK","TRUE","MINT","BDMS",
  "BH","CPN","MAJOR","HANA","SCC","BEM","WHA","TU","BEAUTY","ESSO",
];

const TIME_PERIODS = [
  { key: "start",   label: "Start",    sub: "10:00-12:30", from: 0,   to: 150 },
  { key: "half",    label: "Half-Day", sub: "12:00-14:30", from: 120, to: 270 },
  { key: "end",     label: "End-Day",  sub: "14:15-16:30", from: 255, to: 390 },
  { key: "all",     label: "All",      sub: "10:00-16:30", from: 0,   to: 390 },
];

const ROW_COUNTS = {
  "SET100-+": 12, "SET100--": 7,
};

function getRowCount(category, type) {
  return ROW_COUNTS[`${category}-${type}`] ?? 20;
}

const VISIBLE_ROWS = 5;

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
  seriesData, highlighted, extraVisible, allData,
  height = 200, chartId, chartRefs,
  onZoom, globalLogical, setGlobalLogical,
  showLabels = false, labelData = [],
  timePeriod = "all",
}) => {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const linesRef      = useRef([]);
  const extraLineRef  = useRef(null);
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
    const DURATION  = 600;
    const tick = (now) => {
      const t    = Math.min((now - startTime) / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      priceRangeRef.current = {
        min: startMin + (targetMin - startMin) * ease,
        max: startMax + (targetMax - startMax) * ease,
      };
      if (linesRef.current[0]) {
        linesRef.current[0].applyOptions({ priceLineVisible: false });
      }
      if (t < 1) animRafRef.current = requestAnimationFrame(tick);
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
    if (extraLineRef.current && extraVisible != null && slicedSeriesData?.[extraVisible]) {
      const pts = slicedSeriesData[extraVisible];
      if (pts && pts.length > 0) {
        let rightmostIdx = pts.length - 1;
        if (logicalRange) {
          rightmostIdx = Math.floor(logicalRange.to);
          rightmostIdx = Math.max(0, Math.min(pts.length - 1, rightmostIdx));
        }
        const currentVal = pts[rightmostIdx].value;
        const y = extraLineRef.current.priceToCoordinate(currentVal);
        if (y !== null && y !== undefined) {
          rawLabels.push({ y, value: currentVal.toFixed(2), index: "extra" });
        }
      }
    }
    const adjustedLabels = avoidCollisions(rawLabels, 24);
    Object.values(labelsDOMRef.current).forEach(el => {
      if (el) el.style.opacity = 0;
    });
    adjustedLabels.forEach(({ y, value, index }) => {
      const el = labelsDOMRef.current[index];
      if (el) {
        el.style.transform = `translateY(${y - 11}px)`;
        el.style.opacity = 1;
        const valNode = el.querySelector(".label-val");
        if (valNode && valNode.textContent !== value) {
          valNode.textContent = value;
        }
      }
    });
  }, [showLabels, slicedSeriesData, extraVisible]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateFloatLabels);
  }, [updateFloatLabels]);

  useEffect(() => {
    if (showLabels) scheduleUpdate();
  }, [extraVisible, showLabels, scheduleUpdate]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: typeof height === "number" ? height : containerRef.current.clientHeight || 200,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1b2a" },
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
    const allVals = (slicedSeriesData || [])
      .slice(0, VISIBLE_ROWS)
      .flat()
      .map(p => p?.value)
      .filter(v => v != null);
    if (allVals.length) {
      priceRangeRef.current = {
        min: Math.min(...allVals),
        max: Math.max(...allVals),
      };
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
            const pad = (max - min) * 0.12;
            return {
              priceRange: { minValue: min - pad, maxValue: max + pad },
              margins: { above: 10, below: 10 },
            };
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
      if (param.logical !== undefined && param.logical !== null) {
        setGlobalLogical?.(param.logical);
      } else {
        setGlobalLogical?.(null);
      }
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
      extraLineRef.current = null;
      ro.disconnect();
      chart.remove();
      if (chartRefs) delete chartRefs.current[chartId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod]);

  useEffect(() => {
    if (!linesRef.current.length || !allData?.length) return;
    const vals = (slicedSeriesData || [])
      .slice(0, VISIBLE_ROWS)
      .flat()
      .map(p => p?.value)
      .filter(v => v != null);
    if (!vals.length) return;
    const targetMin = Math.min(...vals);
    const targetMax = Math.max(...vals);
    const cur       = priceRangeRef.current;
    const rangeDiff = Math.abs(targetMax - targetMin);
    const threshold = rangeDiff * 0.005;
    if (
      Math.abs(targetMin - cur.min) > threshold ||
      Math.abs(targetMax - cur.max) > threshold
    ) {
      animatePriceRange(targetMin, targetMax);
    }
  }, [allData, slicedSeriesData, animatePriceRange]);

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
    const chart = chartRef.current;
    if (!chart) return;
    if (extraLineRef.current) {
      try { chart.removeSeries(extraLineRef.current); } catch (_) {}
      extraLineRef.current = null;
    }
    if (extraVisible != null && seriesData?.[extraVisible]) {
      const pts = seriesData[extraVisible].slice(periodConfig.from, periodConfig.to);
      const s = chart.addSeries(LineSeries, {
        color: EXTRA_COLOR,
        lineWidth: 2.2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });
      s.setData(pts);
      extraLineRef.current = s;
    }
    if (showLabels) scheduleUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraVisible, periodConfig]);

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
      dragStart.current  = { lastX: e.clientX };
      el.style.cursor    = "grabbing";
    };
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

  const labelsToRender = Array.from({ length: VISIBLE_ROWS }).map((_, i) => i);
  if (extraVisible != null) labelsToRender.push("extra");

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
        const isExtra = key === "extra";
        const dataIdx = isExtra ? extraVisible : key;
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
            <div
              className="label-val"
              style={{
                background: "#0d1b2a", color: color,
                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                padding: "2px 6px", borderRadius: "0 5px 5px 0",
                border: `1px solid ${color}60`, borderLeft: "none",
                height: 22, display: "flex", alignItems: "center",
              }}
            >
              {initVal}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ================= RANK TABLE ================= */
// [FIX 1] ลบ const COL ออกจาก top-level — ย้ายเข้าไปใน RankTable เป็น dynamic
const ROW_H   = 40;
const TABLE_H = 36 + VISIBLE_ROWS * ROW_H;

// [FIX 2] RankTable ใหม่ — responsive columns, ซ่อน CHART FLIP บน xs/sm/md
const RankTable = ({ data, flashMap = {}, recentMap = {}, highlighted, extraVisible, totalCount, onRowClick, onChartFlipClick }) => {
  const bp     = useBreakpoint();
  const isTiny = bp === "xs" || bp === "sm" || bp === "md";

  // ซ่อน CHART FLIP column บน tiny screen เพื่อให้ %CHG ไม่ตัด
  const COL = isTiny
    ? "30px 1fr 90px 68px"
    : "36px 1fr 90px 72px 56px";

  return (
    <div style={{
      width: "100%",          // [FIX] เปลี่ยนจาก width:480 fixed → 100% เสมอ
      background: "#0d1b2a",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 4, overflow: "hidden",
      display: "flex", flexDirection: "column",
      height: TABLE_H,
    }}>
      {/* header */}
      <div style={{
        display: "grid", gridTemplateColumns: COL,
        alignItems: "center", padding: "0 10px", height: 36,
        background: "#0a1525",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "center" }}>#</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, paddingLeft: 8 }}>SYMBOL</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "right", paddingRight: 8 }}>VALUE</span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textAlign: "right", paddingRight: isTiny ? 4 : 0 }}>%CHG</span>
        {!isTiny && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.2 }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>CHART</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>FLIP</span>
          </div>
        )}
      </div>

      {/* rows */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {data.slice(0, totalCount).map((row, i) => {
          const isTop5  = i < 5;
          const isHi    = isTop5 && highlighted === i;
          const isExtra = !isTop5 && extraVisible === i;
          const flash   = flashMap[i];
          const recent  = recentMap[i];
          const cc         = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";
          const chartColor = cc;
          const rowBg   = flash === "up" ? "rgba(34,197,94,0.10)" : flash === "down" ? "rgba(239,68,68,0.10)" : isHi ? "rgba(59,130,246,0.07)" : isExtra ? "rgba(148,163,184,0.07)" : "transparent";
          const borderLeft = isHi ? `3px solid ${PALETTE[i]}` : isExtra ? `3px solid ${EXTRA_COLOR}` : "3px solid transparent";
          return (
            <div key={i} onClick={() => onRowClick?.(i)} style={{
              display: "grid", gridTemplateColumns: COL,
              alignItems: "center", padding: "0 10px", height: ROW_H,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: rowBg, borderLeft,
              cursor: "pointer", transition: "background 0.3s",
            }}>
              <span style={{ textAlign: "center", fontSize: 11, color: "#475569", fontWeight: 500 }}>{row.rank}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8, minWidth: 0 }}>
                {isTop5  && <span style={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE[i], flexShrink: 0 }} />}
                {isExtra && <span style={{ width: 7, height: 7, borderRadius: "50%", background: EXTRA_COLOR, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.symbol}
                  {flash  && <span style={{ marginLeft: 3, fontSize: 9,  color: flash  === "up" ? "#4ade80" : "#f87171" }}>{flash  === "up" ? "▲" : "▼"}</span>}
                  {!flash && recent && <span style={{ marginLeft: 3, fontSize: 8, color: recent === "up" ? "#4ade80" : "#f87171", opacity: 0.7 }}>{recent === "up" ? "▲" : "▼"}</span>}
                </span>
              </span>
              <span style={{ textAlign: "right", fontSize: 12, color: "#cbd5e1", paddingRight: 8 }}>
                <AnimatedCell value={row.value} flash={flash} />
              </span>
              <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: cc, paddingRight: isTiny ? 4 : 0, whiteSpace: "nowrap" }}>
                {row.isUp === true ? "+" : ""}{row.change}%
              </span>
              {!isTiny && (
                <span style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <button
                    onClick={e => { e.stopPropagation(); onChartFlipClick?.(row.symbol); }}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 4, padding: "3px 6px",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title={`Chart Flip — ${row.symbol}`}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={chartColor} strokeWidth="1.5"/>
                      <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={chartColor}/>
                      <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={chartColor}/>
                      <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={chartColor}/>
                      <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={chartColor}/>
                      <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={chartColor} strokeWidth="0.8"/>
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
const FullscreenRankings = ({ data, flashMap = {}, recentMap = {}, totalCount, highlighted, extraVisible, onRowClick, onChartFlipClick }) => {
  const top5   = data.slice(0, Math.min(5, totalCount));
  const others = data.slice(5, totalCount);

  const RankRow = ({ row, i, isTop }) => {
    const flash      = flashMap[i];
    const recent     = recentMap[i];
    const isHi       = isTop && highlighted === i;
    const isExtra    = !isTop && extraVisible === i;
    const cc         = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";
    const rowBg      = flash === "up" ? "rgba(34,197,94,0.08)" : flash === "down" ? "rgba(239,68,68,0.08)" : isHi ? "rgba(59,130,246,0.08)" : isExtra ? "rgba(148,163,184,0.07)" : "transparent";
    const dotColor   = isTop ? PALETTE[i] : isExtra ? EXTRA_COLOR : "#334155";
    const borderLeft = isHi ? `3px solid ${PALETTE[i]}` : isExtra ? `3px solid ${EXTRA_COLOR}` : "3px solid transparent";
    const chartColor = row.isUp === true ? "#4ade80" : row.isUp === false ? "#f87171" : "#64748b";

    return (
      <div
        onClick={() => onRowClick?.(i)}
        style={{
          display: "grid",
          gridTemplateColumns: "28px 16px 1fr 80px 60px 52px",
          alignItems: "center",
          padding: "0 14px",
          height: isTop ? 46 : 40,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: rowBg, borderLeft,
          cursor: "pointer", transition: "background 0.3s",
        }}
      >
        <span style={{ fontSize: isTop ? 13 : 12, color: isTop ? "#64748b" : "#334155", fontWeight: 600, textAlign: "center", fontFamily: "monospace" }}>
          {row.rank}
        </span>
        <span style={{
          width: isTop ? 10 : 8, height: isTop ? 10 : 8,
          borderRadius: "50%", background: dotColor,
          display: "inline-block", flexShrink: 0,
        }} />
        <span style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 6 }}>
          <span style={{ fontSize: isTop ? 14 : 13, fontWeight: isTop ? 800 : 600, color: isTop || isExtra ? "#e2e8f0" : "#94a3b8", letterSpacing: "0.04em", fontFamily: "monospace" }}>
            {row.symbol}
          </span>
          {flash  && <span style={{ fontSize: 9,  color: flash  === "up" ? "#4ade80" : "#f87171" }}>{flash  === "up" ? "▲" : "▼"}</span>}
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
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4, padding: "4px 7px",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={`Chart Flip — ${row.symbol}`}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={chartColor} strokeWidth="1.5"/>
              <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={chartColor}/>
              <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={chartColor}/>
              <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={chartColor}/>
              <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={chartColor}/>
              <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={chartColor} strokeWidth="0.8"/>
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
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>RANKINGS</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {top5.map((row, i) => <RankRow key={i} row={row} i={i} isTop />)}
        {others.length > 0 && (
          <div style={{
            padding: "6px 14px",
            fontSize: 10, fontWeight: 700, color: "#334155",
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
  const [highlighted,  setHighlighted]  = useState(null);
  const [extraVisible, setExtraVisible] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timePeriod,   setTimePeriod]   = useState("all");
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const bp            = useBreakpoint();
  const isPos         = type === "+";
  const totalCount    = getRowCount(category, type);
  const baseData      = useMemo(() => mkFlowData(initSeed, 20), [initSeed]);
  const allSeriesData = useMemo(() => mkLWCData(initSeed, 20, 390, isPos), [initSeed, isPos]);
  const cardKey       = `${category}-${type}-${initSeed}`;
  const chartId       = `card-${category}-${type}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  useEffect(() => {
    if (Object.keys(flashMap).length > 0) setLastUpdated(Date.now());
  }, [flashMap]);

  const handleRowClick = useCallback(rowIdx => {
    if (rowIdx < 5) {
      setExtraVisible(null);
      setHighlighted(prev => prev === rowIdx ? null : rowIdx);
    } else {
      setHighlighted(null);
      setExtraVisible(prev => prev === rowIdx ? null : rowIdx);
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleRefresh = useCallback(() => {
    setHighlighted(null);
    setExtraVisible(null);
    setTimePeriod("all");
    const fsId = isFullscreen ? `${chartId}-fs` : chartId;
    if (chartRefs?.current?.[fsId]) {
      chartRefs.current[fsId].timeScale().scrollToRealTime();
    }
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
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "#060e1a",
        display: "flex", flexDirection: "column",
      }}>
        {/* top bar */}
        <div style={{
          minHeight: 52,
          background: "#07111c",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px",
          flexShrink: 0,
          flexWrap: "wrap",
        }}>
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
            Back
          </button>

          <span style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {category}
          </span>

          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99,
            background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: isPos ? "#4ade80" : "#f87171",
            border: `1px solid ${isPos ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 9 }}>{isPos ? "▲" : "▼"}</span>
            {isPos ? "BUY FLOW" : "SELL FLOW"}
          </span>

          {!isNarrowFS && <LastUpdateBadge lastUpdated={lastUpdated} />}

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px", flexShrink: 0 }} />

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                    cursor: "pointer",
                    color: isActive ? "#fff" : "#64748b",
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

          <button
            onClick={handleRefresh}
            style={{
              marginLeft: "auto",
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6, padding: "5px 14px",
              color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
            </svg>
            Reset
          </button>
        </div>

        {/* body: chart + sidebar */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isNarrowFS ? "column" : "row",
          minHeight: 0,
        }}>
          <div style={{
            flex: 1, minWidth: 0, minHeight: 0,
            padding: isNarrowFS ? "8px 8px 0" : "12px 0 12px 12px",
            display: "flex",
          }}>
            <LWCChart
              seriesData={allSeriesData}
              highlighted={highlighted}
              extraVisible={extraVisible}
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
            width:      isNarrowFS ? "100%" : 300,
            height:     isNarrowFS ? 260    : undefined,
            flexShrink: 0,
            background: "#07111c",
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
              extraVisible={extraVisible}
              onRowClick={handleRowClick}
              onChartFlipClick={onChartFlipClick}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── NORMAL (card) LAYOUT ── */
  // [FIX 3] card header — alignItems flex-start + flex:1 ให้ badge wrap ได้ถูกต้อง
  // [FIX 4] chart+table — column เสมอ, table full width ใต้ chart
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: "#0f1c2e",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 20px",
        display: "flex", flexDirection: "column",
      }}>
        {/* ── card header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start",   // [FIX] center → flex-start
          justifyContent: "space-between",
          marginBottom: 12, flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>  {/* [FIX] เพิ่ม flex:1 */}
            <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.04em", fontFamily: "monospace" }}>{category}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: isPos ? "#4ade80" : "#f87171",
              border: `1px solid ${isPos ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
              display: "flex", alignItems: "center", gap: 3,
              whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 8 }}>{isPos ? "▲" : "▼"}</span>
              {isPos ? "BUY FLOW" : "SELL FLOW"}
            </span>
            <LastUpdateBadge lastUpdated={lastUpdated} />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>  {/* [FIX] flexShrink:0 */}
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

        {/* ── chart + table ── */}
        {/* [FIX 4] เปลี่ยนจาก row+flexWrap → column เสมอ: chart บน, table ล่าง full width */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {/* chart */}
          <div style={{ width: "100%", height: TABLE_H }}>
            <LWCChart
              seriesData={allSeriesData}
              highlighted={highlighted}
              extraVisible={extraVisible}
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

          {/* table — full width เสมอ */}
          <div style={{ width: "100%" }}>
            <RankTable
              data={liveData}
              flashMap={flashMap}
              recentMap={recentMap}
              highlighted={highlighted}
              extraVisible={extraVisible}
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

/* ================= IDEATRADE POINT ================= */
function IdeatradePoint({ onChartFlipClick }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [infoOpen,       setInfoOpen]       = useState(false);
  const [globalLogical,  setGlobalLogical]  = useState(null);
  const chartRefs = useRef({});
  const [barWidth, setBarWidth] = useState(3);

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
    <div style={{ width: "100%", minHeight: "100vh", background: "#060e1a", color: "#e2e8f0", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px" }}>
        {/* ── filter bar ── */}
        {/* [FIX 5] แยก category buttons เป็น div ของตัวเอง ให้ wrap เป็นกลุ่ม */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap", rowGap: 8 }}>
          <div style={{ position: "relative", zIndex: 50, flexShrink: 0 }}>
            <ToolHint onViewDetails={() => setInfoOpen(true)}>
              ---
            </ToolHint>
          </div>

          <div style={{ position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: "#0f1c2e", borderRadius: 8, padding: "7px 26px 7px 28px", fontSize: 13, color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", outline: "none", width: 120, fontFamily: "inherit" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}
              >✕</button>
            )}
          </div>

          {/* [FIX 5] category buttons ใน div แยก → wrap เป็นกลุ่ม ไม่แตกแถว */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: isActive ? "#1d4ed8" : "transparent",
                    border: isActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
                    color: isActive ? "#fff" : "#94a3b8",
                    transition: "all 0.15s", fontFamily: "inherit",
                    boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.4), 0 2px 8px rgba(59,130,246,0.2)" : "none",
                    whiteSpace: "nowrap",
                  }}
                >{cat}</button>
              );
            })}
          </div>

          <button style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            color: "#94a3b8", cursor: "pointer", fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            History
          </button>
        </div>

        <div>
          {visibleSections.length > 0 ? (
            visibleSections.map(({ category, type }) => {
              const seed = (CATEGORIES.indexOf(category) * 2 + (type === "+" ? 0 : 1) + 1) * 37;
              return (
                <SectionCard
                  key={`${category}-${type}`}
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

  return <IdeatradePoint onChartFlipClick={navigateToChartFlip} />;
}