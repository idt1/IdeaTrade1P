import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ================= CONSTANTS ================= */
const CATEGORIES = ["SET100", "NON-SET100", "MAI", "WARRANT"];
const PALETTE = ["#3b82f6", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];
const EXTRA_COLOR = "#94a3b8";
const SYMS = [
  "PTT","AOT","CPALL","ADVANC","GULF","SCB","KBANK","TRUE","MINT","BDMS",
  "BH","CPN","MAJOR","HANA","SCC","BEM","WHA","TU","BEAUTY","ESSO",
];

const CHART_CFG = {
  paddingLeft: 12,
  paddingRight: 72,
  paddingTop: 14,
  paddingBottom: 50,
  pointGapDefault: 52,
};

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

function mkSeries(seed, count = 20, points = 50, isUp = true) {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    let v = 50 + (r() - 0.5) * 20;
    return Array.from({ length: points }, () => {
      v += (r() - 0.48 + (isUp ? 0.025 : -0.025)) * 6;
      return Math.max(5, Math.min(95, +v.toFixed(2)));
    });
  });
}

function mkLabels(points = 50) {
  const slots = [];
  const base = new Date("2025-01-06");
  let day = 0;
  while (slots.length < points) {
    const d = new Date(base);
    d.setDate(base.getDate() + day);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(2);
      for (let h = 9; h <= 16; h++) {
        for (let m = 0; m < 60; m += 15) {
          if (h === 16 && m > 30) continue;
          slots.push(`${dd}/${mm}/${yy}\n${h}:${m.toString().padStart(2, "0")}`);
          if (slots.length >= points) return slots;
        }
      }
    }
    day++;
  }
  return slots;
}


/* ================= ANIMATED NUMBER ================= */
function useAnimatedValue(target, duration = 400) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(parseFloat(target));
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = parseFloat(target);
    if (Math.abs(from - to) < 0.001) return;
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * ease;
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
  const display = useAnimatedValue(value, 400);
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
    <span style={{
      fontFamily: "monospace",
      fontSize: 12,
      color,
      transition: "color 1.2s ease",
      fontWeight: flash ? 700 : 400,
    }}>
      {display}
    </span>
  );
};

/* ================= LIVE UPDATE HOOK ================= */
function useLiveData(initialData, cardKey) {
  const [liveData, setLiveData] = useState(initialData);
  const [flashMap, setFlashMap] = useState({});
  const [recentMap, setRecentMap] = useState({});
  const timerRef = useRef(null);
  const liveRef = useRef(liveData);
  liveRef.current = liveData;

  const scheduleNext = useCallback(() => {
    const demoDelay = (10 + Math.random() * 5) * 1000;
    timerRef.current = setTimeout(() => {
      const current = liveRef.current;
      const count = Math.floor(Math.random() * 3) + 1;
      const indices = [];
      while (indices.length < count) {
        const idx = Math.floor(Math.random() * current.length);
        if (!indices.includes(idx)) indices.push(idx);
      }

      const newFlash = {};
      const updated = current.map((row, i) => {
        if (!indices.includes(i)) return row;
        const oldVal = parseFloat(row.value);
        const delta = (Math.random() - 0.5) * oldVal * 0.03;
        const newVal = Math.max(1, oldVal + delta);
        const newChange = parseFloat(row.change) + (Math.random() - 0.5) * 1.2;
        const clamped = Math.max(-15, Math.min(15, newChange));
        newFlash[i] = delta > 0 ? "up" : "down";
        return {
          ...row,
          value: newVal.toFixed(2),
          change: clamped.toFixed(2),
          isUp: clamped > 0.05 ? true : clamped < -0.05 ? false : null,
        };
      });

      setLiveData(updated);
      setFlashMap(newFlash);
      setRecentMap(newFlash);

      setTimeout(() => setFlashMap({}), 3000);
      setTimeout(() => setRecentMap({}), 8000);
      scheduleNext();
    }, demoDelay);
  }, []);

  useEffect(() => {
    setLiveData(initialData);
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [cardKey, initialData, scheduleNext]);

  return { liveData, flashMap, recentMap };
}

/* ================= SVG HELPERS ================= */
function calcYScale(allSeries, visibleIndices) {
  let mn = Infinity, mx = -Infinity;
  visibleIndices.forEach(si => {
    allSeries[si]?.forEach(v => { if (v < mn) mn = v; if (v > mx) mx = v; });
  });
  if (mn === Infinity) return { min: 0, max: 100 };
  const pad = (mx - mn) * 0.14 || 3;
  return { min: mn - pad, max: mx + pad };
}

function normY(v, scale, h, padTop, padBot) {
  return h - padBot - ((v - scale.min) / (scale.max - scale.min)) * (h - padTop - padBot);
}

function buildPath(pts, scale, h, padL, padTop, padBot, gap) {
  if (!pts || pts.length === 0) return "";
  return pts.reduce((acc, v, i) => {
    const x = padL + i * gap;
    const y = normY(v, scale, h, padTop, padBot);
    if (i === 0) return `M${x},${y}`;
    const px = padL + (i - 1) * gap;
    const py = normY(pts[i - 1], scale, h, padTop, padBot);
    const cpx = px + (x - px) / 3;
    const cpx2 = px + (x - px) * 2 / 3;
    return `${acc} C${cpx},${py} ${cpx2},${y} ${x},${y}`;
  }, "");
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
const RankTable = ({ data, flashMap = {}, recentMap = {}, top5Len, highlighted, extraVisible, onRowClick }) => (
  <div className="w-full lg:w-[35%] bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden flex flex-col">
    <div className="overflow-y-auto flex-1 custom-scrollbar">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-800 text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
            <th className="py-3 px-2 text-center font-semibold w-10">Rank</th>
            <th className="py-3 px-2 text-left font-semibold">Symbol</th>
            <th className="py-3 px-2 text-right font-semibold">Value</th>
            <th className="py-3 px-2 text-right font-semibold">%Change</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
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
              <tr key={row.rank} onClick={() => onRowClick?.(i)}
                className={`border-b border-slate-700/50 cursor-pointer transition-colors ${bg}`}>
                <td className="py-2 px-2 text-center text-slate-400 w-10">{row.rank}</td>
                <td className="py-2 px-2 font-bold text-white">
                  <span className="flex items-center gap-1">
                    {isTop5  && <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i] }} />}
                    {isExtra && <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXTRA_COLOR }} />}
                    {row.symbol}
                    {recent && !flash && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ml-0.5 ${recent === "up" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {recent === "up" ? "▲" : "▼"}
                      </span>
                    )}
                    {flash && (
                      <span className={`text-[10px] font-bold ml-0.5 animate-bounce-icon ${flash === "up" ? "text-green-300" : "text-red-300"}`}>
                        {flash === "up" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  <AnimatedCell value={row.value} flash={flash} />
                </td>
                <td className={`py-2 px-2 text-right font-semibold ${cc}`}>
                  {row.isUp === true ? "+" : ""}{row.change}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/* ================= SVG FLOW CHART ================= */
const FlowChart = ({
  allSeries, labels, top5, highlighted, dimmed, extraVisible, allData,
  height = 256, chartId, globalHoverIndex, setGlobalHoverIndex, chartRefs,
  pointGap, handleZoom, fullWidth = false, flashMap = {},
}) => {
  const scrollRef  = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [visibleRightIdx, setVisibleRightIdx] = useState(labels.length - 1);
  const dragStart  = useRef({ x: 0, scrollLeft: 0 });

  const prevLenRef = useRef(labels.length);
  useEffect(() => {
    if (labels.length !== prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    prevLenRef.current = labels.length;
  }, [labels.length]);

  const { paddingLeft: padL, paddingRight: padR, paddingTop: padT, paddingBottom: padB } = CHART_CFG;
  const gap    = pointGap ?? CHART_CFG.pointGap;
  const pts    = labels.length;
  const chartW = padL + (pts - 1) * gap + 4;

  const syncVisibleRight = useCallback((el) => {
    const rightX = el.scrollLeft + el.clientWidth;
    const idx = Math.floor((rightX - padL) / gap);
    setVisibleRightIdx(Math.max(0, Math.min(pts - 1, idx)));
  }, [gap, padL, pts]);

  const extraIndices   = extraVisible != null ? [extraVisible] : [];
  const top5Indices    = top5.map((_, i) => i);
  const visibleIndices = extraVisible != null ? extraIndices : top5Indices;
  const yScale = useMemo(
    () => calcYScale(allSeries, visibleIndices),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSeries, visibleIndices.join(",")]
  );

  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks }, (_, i) =>
    yScale.max - (i * (yScale.max - yScale.min)) / (yTicks - 1)
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    chartRefs.current[chartId] = el;
    el.scrollLeft = el.scrollWidth;
    syncVisibleRight(el);
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs, syncVisibleRight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncVisibleRight(el);
  }, [pointGap, syncVisibleRight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !handleZoom) return;
    const onWheel = e => { e.preventDefault(); handleZoom(e.deltaY, e.clientX, el); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  const syncScroll = src => {
    Object.values(chartRefs.current).forEach(node => {
      if (node && node !== src && Math.abs(node.scrollLeft - src.scrollLeft) > 1)
        node.scrollLeft = src.scrollLeft;
    });
    syncVisibleRight(src);
  };

  const onMouseDown = e => {
    setIsDragging(true);
    setGlobalHoverIndex(null);
    dragStart.current = { x: e.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft };
  };
  const onMouseMove = e => {
    if (!scrollRef.current) return;
    if (isDragging) {
      e.preventDefault();
      const dx = e.pageX - scrollRef.current.offsetLeft - dragStart.current.x;
      scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx * 1.5;
      syncVisibleRight(scrollRef.current);
      setGlobalHoverIndex(null);
      return;
    }
    const rect   = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const idx    = Math.max(0, Math.min(Math.round((mouseX - padL) / gap), pts - 1));
    setGlobalHoverIndex(idx);
  };
  const onMouseLeave = () => { setIsDragging(false); setGlobalHoverIndex(null); };
  const onMouseUp    = () => setIsDragging(false);

  const isHovering = globalHoverIndex !== null && !isDragging && globalHoverIndex < pts;
  const hoverX     = isHovering ? padL + globalHoverIndex * gap : null;

  const avoidCollisions = (tags, tagH = 24) => {
    const sorted = [...tags].sort((a, b) => a.y - b.y);
    for (let pass = 0; pass < 8; pass++) {
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

  const visIdx = Math.min(visibleRightIdx, pts - 1);

  const endTags = (() => {
    if (extraVisible != null) {
      const s = allSeries[extraVisible];
      if (!s) return [];
      const v = s[visIdx];
      return [{ symbol: allData[extraVisible]?.symbol, value: v.toFixed(1), y: normY(v, yScale, height, padT, padB), color: EXTRA_COLOR }];
    }
    const raw = top5.map((row, i) => {
      const s = allSeries[i];
      if (!s || dimmed?.[i]) return null;
      const v = s[visIdx];
      return { symbol: row.symbol, value: v.toFixed(1), y: normY(v, yScale, height, padT, padB), color: PALETTE[i] };
    }).filter(Boolean);
    return avoidCollisions(raw);
  })();

  const flashedIndices = Object.keys(flashMap).map(Number).filter(i => i < 5);

  return (
    <div className={`${fullWidth ? "w-full" : "w-full lg:w-[65%]"} bg-[#0f1e2e] rounded-lg border border-slate-600/60 relative`} style={{ height }}>
      <div
        ref={scrollRef}
        className={`absolute inset-0 overflow-x-auto overflow-y-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        style={{ right: padR, msOverflowStyle: "none", scrollbarWidth: "none" }}
        onScroll={e => syncScroll(e.target)}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
      >
        <svg width={chartW} height={height} className="overflow-visible pointer-events-none" style={{ display: "block" }}>
          {[...Array(yTicks)].map((_, i) => {
            const y = padT + (i * (height - padT - padB)) / (yTicks - 1);
            return <line key={i} x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
          })}
          <line x1={0} y1={height - padB} x2={chartW} y2={height - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {labels.map((l, i) => {
            if (i % 4 !== 0) return null;
            const [datePart, timePart] = l.split("\n");
            const prevShown = labels[i - 4];
            const prevDate  = prevShown ? prevShown.split("\n")[0] : null;
            const showDate  = datePart !== prevDate;
            const x = padL + i * gap;
            return (
              <g key={i}>
                {showDate && i > 0 && (
                  <line x1={x} y1={height - padB + 2} x2={x} y2={height - padB + 8} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                )}
                {showDate && (
                  <text x={x} y={height - padB + 18} fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="700">{datePart}</text>
                )}
                <text x={x} y={height - padB + 34} fill="#94a3b8" fontSize="9" textAnchor="middle">{timePart}</text>
              </g>
            );
          })}

          {extraIndices.map(si => {
            const s = allSeries[si];
            if (!s) return null;
            const d = buildPath(s, yScale, height, padL, padT, padB, gap);
            const lastX = padL + visIdx * gap;
            const lastY = normY(s[visIdx], yScale, height, padT, padB);
            return (
              <g key={`ex-${si}`}>
                <path d={d} fill="none" stroke={EXTRA_COLOR} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                {!isHovering && <circle cx={lastX} cy={lastY} r="4" fill={EXTRA_COLOR} stroke="#0f1e2e" strokeWidth="2" />}
              </g>
            );
          })}

          {extraVisible == null && top5.map((row, i) => {
            const s = allSeries[i];
            if (!s) return null;
            const isDim = dimmed?.[i];
            const isHi  = highlighted === i;
            const base  = PALETTE[i];
            const stroke = isDim ? base + "35" : isHi ? base : base + "cc";
            const sw     = isDim ? 1 : isHi ? 3 : 2;
            const d = buildPath(s, yScale, height, padL, padT, padB, gap);
            const lastX = padL + (s.length - 1) * gap;
            const lastY = normY(s[s.length - 1], yScale, height, padT, padB);
            const isFlashing = flashMap[i];
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
                {!isHovering && (
                  <>
                    {isFlashing && (
                      <>
                        <circle cx={lastX} cy={lastY} r="10" fill="none"
                          stroke={isFlashing === "up" ? "#4ade80" : "#f87171"}
                          strokeWidth="1.5" opacity="0.5" className="pulse-ring" />
                        <circle cx={lastX} cy={lastY} r="6" fill="none"
                          stroke={isFlashing === "up" ? "#4ade80" : "#f87171"}
                          strokeWidth="1" opacity="0.7" />
                      </>
                    )}
                    <circle cx={lastX} cy={lastY} r={isHi ? 5 : 3.5} fill={base} stroke="#0f1e2e" strokeWidth="2" />
                  </>
                )}
              </g>
            );
          })}

          {isHovering && (
            <g>
              <line x1={hoverX} y1={padT} x2={hoverX} y2={height - padB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
              {extraVisible == null && top5.map((_, i) => {
                const s = allSeries[i]; if (!s) return null;
                const cy = normY(s[globalHoverIndex] ?? s[s.length-1], yScale, height, padT, padB);
                return <circle key={i} cx={hoverX} cy={cy} r="4" fill={PALETTE[i]} stroke="#0f1e2e" strokeWidth="2" />;
              })}
              {extraIndices.map(si => {
                const s = allSeries[si]; if (!s) return null;
                const cy = normY(s[globalHoverIndex] ?? s[s.length-1], yScale, height, padT, padB);
                return <circle key={si} cx={hoverX} cy={cy} r="4" fill={EXTRA_COLOR} stroke="#0f1e2e" strokeWidth="2" />;
              })}
            </g>
          )}

          {isHovering && globalHoverIndex < pts && (
            <g transform={`translate(${hoverX}, ${height - padB + 18})`}>
              <rect x={-28} y={-9} width={56} height={18} rx={4} fill="#1e293b" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x={0} y={0} fill="#fff" fontSize="10" textAnchor="middle" dominantBaseline="central" fontWeight="700">
                {labels[globalHoverIndex]?.split("\n")[1]}
              </text>
            </g>
          )}
        </svg>

        {isHovering && globalHoverIndex < pts && (
          <div className="absolute top-3 z-50 bg-[#1e293b]/95 border border-slate-500 rounded-lg px-3 py-2 shadow-xl pointer-events-none backdrop-blur-sm"
            style={{
              left: `${hoverX}px`,
              transform: globalHoverIndex > pts - 5 ? "translateX(calc(-100% - 10px))" : "translateX(12px)",
            }}>
            <p className="text-[10px] text-slate-400 mb-1.5 font-medium">
              {labels[globalHoverIndex]?.replace("\n", "  ")}
            </p>
            {extraVisible == null && top5.map((row, i) => {
              const s = allSeries[i]; if (!s) return null;
              return (
                <p key={i} className="text-[12px] font-bold leading-tight" style={{ color: PALETTE[i] }}>
                  {row.symbol}  {(s[globalHoverIndex] ?? s[s.length-1])?.toFixed(1)}
                </p>
              );
            })}
            {extraIndices.map(si => {
              const s = allSeries[si]; if (!s) return null;
              return (
                <p key={si} className="text-[12px] font-bold leading-tight" style={{ color: EXTRA_COLOR }}>
                  {allData[si]?.symbol}  {(s[globalHoverIndex] ?? s[s.length-1])?.toFixed(1)}
                </p>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute right-0 top-0 h-full z-10 border-l border-white/8 bg-[#0c1828]" style={{ width: padR, overflow: "visible" }}>
        <svg width={padR} height={height} className="overflow-visible" style={{ overflow: "visible" }}>
          {yTickVals.map((v, i) => {
            const y = padT + (i * (height - padT - padB)) / (yTicks - 1);
            return (
              <text key={i} x={5} y={y}
                fill="rgba(255,255,255,0.35)" fontSize="8.5" fontWeight="500"
                textAnchor="start" dominantBaseline="central">
                {v.toFixed(1)}
              </text>
            );
          })}

          {endTags.map((tag, idx) => {
            const LW   = 48;
            const VW   = padR - 8;
            const TH   = 22;
            const r    = 5;
            const lx   = -LW - 2;
            const vx   = 4;
            return (
              <g key={idx}>
                <rect x={lx} y={tag.y - TH/2} width={LW} height={TH} rx={r} fill={tag.color} />
                <text x={lx + LW/2} y={tag.y} fill="#fff" fontSize="10" fontWeight="800"
                  textAnchor="middle" dominantBaseline="central"
                  style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>
                  {tag.symbol}
                </text>
                <rect x={vx} y={tag.y - TH/2} width={VW} height={TH} rx={r}
                  fill="transparent" stroke={tag.color} strokeWidth="0.8" strokeOpacity="0.35" />
                <text x={vx + VW/2} y={tag.y} fill={tag.color} fontSize="11" fontWeight="700"
                  textAnchor="middle" dominantBaseline="central"
                  style={{ fontFamily: "monospace" }}>
                  {tag.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ================= SPIN BUTTON ================= */
const SpinButton = ({ onClick, title, label }) => {
  const [spinning, setSpinning] = useState(false);
  const iconRef = useRef(null);
  const handle = () => {
    onClick?.();
    setSpinning(false);
    requestAnimationFrame(() => {
      setSpinning(true);
      if (iconRef.current) {
        iconRef.current.classList.remove("spin-once");
        void iconRef.current.offsetWidth;
        iconRef.current.classList.add("spin-once");
      }
    });
    setTimeout(() => setSpinning(false), 550);
  };
  return label ? (
    <button onClick={handle} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px", background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
      color: "#ffffff", cursor: "pointer", fontSize: 11, fontWeight: 600,
      fontFamily: "monospace", flexShrink: 0, transition: "all .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}
      title={title}
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

const TIME_FILTERS = [
  { key: "start",    label: "Start",    range: "10:00–12:30", from: [10,  0], to: [12, 30] },
  { key: "half",     label: "Half-Day", range: "12:00–14:30", from: [12,  0], to: [14, 30] },
  { key: "end",      label: "End-Day",  range: "14:15–16:30", from: [14, 15], to: [16, 30] },
  { key: "all",      label: "All",      range: "10:00–16:30", from: [ 9,  0], to: [23, 59] },
];

function parseTime(label) {
  const timePart = label.split("\n")[1] || "";
  const [h, m] = timePart.split(":").map(Number);
  return [h || 0, m || 0];
}

function filterByTime(labels, allSeries, filterKey) {
  const f = TIME_FILTERS.find(x => x.key === filterKey) || TIME_FILTERS[3];
  const [fh, fm] = f.from;
  const [th, tm] = f.to;
  const indices = labels.reduce((acc, lbl, i) => {
    const [h, m] = parseTime(lbl);
    const mins = h * 60 + m;
    if (mins >= fh * 60 + fm && mins <= th * 60 + tm) acc.push(i);
    return acc;
  }, []);
  if (indices.length === 0) return { labels, allSeries };
  const filteredLabels = indices.map(i => labels[i]);
  const filteredSeries = allSeries.map(s => indices.map(i => s[i] ?? s[s.length - 1]));
  return { labels: filteredLabels, allSeries: filteredSeries };
}

/* ================= ZOOM MODAL ================= */
const ZoomModal = ({ card, onClose, highlighted, dimmed, extraVisible, onLegendClick, onRowClick, onReset, globalHoverIndex, setGlobalHoverIndex, chartRefs, pointGap, handleZoom, flashMap, recentMap = {} }) => {
  const [timeFilter, setTimeFilter] = useState("all");
  const [localPointGap, setLocalPointGap] = useState(pointGap);
  const chartContainerRef = useRef(null);
  const modalChartRefs = useRef({});
  // track ว่า fit ครั้งล่าสุดสำหรับ filter อะไร เพื่อไม่ให้ fit ซ้ำแล้ว lock scroll
  const lastFitFilter = useRef(null);

  const filtered = useMemo(
    () => card ? filterByTime(card.labels, card.allSeries, timeFilter) : { labels: [], allSeries: [] },
    [card, timeFilter]
  );

  // Auto-fit gap ทุกครั้งที่ filter เปลี่ยนเท่านั้น (ไม่ run ซ้ำ)
  useEffect(() => {
    if (lastFitFilter.current === timeFilter) return;
    lastFitFilter.current = timeFilter;
    let rafId = requestAnimationFrame(() => {
      const el = chartContainerRef.current;
      if (!el || filtered.labels.length < 2) return;
      const availW = el.clientWidth - CHART_CFG.paddingLeft - CHART_CFG.paddingRight - 4;
      const gap = Math.max(8, Math.min(120, availW / (filtered.labels.length - 1)));
      setLocalPointGap(gap);
      // scroll หลัง re-render
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const id = `modal-${card?.category}-${card?.type}`;
          const chartEl = modalChartRefs.current?.[id];
          if (chartEl) chartEl.scrollLeft = chartEl.scrollWidth;
        });
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [timeFilter, filtered.labels.length, card]);

  const localHandleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setLocalPointGap(prev => {
      const factor = deltaY > 0 ? 0.82 : 1.22;
      const next = Math.max(8, Math.min(120, prev * factor));
      if (scrollEl && Math.abs(next - prev) > 0.5) {
        const rect     = scrollEl.getBoundingClientRect();
        const cursorX  = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio    = next / prev;
        requestAnimationFrame(() => {
          scrollEl.scrollLeft = contentX * ratio - cursorX;
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!card) return null;
  const { category, type, data, allSeries, labels, top5 } = card;
  const isPos = type === "+";

  const [chartH, setChartH] = useState(0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#060d16",
      display: "flex", flexDirection: "column",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        padding: "0 16px", height: 46, flexShrink: 0,
        background: "#07111c",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: 12,
      }}>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 12px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          color: "#94a3b8", cursor: "pointer", fontSize: 11, fontWeight: 600,
          fontFamily: "monospace", flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
        <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 800, letterSpacing: "0.1em", flexShrink: 0 }}>
          {category}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99, flexShrink: 0,
          background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: isPos ? "#4ade80" : "#f87171",
          border: `1px solid ${isPos ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
        }}>
          {isPos ? "▲ BUY FLOW" : "▼ SELL FLOW"}
        </span>

        {/* ── Time filter toggle ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          {TIME_FILTERS.map(f => {
            const active = timeFilter === f.key;
            return (
              <button key={f.key} onClick={() => setTimeFilter(f.key)} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                fontFamily: "monospace", flexShrink: 0,
                background: active ? "rgba(59,130,246,0.18)" : "transparent",
                border: `1px solid ${active ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                transition: "all .15s",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#93c5fd" : "#64748b", lineHeight: 1.3 }}>{f.label}</span>
                <span style={{ fontSize: 9, color: active ? "#60a5fa" : "#334155", lineHeight: 1.2 }}>{f.range}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        {/* ── Reset button ── */}
        <SpinButton
          onClick={() => { onReset?.(); setTimeFilter("all"); setLocalPointGap(pointGap); }}
          title="Reset" label="Reset"
        />
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Chart area — FlowIntraday pattern: observe wrapper, fill with absolute */}
        <div
          ref={el => {
            chartContainerRef.current = el;
            // ResizeObserver ตรงนี้ — เหมือน FlowIntraday
            if (el && !el._roAttached) {
              el._roAttached = true;
              const ro = new ResizeObserver(([entry]) => {
                if (entry.contentRect.height > 0) setChartH(entry.contentRect.height);
              });
              ro.observe(el);
            }
          }}
          style={{ flex: 1, minWidth: 0, position: "relative" }}
        >
          {chartH > 0 && (
            <div style={{ position: "absolute", inset: 0 }}>
              <FlowChart
                allSeries={filtered.allSeries}
                labels={filtered.labels}
                top5={top5}
                highlighted={highlighted} dimmed={dimmed}
                extraVisible={extraVisible} allData={data}
                height={chartH}
                chartId={`modal-${category}-${type}`}
                globalHoverIndex={globalHoverIndex}
                setGlobalHoverIndex={setGlobalHoverIndex}
                chartRefs={modalChartRefs}
                pointGap={localPointGap}
                handleZoom={localHandleZoom}
                fullWidth={true}
                flashMap={flashMap}
              />
            </div>
          )}
        </div>

        {/* Rankings panel */}
        <div style={{
          width: 300, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0,
          border: "1px solid rgba(255,255,255,0.15)",
          margin: "8px 8px 8px 0", borderRadius: 8, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}>
            <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Rankings</span>
            <span style={{ color: "#1e3a5f", fontSize: 10 }}>{data.length} stocks</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="custom-scrollbar">
            {data.map((row, i) => {
              const isTop5  = i < 5;
              const isHi    = isTop5 && highlighted === i;
              const isExtra = !isTop5 && extraVisible === i;
              const flash   = flashMap?.[i];
              const recent  = recentMap?.[i];
              const isUp    = row.isUp === true;
              const isDown  = row.isUp === false;
              const dotColor = isTop5 ? PALETTE[i] : isExtra ? EXTRA_COLOR : "#1e3a5f";
              const rowBg = flash === "up"   ? "rgba(34,197,94,0.12)"
                          : flash === "down" ? "rgba(239,68,68,0.12)"
                          : isHi            ? "rgba(59,130,246,0.07)"
                          : "transparent";
              const leftBorder = isHi    ? `2px solid ${PALETTE[i]}`
                               : isExtra ? `2px solid ${EXTRA_COLOR}`
                               : "2px solid transparent";
              const showDivider = i === 5;
              return (
                <React.Fragment key={row.rank}>
                  {showDivider && (
                    <div style={{
                      margin: "4px 18px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>OTHER</span>
                    </div>
                  )}
                  <div onClick={() => onRowClick?.(i)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 10px 1fr auto auto",
                      alignItems: "center",
                      gap: "0 10px",
                      padding: "9px 18px",
                      borderBottom: "1px solid rgba(255,255,255,0.15)",
                      borderLeft: leftBorder,
                      background: rowBg,
                      cursor: "pointer",
                      transition: "background .3s",
                    }}>
                    <span style={{
                      color: isTop5 ? "#94a3b8" : "#334155",
                      fontSize: isTop5 ? 12 : 11,
                      fontWeight: isTop5 ? 700 : 400,
                      textAlign: "right", fontFamily: "monospace",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      paddingRight: 6,
                    }}>{row.rank}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, justifySelf: "center" }} />
                    <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", fontFamily: "monospace" }}>
                      {row.symbol}
                      {(flash || recent) && (
                        <span style={{ marginLeft: 5, fontSize: 9, color: (flash||recent) === "up" ? "#4ade80" : "#f87171" }}>
                          {(flash||recent) === "up" ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: "monospace", textAlign: "right",
                      color: flash === "up" ? "#86efac" : flash === "down" ? "#fca5a5" : "#64748b",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      paddingRight: 8,
                    }}>{row.value}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: "monospace", textAlign: "right", minWidth: 56,
                      color: isUp ? "#4ade80" : isDown ? "#f87171" : "#334155",
                    }}>
                      {isUp ? "+" : ""}{row.change}%
                    </span>
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
  return (
    <span className="text-[10px] text-slate-500 font-mono">
      updated {display}
    </span>
  );
};

/* ================= SECTION CARD ================= */
const SectionCard = ({ category, type, seed: initSeed, globalHoverIndex, setGlobalHoverIndex, chartRefs, pointGap, handleZoom }) => {
  const [highlighted, setHighlighted]   = useState(null);
  const [dimmed, setDimmed]             = useState({});
  const [extraVisible, setExtraVisible] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(null);

  const isPos  = type === "+";
  const POINTS = 31;

  const baseData    = useMemo(() => mkFlowData(initSeed), [initSeed]);
  const baseSeries  = useMemo(() => mkSeries(initSeed, 20, POINTS, isPos), [initSeed, isPos]);
  const baseLabels  = useMemo(() => mkLabels(POINTS), []);
  const cardKey     = `${category}-${type}-${initSeed}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  useEffect(() => {
    const hasFlash = Object.keys(flashMap).length > 0;
    if (hasFlash) setLastUpdated(Date.now());
  }, [flashMap]);

  const top5 = useMemo(() => liveData.slice(0, 5), [liveData]);
  const chartId = `card-${category}-${type}`;

  const handleRefresh = useCallback(() => {
    Object.values(chartRefs.current).forEach(node => {
      if (node) node.scrollLeft = node.scrollWidth;
    });
    setHighlighted(null); setDimmed({}); setExtraVisible(null);
  }, [chartRefs]);

  const handleLegendClick = useCallback(idx => {
    setHighlighted(prev => {
      const next = prev === idx ? null : idx;
      setDimmed(() => { const d = {}; for (let i = 0; i < 5; i++) d[i] = next !== null && i !== next; return d; });
      return next;
    });
  }, []);

  const handleRowClick = useCallback(rowIdx => {
    if (rowIdx < 5) {
      setExtraVisible(null);
      handleLegendClick(rowIdx);
    } else {
      setHighlighted(null);
      setDimmed({});
      setExtraVisible(prev => prev === rowIdx ? null : rowIdx);
    }
  }, [handleLegendClick]);

  return (
    <>
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/60 shadow-lg hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">{category}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
              ${isPos ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
              {isPos ? "▲ BUY FLOW" : "▼ SELL FLOW"}
            </span>
            <LastUpdateBadge lastUpdated={lastUpdated} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setModalOpen(true)}
              className="w-8 h-8 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-400 transition-all"
              title="Fullscreen">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
              </svg>
            </button>
            <SpinButton onClick={handleRefresh} title="Refresh" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:h-64">
          <FlowChart
            allSeries={baseSeries} labels={baseLabels} top5={top5}
            highlighted={highlighted} dimmed={dimmed}
            extraVisible={extraVisible} allData={liveData}
            height={256}
            chartId={chartId}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs}
            pointGap={pointGap}
            handleZoom={handleZoom}
            flashMap={flashMap}
          />
          <RankTable
            data={liveData}
            flashMap={flashMap}
            recentMap={recentMap}
            top5Len={5}
            highlighted={highlighted}
            extraVisible={extraVisible}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {modalOpen && (
        <ZoomModal
          card={{ category, type, data: liveData, allSeries: baseSeries, labels: baseLabels, top5 }}
          onClose={() => setModalOpen(false)}
          highlighted={highlighted} dimmed={dimmed} extraVisible={extraVisible}
          onLegendClick={handleLegendClick} onRowClick={handleRowClick} onReset={handleRefresh}
          globalHoverIndex={globalHoverIndex}
          setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs}
          pointGap={pointGap}
          handleZoom={handleZoom}
          flashMap={flashMap}
          recentMap={recentMap}
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
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const [pointGap, setPointGap] = useState(52);
  const chartRefs = useRef({});
  

  const handleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setPointGap(prev => {
      const factor = deltaY > 0 ? 0.82 : 1.22;
      const next = Math.max(8, Math.min(120, prev * factor));
      if (scrollEl && Math.abs(next - prev) > 0.5) {
        const rect     = scrollEl.getBoundingClientRect();
        const cursorX  = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio    = next / prev;
        requestAnimationFrame(() => {
          Object.values(chartRefs.current).forEach(node => {
            if (node) node.scrollLeft = contentX * ratio - cursorX;
          });
        });
      }
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

        @keyframes flash-up {
          0%   { background-color: rgba(34,197,94,0.45); }
          40%  { background-color: rgba(34,197,94,0.2); }
          100% { background-color: transparent; }
        }
        @keyframes flash-down {
          0%   { background-color: rgba(239,68,68,0.45); }
          40%  { background-color: rgba(239,68,68,0.2); }
          100% { background-color: transparent; }
        }
        .flash-up   { animation: flash-up 3s ease-out forwards; }
        .flash-down { animation: flash-down 3s ease-out forwards; }

        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping { animation: ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite; }

        @keyframes bounce-icon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-icon { animation: bounce-icon 0.4s ease-in-out 3; }

        @keyframes spin-once {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-once { animation: spin-once 0.5s ease-in-out; }

        @keyframes pulse-ring {
          0%   { r: 6; opacity: 0.8; }
          100% { r: 16; opacity: 0; }
        }
        .pulse-ring { animation: pulse-ring 1s ease-out forwards; }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <header className="flex flex-wrap items-center gap-3 mb-8">
          <InfoTooltip
            lines={[
              "Real Flow ติดตามกระแสเงินตลาดหุ้น Real-time",
              "ราคาอัพเดทอัตโนมัติทุก 4-10 วินาที (demo)",
              "กราฟ append จุดใหม่ทุกครั้งที่มีข้อมูล",
              "ตัวเลขเปลี่ยนแบบ animate + มีเสียง tick",
            ]}
            linkText="View feature details here" linkHref="#">
            <button className="w-9 h-9 rounded-full border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-400 transition-all text-sm font-bold shrink-0">?</button>
          </InfoTooltip>

          <div className="relative w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] rounded-lg py-2 pl-9 pr-8 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700 transition-all" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs transition-colors">✕</button>
            )}
          </div>

          {/* Category buttons container */}
          <div className="flex flex-wrap gap-2 flex-1 lg:flex-none">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button key={cat} onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all border focus:outline-none
                    ${isActive
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/50"
                      : "bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"}`}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Your new button on the right */}
          <div className="ml-auto">
            <button
            onClick={() => navigate('/hisrealflow')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white focus:outline-none flex items-center gap-2"
            title="View History">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </button>
          </div>
        </header>

        <div className="space-y-6 pb-12">
          {visibleSections.length > 0 ? (
            visibleSections.map(({ category, type }) => {
              const seed = (CATEGORIES.indexOf(category) * 2 + (type === "+" ? 0 : 1) + 1) * 37;
              return (
                <SectionCard
                  key={`${category}-${type}`}
                  category={category} type={type} seed={seed}
                  globalHoverIndex={globalHoverIndex}
                  setGlobalHoverIndex={setGlobalHoverIndex}
                  chartRefs={chartRefs}
                  pointGap={pointGap}
                  handleZoom={handleZoom}
                />
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No sections found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}