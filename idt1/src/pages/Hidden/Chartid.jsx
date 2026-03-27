import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ToolHint from "@/components/ToolHint.jsx";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAD     = { l: 14, t: 16, b: 32 };
const YAXIS_W = 68;
const N       = 390;

const TIME_LABELS = Array.from({ length: N }, (_, i) => {
  const mins = 10 * 60 + i;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});
const TICK_LABELS = Array.from({ length: 14 }, (_, i) => {
  const mins = 10 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#080f1a",
  surface:   "#0b1525",
  panel:     "#0f1c2e",
  header:    "#0f1c2e",
  border:    "rgba(255,255,255,0.11)",
  borderHi:  "rgba(255,255,255,0.20)",
  grid:      "rgba(255,255,255,0.04)",
  axis:      "rgba(255,255,255,0.13)",
  dimText:   "#1e3a5f",
  mutedText: "#4d6484",
  bodyText:  "#7a96b8",
  t1:        "#22c55e",
  t1d:       "#14532d",
  id:        "#eab308",
  idd:       "#713f12",
  zero:      "#6366f1",
  zeroglow:  "rgba(99,102,241,0.10)",
  crosshair: "rgba(255,255,255,0.18)",
  tagBg:     "#1a2d45",
  navBg:     "#131f30",
  navBorder: "rgba(255,255,255,0.11)",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
function randomWalk(length, start, volatility) {
  const arr = [start];
  for (let i = 1; i < length; i++) {
    arr.push(Math.round((arr[i - 1] + (Math.random() - 0.5) * 2 * volatility) * 100) / 100);
  }
  return arr;
}
function clamp(arr, mn, mx) { return arr.map(v => Math.max(mn, Math.min(mx, v))); }
function generateMockData() {
  const r = () => Math.round((Math.random() - 0.5) * 20);
  return {
    set:     { t1: clamp(randomWalk(N, r(), 1.2), -30, 30), id: clamp(randomWalk(N, r(), 1.8), -40, 40), smooth: true  },
    mai:     { t1: clamp(randomWalk(N, r(), 0.5), -18, 18), id: clamp(randomWalk(N, r(), 0.6), -12, 12), smooth: false },
    warrant: { t1: clamp(randomWalk(N, r(), 0.2), -8,   8), id: clamp(randomWalk(N, r(), 0.2), -6,   6), smooth: false },
  };
}
function calcYScale(t1, id) {
  const all = [...(t1 || []), ...(id || [])];
  if (!all.length) return { max: 10, min: -10 };
  const mx = Math.max(...all), mn = Math.min(...all);
  const r = mx - mn || 1;
  return { max: mx + r * 0.22, min: mn - r * 0.22 };
}
function normY(v, ys, h) {
  return h - PAD.b - ((v - ys.min) / (ys.max - ys.min)) * (h - PAD.t - PAD.b);
}
function buildPath(data, ys, h, gap, smooth) {
  const step = Math.max(1, Math.floor(1 / gap));
  return data.reduce((p, v, i) => {
    if (i % step !== 0 && i !== data.length - 1) return p;
    const x = PAD.l + i * gap, y = normY(v, ys, h);
    if (p === "") return `M ${x},${y}`;
    if (!smooth) return `${p} L ${x},${y}`;
    const pi = Math.max(0, i - step);
    const px = PAD.l + pi * gap, py = normY(data[pi], ys, h);
    return `${p} C ${px + (x - px) / 3},${py} ${px + (x - px) * 2 / 3},${y} ${x},${y}`;
  }, "");
}

// ─── Shared Hover ─────────────────────────────────────────────────────────────
let _sharedHover = null;
const _hoverListeners = new Set();
function setSharedHover(v) { _sharedHover = v; _hoverListeners.forEach(fn => fn(v)); }
function subscribeHover(fn) { _hoverListeners.add(fn); return () => _hoverListeners.delete(fn); }

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconExpand = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/>
  </svg>
);
const IconReset = ({ spinning }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? "spin-once 0.5s ease-in-out" : "none", transformOrigin: "center", display:"block" }}>
    <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
  </svg>
);
const IconBack = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconInfo = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IconLabel = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);
const IconCompare = () => (
  <svg width="15" height="15" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.7477 11.25C19.7477 11.25 19.75 10.75 19.75 10.25C19.75 5.77166 19.75 3.53249 18.3588 2.14124C16.9675 0.75 14.7283 0.75 10.25 0.75C5.77166 0.75 3.53249 0.75 2.14124 2.14124C0.75 3.53249 0.75 5.77166 0.75 10.25C0.75 14.7283 0.75 16.9675 2.14124 18.3588C3.53249 19.75 5.77166 19.75 10.25 19.75C10.7807 19.75 11.25 19.7477 11.25 19.7477" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M0.75 5.75H19.75" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8.75 14.75H10.25M4.75 14.75H5.75M8.75 10.75H14.75M4.75 10.75H5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.75 17.25H20.75M17.25 20.75L17.25 13.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Small icon button ────────────────────────────────────────────────────────
function IconBtn({ onClick, title, children, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28,
        background: active ? "rgba(255,255,255,0.07)" : "transparent",
        border: `1px solid ${active ? "rgba(255,255,255,0.15)" : C.border}`,
        borderRadius: 6,
        color: active ? "#e2e8f0" : C.mutedText,
        cursor: "pointer", flexShrink: 0,
        transition: "all .15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "#e2e8f0";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = active ? "#e2e8f0" : C.mutedText;
        e.currentTarget.style.borderColor = active ? "rgba(255,255,255,0.15)" : C.border;
        e.currentTarget.style.background = active ? "rgba(255,255,255,0.07)" : "transparent";
      }}
    >{children}</button>
  );
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────
function ToggleBtn({ active, color, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 10px 3px 8px",
      borderRadius: 99,
      border: active ? `1px solid ${color}40` : `1px solid rgba(255,255,255,0.07)`,
      background: active ? `${color}12` : "transparent",
      color: active ? color : C.mutedText,
      cursor: "pointer",
      fontSize: 11, fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.03em",
      transition: "all .15s",
      flexShrink: 0,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: active ? color : C.dimText,
        flexShrink: 0,
        boxShadow: active ? `0 0 5px ${color}` : "none",
        transition: "all .15s",
      }} />
      {label}
    </button>
  );
}

// ─── Info Tooltip ─────────────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "50%",
          background: "transparent",
          border: `1px solid rgba(255,255,255,0.10)`,
          color: C.mutedText, cursor: "pointer", padding: 0,
        }}
      >
        <IconInfo />
      </button>
      {show && (
        <div style={{
          position: "absolute", top: 24, left: 0,
          background: "#0a1422",
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 6, padding: "5px 10px",
          whiteSpace: "nowrap", zIndex: 999,
          color: C.bodyText, fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, letterSpacing: "0.06em",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Chart Panel ──────────────────────────────────────────────────────────────
function ChartPanel({
  title, subtitle, t1Data, idData, smooth,
  pointGap, handleZoom, chartRefs, chartId,
  isExpanded, onExpand, onClose,
  showT1, showId, showLabels,
  onToggleT1, onToggleId, onToggleLabels,
  onReset,
}) {
  const scrollRef  = useRef(null);
  const bodyRef    = useRef(null);
  const [hover, setHover]           = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOnYAxis, setIsOnYAxis]   = useState(false);
  const [dim, setDim]               = useState({ w: 800, h: 220 });
  const [visibleRightIdx, setVisibleRightIdx] = useState(N - 1);
  const [isResetting, setIsResetting] = useState(false);
  const dragData = useRef(null);

  const handleResetClick = () => {
    setIsResetting(true);
    onReset();
    setTimeout(() => setIsResetting(false), 520);
  };

  useEffect(() => { const unsub = subscribeHover(setHover); return unsub; }, []);

  useEffect(() => {
    if (scrollRef.current) chartRefs.current[chartId] = scrollRef.current;
    return () => { delete chartRefs.current[chartId]; };
  }, [chartId, chartRefs]);

  useEffect(() => {
    const el = bodyRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setDim({ w: e.contentRect.width, h: Math.max(100, e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const rightX = el.scrollLeft + el.clientWidth;
    setVisibleRightIdx(Math.max(0, Math.min(N - 1, Math.floor((rightX - PAD.l) / pointGap))));
  }, [pointGap, dim.w]);

  useEffect(() => {
    const el = scrollRef.current; if (!el || !handleZoom) return;
    const onWheel = e => { e.preventDefault(); handleZoom(e.deltaY, e.clientX, el); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  const syncRightIdx = useCallback((el) => {
    const rightX = el.scrollLeft + el.clientWidth;
    setVisibleRightIdx(Math.max(0, Math.min(N - 1, Math.floor((rightX - PAD.l) / pointGap))));
  }, [pointGap]);

  const handleMouseDown = e => {
    setIsDragging(true);
    const snaps = {};
    Object.entries(chartRefs.current).forEach(([k, n]) => { if (n) snaps[k] = n.scrollLeft; });
    dragData.current = { startX: e.clientX, snaps };
    setSharedHover(null);
    const onMove = ev => {
      ev.preventDefault();
      const dx = ev.clientX - dragData.current.startX;
      Object.entries(chartRefs.current).forEach(([k, n]) => {
        if (n && dragData.current.snaps[k] != null) { n.scrollLeft = dragData.current.snaps[k] - dx; syncRightIdx(n); }
      });
    };
    const onUp = () => {
      setIsDragging(false); dragData.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleMouseMove = e => {
    if (isDragging) return;
    setIsOnYAxis(false);
    const rect = scrollRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const idx = Math.max(0, Math.min(N - 1, Math.round((mx - PAD.l) / pointGap)));
    if (idx !== _sharedHover) setSharedHover(idx);
  };
  const handleMouseLeave = () => { if (!isDragging) setSharedHover(null); };

  const bodyH   = dim.h;
  const ys      = calcYScale(t1Data, idData);
  const lastIdx = Math.min(visibleRightIdx, N - 1);
  const svgW    = Math.max(dim.w - YAXIS_W, PAD.l + (N - 1) * pointGap);
  const zeroY   = normY(0, ys, bodyH);

  const yTicks = Array.from({ length: 7 }, (_, i) => {
    const v = ys.max - (i * (ys.max - ys.min)) / 6;
    return { y: normY(v, ys, bodyH), v };
  });

  const isHovering = hover !== null && !isDragging && !isOnYAxis && hover >= 0 && hover < N;
  const hoverX     = isHovering ? PAD.l + hover * pointGap : null;
  const hoverYT1   = isHovering && showT1 && t1Data ? normY(t1Data[hover], ys, bodyH) : null;
  const hoverYId   = isHovering && showId  && idData  ? normY(idData[hover],  ys, bodyH) : null;
  const lastT1Y    = normY(t1Data?.[lastIdx] ?? 0, ys, bodyH);
  const lastIdY    = normY(idData?.[lastIdx]  ?? 0, ys, bodyH);

  const endTags = [];
  if (showT1 && t1Data) endTags.push({ id:"t1", y:lastT1Y, val:t1Data[lastIdx]?.toFixed(0), label:"Flip T-1→T", color:C.t1, dark:C.t1d });
  if (showId  && idData) endTags.push({ id:"id", y:lastIdY, val:idData[lastIdx]?.toFixed(0),  label:"Intraday",   color:C.id,  dark:C.idd });
  endTags.sort((a, b) => a.y - b.y);
  if (endTags.length > 1) {
    const diff = endTags[1].y - endTags[0].y;
    if (diff < 26) { const ov = 26 - diff; endTags[0].y -= ov / 2; endTags[1].y += ov / 2; }
  }

  const avoidYs = [zeroY, ...endTags.map(t => t.y)];

  return (
    <div style={{
      flex: 1,
      background: C.panel,
      border: isExpanded ? "none" : `1px solid ${C.border}`,
      borderRadius: isExpanded ? 0 : 10,
      display: "flex", flexDirection: "column",
      overflow: "hidden", minHeight: 0,
      boxShadow: isExpanded ? "none" : "0 2px 16px rgba(0,0,0,0.5)",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: C.header,
        height: 42, padding: "0 10px 0 14px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {isExpanded && (
            <button onClick={onClose} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", background: "transparent",
              border: `1px solid rgba(255,255,255,0.09)`, borderRadius: 6,
              color: "#64748b", cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: "monospace",
              flexShrink: 0,
            }}>
              <IconBack /> Back
            </button>
          )}
          <span style={{
            color: "#e2e8f0", fontSize: 13, fontWeight: 800,
            letterSpacing: "0.10em",
            fontFamily: "'JetBrains Mono', monospace",
          }}>{title}</span>

          {/* ── Info Tooltip แทน button เดิม ── */}
          <InfoTooltip text={subtitle} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <IconBtn onClick={handleResetClick} title="Reset">
            <IconReset spinning={isResetting} />
          </IconBtn>
          {!isExpanded && (
            <IconBtn onClick={onExpand} title="Fullscreen">
              <IconExpand />
            </IconBtn>
          )}
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />
          <ToggleBtn active={showT1} color={C.t1} onClick={onToggleT1} label="Flip T-1→T" />
          <ToggleBtn active={showId}  color={C.id}  onClick={onToggleId}  label="Intraday" />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />
          <button
            onClick={onToggleLabels}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px 3px 8px", borderRadius: 99,
              border: `1px solid rgba(255,255,255,0.07)`,
              background: showLabels ? "rgba(255,255,255,0.05)" : "transparent",
              color: showLabels ? "#94a3b8" : C.mutedText,
              cursor: "pointer", fontSize: 11, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.03em", transition: "all .15s", flexShrink: 0,
            }}
          >
            <IconLabel />
            {showLabels ? "Hide labels" : "Show labels"}
          </button>
        </div>
      </div>

      {/* ── Chart Body ── */}
      <div
        ref={bodyRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          flex: 1, minHeight: 0, position: "relative",
          background: C.surface,
          cursor: isDragging ? "grabbing" : "crosshair",
          userSelect: "none",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: YAXIS_W, overflow: "hidden" }}>
          <div
            ref={scrollRef}
            onScroll={e => {
              const sl = e.target.scrollLeft;
              Object.values(chartRefs.current).forEach(n => {
                if (n && n !== e.target && Math.abs(n.scrollLeft - sl) > 1) n.scrollLeft = sl;
              });
              syncRightIdx(e.target);
            }}
            style={{
              width: "100%", height: "100%",
              overflowX: "auto", overflowY: "hidden",
              msOverflowStyle: "none", scrollbarWidth: "none",
              cursor: "inherit", userSelect: "none",
            }}
          >
            <style>{`@keyframes spin-once { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>

            <svg width={svgW} height={bodyH} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
              {yTicks.map(({ y }, i) => (
                <line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke={C.grid} strokeWidth={1} />
              ))}
              <line x1={0} y1={zeroY} x2={svgW} y2={zeroY} stroke={C.zero} strokeWidth={1} opacity={0.5} strokeDasharray="3 6" />
              <line x1={0} y1={bodyH - PAD.b} x2={svgW} y2={bodyH - PAD.b} stroke={C.axis} strokeWidth={1} />

              {TICK_LABELS.map((label, i) => {
                const dataIdx = i * 30;
                if (dataIdx >= N) return null;
                const x = PAD.l + dataIdx * pointGap;
                const isHour = label.endsWith(":00");
                return (
                  <g key={i}>
                    <line x1={x} y1={bodyH - PAD.b} x2={x} y2={bodyH - PAD.b + (isHour ? 6 : 4)} stroke={isHour ? C.axis : C.dimText} strokeWidth={1} />
                    {isHour && <text x={x} y={bodyH - PAD.b + 20} fill={C.mutedText} fontSize={9} fontFamily="monospace" textAnchor="middle" fontWeight="700">{label}</text>}
                    {!isHour && <text x={x} y={bodyH - PAD.b + 19} fill={C.dimText} fontSize={8.5} fontFamily="monospace" textAnchor="middle">{label}</text>}
                  </g>
                );
              })}

              {showT1 && t1Data && <path d={buildPath(t1Data, ys, bodyH, pointGap, smooth)} fill="none" stroke={C.t1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              {showId  && idData  && <path d={buildPath(idData,  ys, bodyH, pointGap, false)} fill="none" stroke={C.id}  strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              {showT1 && t1Data && <circle cx={PAD.l + lastIdx * pointGap} cy={lastT1Y} r={4} fill={C.t1} stroke={C.surface} strokeWidth={2} />}
              {showId  && idData  && <circle cx={PAD.l + lastIdx * pointGap} cy={lastIdY} r={4} fill={C.id}  stroke={C.surface} strokeWidth={2} />}
              {showT1 && <line x1={PAD.l + lastIdx * pointGap} y1={lastT1Y} x2={svgW} y2={lastT1Y} stroke={C.t1} strokeDasharray="2 5" strokeWidth={1} opacity={0.3} />}
              {showId  && <line x1={PAD.l + lastIdx * pointGap} y1={lastIdY} x2={svgW} y2={lastIdY} stroke={C.id}  strokeDasharray="2 5" strokeWidth={1} opacity={0.3} />}

              {isHovering && (
                <g>
                  <line x1={hoverX} y1={PAD.t} x2={hoverX} y2={bodyH - PAD.b} stroke={C.crosshair} strokeWidth={1} strokeDasharray="4 4" />
                  {hoverYT1 != null && showT1 && <>
                    <line x1={0} y1={hoverYT1} x2={svgW} y2={hoverYT1} stroke={C.crosshair} strokeWidth={1} />
                    <circle cx={hoverX} cy={hoverYT1} r={4.5} fill={C.t1} stroke={C.surface} strokeWidth={2} />
                  </>}
                  {hoverYId != null && showId && <>
                    <line x1={0} y1={hoverYId} x2={svgW} y2={hoverYId} stroke={C.crosshair} strokeWidth={1} />
                    <circle cx={hoverX} cy={hoverYId} r={4.5} fill={C.id} stroke={C.surface} strokeWidth={2} />
                  </>}
                  <g transform={`translate(${hoverX}, ${bodyH - PAD.b + 17})`}>
                    <rect x={-26} y={-9} width={52} height={18} rx={4} fill={C.header} stroke={C.borderHi} strokeWidth={1} />
                    <text x={0} y={0.5} fill="#e2e8f0" fontSize={9.5} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="700">
                      {TIME_LABELS[hover]}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Hover tooltip */}
        {isHovering && (
          <div style={{
            position: "absolute", top: 8, left: 10,
            background: "rgba(8,15,26,0.96)",
            border: `1px solid ${C.borderHi}`,
            borderRadius: 8, padding: "6px 10px",
            pointerEvents: "none", zIndex: 20,
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ color: C.bodyText, fontSize: 9.5, fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.06em" }}>
              {TIME_LABELS[hover]}
            </div>
            {showT1 && t1Data && (
              <div style={{ color: C.t1, fontSize: 12, fontWeight: 700, fontFamily: "monospace", lineHeight: 1.4 }}>
                Flip T-1→T&nbsp;&nbsp;{(t1Data[hover] >= 0 ? "+" : "") + t1Data[hover]?.toFixed(2)}
              </div>
            )}
            {showId && idData && (
              <div style={{ color: C.id, fontSize: 12, fontWeight: 700, fontFamily: "monospace", lineHeight: 1.4 }}>
                Intraday&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{(idData[hover] >= 0 ? "+" : "") + idData[hover]?.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Fixed Y-axis */}
        <div
          onMouseMove={e => { e.stopPropagation(); setIsOnYAxis(true); }}
          onMouseLeave={() => setIsOnYAxis(false)}
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute", right: 0, top: 0,
            width: YAXIS_W, height: "100%",
            pointerEvents: "auto", zIndex: 10,
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: C.tagBg,
            borderLeft: `1px solid rgba(255,255,255,0.05)`,
          }} />
          <svg width={YAXIS_W} height={bodyH} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            {yTicks.map(({ y, v }, i) => {
              if (avoidYs.some(ay => Math.abs(y - ay) < 14)) return null;
              return (
                <text key={i} x={YAXIS_W - 6} y={y} fill={C.mutedText} fontSize={9} fontFamily="monospace"
                  textAnchor="end" dominantBaseline="central">
                  {Math.round(v)}
                </text>
              );
            })}

            <g transform={`translate(4, ${zeroY - 9})`}>
              <rect width={YAXIS_W - 8} height={18} rx={3} fill={C.zeroglow} stroke={`${C.zero}40`} strokeWidth={1} />
              <text x={(YAXIS_W - 8) / 2} y={9} fill={C.zero} fontSize={9.5} fontFamily="monospace"
                textAnchor="middle" dominantBaseline="central" fontWeight="800">0</text>
            </g>

            {/* endTags — ตัวเลขแสดงเสมอ, ป้ายชื่อแสดงเฉพาะเมื่อ showLabels=true */}
            {endTags.map(({ id, y, val, label, color }) => {
              const LW = 52, VW = YAXIS_W - 6, TH = 20, r = 4;
              return (
                <g key={id}>
                  {/* ป้ายชื่อ — ซ่อนเมื่อ showLabels=false */}
                  {showLabels && (
                    <>
                      <rect x={-LW - 2} y={y - TH/2} width={LW} height={TH} rx={r} fill={color} />
                      <text x={-LW/2 - 2} y={y} fill="#000d1a" fontSize={8.5} fontWeight="800"
                        textAnchor="middle" dominantBaseline="central" fontFamily="monospace" letterSpacing="0.02em">
                        {label}
                      </text>
                    </>
                  )}
                  {/* ตัวเลขค่า — แสดงเสมอ */}
                  <rect x={3} y={y - TH/2} width={VW} height={TH} rx={r}
                    fill="transparent" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
                  <text x={3 + VW/2} y={y} fill={color} fontSize={11} fontWeight="700"
                    textAnchor="middle" dominantBaseline="central" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              );
            })}

            {isHovering && hoverYT1 != null && showT1 && (
              <g transform={`translate(2, ${hoverYT1 - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.t1}50`} strokeWidth={1} />
                <text x={(YAXIS_W - 4)/2} y={9} fill={C.t1} fontSize={10} fontFamily="monospace"
                  textAnchor="middle" dominantBaseline="central" fontWeight="700">
                  {t1Data[hover]?.toFixed(1)}
                </text>
              </g>
            )}
            {isHovering && hoverYId != null && showId && (
              <g transform={`translate(2, ${hoverYId - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.id}50`} strokeWidth={1} />
                <text x={(YAXIS_W - 4)/2} y={9} fill={C.id} fontSize={10} fontFamily="monospace"
                  textAnchor="middle" dominantBaseline="central" fontWeight="700">
                  {idData[hover]?.toFixed(1)}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Fullscreen Modal ─────────────────────────────────────────────────────────
function FullscreenModal({ panel, pointGap, handleZoom, chartRefs, onClose, panelState, onToggleT1, onToggleId, onToggleLabels, onReset }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: C.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ChartPanel
          chartId={`fs-${panel.key}`}
          title={panel.title}
          subtitle={panel.subtitle}
          t1Data={panel.t1}
          idData={panel.id}
          smooth={panel.smooth}
          pointGap={pointGap}
          handleZoom={handleZoom}
          chartRefs={chartRefs}
          isExpanded={true}
          onClose={onClose}
          onReset={onReset}
          showT1={panelState.showT1}
          showId={panelState.showId}
          showLabels={panelState.showLabels}
          onToggleT1={onToggleT1}
          onToggleId={onToggleId}
          onToggleLabels={onToggleLabels}
        />
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ symbol, onBack, onSymbolChange, symbolInput, setSymbolInput, onOpenInfo }) {
  const [dropOpen, setDropOpen] = useState(false);
  const SYMBOLS = ["PTT","AOT","CPALL","ADVANC","GULF","SCB","KBANK","TRUE","MINT","BDMS","BH","CPN","MAJOR","HANA","SCC"];

  return (
    <div style={{
      height: 48,
      background: C.navBg,
      borderBottom: `1px solid ${C.navBorder}`,
      display: "flex", alignItems: "center",
      padding: "0 14px", gap: 8,
      flexShrink: 0, zIndex: 100, position: "relative",
    }}>
      <ToolHint onViewDetails={onOpenInfo}>
        ---
      </ToolHint>

      {/* ← Back */}
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 12px", borderRadius: 7,
          border: `1px solid ${C.border}`,
          background: "transparent",
          color: "#64748b", cursor: "pointer",
          fontSize: 12, fontWeight: 600, fontFamily: "monospace",
          flexShrink: 0, transition: "all .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = C.border; }}
      >
        <IconBack /> back
      </button>

      {/* Symbol search */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#0a1422",
          border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "0 10px",
          height: 30, width: 180, cursor: "text",
        }}>
          <IconSearch />
          <input
            value={symbolInput}
            onChange={e => setSymbolInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && symbolInput) { onSymbolChange(symbolInput); setDropOpen(false); } }}
            placeholder="Type a Symbol..."
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 11, fontFamily: "monospace", fontWeight: 600,
              width: "100%", letterSpacing: "0.04em",
            }}
          />
          <button
            onClick={() => setDropOpen(v => !v)}
            style={{ background: "transparent", border: "none", color: C.mutedText, cursor: "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}
          >▼</button>
        </div>

        {dropOpen && (
          <div style={{
            position: "absolute", top: 34, left: 0, width: 180,
            background: "#0a1422",
            border: `1px solid rgba(255,255,255,0.10)`,
            borderRadius: 8, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            zIndex: 200,
          }}>
            {SYMBOLS.filter(s => s.includes(symbolInput)).map(s => (
              <div
                key={s}
                onClick={() => { onSymbolChange(s); setSymbolInput(s); setDropOpen(false); }}
                style={{
                  padding: "7px 12px", fontSize: 11,
                  fontFamily: "monospace", fontWeight: 600,
                  color: "#94a3b8", cursor: "pointer",
                  letterSpacing: "0.05em", transition: "background .1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#e2e8f0"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
              >{s}</div>
            ))}
          </div>
        )}
      </div>

      {/* Compare */}
      <button
        onClick={() => {
          const url = new URL(window.location.href);
          if (symbol) url.searchParams.set("symbol", symbol);
          window.open(url.toString(), "_blank");
        }}
        title="Open Compare in new tab"
        style={{
          width: 30, height: 30, borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: "transparent",
          color: C.mutedText, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all .15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#e2e8f0";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = C.mutedText;
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.background = "transparent";
        }}
      >
        <IconCompare />
      </button>

      {/* Symbol name — center */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.12em",
        }}>{symbol || "Symbol Name"}</span>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const PANEL_META = {
  set:     { subtitle: "STOCK EXCHANGE OF THAILAND" },
  mai:     { subtitle: "MARKET FOR ALTERNATIVE INVESTMENT" },
  warrant: { subtitle: "DERIVATIVES & WARRANTS" },
};

const DEFAULT_PANEL_STATE = { showT1: true, showId: true, showLabels: true };

export default function ChartFlipId() {
  const navigate = useNavigate();
  const location = useLocation();

  const chartRefs  = useRef({});
  const [mockData] = useState(() => generateMockData());
  const [pointGap,    setPointGap]   = useState(12);
  const [expandedKey, setExpandedKey] = useState(null);
  const [infoOpen,    setInfoOpen]   = useState(false);
  const initSymbol = location.state?.symbol || new URLSearchParams(location.search).get("symbol") || "";
  const [symbol,      setSymbol]     = useState(initSymbol);
  const [symbolInput, setSymbolInput] = useState(initSymbol);

  const [panelStates, setPanelStates] = useState({
    set:     { ...DEFAULT_PANEL_STATE },
    mai:     { ...DEFAULT_PANEL_STATE },
    warrant: { ...DEFAULT_PANEL_STATE },
  });

  const makeToggle = useCallback((key, field) => () => {
    setPanelStates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: !prev[key][field] },
    }));
  }, []);

  const handleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setPointGap(prev => {
      const factor = deltaY > 0 ? 0.85 : 1.18;
      const next   = Math.max(1, Math.min(30, prev * factor));
      if (Math.abs(next - prev) < 0.01) return prev;
      if (scrollEl) {
        const rect     = scrollEl.getBoundingClientRect();
        const cursorX  = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio    = next / prev;
        requestAnimationFrame(() => {
          Object.values(chartRefs.current).forEach(n => { if (n) n.scrollLeft = contentX * ratio - cursorX; });
        });
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    Object.values(chartRefs.current).forEach(n => { if (n) n.scrollLeft = n.scrollWidth; });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      Object.values(chartRefs.current).forEach(n => { if (n) n.scrollLeft = n.scrollWidth; });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const panels = [
    { key: "set",     title: "SET",     ...mockData.set,     ...PANEL_META.set     },
    { key: "mai",     title: "MAI",     ...mockData.mai,     ...PANEL_META.mai     },
    { key: "warrant", title: "WARRANT", ...mockData.warrant, ...PANEL_META.warrant },
  ];

  const expandedPanel = panels.find(p => p.key === expandedKey);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin-once { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        width: "100%", height: "100vh",
        background: C.bg, color: "#fff",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <Navbar
          symbol={symbol}
          onBack={() => {
            const from = location.state?.from;
            if (from) navigate(`/${from}`);
            else navigate(-1);
          }}
          onSymbolChange={setSymbol}
          symbolInput={symbolInput}
          setSymbolInput={setSymbolInput}
          onOpenInfo={() => setInfoOpen(true)}
        />

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          gap: 8, minHeight: 0, padding: "8px",
        }}>
          {panels.map(({ key, title, subtitle, t1, id, smooth }) => {
            const ps = panelStates[key];
            return (
              <ChartPanel
                key={key}
                chartId={key}
                title={title}
                subtitle={subtitle}
                t1Data={t1}
                idData={id}
                smooth={smooth}
                pointGap={pointGap}
                handleZoom={handleZoom}
                chartRefs={chartRefs}
                isExpanded={false}
                onExpand={() => setExpandedKey(key)}
                onReset={handleReset}
                showT1={ps.showT1}
                showId={ps.showId}
                showLabels={ps.showLabels}
                onToggleT1={makeToggle(key, "showT1")}
                onToggleId={makeToggle(key, "showId")}
                onToggleLabels={makeToggle(key, "showLabels")}
              />
            );
          })}
        </div>
      </div>

      {expandedPanel && (
        <FullscreenModal
          panel={expandedPanel}
          pointGap={pointGap}
          handleZoom={handleZoom}
          chartRefs={chartRefs}
          onClose={() => setExpandedKey(null)}
          onReset={handleReset}
          panelState={panelStates[expandedPanel.key]}
          onToggleT1={makeToggle(expandedPanel.key, "showT1")}
          onToggleId={makeToggle(expandedPanel.key, "showId")}
          onToggleLabels={makeToggle(expandedPanel.key, "showLabels")}
        />
      )}
    </>
  );
}