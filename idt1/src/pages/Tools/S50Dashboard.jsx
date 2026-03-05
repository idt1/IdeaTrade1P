import { useEffect, useRef, useState } from "react";

// ── Data generators ──────────────────────────────────────────
const seed = (s) => {
  let x = s;
  return () => { x = (x * 1664525 + 1013904223) & 0xffffffff; return (x >>> 0) / 0xffffffff; };
};

const gen = (n, base, vol, trend = 0, seedN = 1) => {
  const r = seed(seedN);
  let v = base;
  return Array.from({ length: n }, () => {
    v += (r() - 0.48) * vol + trend;
    return parseFloat(v.toFixed(2));
  });
};

const N = 60;
const DATASETS = {
  "15m": {
    price:      gen(N, 862, 3,  0.5, 11),
    upStr:      gen(N, 47,  2,  0.05, 22),
    downStr:    gen(N, 44,  2,  0,    33),
    volFlow:    gen(N, 100.2, 0.3, 0.08, 44),
    midTrend:   gen(N, 1390, 5, -0.3, 55),
  },
  "1H": {
    price:      gen(N, 855, 4,  1.0, 12),
    upStr:      gen(N, 49,  3,  0.04, 23),
    downStr:    gen(N, 42,  3,  0,    34),
    volFlow:    gen(N, 100.4, 0.35, 0.09, 45),
    midTrend:   gen(N, 1395, 6, -0.4, 56),
  },
  "Day": {
    price:      gen(N, 850, 5,  1.8, 13),
    upStr:      gen(N, 48,  4,  0.05, 24),
    downStr:    gen(N, 43,  5,  0,    35),
    volFlow:    gen(N, 100.5, 0.4, 0.1, 46),
    midTrend:   gen(N, 1398, 8, -0.5, 57),
  },
  "Week": {
    price:      gen(N, 840, 7,  2.5, 14),
    upStr:      gen(N, 50,  5,  0.06, 25),
    downStr:    gen(N, 41,  6,  0,    36),
    volFlow:    gen(N, 100.6, 0.5, 0.12, 47),
    midTrend:   gen(N, 1405, 10, -0.6, 58),
  },
};

const makeDates = (n) => {
  const out = [];
  let d = new Date();
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6)
      out.unshift(`${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`);
    d.setDate(d.getDate() - 1);
  }
  return out;
};
const DATES = makeDates(N);

// ── Animated Line / Area Chart ────────────────────────────────
function Chart({ data, color, data2, color2, decimals = 0, animated = true }) {
  const [prog, setProg] = useState(animated ? 0 : 1);
  const raf = useRef(null);

  useEffect(() => {
    setProg(0);
    const start = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      setProg(p < 1 ? p : 1);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => { raf.current = requestAnimationFrame(tick); }, 120);
    return () => { clearTimeout(id); cancelAnimationFrame(raf.current); };
  }, [data, data2]);

  const W = 600, H = 180;
  const pad = { t: 10, r: 54, b: 26, l: 6 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  const all = data2 ? [...data, ...data2] : data;
  const lo = Math.min(...all) * 0.998;
  const hi = Math.max(...all) * 1.002;

  const xOf = (i, len) => pad.l + (i / (len - 1)) * iW;
  const yOf = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * iH;

  const visible = (arr) => arr.slice(0, Math.max(2, Math.round(arr.length * prog)));

  const linePath = (arr) =>
    visible(arr).map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i, arr.length).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

  const areaPath = (arr) => {
    const pts = visible(arr);
    const base = H - pad.b;
    return (
      `M${xOf(0, arr.length).toFixed(1)},${base} ` +
      pts.map((v, i) => `L${xOf(i, arr.length).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ") +
      ` L${xOf(pts.length - 1, arr.length).toFixed(1)},${base} Z`
    );
  };

  const gradId = `g${color.replace("#", "")}`;
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (i / 4) * (hi - lo)).reverse();
  const xStep = Math.floor(N / 5);
  const xIdxs = [0, xStep, xStep * 2, xStep * 3, xStep * 4, N - 1];

  const last = data[Math.round((data.length - 1) * prog)];
  const lastY = yOf(last);
  const lastX = xOf(Math.round((data.length - 1) * prog), data.length);
  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="85%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
        <clipPath id={`clip-${gradId}`}>
          <rect x={pad.l} y={pad.t} width={iW} height={iH + 1} />
        </clipPath>
      </defs>

      {/* grid */}
      {yTicks.map((v, i) => (
        <line key={i} x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}

      {/* area */}
      {!data2 && (
        <path d={areaPath(data)} fill={`url(#${gradId})`} clipPath={`url(#clip-${gradId})`} />
      )}

      {/* lines */}
      <path d={linePath(data)} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      {data2 && (
        <path d={linePath(data2)} fill="none" stroke={color2} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* live dot */}
      <circle cx={lastX} cy={lastY} r="3.5" fill={isUp ? "#22c55e" : "#ef4444"}
        stroke="#060a10" strokeWidth="1.5" />

      {/* last value badge */}
      <g transform={`translate(${W - pad.r + 3}, ${lastY})`}>
        <rect x="0" y="-9" width="46" height="18" rx="3"
          fill={isUp ? "#166534" : "#7f1d1d"} />
        <text x="23" y="4.5" textAnchor="middle" fill={isUp ? "#4ade80" : "#f87171"}
          fontSize="9.5" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          {decimals > 0 ? last?.toFixed(decimals) : Math.round(last ?? 0)}
        </text>
      </g>

      {/* y-axis labels */}
      {yTicks.map((v, i) => (
        <text key={i} x={W - pad.r + 4} y={yOf(v) + 3.5}
          fill="#374151" fontSize="8.5" fontFamily="'JetBrains Mono', monospace">
          {decimals > 0 ? v.toFixed(decimals) : Math.round(v)}
        </text>
      ))}

      {/* x-axis labels */}
      {xIdxs.map((idx) => {
        if (idx >= DATES.length) return null;
        return (
          <text key={idx} x={xOf(idx, data.length)} y={H - 4}
            textAnchor="middle" fill="#374151" fontSize="8"
            fontFamily="'JetBrains Mono', monospace">
            {DATES[idx]}
          </text>
        );
      })}
    </svg>
  );
}

// ── Panel ─────────────────────────────────────────────────────
function Panel({ num, title, subtitle, badge, children, delay = 0, isMobile = false }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, #0c1120 0%, #080d18 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding: isMobile ? "10px 10px 6px" : "11px 13px 8px",
      display: "flex", flexDirection: "column", gap: 4,
      position: "relative", overflow: "hidden",
      animation: `fadeUp 0.55s ease ${delay}s both`,
      height: isMobile ? 220 : "100%",
      boxSizing: "border-box",
    }}>
      {/* subtle grid texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, zIndex: 1, flexShrink: 0 }}>
        <span style={{ color: "#4b5563", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{num}.</span>
        <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" }}>
          {title}
        </span>
        {badge}
      </div>
      {subtitle && (
        <div style={{ color: "#374151", fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", zIndex: 1, flexShrink: 0 }}>
          {subtitle}
        </div>
      )}

      {/* chart area */}
      <div style={{ flex: 1, zIndex: 1, minHeight: 0, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 6, padding: "4px 14px", gap: 1,
    }}>
      <span style={{ color: "#4b5563", fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <span style={{ color, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function TradingDashboard() {
  const d = DATASETS["Day"];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{
      background: "#060a10",
      minHeight: "100vh",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: isMobile ? "12px 10px 24px" : "24px 16px 32px",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 1280,
        background: "#090e1a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: isMobile ? 10 : 14,
        overflow: "hidden",
        boxShadow: "0 48px 96px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset",
        animation: "fadeUp 0.4s ease both",
      }}>

        {/* ── Grid: 2 cols desktop / 1 col mobile ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gridTemplateRows: isMobile ? "auto" : "1fr 1fr",
          gap: isMobile ? 10 : 14,
          padding: isMobile ? "10px" : "14px",
          height: isMobile ? "auto" : 560,
        }}>

          {/* 1 — Last Price */}
          <Panel num="1" title="Last (SET50 Daily)" subtitle="Price Action & Moving Average" delay={0.05} isMobile={isMobile}>
            <Chart data={d.price} color="#4c8ef7" animated />
          </Panel>

          {/* 2 — Confirm Up/Down */}
          <Panel
            num="2" title="Confirm Up/Down S50"
            badge={
              <span style={{ fontSize: 9, color: "#4b5563", marginLeft: 4 }}>
                <span style={{ color: "#22c55e" }}>▪ Up</span>
                <span style={{ color: "#4b5563", margin: "0 4px" }}>vs</span>
                <span style={{ color: "#ef4444" }}>▪ Down</span>
              </span>
            }
            delay={0.12} isMobile={isMobile}
          >
            <Chart data={d.upStr} color="#22c55e" data2={d.downStr} color2="#ef4444" animated />
          </Panel>

          {/* 3 — Volume Flow */}
          <Panel num="3" title="Trend (Volume Flow)" subtitle="Accumulation / Distribution" delay={0.19} isMobile={isMobile}>
            <Chart data={d.volFlow} color="#f0c040" decimals={1} animated />
          </Panel>

          {/* 4 — Mid-Trend */}
          <Panel num="4" title="Mid-Trend (SET Context)" subtitle="Correlation with SET Index" delay={0.26} isMobile={isMobile}>
            <Chart data={d.midTrend} color="#c084fc" animated />
          </Panel>

        </div>
      </div>
    </div>
  );
}