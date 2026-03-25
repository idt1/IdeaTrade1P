import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import ToolHint from "@/components/ToolHint.jsx";
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

function mkDayLabels(dateKey) {
  const slots = [];
  for (let h = 9; h <= 16; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 9 && m < 30) continue;
      if (h === 16 && m > 30) continue;
      slots.push(`${dateKey}\n${h}:${String(m).padStart(2,"0")}`);
    }
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

const AnimatedCell = memo(({ value, flash }) => {
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
      fontFamily: "monospace", fontSize: 12, color,
      transition: "color 1.2s ease", fontWeight: flash ? 700 : 400,
    }}>
      {display}
    </span>
  );
});

/* ================= LIVE UPDATE HOOK ================= */
function useLiveData(initialData, cardKey) {
  const [liveData, setLiveData] = useState(initialData);
  const [flashMap, setFlashMap] = useState({});
  const [recentMap, setRecentMap] = useState({});
  const timerRef = useRef(null);
  const liveRef = useRef(liveData);
  liveRef.current = liveData;

  const scheduleNext = useCallback(() => {
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
          ...row, value: newVal.toFixed(2), change: clamped.toFixed(2),
          isUp: clamped > 0.05 ? true : clamped < -0.05 ? false : null,
        };
      });
      setLiveData(updated);
      setFlashMap(newFlash);
      setRecentMap(newFlash);
      setTimeout(() => setFlashMap({}), 3000);
      setTimeout(() => setRecentMap({}), 8000);
      scheduleNextRef.current();
    }, (10 + Math.random() * 5) * 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleNextRef = useRef(scheduleNext);
  scheduleNextRef.current = scheduleNext;

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
const InfoTooltip = memo(({ children, lines = [], linkText = "", linkHref = "#" }) => {
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
          className="absolute left-full top-0 ml-3 z-[9999] w-64 rounded-xl shadow-2xl px-4 py-3 pointer-events-auto"
          style={{background:"#140f00",border:"1px solid rgba(217,119,6,0.3)"}}>
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
});

/* ================= RANK TABLE ================= */
const RankTable = memo(({ data, flashMap = {}, recentMap = {}, top5Len, highlighted, extraVisible, onRowClick }) => (
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
));

/* ================= SVG FLOW CHART ================= */
const FlowChart = memo(({
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
  const gap    = pointGap ?? CHART_CFG.pointGapDefault;
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
  const yTickVals = useMemo(
    () => Array.from({ length: yTicks }, (_, i) =>
      yScale.max - (i * (yScale.max - yScale.min)) / (yTicks - 1)
    ),
    [yScale]
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

  const syncScroll = useCallback(src => {
    Object.values(chartRefs.current).forEach(node => {
      if (node && node !== src && Math.abs(node.scrollLeft - src.scrollLeft) > 1)
        node.scrollLeft = src.scrollLeft;
    });
    syncVisibleRight(src);
  }, [chartRefs, syncVisibleRight]);

  const onMouseDown = useCallback(e => {
    setIsDragging(true);
    setGlobalHoverIndex(null);
    dragStart.current = { x: e.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft };
  }, [setGlobalHoverIndex]);

  const onMouseMove = useCallback(e => {
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
  }, [isDragging, padL, gap, pts, syncVisibleRight, setGlobalHoverIndex]);

  const onMouseLeave = useCallback(() => { setIsDragging(false); setGlobalHoverIndex(null); }, [setGlobalHoverIndex]);
  const onMouseUp    = useCallback(() => setIsDragging(false), []);

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

  const endTags = useMemo(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraVisible, allSeries, allData, top5, dimmed, visIdx, yScale, height, padT, padB]);

  const flashedIndices = useMemo(
    () => Object.keys(flashMap).map(Number).filter(i => i < 5),
    [flashMap]
  );

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
          {Array.from({ length: yTicks }, (_, i) => {
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
});

/* ================= SPIN BUTTON ================= */
const SpinButton = memo(({ onClick, title, label }) => {
  const iconRef = useRef(null);
  const handle = () => {
    onClick?.();
    if (iconRef.current) {
      iconRef.current.classList.remove("spin-once");
      void iconRef.current.offsetWidth;
      iconRef.current.classList.add("spin-once");
    }
  };
  return label ? (
    <button onClick={handle} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px", background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
      color: "#ffffff", cursor: "pointer", fontSize: 11, fontWeight: 600,
      fontFamily: "monospace", flexShrink: 0, transition: "all .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}
      title={title}>
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
});

/* ================= ZOOM MODAL ================= */
const ZoomModal = memo(({ card, onClose, highlighted, dimmed, extraVisible, onLegendClick, onRowClick, onReset, globalHoverIndex, setGlobalHoverIndex, chartRefs, pointGap, handleZoom, flashMap, recentMap = {} }) => {
  const [localPointGap, setLocalPointGap] = useState(pointGap);
  const chartContainerRef = useRef(null);
  const modalChartRefs = useRef({});

  useEffect(() => {
    let rafId = requestAnimationFrame(() => {
      const el = chartContainerRef.current;
      if (!el || !card || card.labels.length < 2) return;
      const availW = el.clientWidth - CHART_CFG.paddingLeft - CHART_CFG.paddingRight - 4;
      const gap = Math.max(8, Math.min(120, availW / (card.labels.length - 1)));
      setLocalPointGap(gap);
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const id = `modal-${card?.category}-${card?.type}`;
          const chartEl = modalChartRefs.current?.[id];
          if (chartEl) chartEl.scrollLeft = chartEl.scrollWidth;
        });
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [card]);

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

  const [chartH, setChartH] = useState(0);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setChartH(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!card) return null;
  const { category, type, data, allSeries, labels, top5 } = card;
  const isPos = type === "+";

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
        <div style={{ flex: 1 }} />
        <SpinButton
          onClick={() => { onReset?.(); setLocalPointGap(pointGap); }}
          title="Reset" label="Reset"
        />
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div ref={chartContainerRef} style={{ flexShrink: 0 }}>
          {chartH > 0 && (
            <div style={{ position: "absolute", inset: 0 }}>
              <FlowChart
                allSeries={allSeries} labels={labels} top5={top5}
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

        <div style={{
          width: 300, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0,
          border: "1px solid rgba(255,255,255,0.15)",
          margin: "8px 8px 8px 0", borderRadius: 8, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                      margin: "4px 18px", borderTop: "1px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>OTHER</span>
                    </div>
                  )}
                  <div onClick={() => onRowClick?.(i)}
                    style={{
                      display: "grid", gridTemplateColumns: "32px 10px 1fr auto auto",
                      alignItems: "center", gap: "0 10px", padding: "9px 18px",
                      borderBottom: "1px solid rgba(255,255,255,0.15)",
                      borderLeft: leftBorder, background: rowBg,
                      cursor: "pointer", transition: "background .3s",
                    }}>
                    <span style={{
                      color: isTop5 ? "#94a3b8" : "#334155", fontSize: isTop5 ? 12 : 11,
                      fontWeight: isTop5 ? 700 : 400, textAlign: "right", fontFamily: "monospace",
                      borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 6,
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
                      borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 8,
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
});

/* ================= LAST UPDATE BADGE ================= */
const LastUpdateBadge = memo(({ lastUpdated }) => {
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
});

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

/* ================= SECTION CARD ================= */
const SectionCard = memo(({ category, type, baseSeed, selectedDate, dateIndex, globalHoverIndex, setGlobalHoverIndex, chartRefs, pointGap, handleZoom }) => {
  const [highlighted, setHighlighted]   = useState(null);
  const [dimmed, setDimmed]             = useState({});
  const [extraVisible, setExtraVisible] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(null);

  const isPos  = type === "+";
  const POINTS = 29;

  const dateSeed = (baseSeed * 17 + (dateIndex + 1) * 131) >>> 0;

  const baseData   = useMemo(() => mkFlowData(dateSeed), [dateSeed]);
  const baseSeries = useMemo(() => mkSeries(dateSeed, 20, POINTS, isPos), [dateSeed, isPos]);
  const dayLabels  = useMemo(() => selectedDate ? mkDayLabels(selectedDate) : mkDayLabels("06/01/25"), [selectedDate]);
  const cardKey    = `${category}-${type}-${dateSeed}`;

  const { liveData, flashMap, recentMap } = useLiveData(baseData, cardKey);

  useEffect(() => {
    if (Object.keys(flashMap).length > 0) setLastUpdated(Date.now());
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
      setDimmed(() => {
        const d = {};
        for (let i = 0; i < 5; i++) d[i] = next !== null && i !== next;
        return d;
      });
      return next;
    });
  }, []);

  const handleRowClick = useCallback(rowIdx => {
    if (rowIdx < 5) {
      setExtraVisible(null);
      setHighlighted(prev => {
        const next = prev === rowIdx ? null : rowIdx;
        setDimmed(() => {
          const d = {};
          for (let i = 0; i < 5; i++) d[i] = next !== null && i !== next;
          return d;
        });
        return next;
      });
    } else {
      setHighlighted(null);
      setDimmed({});
      setExtraVisible(prev => prev === rowIdx ? null : rowIdx);
    }
  }, []);

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
            allSeries={baseSeries} labels={dayLabels} top5={top5}
            highlighted={highlighted} dimmed={dimmed}
            extraVisible={extraVisible} allData={liveData}
            height={256} chartId={chartId}
            globalHoverIndex={globalHoverIndex}
            setGlobalHoverIndex={setGlobalHoverIndex}
            chartRefs={chartRefs} pointGap={pointGap} handleZoom={handleZoom}
            flashMap={flashMap}
          />
          <RankTable
            data={liveData} flashMap={flashMap} recentMap={recentMap}
            top5Len={5} highlighted={highlighted} extraVisible={extraVisible}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {modalOpen && (
        <ZoomModal
          card={{ category, type, data: liveData, allSeries: baseSeries, labels: dayLabels, top5 }}
          onClose={() => setModalOpen(false)}
          highlighted={highlighted} dimmed={dimmed} extraVisible={extraVisible}
          onLegendClick={handleLegendClick} onRowClick={handleRowClick} onReset={handleRefresh}
          globalHoverIndex={globalHoverIndex} setGlobalHoverIndex={setGlobalHoverIndex}
          chartRefs={chartRefs} pointGap={pointGap} handleZoom={handleZoom}
          flashMap={flashMap} recentMap={recentMap}
        />
      )}
    </>
  );
});

/* ================= DATE PICKER ================= */
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
      dates.push({ key: `${dd}/${mm}/${yy}`, index: dates.length });
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
  const dd = String(day).padStart(2,"0");
  return `${dd} ${MONTH_NAMES[month-1]} ${year}`;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

  const tradableSet    = useMemo(() => new Set(dates), [dates]);
  const availableYears = useMemo(() => {
    const ys = new Set(dates.map(k => 2000 + +k.split("/")[2]));
    return [...ys].sort((a, b) => a - b);
  }, [dates]);
  const availableMonths = useMemo(() => {
    return new Set(dates.filter(k => 2000 + +k.split("/")[2] === viewYear).map(k => +k.split("/")[1]));
  }, [dates, viewYear]);

  const decadeStart = Math.floor(viewYear / 10) * 10;
  const decadeYears = useMemo(
    () => Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i),
    [decadeStart]
  );

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
  }, [viewMonth]);

  const canPrev = useCallback(() => {
    if (!dates[0]) return false;
    const p = parseKey(dates[0]);
    return viewYear > p.year || (viewYear === p.year && viewMonth > p.month);
  }, [dates, viewYear, viewMonth]);

  const canNext = useCallback(() => {
    if (!dates[dates.length-1]) return false;
    const p = parseKey(dates[dates.length-1]);
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
    overflow: "hidden",
    maxHeight: `calc(100vh - ${popupPos.top}px - 8px)`,  // ไม่ให้สูงเกินจอ
    overflowY: "auto",
    };
  const header = {
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
      {d==="left"  && <polyline points="15 18 9 12 15 6"/>}
      {d==="right" && <polyline points="9 18 15 12 9 6"/>}
      {d==="down"  && <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );

  return (
    <div ref={ref} style={{ flexShrink: 0 }}>
      <button onClick={() => {
        if (!open && selected) { const p = parseKey(selected); setViewMonth(p.month); setViewYear(p.year); }
        if (!open && ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const POPUP_W = 252;
          const clampedLeft = Math.min(
            rect.left,
            window.innerWidth - POPUP_W - 8   // ไม่ให้ล้นขวา
          );
          const clampedTop = Math.min(
            rect.bottom + 8,
            window.innerHeight - 8            // ไม่ให้ล้นล่าง
          );
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
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {formatDisplay(selected)}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity:.6, transform: open?"rotate(180deg)":"none", transition:"transform .2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={popup}>
          {view === "year" && (<>
            <div style={header}>
              <button style={navBtn(decadeStart > (availableYears[0]??2025))}
                onClick={() => setViewYear(decadeStart - 1)}
                onMouseEnter={e=>{ if(decadeStart>(availableYears[0]??2025)) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <span style={{ color:"#e2e8f0", fontSize:12, fontWeight:500, fontFamily:"monospace" }}>
                {decadeStart} – {decadeStart+9}
              </span>
              <button style={navBtn(decadeStart+9 < (availableYears[availableYears.length-1]??2025))}
                onClick={() => setViewYear(decadeStart+10)}
                onMouseEnter={e=>{ if(decadeStart+9<(availableYears[availableYears.length-1]??2025)) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={{ ...body, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
              {decadeYears.map(yr => {
                const avail = availableYears.includes(yr);
                const isCur = yr === viewYear;
                const isOut = yr < decadeStart || yr > decadeStart+9;
                return (
                  <button key={yr}
                    onClick={() => { if(avail){ setViewYear(yr); setView("month"); } }}
                    style={{
                      height:30, borderRadius:6, border:"none",
                      cursor: avail?"pointer":"default", fontFamily:"monospace",
                      fontSize:12, fontWeight: isCur?600:400,
                      background: isCur?"#3b82f6":"transparent",
                      color: isCur?"#fff" : avail?(isOut?"#475569":"#cbd5e1") : "#1e3a5f",
                      transition:"all .1s",
                    }}
                    onMouseEnter={e=>{ if(avail&&!isCur) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e=>{ if(avail&&!isCur) e.currentTarget.style.background="transparent"; }}
                  >{yr}</button>
                );
              })}
            </div>
          </>)}

          {view === "month" && (<>
            <div style={header}>
              <button style={navBtn(availableYears.includes(viewYear-1))}
                onClick={()=>setViewYear(y=>y-1)}
                onMouseEnter={e=>{ if(availableYears.includes(viewYear-1)) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <button style={titleBtn} onClick={()=>setView("year")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {viewYear} <Chev d="down"/>
              </button>
              <button style={navBtn(availableYears.includes(viewYear+1))}
                onClick={()=>setViewYear(y=>y+1)}
                onMouseEnter={e=>{ if(availableYears.includes(viewYear+1)) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={{ ...body, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
              {SHORT_MONTH.map((m, idx) => {
                const mNum  = idx+1;
                const avail = availableMonths.has(mNum);
                const isCur = mNum === viewMonth;
                return (
                  <button key={m}
                    onClick={()=>{ if(avail){ setViewMonth(mNum); setView("day"); } }}
                    style={{
                      height:32, borderRadius:6, border:"none",
                      cursor: avail?"pointer":"default", fontFamily:"monospace",
                      fontSize:12, fontWeight: isCur?600:400,
                      background: isCur?"#3b82f6":"transparent",
                      color: isCur?"#fff" : avail?"#cbd5e1" : "#1e3a5f",
                      transition:"all .1s",
                    }}
                    onMouseEnter={e=>{ if(avail&&!isCur) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e=>{ if(avail&&!isCur) e.currentTarget.style.background="transparent"; }}
                  >{m}</button>
                );
              })}
            </div>
          </>)}

          {view === "day" && (<>
            <div style={header}>
              <button style={navBtn(canPrev())} onClick={prevMonth}
                onMouseEnter={e=>{ if(canPrev()) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <button style={titleBtn} onClick={()=>setView("month")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {FULL_MONTH[viewMonth-1]} {viewYear} <Chev d="down"/>
              </button>
              <button style={navBtn(canNext())} onClick={nextMonth}
                onMouseEnter={e=>{ if(canNext()) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={body}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
                {DAY_NAMES.map(n => (
                  <div key={n} style={{
                    textAlign:"center", fontSize:10, fontWeight:500,
                    color: n==="Sun"||n==="Sat" ? "#1e3a5f" : "#475569",
                    padding:"2px 0", letterSpacing:"0.06em",
                  }}>{n}</div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {calDays.map((day, i) => {
                  if (!day) return <div key={`e-${i}`}/>;
                  const key       = toKey(viewYear, viewMonth, day);
                  const isTrade   = tradableSet.has(key);
                  const isSel     = key === selected;
                  const isWeekend = new Date(viewYear, viewMonth-1, day).getDay() % 6 === 0;
                  return (
                    <button key={key}
                      onClick={()=>{ if(isTrade){ onChange(key); setOpen(false); } }}
                      style={{
                        height:28, borderRadius:6, border: "none",
                        cursor: isTrade?"pointer":"default", fontFamily:"monospace",
                        fontSize:11, fontWeight: isSel?600:400,
                        background: isSel?"#3b82f6":"transparent",
                        color: isSel?"#fff" : isTrade?"#e2e8f0" : isWeekend?"#1e3a5f" : "#334155",
                        transition:"all .1s", position:"relative",
                      }}
                      onMouseEnter={e=>{ if(isTrade&&!isSel) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
                      onMouseLeave={e=>{ if(isTrade&&!isSel) e.currentTarget.style.background="transparent"; }}
                    >
                      {day}
                      {isTrade && !isSel && (
                        <span style={{
                          position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                          width:3, height:3, borderRadius:"50%", background:"#3b82f6",
                        }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={footer}>
              <span style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", textTransform:"uppercase" }}>Trading Days</span>
              <span style={{
                fontSize:11, fontWeight:500, color:"#60a5fa",
                background:"rgba(59,130,246,0.1)", padding:"1px 8px", borderRadius:99,
                border:"0.5px solid rgba(59,130,246,0.2)",
              }}>{dates.length}</span>
            </div>
          </>)}
        </div>
      )}
    </div>
  );
});

/* ================= MAIN COMPONENT ================= */
export default function HisRealFlow() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery]        = useState("");
  const [selectedDate, setSelectedDate]      = useState(() => { const all = getTradingDates(); return all[all.length - 1]?.key ?? null; });
  const [globalHoverIndex, setGlobalHoverIndex] = useState(null);
  const [pointGap, setPointGap] = useState(52);
  const chartRefs = useRef({});
  const navigate = useNavigate();

  const tradingDates   = useMemo(() => getTradingDates(), []);
  const availableDates = useMemo(() => tradingDates.map(d => d.key), [tradingDates]);

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
        @keyframes flash-up { 0% { background-color: rgba(34,197,94,0.45); } 40% { background-color: rgba(34,197,94,0.2); } 100% { background-color: transparent; } }
        @keyframes flash-down { 0% { background-color: rgba(239,68,68,0.45); } 40% { background-color: rgba(239,68,68,0.2); } 100% { background-color: transparent; } }
        .flash-up   { animation: flash-up 3s ease-out forwards; }
        .flash-down { animation: flash-down 3s ease-out forwards; }
        @keyframes ping-slow { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.5); opacity: 0; } }
        .animate-ping { animation: ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite; }
        @keyframes bounce-icon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-bounce-icon { animation: bounce-icon 0.4s ease-in-out 3; }
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spin-once 0.5s ease-in-out; }
        @keyframes pulse-ring { 0% { r: 6; opacity: 0.8; } 100% { r: 16; opacity: 0; } }
        .pulse-ring { animation: pulse-ring 1s ease-out forwards; }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .mobile-menu-enter { animation: slide-down 0.18s ease-out forwards; }
        .cat-pill-active { box-shadow: 0 0 0 1px rgba(59,130,246,0.5), 0 2px 8px rgba(59,130,246,0.2); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
<header className="mb-6 sm:mb-8">
  {/* ── Main Container ── */}
  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3">

    {/* 1. ToolHint (ซ้ายสุดเสมอ) */}
    <div className="order-1 shrink-0">
      <ToolHint onViewDetails={() => window.scrollTo({ top: 0 })}>
        His Real Flow tracks stock market money flow historically.
        Select a trading date to view that day's flow data.
        Charts and rankings update based on the selected date.
      </ToolHint>
    </div>

    {/* 2. Search Box */}
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

    {/* 3. DatePicker (เลื่อนมาซ้าย ต่อจาก Search) */}
    <div className="order-3 shrink-0">
      <DatePicker dates={availableDates} selected={selectedDate} onChange={setSelectedDate} />
    </div>

    {/* 4. Category pills 
        มือถือ (order-5): บังคับขึ้นบรรทัดใหม่ด้วย w-full
        Desktop (lg:order-4): แทรกกลางระหว่าง ปฏิทิน กับ ปุ่ม Real Flow 
    */}
    <div className="order-5 lg:order-4 w-full lg:w-auto mt-2 lg:mt-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar lg:min-w-0">
      {CATEGORIES.map(cat => {
        const isActive = activeCategory === cat;
        return (
          <button key={cat} onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border focus:outline-none whitespace-nowrap flex-shrink-0
              ${isActive
                ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/50 cat-pill-active"
                : "bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"}`}>
            {cat}
          </button>
        );
      })}
    </div>

    {/* 5. Real Flow button (ขวาสุด) 
        ใช้ ml-auto เพื่อดันปุ่มนี้ไปชิดขวาเสมอ
    */}
    <button
      onClick={() => navigate("/real-flow")}
      className="order-4 lg:order-5 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border bg-transparent border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white focus:outline-none ml-auto shrink-0"
      title="Back to Real Flow">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      <span className="hidden sm:inline">Real Flow</span>
    </button>

  </div>
</header>
        <div className="space-y-4 sm:space-y-6 pb-12">
          {visibleSections.length > 0 ? (
            visibleSections.map(({ category, type }) => {
              const baseSeed  = (CATEGORIES.indexOf(category) * 2 + (type === "+" ? 0 : 1) + 1) * 37;
              const dateIndex = tradingDates.findIndex(d => d.key === selectedDate);
              const safeIdx   = dateIndex >= 0 ? dateIndex : 0;
              return (
                <SectionCard
                  key={`${category}-${type}-${selectedDate}`}
                  category={category} type={type} baseSeed={baseSeed}
                  selectedDate={selectedDate} dateIndex={safeIdx}
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