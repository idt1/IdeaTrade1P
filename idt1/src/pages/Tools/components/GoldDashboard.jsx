// src/pages/tools/components/GoldDashboard.jsx
import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  CartesianGrid, Tooltip,
} from "recharts";

/* ─────────────────────────────────────────────
   WAVE GENERATOR (deterministic)
───────────────────────────────────────────── */
function seededRand(seed, i, salt = 0) {
  const x = Math.sin(seed * 9301 + i * 49297 + salt * 233) * 803.5453;
  return x - Math.floor(x);
}
function smoothNoise(seed, i, scale = 4) {
  const i0 = Math.floor(i / scale) * scale;
  const i1 = i0 + scale;
  const t = (i - i0) / scale;
  const s = t * t * (3 - 2 * t);
  const a = (seededRand(seed, i0) - 0.5) * 2;
  const b = (seededRand(seed, i1) - 0.5) * 2;
  return a * (1 - s) + b * s;
}
function generateWave(cfg, n) {
  const { s, dr, ns, mn, mx, key } = cfg;
  const range = mx - mn;
  const seed = key.charCodeAt(0) * 137 + (key.charCodeAt(1) || 0) * 31;
  const data = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const drift = dr * range * (1 / (1 + Math.exp(-8 * (t - 0.5))) - 0.5);
    const wave =
      Math.sin(t * Math.PI * 2.8 + seed * 0.017) * range * 0.14
      + Math.sin(t * Math.PI * 5.9 + seed * 0.031) * 0.45 * range * 0.07
      + Math.sin(t * Math.PI * 13.1 + seed * 0.052) * 0.2 * range * 0.03;
    const noise = smoothNoise(seed, i, 5) * ns;
    const val = Math.max(mn, Math.min(mx, s + drift + wave + noise));
    data.push({ i, v: +val.toFixed(4) });
  }
  return data;
}

/* Gold COMEX uptrend */
function makeGold(n = 120) {
  const mn = 2033, mx = 2095, seed = 42;
  const data = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const drift = (mx - mn) * 0.75 * (t * t * (3 - 2 * t));
    const wave =
      Math.sin(t * Math.PI * 3.1 + 0.9) * 18
      + Math.sin(t * Math.PI * 7.4 + 1.7) * 0.4 * 9
      + Math.sin(t * Math.PI * 15.2 + 0.3) * 0.15 * 5;
    const noise = smoothNoise(seed, i, 4) * 5;
    const v = Math.max(mn, Math.min(mx, mn + drift + wave + noise));
    data.push({ i, v: +v.toFixed(2) });
  }
  return data;
}

/* Trading-day date labels */
function makeDates(n) {
  const dates = [];
  const d = new Date("2024-06-24");
  while (dates.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(2);
      dates.push(`${dd}/${mm}/${yy}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
const DATE_LABELS = makeDates(200);
const N = 80;

const SUB_CFG = [
  { key: "tr", title: "TRENDS",  col: "#22c55e", s: 120,  dr: 0.28, ns: 3.5,  mn: 118,  mx: 140,  f: v => (+v).toFixed(2), yd: [118, 142] },
  { key: "vx", title: "VIX",     col: "#a855f7", s: 9.5,  dr: 0.10, ns: 0.4,  mn: 6.5,  mx: 13.5, f: v => (+v).toFixed(2), yd: [6.5, 13.5] },
  { key: "dx", title: "DXY",     col: "#3b82f6", s: 83.5, dr: 0.05, ns: 0.4,  mn: 82.8, mx: 86.2, f: v => (+v).toFixed(2), yd: [82.5, 86.5] },
  { key: "us", title: "US10YY",  col: "#f97316", s: 2.5,  dr: 0.22, ns: 0.06, mn: 1.9,  mx: 3.1,  f: v => (+v).toFixed(2), yd: [1.9, 3.1] },
];

function appendPoint(arr, c) {
  const lv = arr[arr.length - 1].v;
  const prev = arr[arr.length - 2]?.v ?? lv;
  const momentum = (lv - prev) * 0.55;
  const seed = c.key.charCodeAt(0) * 137;
  const noise = (seededRand(seed, arr.length, Date.now() % 1000) - 0.5) * c.ns;
  let nv = lv + momentum + noise;
  nv = Math.max(c.mn, Math.min(c.mx, nv));
  const next = [...arr.slice(1), { i: N - 1, v: +nv.toFixed(3) }];
  return next.map((p, idx) => ({ i: idx, v: p.v }));
}

const Tip = ({ active, payload, f }) =>
  active && payload?.length ? (
    <div style={{ background: "rgba(6,10,20,0.97)", border: "1px solid rgba(120,150,255,0.15)", borderRadius: 5, padding: "4px 10px", fontSize: 10, color: "#b0c4de", fontFamily: "monospace" }}>
      {f ? f(payload[0].value) : payload[0].value}
    </div>
  ) : null;

/* ── Sub Chart Panel ── */
function SubPanel({ c, data, animated, tickOffset = 0 }) {
  const lastVal = data[data.length - 1]?.v ?? 0;
  const firstVal = data[0]?.v ?? lastVal;
  const diff = +(lastVal - firstVal).toFixed(2);
  const pct = +((diff / (firstVal || 1)) * 100).toFixed(2);
  const up = diff >= 0;
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    +(c.yd[0] + (i / 4) * (c.yd[1] - c.yd[0])).toFixed(2)
  );

  return (
    <div style={{ flex: 1, minWidth: 0, background: "linear-gradient(150deg,#0b1120,#080e1a)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 0 4px 10px", overflow: "hidden", position: "relative", boxShadow: "0 2px 20px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg,transparent,${c.col}44,transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 10, marginBottom: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#667788", letterSpacing: "0.08em" }}>{c.title}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.col, fontFamily: "monospace" }}>{c.f(lastVal)}</span>
          <span style={{ fontSize: 8.5, fontWeight: 600, color: up ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>
            {up ? "▲" : "▼"} {Math.abs(diff)} ({up ? "+" : ""}{pct}%)
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 48, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g${c.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.col} stopOpacity="0.28" />
                <stop offset="100%" stopColor={c.col} stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="0" />
            <YAxis domain={c.yd} ticks={yTicks} orientation="right"
              tick={{ fontSize: 7.5, fill: "#2a3a4a", fontFamily: "monospace" }}
              axisLine={false} tickLine={false} width={44}
              tickFormatter={v => c.f(v)} />
            <XAxis dataKey="i"
              tick={{ fontSize: 7, fill: "#2a3a4a", fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              tickLine={false} height={13}
              ticks={[0, 20, 40, 60, 79]}
              tickFormatter={i => DATE_LABELS[(i + tickOffset) % DATE_LABELS.length]} />
            <Tooltip content={<Tip f={c.f} />} />
            <Area type="monotone" dataKey="v" stroke={c.col} strokeWidth={1.8}
              fill={`url(#g${c.key})`} dot={false} isAnimationActive={!animated} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", right: 2, top: "38%", transform: "translateY(-50%)", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ background: c.col, borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
            {c.f(lastVal)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main GoldDashboard (preview for Gold.jsx) ── */
export default function GoldDashboard() {
  const [spot, setSpot] = useState(2062.90);
  const [flash, setFlash] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [gd, setGd] = useState(() => makeGold(120));
  const [sd, setSd] = useState(() =>
    Object.fromEntries(SUB_CFG.map(c => [c.key, generateWave(c, N)]))
  );

  useEffect(() => {
    const t0 = setTimeout(() => setAnimated(true), 1400);
    const t = setInterval(() => {
      setSpot(p => {
        const n = +(p + (Math.random() - 0.46) * 1.2).toFixed(2);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        return Math.max(2040, Math.min(2095, n));
      });
      setSd(prev => {
        const nx = {};
        SUB_CFG.forEach(c => { nx[c.key] = appendPoint(prev[c.key], c); });
        return nx;
      });
      setGd(prev => {
        const lv = prev[prev.length - 1].v;
        const pv = prev[prev.length - 2]?.v ?? lv;
        const nv = Math.max(2033, Math.min(2095, lv + (lv - pv) * 0.4 + (Math.random() - 0.47) * 3));
        return [...prev.slice(1), { i: 119, v: +nv.toFixed(2) }].map((p, i) => ({ i, v: p.v }));
      });
    }, 1800);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  const goldLast = gd[gd.length - 1]?.v ?? 2062.90;
  const goldFirst = gd[0]?.v ?? 2041.35;
  const goldDiff = +(goldLast - goldFirst).toFixed(2);
  const goldPct = +((goldDiff / goldFirst) * 100).toFixed(2);
  const goldUp = goldDiff >= 0;
  const goldYTicks = [2033, 2043, 2053, 2063, 2073, 2083, 2093];
  const goldTicks = [0, 20, 40, 60, 80, 100, 119];

  const tickers = [
    { label: "GOLD SPOT",         val: spot.toFixed(2), chg: `${goldUp ? "▲" : "▼"} ${Math.abs(goldDiff).toFixed(2)} (${goldUp ? "+" : ""}${goldPct}%)`, up: goldUp, gold: true, flash },
    { label: "GOLD THAI (96.5%)", val: "34,550",         chg: "+150",               up: true  },
    { label: "SILVER",            val: "22.85",          chg: "-0.121 (-0.5%)",     up: false },
    { label: "THB/USD",           val: "35.60",          chg: "-0.10 (Stronger)",   up: false },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: "#070c14", display: "flex", flexDirection: "column", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", overflow: "hidden" }}>
      <style>{`::-webkit-scrollbar{display:none}`}</style>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4, padding: "5px" }}>

        {/* Gold COMEX big chart */}
        <div style={{ flex: "2.2", minHeight: 0, background: "linear-gradient(150deg,#0b1120,#080e1a)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 0 4px 10px", position: "relative", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: 1, background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.5),transparent)" }} />
          <div style={{ position: "absolute", left: "50%", top: "55%", transform: "translate(-50%,-50%)", fontSize: 52, fontWeight: 900, color: "rgba(251,191,36,0.018)", letterSpacing: "0.3em", pointerEvents: "none", userSelect: "none" }}>GOLD</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 10, marginBottom: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#dde4f0", letterSpacing: "0.04em" }}>GOLD (COMEX)</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: flash ? "#ffe066" : "#fbbf24", fontFamily: "monospace", transition: "color .2s" }}>{spot.toFixed(2)}</span>
              <span style={{ fontSize: 9.5, fontFamily: "monospace", fontWeight: 600, color: goldUp ? "#4ade80" : "#f87171" }}>
                {goldUp ? "▲" : "▼"} {Math.abs(goldDiff).toFixed(2)} ({goldUp ? "+" : ""}{goldPct}%)
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gd} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="0" />
                <YAxis domain={[2030, 2098]} ticks={goldYTicks} orientation="right"
                  tick={{ fontSize: 7.5, fill: "#2a3a4a", fontFamily: "monospace" }}
                  axisLine={false} tickLine={false} width={48} tickFormatter={v => v.toFixed(2)} />
                <XAxis dataKey="i"
                  tick={{ fontSize: 7, fill: "#2a3a4a", fontFamily: "monospace" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                  tickLine={false} height={14}
                  ticks={goldTicks}
                  tickFormatter={i => DATE_LABELS[i % DATE_LABELS.length]} />
                <Tooltip content={<Tip f={v => `$${(+v).toFixed(2)}`} />} />
                <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={1.8}
                  fill="url(#gg)" dot={false} isAnimationActive={!animated} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", right: 2, top: "40%", transform: "translateY(-50%)", zIndex: 10, pointerEvents: "none" }}>
              <div style={{ background: "#22c55e", borderRadius: 3, padding: "2px 5px", fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                {goldLast.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          <SubPanel c={SUB_CFG[0]} data={sd.tr} animated={animated} tickOffset={0} />
          <SubPanel c={SUB_CFG[1]} data={sd.vx} animated={animated} tickOffset={10} />
        </div>

        {/* Row 3 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          <SubPanel c={SUB_CFG[2]} data={sd.dx} animated={animated} tickOffset={20} />
          <SubPanel c={SUB_CFG[3]} data={sd.us} animated={animated} tickOffset={30} />
        </div>

      </div>
    </div>
  );
}