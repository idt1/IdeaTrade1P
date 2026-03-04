import React, { useState, useRef, useEffect, useCallback } from "react";

/* ── PRNG ── */
function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Generate dates ── */
function generateDates(n = 80) {
  const dates = [];
  const start = new Date("2025-01-11");
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 3);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    dates.push(`${dd}/${mm}/${yy}`);
  }
  return dates;
}
const DATES = generateDates(80);

/* ── Generate series ── */
function genSeries(seed, n, base, vol, trend = 0) {
  const rng = createRng(seed);
  let v = base;
  return Array.from({ length: n }, () => {
    v += (rng() - 0.5) * vol + trend;
    return parseFloat(Math.max(base * 0.5, Math.min(base * 2, v)).toFixed(2));
  });
}

function genStep(seed, n, levels) {
  const rng = createRng(seed);
  let cur = Math.floor(rng() * levels.length);
  return Array.from({ length: n }, () => {
    if (rng() < 0.15) cur = Math.max(0, Math.min(levels.length - 1, cur + (rng() < 0.5 ? 1 : -1)));
    return levels[cur];
  });
}

function genMultiLine(seed, n, count, bases, vol) {
  return bases.map((b, i) => genSeries(seed + i * 37, n, b, vol));
}

/* ── SVG path helpers ── */
function toPath(data, xs, ys, step = false) {
  if (!data.length) return "";
  let d = `M ${xs(0)} ${ys(data[0])}`;
  for (let i = 1; i < data.length; i++) {
    if (step) {
      d += ` L ${xs(i)} ${ys(data[i - 1])} L ${xs(i)} ${ys(data[i])}`;
    } else {
      const px = xs(i - 1), cx = xs(i);
      const cp1x = px + (cx - px) / 3, cp2x = px + (cx - px) * 2 / 3;
      d += ` C ${cp1x} ${ys(data[i - 1])} ${cp2x} ${ys(data[i])} ${cx} ${ys(data[i])}`;
    }
  }
  return d;
}

/* ── Chart Panel ── */
function ChartPanel({
  id, label, options, selectedOption, onOptionChange,
  datasets, colors, fills, step = false,
  sharedIdx, onHover, n = 80,
  showBadges = false,
  peak = false,
}) {
  const svgRef = useRef(null);
  const W = 700, H = 180;
  const PL = 8, PR = 52, PT = 20, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;

  const allVals = datasets.flat();
  const rawMin = Math.min(...allVals), rawMax = Math.max(...allVals);
  const range = rawMax - rawMin || 1;
  const yMin = rawMin - range * 0.08, yMax = rawMax + range * 0.08;

  const xs = i => PL + (i / (n - 1)) * cw;
  const ys = v => PT + (1 - (v - yMin) / (yMax - yMin)) * ch;

  // sparse x-axis labels
  const labelStep = Math.ceil(n / 12);
  const xLabels = DATES.slice(0, n).map((d, i) => i % labelStep === 0 ? { i, d } : null).filter(Boolean);

  // y-axis labels
  const yLabels = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * (yMax - yMin);
    return { y: ys(v), v: v.toFixed(2) };
  }).reverse();

  const hoverData = sharedIdx !== null ? datasets.map(d => d[sharedIdx]) : null;

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rx = (e.clientX - rect.left - PL) / cw;
    const idx = Math.max(0, Math.min(n - 1, Math.round(rx * (n - 1))));
    onHover(idx);
  }, [cw, n, onHover]);

  // peak fill area (chart4)
  const peakIdx = peak && datasets[0] ? datasets[0].indexOf(Math.max(...datasets[0])) : -1;

  return (
    <div className="relative bg-[#0d1117] border border-[#1e2a3a] rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <select
            value={selectedOption}
            onChange={e => onOptionChange(e.target.value)}
            className="bg-[#161d2a] border border-[#2a3a50] text-white text-xs px-2 py-1 rounded outline-none cursor-pointer"
          >
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <span className="text-[10px] text-[#3a5070] font-mono">{id}</span>
      </div>

      {/* SVG */}
      <div className="flex-1 relative" onMouseLeave={() => onHover(null)}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          style={{ cursor: "crosshair" }}
        >
          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <line key={i} x1={PL} y1={l.y} x2={W - PR} y2={l.y} stroke="#1a2535" strokeWidth="0.8" />
          ))}
          <line x1={PL} y1={PT + ch} x2={W - PR} y2={PT + ch} stroke="#2a3a50" strokeWidth="1" />

          {/* X labels */}
          {xLabels.map(({ i, d }) => (
            <text key={i} x={xs(i)} y={H - 4} fill="#3a5070" fontSize="7" textAnchor="middle">{d}</text>
          ))}

          {/* Y labels */}
          {yLabels.map((l, i) => (
            <text key={i} x={W - PR + 4} y={l.y} fill="#3a5070" fontSize="8" dominantBaseline="central">{l.v}</text>
          ))}

          {/* Datasets */}
          {datasets.map((data, di) => {
            const color = colors[di];
            const linePath = toPath(data, xs, ys, step);
            const lastX = xs(n - 1), lastY = ys(data[n - 1]);

            // area fill
            const areaPath = linePath + ` L ${xs(n - 1)} ${PT + ch} L ${PL} ${PT + ch} Z`;
            const gradId = `grad-${id}-${di}`;

            // peak shading
            let peakAreaPath = "";
            if (peak && di === 0 && peakIdx > 0) {
              const sub = data.slice(peakIdx);
              let pp = `M ${xs(peakIdx)} ${ys(data[peakIdx])}`;
              for (let i = 1; i < sub.length; i++) {
                const px = xs(peakIdx + i - 1), cx = xs(peakIdx + i);
                const cp1x = px + (cx - px) / 3, cp2x = px + (cx - px) * 2 / 3;
                pp += ` C ${cp1x} ${ys(sub[i - 1])} ${cp2x} ${ys(sub[i])} ${cx} ${ys(sub[i])}`;
              }
              pp += ` L ${xs(n - 1)} ${PT + ch} L ${xs(peakIdx)} ${PT + ch} Z`;
              peakAreaPath = pp;
            }

            return (
              <g key={di}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={fills ? "0.22" : "0"} />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                  {peak && di === 0 && (
                    <linearGradient id={`peak-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                  )}
                </defs>
                {fills && <path d={areaPath} fill={`url(#${gradId})`} />}
                {peak && di === 0 && peakAreaPath && (
                  <path d={peakAreaPath} fill={`url(#peak-${id})`} />
                )}
                <path d={linePath} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />

                {/* Last value badge */}
                {!showBadges && (
                  <g>
                    <rect x={W - PR + 2} y={lastY - 9} width={PR - 4} height={18} fill={color} rx="3" />
                    <text x={W - PR / 2} y={lastY} fill="#fff" fontSize="9" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                      {data[n - 1].toFixed(2)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover crosshair */}
          {sharedIdx !== null && (
            <g>
              <line x1={xs(sharedIdx)} y1={PT} x2={xs(sharedIdx)} y2={PT + ch} stroke="#4a6080" strokeWidth="0.8" strokeDasharray="3,2" />

              {/* Tooltip box */}
              {(() => {
                const bx = xs(sharedIdx);
                const boxW = 60, boxH = 14 + datasets.length * 14;
                const bLeft = bx - boxW / 2 < PL + 4;
                const bRight = bx + boxW / 2 > W - PR - 4;
                const tx = bLeft ? PL + 4 : bRight ? W - PR - boxW - 4 : bx - boxW / 2;
                const ty = PT + 4;
                return (
                  <g>
                    <rect x={tx} y={ty} width={boxW} height={boxH} fill="#0d1420" stroke="#2a3a50" strokeWidth="0.8" rx="3" />
                    <text x={tx + boxW / 2} y={ty + 10} fill="#8899aa" fontSize="8" textAnchor="middle">
                      {DATES[sharedIdx]}
                    </text>
                    {datasets.map((d, di) => (
                      <text key={di} x={tx + boxW / 2} y={ty + 22 + di * 14} fill={colors[di]} fontSize="9" textAnchor="middle" fontWeight="bold">
                        {d[sharedIdx]?.toFixed(2)}
                      </text>
                    ))}
                  </g>
                );
              })()}

              {/* Dots on lines */}
              {datasets.map((d, di) => (
                <g key={di}>
                  <circle cx={xs(sharedIdx)} cy={ys(d[sharedIdx])} r="3" fill={colors[di]} stroke="#0d1117" strokeWidth="1.5" />
                  {/* value tag on left of crosshair */}
                  <rect x={PL + 4} y={ys(d[sharedIdx]) - 10} width={36} height={20} fill={colors[di]} rx="3" />
                  <text x={PL + 22} y={ys(d[sharedIdx])} fill="#fff" fontSize="9" textAnchor="middle" dominantBaseline="central" fontWeight="bold">
                    {d[sharedIdx]?.toFixed(2)}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* Multi-line right badges */}
        {showBadges && (
          <div className="absolute right-0 top-0 h-full flex flex-col justify-around pr-1 py-4">
            {datasets.map((d, di) => (
              <div key={di} className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white text-right" style={{ backgroundColor: colors[di], minWidth: 36 }}>
                {sharedIdx !== null
                  ? (d[sharedIdx] >= 0 ? "+" : "") + d[sharedIdx]?.toFixed(2)
                  : (d[n - 1] >= 0 ? "+" : "") + d[n - 1]?.toFixed(2)
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function StockDashboard() {
  const [symbol, setSymbol] = useState("GULF");
  const [inputVal, setInputVal] = useState("GULF");
  const [sharedIdx, setSharedIdx] = useState(null);

  const [opts, setOpts] = useState({
    c1: "Last", c2: "%Short", c3: "PredictTrend", c4: "Peak", c5: "Shareholder", c6: "Manager",
  });

  const N = 80;
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  // Chart 1: single line blue, fill
  const c1data = [genSeries(seed + 1, N, 24, 0.4, 0.03)];

  // Chart 2: two lines orange + light blue, no fill
  const c2data = [
    genSeries(seed + 2, N, 18, 0.3, 0.01),
    genSeries(seed + 3, N, 20, 0.25, 0.005),
  ];

  // Chart 3: single orange line, fill
  const c3data = [genSeries(seed + 4, N, 32, 0.5, 0.04)];

  // Chart 4: single yellow line, peak area fill
  const c4data = [genSeries(seed + 5, N, 10, 0.8, 0.01)];

  // Chart 5: step red line
  const c5data = [genStep(seed + 6, N, [8.87, 8.89, 8.91, 8.95, 8.98, 9.01, 9.03])];

  // Chart 6: multi-line (5 lines)
  const c6bases = [5.82, 1.70, 0.57, -3.36, -6.72];
  const c6data = c6bases.map((b, i) => genSeries(seed + 10 + i, N, b, 0.1));
  const c6colors = ["#f97316", "#22c55e", "#06b6d4", "#3b82f6", "#eab308"];

  const handleHover = useCallback((idx) => setSharedIdx(idx), []);

  const handleSubmit = () => setSymbol(inputVal.toUpperCase());

  return (
    <div className="w-full min-h-screen bg-[#080d14] text-white p-4 font-mono">
      <style>{`
        select option { background: #161d2a; }
        input::placeholder { color: #3a5070; }
      `}</style>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex items-center bg-[#0d1420] border border-[#2a3a50] rounded px-3 py-1.5 w-56">
          <svg className="w-3.5 h-3.5 text-[#4a6080] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="bg-transparent outline-none text-white text-sm w-full"
            placeholder="Symbol..."
          />
          {inputVal && (
            <button onClick={() => { setInputVal(""); setSymbol(""); }} className="text-[#4a6080] hover:text-white ml-1">✕</button>
          )}
        </div>

        {/* Icon buttons */}
        {[
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>,
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>,
          <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>,
        ].map((path, i) => (
          <button key={i} className="bg-[#0d1420] border border-[#2a3a50] rounded p-1.5 hover:border-[#4a6080] transition">
            <svg className="w-4 h-4 text-[#4a6080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {path}
            </svg>
          </button>
        ))}
      </div>

      {/* 3×2 grid */}
      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateRows: "repeat(3, 220px)" }}>

        {/* Chart 1 — Last, blue fill */}
        <ChartPanel
          id="chart1" label="chart1"
          options={["Last","Open","High","Low","Volume"]}
          selectedOption={opts.c1} onOptionChange={v => setOpts(p => ({...p, c1: v}))}
          datasets={c1data} colors={["#4488dd"]} fills={true}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
        />

        {/* Chart 2 — %Short, two lines */}
        <ChartPanel
          id="chart2" label="chart2"
          options={["%Short","NetBuy","Foreign"]}
          selectedOption={opts.c2} onOptionChange={v => setOpts(p => ({...p, c2: v}))}
          datasets={c2data} colors={["#f97316","#60a5fa"]} fills={false}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
        />

        {/* Chart 3 — PredictTrend, orange fill */}
        <ChartPanel
          id="chart3" label="chart3"
          options={["PredictTrend","Trend","Signal"]}
          selectedOption={opts.c3} onOptionChange={v => setOpts(p => ({...p, c3: v}))}
          datasets={c3data} colors={["#f59e0b"]} fills={true}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
        />

        {/* Chart 4 — Peak, yellow peak area */}
        <ChartPanel
          id="chart4" label="chart4"
          options={["Peak","Valley","Range"]}
          selectedOption={opts.c4} onOptionChange={v => setOpts(p => ({...p, c4: v}))}
          datasets={c4data} colors={["#eab308"]} fills={false} peak={true}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
        />

        {/* Chart 5 — Shareholder, step red */}
        <ChartPanel
          id="chart5" label="chart5"
          options={["Shareholder","Insider","Institution"]}
          selectedOption={opts.c5} onOptionChange={v => setOpts(p => ({...p, c5: v}))}
          datasets={c5data} colors={["#ef4444"]} fills={false} step={true}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
        />

        {/* Chart 6 — Manager, multi-line with right badges */}
        <ChartPanel
          id="chart6" label="chart6"
          options={["Manager","Director","Fund"]}
          selectedOption={opts.c6} onOptionChange={v => setOpts(p => ({...p, c6: v}))}
          datasets={c6data} colors={c6colors} fills={false}
          sharedIdx={sharedIdx} onHover={handleHover} n={N}
          showBadges={true}
        />

      </div>
    </div>
  );
}