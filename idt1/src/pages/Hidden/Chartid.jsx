import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAD     = { l: 14, t: 16, b: 28 };
const YAXIS_W = 56;
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
  bg:        "#080d13",
  surface:   "#0c1420",
  panel:     "#0f1929",
  header:    "#0a1220",
  border:    "rgba(255,255,255,0.06)",
  borderHi:  "rgba(255,255,255,0.12)",
  grid:      "rgba(255,255,255,0.04)",
  axis:      "rgba(255,255,255,0.08)",
  dimText:   "#3d5166",
  mutedText: "#526b85",
  bodyText:  "#8da5bd",
  t1:        "#34d399",
  t1d:       "#059669",
  t1glow:    "rgba(52,211,153,0.25)",
  id:        "#fbbf24",
  idd:       "#d97706",
  idglow:    "rgba(251,191,36,0.25)",
  zero:      "#6366f1",
  zeroglow:  "rgba(99,102,241,0.15)",
  crosshair: "rgba(255,255,255,0.15)",
  accent:    "#38bdf8",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
function randomWalk(length, start, volatility) {
  const arr = [start];
  for (let i = 1; i < length; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    arr.push(Math.round((arr[i - 1] + change) * 100) / 100);
  }
  return arr;
}
function clamp(arr, min, max) { return arr.map(v => Math.max(min, Math.min(max, v))); }
function generateMockData() {
  const r = () => Math.round((Math.random() - 0.5) * 20);
  return {
    set:     { t1: clamp(randomWalk(N, r(), 1.2), -30, 30), id: clamp(randomWalk(N, r(), 1.8), -40, 40), smooth: true  },
    mai:     { t1: clamp(randomWalk(N, r(), 0.5), -18, 18), id: clamp(randomWalk(N, r(), 0.6), -12, 12), smooth: false },
    warrant: { t1: clamp(randomWalk(N, r(), 0.2), -8,   8), id: clamp(randomWalk(N, r(), 0.2), -6,   6), smooth: false },
  };
}
function calcYScale(t1, id) {
  if (!t1 || !id) return { max: 10, min: -10 };
  const all = [...t1, ...id];
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

// ─── Shared Hover State ────────────────────────────────────────────────────────
// FIX Bug 2: expose subscribe/unsubscribe so ChartPanels can register their setHover
let _sharedHover = null;
const _hoverListeners = new Set();
function setSharedHover(v) {
  _sharedHover = v;
  _hoverListeners.forEach(fn => fn(v));
}
function subscribeHover(fn) {
  _hoverListeners.add(fn);
  return () => _hoverListeners.delete(fn);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="22" y2="22"/>
  </svg>
);
const IconReset = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? "spin 0.5s linear" : "none", transformOrigin: "center" }}>
    <polyline points="13 17 18 17 18 12"/>
    <path d="M18 17 A7 7 0 1 0 6 12"/>
  </svg>
);
const IconBack = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

// ─── Toggle Button ────────────────────────────────────────────────────────────
function ToggleBtn({ active, color, glow, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 10px 5px 8px",
      borderRadius: 6,
      border: active ? `1px solid ${color}40` : `1px solid ${C.border}`,
      background: active ? `${color}12` : "transparent",
      color: active ? color : C.mutedText,
      cursor: "pointer",
      fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      letterSpacing: "0.04em",
      transition: "all .15s ease",
      boxShadow: "none",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: active ? color : C.dimText,
        flexShrink: 0,
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
  const [dim, setDim]               = useState({ w: 800, h: 200 });
  const [visibleRightIdx, setVisibleRightIdx] = useState(N - 1);
  const [isResetting, setIsResetting] = useState(false);
  const dragData = useRef(null);

  const handleResetClick = () => {
    setIsResetting(true);
    onReset();
    setTimeout(() => setIsResetting(false), 500);
  };

  // FIX Bug 2: Subscribe this panel's setHover to the shared hover system
  useEffect(() => {
    const unsub = subscribeHover(setHover);
    return unsub;
  }, []);

  // FIX Bug 3: Register this panel's scroll element in the shared chartRefs map
  useEffect(() => {
    if (scrollRef.current) {
      chartRefs.current[chartId] = scrollRef.current;
    }
    return () => {
      delete chartRefs.current[chartId];
    };
  }, [chartId, chartRefs]);

  // Detect resize via bodyRef
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (let e of entries) setDim({ w: e.contentRect.width, h: Math.max(100, e.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Update visibleRightIdx on zoom or resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const rightX = el.scrollLeft + el.clientWidth;
    let idx = Math.floor((rightX - PAD.l) / pointGap);
    setVisibleRightIdx(Math.max(0, Math.min(N - 1, idx)));
  }, [pointGap, dim.w]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = e => { e.preventDefault(); handleZoom(e.deltaY, e.clientX, el); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  // Prevent the scroll container from drifting during mouse-drag
  // (wheel zoom is handled above; this blocks accidental scroll on trackpads mid-drag)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const blockScroll = e => { if (isDragging) e.preventDefault(); };
    el.addEventListener("scroll", blockScroll, { passive: false });
    return () => el.removeEventListener("scroll", blockScroll);
  }, [isDragging]);

  const bodyH   = dim.h;
  const ys      = calcYScale(t1Data, idData);
  const lastIdx = visibleRightIdx;
  const scrollAreaW = Math.max(0, dim.w - YAXIS_W);
  // Bug A fix: SVG must always be wide enough to cover ALL N points,
  // not just up to visibleRightIdx — otherwise there's nothing to scroll into.
  const svgW    = Math.max(scrollAreaW, PAD.l + (N - 1) * pointGap);

  const yTicks = Array.from({ length: 7 }, (_, i) => {
    const v = ys.max - (i * (ys.max - ys.min)) / 6;
    return { y: normY(v, ys, bodyH), v };
  });

  const isHovering = hover !== null && !isDragging && !isOnYAxis && hover >= 0 && hover < N;
  const hoverX     = isHovering ? PAD.l + hover * pointGap : null;
  const hoverYT1   = isHovering && showT1 && t1Data ? normY(t1Data[hover], ys, bodyH) : null;
  const hoverYId   = isHovering && showId && idData  ? normY(idData[hover],  ys, bodyH) : null;

  const lastT1Y = normY(t1Data[lastIdx], ys, bodyH);
  const lastIdY = normY(idData[lastIdx], ys, bodyH);

  // End tags with collision avoidance
  const endTags = [];
  if (showT1) endTags.push({ id: "t1", y: lastT1Y, val: t1Data[lastIdx].toFixed(0), label: "T-1→T", color: C.t1, colorDark: C.t1d });
  if (showId)  endTags.push({ id: "id", y: lastIdY, val: idData[lastIdx].toFixed(0), label: "ID",    color: C.id, colorDark: C.idd });
  endTags.sort((a, b) => a.y - b.y);
  if (endTags.length > 1) {
    const diff = endTags[1].y - endTags[0].y;
    if (diff < 28) { const overlap = 28 - diff; endTags[0].y -= overlap / 2; endTags[1].y += overlap / 2; }
  }

  const zeroY = normY(0, ys, bodyH);
  const avoidYs = [zeroY, ...endTags.map(t => t.y)];
  if (hoverYT1 != null) avoidYs.push(hoverYT1);
  if (hoverYId != null) avoidYs.push(hoverYId);

  // FIX Bug 4: helper to sync visibleRightIdx on any scroll, including programmatic drags
  const syncRightIdx = useCallback((scrollEl) => {
    const rightX = scrollEl.scrollLeft + scrollEl.clientWidth;
    let idx = Math.floor((rightX - PAD.l) / pointGap);
    setVisibleRightIdx(Math.max(0, Math.min(N - 1, idx)));
  }, [pointGap]);

  const handleMouseDown = e => {
    setIsDragging(true);
    const allScrollLefts = {};
    Object.entries(chartRefs.current).forEach(([k, node]) => {
      if (node) allScrollLefts[k] = node.scrollLeft;
    });
    dragData.current = { startX: e.clientX, allScrollLefts };
    setSharedHover(null);

    const onMove = ev => {
      ev.preventDefault();
      const dx = ev.clientX - dragData.current.startX;
      Object.entries(chartRefs.current).forEach(([k, node]) => {
        if (node && dragData.current.allScrollLefts[k] != null) {
          node.scrollLeft = dragData.current.allScrollLefts[k] - dx;
          // FIX Bug 4: sync each chart's rightIdx during drag, not just the one that fired onScroll
          syncRightIdx(node);
        }
      });
    };
    const onUp = () => {
      setIsDragging(false);
      dragData.current = null;
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
    const mx   = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const idx  = Math.max(0, Math.min(N - 1, Math.round((mx - PAD.l) / pointGap)));
    if (idx !== _sharedHover) setSharedHover(idx);
  };
  const handleMouseLeave = () => { if (!isDragging) setSharedHover(null); };

  const t1Val = isHovering && t1Data ? t1Data[hover] : null;
  const idVal = isHovering && idData  ? idData[hover]  : null;
  const t1Pos = t1Val !== null ? (t1Val >= 0 ? "+" : "") + t1Val.toFixed(2) : null;
  const idPos = idVal !== null ? (idVal >= 0 ? "+" : "") + idVal.toFixed(2) : null;

  return (
    <div style={{
      flex: 1,
      background: C.panel,
      border: isExpanded ? "none" : `1px solid ${C.border}`,
      borderRadius: isExpanded ? 0 : 10,
      display: "flex", flexDirection: "column",
      overflow: "hidden", minHeight: 0,
      position: "relative",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: C.header,
        height: 44,
        padding: "0 12px 0 16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {isExpanded && (
            <button onClick={onClose} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", background: "transparent",
              color: "#ffffff", border: `1px solid ${C.borderHi}`,
              borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all .15s",
            }}>
              <IconBack /> Back
            </button>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{
              color: "#dce9f5", fontSize: 13, fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace",
            }}>{title}</span>
            {subtitle && (
              <span style={{ color: C.dimText, fontSize: 9, letterSpacing: "0.06em", fontFamily: "monospace" }}>{subtitle}</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={handleResetClick} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28,
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.mutedText, cursor: "pointer",
            transition: "all .15s",
          }}>
            <IconReset spinning={isResetting} />
          </button>
          {!isExpanded && (
            <button onClick={onExpand} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28,
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.mutedText, cursor: "pointer",
              transition: "all .15s",
            }}>
              <IconExpand />
            </button>
          )}

          <ToggleBtn active={showT1} color={C.t1} glow={C.t1glow} onClick={onToggleT1} label="Flip T-1→T" />
          <ToggleBtn active={showId}  color={C.id}  glow={C.idglow}  onClick={onToggleId}  label="Intraday" />
        </div>
      </div>

      {/* ── Chart Body ── */}
      <div
        ref={bodyRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          flex: 1, minHeight: 0, position: "relative", background: C.surface,
          cursor: isDragging ? "grabbing" : "crosshair",
          userSelect: "none",
        }}
      >
        {/* Scrollable chart layer */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, right: YAXIS_W,
          overflow: "hidden",
        }}>
          <div
            ref={scrollRef}
            onScroll={e => {
              const sl = e.target.scrollLeft;
              // Sync sibling charts
              Object.values(chartRefs.current).forEach(node => {
                if (node && node !== e.target && Math.abs(node.scrollLeft - sl) > 1)
                  node.scrollLeft = sl;
              });
              syncRightIdx(e.target);
            }}
            style={{
              width: "100%", height: "100%",
              overflowX: "auto", overflowY: "hidden",
              msOverflowStyle: "none", scrollbarWidth: "none",
              cursor: "inherit",
              userSelect: "none",
            }}
          >
            <style>{`
              #sw-${chartId}::-webkit-scrollbar { display: none }
              @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
            `}</style>

            <svg id={`sw-${chartId}`} width={svgW} height={bodyH} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
              {/* Grid lines */}
              {yTicks.map(({ y }, i) => (
                <line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke={C.grid} strokeWidth={1} />
              ))}

              {/* Zero line */}
              <line x1={0} y1={zeroY} x2={svgW} y2={zeroY} stroke={C.zero} strokeWidth={1} opacity={0.6} />

              {/* Bottom axis */}
              <line x1={0} y1={bodyH - PAD.b} x2={svgW} y2={bodyH - PAD.b} stroke={C.axis} strokeWidth={1} />

              {/* Time ticks */}
              {TICK_LABELS.map((label, i) => {
                const dataIdx = i * 30;
                if (dataIdx >= N) return null;
                const x = PAD.l + dataIdx * pointGap;
                return (
                  <g key={i}>
                    <line x1={x} y1={bodyH - PAD.b} x2={x} y2={bodyH - PAD.b + 4} stroke={C.axis} strokeWidth={1} />
                    <text x={x} y={bodyH - PAD.b + 17} fill={C.dimText} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" textAnchor="middle">{label}</text>
                  </g>
                );
              })}

              {/* Main lines */}
              {showT1 && <path d={buildPath(t1Data, ys, bodyH, pointGap, smooth)} fill="none" stroke={C.t1} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
              {showId  && <path d={buildPath(idData,  ys, bodyH, pointGap, false)} fill="none" stroke={C.id}  strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}

              {/* End dots */}
              {showT1 && <circle cx={PAD.l + lastIdx * pointGap} cy={lastT1Y} r={3.5} fill={C.t1} stroke={C.surface} strokeWidth={2} />}
              {showId  && <circle cx={PAD.l + lastIdx * pointGap} cy={lastIdY} r={3.5} fill={C.id}  stroke={C.surface} strokeWidth={2} />}

              {/* Trailing dashes */}
              {showT1 && <line x1={PAD.l + lastIdx * pointGap} y1={lastT1Y} x2={svgW} y2={lastT1Y} stroke={C.t1} strokeDasharray="2 4" strokeWidth={1} opacity={0.4} />}
              {showId  && <line x1={PAD.l + lastIdx * pointGap} y1={lastIdY} x2={svgW} y2={lastIdY} stroke={C.id}  strokeDasharray="2 4" strokeWidth={1} opacity={0.4} />}

              {/* Hover Crosshair */}
              {isHovering && (
                <g>
                  <line x1={hoverX} y1={PAD.t} x2={hoverX} y2={bodyH - PAD.b} stroke={C.crosshair} strokeWidth={1} />

                  {hoverYT1 != null && showT1 && (
                    <g>
                      <line x1={0} y1={hoverYT1} x2={svgW} y2={hoverYT1} stroke={C.crosshair} strokeWidth={1} />
                      <circle cx={hoverX} cy={hoverYT1} r={4} fill={C.t1} stroke={C.surface} strokeWidth={2} />
                    </g>
                  )}
                  {hoverYId != null && showId && (
                    <g>
                      <line x1={0} y1={hoverYId} x2={svgW} y2={hoverYId} stroke={C.crosshair} strokeWidth={1} />
                      <circle cx={hoverX} cy={hoverYId} r={4} fill={C.id} stroke={C.surface} strokeWidth={2} />
                    </g>
                  )}

                  {/* Time label on axis */}
                  <g transform={`translate(${hoverX}, ${bodyH - PAD.b + 16})`}>
                    <rect x={-28} y={-9} width={56} height={18} rx={4} fill={C.header} stroke={C.borderHi} strokeWidth={1} />
                    <text x={0} y={0.5} fill="#dce9f5" fontSize={9.5} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                      {TIME_LABELS[hover]}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Fixed Y-axis layer */}
        <div
          onMouseMove={e => { e.stopPropagation(); setIsOnYAxis(true); }}
          onMouseLeave={() => { setIsOnYAxis(false); }}
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute", right: 0, top: 0, width: YAXIS_W, height: "100%",
            pointerEvents: "auto", zIndex: 10,
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: C.surface,
            borderLeft: `1px solid ${C.border}`,
          }} />

          <svg width={YAXIS_W} height={bodyH} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            {/* Y Tick labels */}
            {yTicks.map(({ y, v }, i) => {
              const isOverlapping = avoidYs.some(ay => Math.abs(y - ay) < 16);
              if (isOverlapping) return null;
              return (
                <text key={i} x={YAXIS_W - 6} y={y} fill={C.dimText} fontSize={9.5} fontFamily="monospace" textAnchor="end" dominantBaseline="central">
                  {Math.round(v)}
                </text>
              );
            })}

            {/* Zero badge */}
            <g transform={`translate(4, ${zeroY - 9})`}>
              <rect width={YAXIS_W - 8} height={18} rx={3} fill={C.zeroglow} stroke={`${C.zero}50`} strokeWidth={1} />
              <text x={(YAXIS_W - 8) / 2} y={9} fill={C.zero} fontSize={9.5} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">0</text>
            </g>

            {/* End tags */}
            {endTags.map(({ id, y, val, label, color, colorDark }) => (
              <g key={id} transform={`translate(0, ${y})`}>
                <rect x={-54} y={-10} width={54} height={20} rx={4} fill={colorDark} />
                <text x={-27} y={0.5} fontSize={9} fontWeight={800} fill="#000d1a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace" letterSpacing="0.04em">{label}</text>
                <rect x={2} y={-10} width={YAXIS_W - 4} height={20} rx={4} fill={color} />
                <text x={YAXIS_W / 2 + 1} y={0.5} fontSize={10.5} fontWeight={800} fill="#000d1a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{val}</text>
              </g>
            ))}

            {/* Hover Y badges */}
            {isHovering && hoverYT1 != null && showT1 && (
              <g transform={`translate(2, ${hoverYT1 - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.t1}60`} strokeWidth={1} />
                <text x={(YAXIS_W - 4) / 2} y={9} fill={C.t1} fontSize={10} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{t1Data[hover]?.toFixed(0)}</text>
              </g>
            )}
            {isHovering && hoverYId != null && showId && (
              <g transform={`translate(2, ${hoverYId - 9})`}>
                <rect width={YAXIS_W - 4} height={18} rx={3} fill={C.header} stroke={`${C.id}60`} strokeWidth={1} />
                <text x={(YAXIS_W - 4) / 2} y={9} fill={C.id} fontSize={10} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{idData[hover]?.toFixed(0)}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Fullscreen Modal ──────────────────────────────────────────────────────────
// FIX Bug 1: Don't spread the entire panel object. Pass t1Data/idData explicitly
// to avoid collisions between panel.t1/id and ChartPanel's t1Data/idData props.
function FullscreenModal({ panel, pointGap, handleZoom, chartRefs, onClose, showT1, showId, onToggleT1, onToggleId, onReset }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(4,8,16,0.92)", backdropFilter: "blur(8px) saturate(0.8)",
      display: "flex", flexDirection: "column", padding: 20,
    }}>
      <div style={{ flex: 1, display: "flex", width: "100%", maxWidth: 1600, margin: "0 auto", minHeight: 0 }}>
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
  const [mockData]                    = useState(() => generateMockData());
  const [pointGap,    setPointGap]    = useState(12);
  const [expandedKey, setExpandedKey] = useState(null);
  const [showT1,      setShowT1]      = useState(true);
  const [showId,      setShowId]      = useState(true);

  const handleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setPointGap(prev => {
      const factor = deltaY > 0 ? 0.85 : 1.18;
      const newGap = Math.max(1, Math.min(30, prev * factor));
      if (Math.abs(newGap - prev) < 0.01) return prev;
      if (scrollEl) {
        const rect    = scrollEl.getBoundingClientRect();
        const cursorX = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio   = newGap / prev;
        requestAnimationFrame(() => {
          Object.values(chartRefs.current).forEach(node => {
            if (node) node.scrollLeft = contentX * ratio - cursorX;
          });
        });
      }
      return newGap;
    });
  }, []);

  const handleReset = useCallback(() => {
    Object.values(chartRefs.current).forEach(node => {
      if (node) node.scrollLeft = node.scrollWidth;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Object.values(chartRefs.current).forEach(node => { if (node) node.scrollLeft = node.scrollWidth; });
    }, 100);
    return () => clearTimeout(timer);
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
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.25 } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        width: "100%",
        height: "calc(100vh - 80px)",
        minHeight: 520,
        background: C.bg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          gap: 20, minHeight: 0, padding: "16px 8px 8px 8px",
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