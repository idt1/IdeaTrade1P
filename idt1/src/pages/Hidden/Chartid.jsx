import React, { useState, useEffect, useRef, useCallback } from "react";

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

// ─── Design Tokens (RealFlow style) ──────────────────────────────────────────
const C = {
  bg:        "#0f172a",
  surface:   "#0f1e2e",
  panel:     "#1e293b",
  header:    "#0a1628",
  border:    "rgba(255,255,255,0.07)",
  borderHi:  "rgba(255,255,255,0.14)",
  grid:      "rgba(255,255,255,0.04)",
  axis:      "rgba(255,255,255,0.10)",
  dimText:   "#334155",
  mutedText: "#475569",
  bodyText:  "#94a3b8",
  t1:        "#34d399",
  t1d:       "#065f46",
  id:        "#fbbf24",
  idd:       "#78350f",
  zero:      "#6366f1",
  zeroglow:  "rgba(99,102,241,0.12)",
  crosshair: "rgba(255,255,255,0.18)",
  tagBg:     "#0c1828",
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

// ─── Toggle Button (RealFlow pill style) ──────────────────────────────────────
function ToggleBtn({ active, color, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px 4px 8px",
      borderRadius: 99,
      border: active ? `1px solid ${color}50` : `1px solid rgba(255,255,255,0.08)`,
      background: active ? `${color}15` : "transparent",
      color: active ? color : C.mutedText,
      cursor: "pointer",
      fontSize: 11, fontWeight: 700,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      letterSpacing: "0.04em",
      transition: "all .15s",
      flexShrink: 0,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: active ? color : C.dimText,
        flexShrink: 0,
        boxShadow: active ? `0 0 6px ${color}` : "none",
        transition: "all .15s",
      }} />
      {label}
    </button>
  );
}

// ─── Chart Panel ──────────────────────────────────────────────────────────────
function ChartPanel({ title, subtitle, t1Data, idData, smooth, pointGap, handleZoom, chartRefs, chartId, isExpanded, onExpand, onClose, showT1, showId, onToggleT1, onToggleId, onReset }) {
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

  const bodyH = dim.h;
  const ys    = calcYScale(t1Data, idData);
  const lastIdx = Math.min(visibleRightIdx, N - 1);
  const svgW  = Math.max(dim.w - YAXIS_W, PAD.l + (N - 1) * pointGap);
  const zeroY = normY(0, ys, bodyH);

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

  // End tags with collision avoidance
  const endTags = [];
  if (showT1 && t1Data) endTags.push({ id:"t1", y:lastT1Y, val:t1Data[lastIdx]?.toFixed(0), label:"T-1→T", color:C.t1, dark:C.t1d });
  if (showId  && idData)  endTags.push({ id:"id", y:lastIdY, val:idData[lastIdx]?.toFixed(0),  label:"ID",    color:C.id,  dark:C.idd });
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
      border: isExpanded ? "none" : `1px solid rgba(71,85,105,0.5)`,
      borderRadius: isExpanded ? 0 : 12,
      display: "flex", flexDirection: "column",
      overflow: "hidden", minHeight: 0,
      boxShadow: isExpanded ? "none" : "0 4px 24px rgba(0,0,0,0.4)",
      transition: "border-color .2s",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: C.header,
        height: 44, padding: "0 10px 0 14px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {isExpanded && (
            <button onClick={onClose} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", background: "transparent",
              border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6,
              color: "#94a3b8", cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: "monospace",
              flexShrink: 0,
            }}>
              <IconBack /> Back
            </button>
          )}
          <span style={{
            color: "#e2e8f0", fontSize: 14, fontWeight: 800,
            letterSpacing: "0.12em",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}>{title}</span>
          {subtitle && (
            <span style={{
              color: C.dimText, fontSize: 9, letterSpacing: "0.08em",
              fontFamily: "monospace", fontWeight: 600,
            }}>{subtitle}</span>
          )}
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <ToggleBtn active={showT1} color={C.t1} onClick={onToggleT1} label="Flip T-1→T" />
          <ToggleBtn active={showId}  color={C.id}  onClick={onToggleId}  label="Intraday" />
          <button onClick={handleResetClick}
            className="icon-btn" title="Reset"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: 7,
              color: C.mutedText, cursor: "pointer", flexShrink: 0,
            }}>
            <IconReset spinning={isResetting} />
          </button>
          {!isExpanded && (
            <button onClick={onExpand}
              className="icon-btn" title="Fullscreen"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, background: "transparent",
                border: `1px solid ${C.border}`, borderRadius: 7,
                color: C.mutedText, cursor: "pointer", flexShrink: 0,
              }}>
              <IconExpand />
            </button>
          )}
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
        {/* Scrollable SVG area */}
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
            <style>{`
              .chart-scroll-${chartId}::-webkit-scrollbar { display: none }
              @keyframes spin-once { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
              .icon-btn:hover { color: #fff !important; border-color: rgba(255,255,255,0.25) !important; background: rgba(255,255,255,0.05) !important; }
            `}</style>

            <svg className={`chart-scroll-${chartId}`} width={svgW} height={bodyH}
              style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>

              {/* Grid */}
              {yTicks.map(({ y }, i) => (
                <line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke={C.grid} strokeWidth={1} />
              ))}

              {/* Zero line */}
              <line x1={0} y1={zeroY} x2={svgW} y2={zeroY} stroke={C.zero} strokeWidth={1} opacity={0.55} strokeDasharray="3 6" />

              {/* Bottom axis */}
              <line x1={0} y1={bodyH - PAD.b} x2={svgW} y2={bodyH - PAD.b} stroke={C.axis} strokeWidth={1} />

              {/* Time ticks */}
              {TICK_LABELS.map((label, i) => {
                const dataIdx = i * 30;
                if (dataIdx >= N) return null;
                const x = PAD.l + dataIdx * pointGap;
                const isHour = label.endsWith(":00");
                return (
                  <g key={i}>
                    <line x1={x} y1={bodyH - PAD.b} x2={x} y2={bodyH - PAD.b + (isHour ? 6 : 4)} stroke={isHour ? C.axis : C.dimText} strokeWidth={1} />
                    {isHour && (
                      <text x={x} y={bodyH - PAD.b + 20} fill={C.mutedText} fontSize={9} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">
                        {label}
                      </text>
                    )}
                    {!isHour && (
                      <text x={x} y={bodyH - PAD.b + 19} fill={C.dimText} fontSize={8.5} fontFamily="'JetBrains Mono', monospace" textAnchor="middle">
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Lines */}
              {showT1 && t1Data && <path d={buildPath(t1Data, ys, bodyH, pointGap, smooth)} fill="none" stroke={C.t1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              {showId  && idData  && <path d={buildPath(idData,  ys, bodyH, pointGap, false)} fill="none" stroke={C.id}  strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}

              {/* End dots */}
              {showT1 && t1Data && <circle cx={PAD.l + lastIdx * pointGap} cy={lastT1Y} r={4} fill={C.t1} stroke={C.surface} strokeWidth={2} />}
              {showId  && idData  && <circle cx={PAD.l + lastIdx * pointGap} cy={lastIdY} r={4} fill={C.id}  stroke={C.surface} strokeWidth={2} />}

              {/* Trailing dashes */}
              {showT1 && <line x1={PAD.l + lastIdx * pointGap} y1={lastT1Y} x2={svgW} y2={lastT1Y} stroke={C.t1} strokeDasharray="2 5" strokeWidth={1} opacity={0.35} />}
              {showId  && <line x1={PAD.l + lastIdx * pointGap} y1={lastIdY} x2={svgW} y2={lastIdY} stroke={C.id}  strokeDasharray="2 5" strokeWidth={1} opacity={0.35} />}

              {/* Crosshair */}
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
                  {/* Time badge */}
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

        {/* Hover tooltip overlay */}
        {isHovering && (
          <div style={{
            position: "absolute", top: 8, left: 10,
            background: "rgba(14,26,42,0.95)",
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
                T-1→T&nbsp;&nbsp;{(t1Data[hover] >= 0 ? "+" : "") + t1Data[hover]?.toFixed(2)}
              </div>
            )}
            {showId && idData && (
              <div style={{ color: C.id, fontSize: 12, fontWeight: 700, fontFamily: "monospace", lineHeight: 1.4 }}>
                ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{(idData[hover] >= 0 ? "+" : "") + idData[hover]?.toFixed(2)}
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
            borderLeft: `1px solid rgba(255,255,255,0.06)`,
          }} />
          <svg width={YAXIS_W} height={bodyH} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            {/* Y ticks */}
            {yTicks.map(({ y, v }, i) => {
              if (avoidYs.some(ay => Math.abs(y - ay) < 14)) return null;
              return (
                <text key={i} x={YAXIS_W - 6} y={y} fill={C.mutedText} fontSize={9} fontFamily="monospace"
                  textAnchor="end" dominantBaseline="central">
                  {Math.round(v)}
                </text>
              );
            })}

            {/* Zero badge */}
            <g transform={`translate(4, ${zeroY - 9})`}>
              <rect width={YAXIS_W - 8} height={18} rx={3} fill={C.zeroglow} stroke={`${C.zero}45`} strokeWidth={1} />
              <text x={(YAXIS_W - 8) / 2} y={9} fill={C.zero} fontSize={9.5} fontFamily="monospace"
                textAnchor="middle" dominantBaseline="central" fontWeight="800">0</text>
            </g>

            {/* End tags (RealFlow style — label pill + value pill) */}
            {endTags.map(({ id, y, val, label, color, dark }) => {
              const LW = 44, VW = YAXIS_W - 6, TH = 20, r = 4;
              return (
                <g key={id}>
                  {/* Label pill floats left of axis */}
                  <rect x={-LW - 2} y={y - TH/2} width={LW} height={TH} rx={r} fill={color} />
                  <text x={-LW/2 - 2} y={y} fill="#000d1a" fontSize={9} fontWeight="800"
                    textAnchor="middle" dominantBaseline="central" fontFamily="monospace" letterSpacing="0.03em">
                    {label}
                  </text>
                  {/* Value pill inside axis */}
                  <rect x={3} y={y - TH/2} width={VW} height={TH} rx={r}
                    fill="transparent" stroke={color} strokeWidth="0.8" strokeOpacity="0.45" />
                  <text x={3 + VW/2} y={y} fill={color} fontSize={11} fontWeight="700"
                    textAnchor="middle" dominantBaseline="central" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Hover Y badges */}
            {isHovering && hoverYT1 != null && showT1 && (
              <g transform={`translate(2, ${hoverYT1 - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.t1}55`} strokeWidth={1} />
                <text x={(YAXIS_W - 4)/2} y={9} fill={C.t1} fontSize={10} fontFamily="monospace"
                  textAnchor="middle" dominantBaseline="central" fontWeight="700">
                  {t1Data[hover]?.toFixed(1)}
                </text>
              </g>
            )}
            {isHovering && hoverYId != null && showId && (
              <g transform={`translate(2, ${hoverYId - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.id}55`} strokeWidth={1} />
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

// ─── Fullscreen Modal ──────────────────────────────────────────────────────────
function FullscreenModal({ panel, pointGap, handleZoom, chartRefs, onClose, showT1, showId, onToggleT1, onToggleId, onReset }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#060d16",
      display: "flex", flexDirection: "column",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
          showT1={showT1}
          showId={showId}
          onToggleT1={onToggleT1}
          onToggleId={onToggleId}
        />
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

export default function ChartFlipId() {
  const chartRefs = useRef({});
  const [mockData]     = useState(() => generateMockData());
  const [pointGap,     setPointGap]    = useState(12);
  const [expandedKey,  setExpandedKey] = useState(null);
  const [showT1,       setShowT1]      = useState(true);
  const [showId,       setShowId]      = useState(true);

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
      `}</style>

      <div style={{
        width: "100%",
        height: "100vh",
        minHeight: 520,
        background: C.bg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        {/* Charts */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          gap: 10, minHeight: 0, padding: "10px 10px 10px 10px",
        }}>
          {panels.map(({ key, title, subtitle, t1, id, smooth }) => (
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
              showT1={showT1}
              showId={showId}
              onToggleT1={() => setShowT1(v => !v)}
              onToggleId={() => setShowId(v => !v)}
            />
          ))}
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
          showT1={showT1}
          showId={showId}
          onToggleT1={() => setShowT1(v => !v)}
          onToggleId={() => setShowId(v => !v)}
        />
      )}
    </>
  );
}