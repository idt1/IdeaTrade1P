// src/pages/Hidden/ChartFlipId.jsx
// Architecture: custom SVG + scroll container + wheel zoom + drag pan
// Labels ติดขอบขวา viewport เสมอ ผ่าน overlay SVG แยกชั้น
// ไม่ต้องติดตั้ง dependency เพิ่ม

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAD     = { l: 14, t: 14, b: 24 };
const YAXIS_W = 50;

// จุดข้อมูล: ทุก 1 นาที ตั้งแต่ 10:00 → 16:30 = 390 จุด
const N = 390;
const TIME_LABELS = Array.from({ length: N }, (_, i) => {
  const mins = 10 * 60 + i;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});
// X-axis tick labels (แสดงทุก 30 นาที)
const TICK_LABELS = Array.from({ length: 14 }, (_, i) => {
  const mins = 10 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

// ─── Colors ───────────────────────────────────────────────────────────────────
const GRN  = "#4ade80";
const YLW  = "#facc15";
const PUR  = "#a855f7";
const GRID = "#1e293b";

// ─── Mock data ────────────────────────────────────────────────────────────────
function randomWalk(length, start, volatility) {
  const arr = [start];
  for (let i = 1; i < length; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    arr.push(Math.round((arr[i - 1] + change) * 100) / 100);
  }
  return arr;
}
function clamp(arr, min, max) {
  return arr.map((v) => Math.max(min, Math.min(max, v)));
}
function generateMockData() {
  const r = () => Math.round((Math.random() - 0.5) * 20);
  return {
    set:     { t1: clamp(randomWalk(N, r(), 1.2), -30, 30), id: clamp(randomWalk(N, r(), 1.8), -40, 40), smooth: true  },
    mai:     { t1: clamp(randomWalk(N, r(), 0.5), -18, 18), id: clamp(randomWalk(N, r(), 0.6), -12, 12), smooth: false },
    warrant: { t1: clamp(randomWalk(N, r(), 0.2), -8,   8), id: clamp(randomWalk(N, r(), 0.2), -6,   6), smooth: false },
  };
}

// ─── Y-scale ──────────────────────────────────────────────────────────────────
function calcYScale(t1, id) {
  const all = [...t1, ...id];
  const mx  = Math.max(...all);
  const mn  = Math.min(...all);
  const r   = mx - mn || 1;
  return { max: mx + r * 0.22, min: mn - r * 0.22 };
}
function normY(v, ys, h) {
  return h - PAD.b - ((v - ys.min) / (ys.max - ys.min)) * (h - PAD.t - PAD.b);
}

// ─── SVG path builder ─────────────────────────────────────────────────────────
function buildPath(data, ys, h, gap, smooth) {
  const step = Math.max(1, Math.floor(1 / gap));
  return data.reduce((p, v, i) => {
    if (i % step !== 0 && i !== data.length - 1) return p;
    const x  = PAD.l + i * gap;
    const y  = normY(v, ys, h);
    if (p === "") return `M ${x},${y}`;
    if (!smooth) return `${p} L ${x},${y}`;
    const pi = Math.max(0, i - step);
    const px = PAD.l + pi * gap;
    const py = normY(data[pi], ys, h);
    return `${p} C ${px + (x - px) / 3},${py} ${px + (x - px) * 2 / 3},${y} ${x},${y}`;
  }, "");
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

// ─── Toggle button ────────────────────────────────────────────────────────────
const ToggleButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding:    "4px 12px",
      borderRadius: 6,
      fontSize:   10,
      fontWeight: "bold",
      fontFamily: "monospace",
      cursor:     "pointer",
      border:     active ? "none" : "1px solid rgba(34,211,238,0.32)",
      background: active ? "#22d3ee" : "rgba(34,211,238,0.1)",
      color:      active ? "#0f172a" : "#22d3ee",
      transition: "background .12s, color .12s",
    }}
  >
    {children}
  </button>
);

// ─── Shared hover ─────────────────────────────────────────────────────────────
let _sharedHover = null;
const _hoverListeners = new Set();
function setSharedHover(v) {
  _sharedHover = v;
  _hoverListeners.forEach((fn) => fn(v));
}

// ─── ChartPanel ───────────────────────────────────────────────────────────────
function ChartPanel({ title, t1Data, idData, smooth, height, pointGap, handleZoom, chartRefs, chartId, isExpanded, onExpand, onClose }) {
  const scrollRef = useRef(null);
  const [showT1,     setShowT1]     = useState(true);
  const [showId,     setShowId]     = useState(true);
  const [hover,      setHover]      = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragData = useRef(null);
  const mounted  = useRef(false);

  useEffect(() => {
    const fn = (v) => setHover(v);
    _hoverListeners.add(fn);
    return () => _hoverListeners.delete(fn);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    chartRefs.current[chartId] = el;
    if (!mounted.current) {
      mounted.current = true;
      requestAnimationFrame(() => {
        const siblings = Object.values(chartRefs.current).filter((n) => n && n !== el);
        el.scrollLeft = siblings.length ? siblings[0].scrollLeft : el.scrollWidth;
      });
    }
    return () => { delete chartRefs.current[chartId]; };
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      handleZoom(e.deltaY, e.clientX, el, (e.clientX - rect.left) / rect.width);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [handleZoom]);

  const syncScroll = useCallback((src) => {
    Object.values(chartRefs.current).forEach((node) => {
      if (node && node !== src && Math.abs(node.scrollLeft - src.scrollLeft) > 1)
        node.scrollLeft = src.scrollLeft;
    });
  }, [chartRefs]);

  const bodyH  = height - 44; 
  const ys     = calcYScale(t1Data, idData);
  const lastIdx = N - 1;
  const chartW  = PAD.l + lastIdx * pointGap + PAD.l + 8;
  const svgW    = chartW;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = ys.max - (i * (ys.max - ys.min)) / 4;
    return { y: normY(v, ys, bodyH), v };
  });

  const isHovering = hover !== null && !isDragging && hover >= 0 && hover < N;
  const hoverX     = isHovering ? PAD.l + hover * pointGap : null;
  const hoverYT1   = isHovering && showT1 ? normY(t1Data[hover], ys, bodyH) : null;
  const hoverYId   = isHovering && showId  ? normY(idData[hover],  ys, bodyH) : null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragData.current = { startX: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
    setSharedHover(null);
  };
  const handleMouseMove = (e) => {
    if (isDragging && dragData.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft = dragData.current.scrollLeft - (e.clientX - dragData.current.startX);
      syncScroll(scrollRef.current);
      return;
    }
    const rect = scrollRef.current.getBoundingClientRect();
    const mx   = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const idx  = Math.max(0, Math.min(N - 1, Math.round((mx - PAD.l) / pointGap)));
    if (idx !== _sharedHover) setSharedHover(idx);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
    dragData.current = null;
    setSharedHover(null);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    dragData.current = null;
  };

  return (
    <div style={{
      background: "#111827", border: isExpanded ? "none" : "1px solid rgba(100,116,139,0.3)",
      borderRadius: isExpanded ? 12 : 8, display: "flex", flexDirection: "column",
      overflow: "hidden", width: "100%", height,
      boxShadow: isExpanded ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "none",
    }}>
      {/* Header */}
      <div style={{
        background: "#0d1420", height: 48, padding: "0 12px",
        borderBottom: "1px solid rgba(100,116,139,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isExpanded && (
            <button onClick={onClose} style={{
              padding: "5px 12px", background: "#1e293b", color: "#e2e8f0",
              border: "1px solid #334155", borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6,
            }}>
              <BackIcon />
              ย้อนกลับ
            </button>
          )}
          <span style={{ color: "#e2e8f0", fontSize: isExpanded ? 14 : 12, fontWeight: "bold", letterSpacing: "0.05em", fontFamily: "monospace" }}>
            {title}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isExpanded && (
            <button onClick={onExpand} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }} title="ขยายเต็มจอ">
              <SearchIcon />
            </button>
          )}
          <ToggleButton active={showT1} onClick={() => setShowT1((v) => !v)}>T1 Line</ToggleButton>
          <ToggleButton active={showId} onClick={() => setShowId((v)  => !v)}>Intraday Line</ToggleButton>
        </div>
      </div>

      {/* Chart body */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#0d1420", overflow: "hidden" }}>
        <div
          ref={scrollRef}
          onScroll={(e) => { if (!isDragging) syncScroll(e.target); }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute", inset: 0,
            overflowX: "auto", overflowY: "hidden",
            msOverflowStyle: "none", scrollbarWidth: "none",
            cursor: isDragging ? "grabbing" : "crosshair",
            userSelect: "none",
          }}
        >
          <style>{`#sw-${chartId}::-webkit-scrollbar{display:none}`}</style>
          <svg id={`sw-${chartId}`} width={svgW} height={bodyH} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
            {yTicks.map(({ y }, i) => (
              <line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke={GRID} strokeWidth={1} />
            ))}
            <line x1={0} y1={normY(0, ys, bodyH)} x2={svgW} y2={normY(0, ys, bodyH)} stroke={PUR} strokeWidth={1} />
            <line x1={0} y1={bodyH - PAD.b} x2={svgW} y2={bodyH - PAD.b} stroke="#334155" strokeWidth={1.5} />

            {TICK_LABELS.map((label, i) => {
              const dataIdx = i * 30;
              if (dataIdx >= N) return null;
              const x = PAD.l + dataIdx * pointGap;
              return (
                <g key={i}>
                  <line x1={x} y1={bodyH - PAD.b} x2={x} y2={bodyH - PAD.b + 5} stroke="#334155" strokeWidth={1.5} />
                  <text x={x} y={bodyH - PAD.b + 16} fill="#64748b" fontSize={10} fontFamily="monospace" textAnchor="middle">{label}</text>
                </g>
              );
            })}

            {showT1 && <path d={buildPath(t1Data, ys, bodyH, pointGap, smooth)} fill="none" stroke={GRN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
            {showId && <path d={buildPath(idData, ys, bodyH, pointGap, false)} fill="none" stroke={YLW} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

            {showT1 && <circle cx={PAD.l + lastIdx * pointGap} cy={normY(t1Data[lastIdx], ys, bodyH)} r={4} fill={GRN} stroke="#0d1420" strokeWidth={2} />}
            {showId  && <circle cx={PAD.l + lastIdx * pointGap} cy={normY(idData[lastIdx],  ys, bodyH)} r={4} fill={YLW} stroke="#0d1420" strokeWidth={2} />}

            {isHovering && (
              <g>
                <line x1={hoverX} y1={PAD.t} x2={hoverX} y2={bodyH - PAD.b} stroke="#475569" strokeWidth={1} strokeDasharray="4 4" />
                {hoverYT1 != null && <line x1={0} y1={hoverYT1} x2={svgW} y2={hoverYT1} stroke="#475569" strokeWidth={1} strokeDasharray="4 4" />}
                {hoverYId  != null && <line x1={0} y1={hoverYId}  x2={svgW} y2={hoverYId}  stroke="#475569" strokeWidth={1} strokeDasharray="4 4" />}
                {hoverYT1 != null && <circle cx={hoverX} cy={hoverYT1} r={4.5} fill={GRN} stroke="#0d1420" strokeWidth={2} />}
                {hoverYId  != null && <circle cx={hoverX} cy={hoverYId}  r={4.5} fill={YLW} stroke="#0d1420" strokeWidth={2} />}
                
                <g transform={`translate(${hoverX}, ${bodyH - PAD.b + 14})`}>
                  <rect x={-34} y={-11} width={68} height={22} rx={4} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                  <text x={0} y={1} fill="#f8fafc" fontSize={10} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {TIME_LABELS[hover]}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Overlay Labels ขวา */}
        <svg style={{ position: "absolute", inset: 0, width: `calc(100% - ${YAXIS_W}px)`, height: "100%", pointerEvents: "none", zIndex: 5, overflow: "visible" }}>
          {showT1 && (() => {
            const y      = normY(t1Data[lastIdx], ys, bodyH);
            const valStr = t1Data[lastIdx].toFixed(0);
            const tagW   = 85; 
            const valW   = Math.max(30, valStr.length * 8 + 12);
            const totalW = tagW + 2 + valW + 6;
            return (
              <g style={{ transform: `translateX(calc(100% - ${totalW}px))` }}>
                <rect x={0} y={y - 11} width={tagW} height={22} rx={4} fill={GRN} />
                <text x={tagW / 2} y={y + 0.5} fontSize={10.5} fontWeight="bold" fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{"Flip T-1 -> T"}</text>
                <rect x={tagW + 2} y={y - 11} width={valW} height={22} rx={4} fill="#16a34a" />
                <text x={tagW + 2 + valW / 2} y={y + 0.5} fontSize={10.5} fontWeight="bold" fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{valStr}</text>
              </g>
            );
          })()}

          {showId && (() => {
            const y      = normY(idData[lastIdx], ys, bodyH);
            const valStr = idData[lastIdx].toFixed(0);
            const tagW   = 65;
            const valW   = Math.max(30, valStr.length * 8 + 12);
            const totalW = tagW + 2 + valW + 6;
            return (
              <g style={{ transform: `translateX(calc(100% - ${totalW}px))` }}>
                <rect x={0} y={y - 11} width={tagW} height={22} rx={4} fill={YLW} />
                <text x={tagW / 2} y={y + 0.5} fontSize={10.5} fontWeight="bold" fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">Intraday</text>
                <rect x={tagW + 2} y={y - 11} width={valW} height={22} rx={4} fill="#ca8a04" />
                <text x={tagW + 2 + valW / 2} y={y + 0.5} fontSize={10.5} fontWeight="bold" fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{valStr}</text>
              </g>
            );
          })()}
        </svg>

        {/* Right Y-axis Panel */}
        <div style={{ position: "absolute", right: 0, top: 0, width: YAXIS_W, height: "100%", background: "#0d1420", borderLeft: "1px solid rgba(51,65,85,0.45)", pointerEvents: "none", zIndex: 10 }}>
          <svg width={YAXIS_W} height={bodyH} style={{ display: "block" }}>
            {yTicks.map(({ y, v }, i) => (
              <text key={i} x={44} y={y} fill="#64748b" fontSize={10} fontFamily="monospace" textAnchor="end" dominantBaseline="central">{v.toFixed(0)}</text>
            ))}
            {isHovering && hoverYT1 != null && showT1 && (
              <g>
                <rect x={2} y={hoverYT1 - 11} width={46} height={22} rx={4} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                <text x={25} y={hoverYT1 + 0.5} fill="#f8fafc" fontSize={10} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{t1Data[hover]?.toFixed(0)}</text>
              </g>
            )}
            {isHovering && hoverYId != null && showId && (
              <g>
                <rect x={2} y={hoverYId - 11} width={46} height={22} rx={4} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                <text x={25} y={hoverYId + 0.5} fill="#f8fafc" fontSize={10} fontFamily="monospace" textAnchor="middle" dominantBaseline="central" fontWeight="bold">{idData[hover]?.toFixed(0)}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Fullscreen Modal Wrapper ─────────────────────────────────────────────────
function FullscreenModal({ panel, pointGap, handleZoom, chartRefs, onClose }) {
  const modalContainerRef = useRef(null);
  const [modalHeight, setModalHeight] = useState(500);

  // คำนวณความสูงให้เต็มพื้นที่จอ
  useEffect(() => {
    if (!modalContainerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setModalHeight(entry.contentRect.height);
      }
    });
    ro.observe(modalContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // กด ESC เพื่อปิด
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(11, 17, 26, 0.95)", backdropFilter: "blur(6px)",
      padding: "24px", display: "flex", flexDirection: "column"
    }}>
      <div ref={modalContainerRef} style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: 1600, margin: "0 auto" }}>
        {modalHeight > 100 && (
          <ChartPanel
            {...panel}
            chartId={`fs-${panel.key}`} // ID แยกเพื่อไม่ให้ตีกับกราฟข้างหลัง
            height={modalHeight}
            pointGap={pointGap}
            handleZoom={handleZoom}
            chartRefs={chartRefs}
            isExpanded={true}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ChartFlipId() {
  const containerRef = useRef(null);
  const chartRefs    = useRef({});
  const [chartHeight, setChartHeight] = useState(240);
  const [mockData]                    = useState(() => generateMockData());
  const [pointGap,    setPointGap]    = useState(12);
  const [expandedKey, setExpandedKey] = useState(null); // เก็บ state ว่ากราฟไหนดันเป็น Fullscreen

  const handleZoom = useCallback((deltaY, mouseClientX, scrollEl) => {
    setPointGap((prev) => {
      const factor = deltaY > 0 ? 0.85 : 1.18;
      const newGap = Math.max(1, Math.min(30, prev * factor));
      if (Math.abs(newGap - prev) < 0.01) return prev;
      if (scrollEl) {
        const rect     = scrollEl.getBoundingClientRect();
        const cursorX  = mouseClientX - rect.left;
        const contentX = scrollEl.scrollLeft + cursorX;
        const ratio    = newGap / prev;
        requestAnimationFrame(() => {
          Object.values(chartRefs.current).forEach((node) => {
            if (node) node.scrollLeft = contentX * ratio - cursorX;
          });
        });
      }
      return newGap;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Object.values(chartRefs.current).forEach((node) => {
        if (node) node.scrollLeft = node.scrollWidth;
      });
    }, 100); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const h = entry.contentRect.height;
        setChartHeight(Math.max(150, (h - 20) / 3)); 
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const panels = [
    { key: "set",     title: "SET",     ...mockData.set     },
    { key: "mai",     title: "MAI",     ...mockData.mai     },
    { key: "warrant", title: "WARRANT", ...mockData.warrant },
  ];

  const expandedPanel = panels.find(p => p.key === expandedKey);

  return (
    <div style={{
      width: "100%", height: "100vh", overflow: "hidden",
      background: "#0b111a", color: "#fff",
      display: "flex", flexDirection: "column",
    }}>
      <div
        ref={containerRef}
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 0, padding: 6 }}
      >
        {panels.map(({ key, title, t1, id, smooth }) => (
          <ChartPanel
            key={key}
            chartId={key}
            title={title}
            t1Data={t1}
            idData={id}
            smooth={smooth}
            height={chartHeight}
            pointGap={pointGap}
            handleZoom={handleZoom}
            chartRefs={chartRefs}
            isExpanded={false}
            onExpand={() => setExpandedKey(key)} // กดขยาย
          />
        ))}
      </div>

      {/* Popup Fullscreen Modal */}
      {expandedPanel && (
        <FullscreenModal
          panel={expandedPanel}
          pointGap={pointGap}
          handleZoom={handleZoom}
          chartRefs={chartRefs}
          onClose={() => setExpandedKey(null)} // ปิด popup (หรือกด ESC)
        />
      )}
    </div>
  );
}