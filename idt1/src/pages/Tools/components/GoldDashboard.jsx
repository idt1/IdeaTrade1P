// src/pages/tools/components/GoldDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { AreaLWC } from "@/components/LWChart";

/* ─────────────────────────────────────────────
   DATA HELPERS
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
    data.push(+val.toFixed(4));
  }
  return data;
}

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
    data.push(+v.toFixed(2));
  }
  return data;
}

/** Convert a flat number[] to LWC { time, value }[] starting from a base date */
function toLWC(values, startDate = "2024-06-24") {
  const base = new Date(startDate);
  // Skip weekends so dates look like trading days
  const dates = [];
  const d = new Date(base);
  while (dates.length < values.length) {
    if (d.getDay() !== 0 && d.getDay() !== 6)
      dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return values.map((v, i) => ({ time: dates[i], value: v }));
}

function appendPoint(arr, c) {
  const lv = arr[arr.length - 1];
  const prev = arr[arr.length - 2] ?? lv;
  const momentum = (lv - prev) * 0.55;
  const seed = c.key.charCodeAt(0) * 137;
  const noise = (seededRand(seed, arr.length, Date.now() % 1000) - 0.5) * c.ns;
  const nv = Math.max(c.mn, Math.min(c.mx, lv + momentum + noise));
  return [...arr.slice(1), +nv.toFixed(3)];
}

const N = 80;

const SUB_CFG = [
  { key: "tr", title: "TRENDS",  col: "#22c55e", s: 120,  dr: 0.28, ns: 3.5,  mn: 118,  mx: 140,  f: v => (+v).toFixed(2) },
  { key: "vx", title: "VIX",     col: "#a855f7", s: 9.5,  dr: 0.10, ns: 0.4,  mn: 6.5,  mx: 13.5, f: v => (+v).toFixed(2) },
  { key: "dx", title: "DXY",     col: "#3b82f6", s: 83.5, dr: 0.05, ns: 0.4,  mn: 82.8, mx: 86.2, f: v => (+v).toFixed(2) },
  { key: "us", title: "US10YY",  col: "#f97316", s: 2.5,  dr: 0.22, ns: 0.06, mn: 1.9,  mx: 3.1,  f: v => (+v).toFixed(2) },
];

/* ── Sub Chart Panel ── */
function SubPanel({ c, data }) {
  const lastVal = data[data.length - 1] ?? 0;
  const firstVal = data[0] ?? lastVal;
  const diff = +(lastVal - firstVal).toFixed(2);
  const pct = +((diff / (firstVal || 1)) * 100).toFixed(2);
  const up = diff >= 0;

  const lwcData = useMemo(() => toLWC(data), [data]);

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "linear-gradient(150deg,#0b1120,#080e1a)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: "8px 0 4px 10px",
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 2px 20px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
        background: `linear-gradient(90deg,transparent,${c.col}44,transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 10, marginBottom: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#667788", letterSpacing: "0.08em" }}>{c.title}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.col, fontFamily: "monospace" }}>{c.f(lastVal)}</span>
          <span style={{ fontSize: 8.5, fontWeight: 600, color: up ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>
            {up ? "▲" : "▼"} {Math.abs(diff)} ({up ? "+" : ""}{pct}%)
          </span>
        </div>
      </div>

      {/* Chart — AreaLWC handles everything */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AreaLWC data={lwcData} color={c.col} height={100} gradientOpacity={0.2} />
      </div>
    </div>
  );
}

/* ── Main GoldDashboard ── */
export default function GoldDashboard() {
  const [spot, setSpot] = useState(2062.90);
  const [flash, setFlash] = useState(false);
  const [gd, setGd] = useState(() => makeGold(120));
  const [sd, setSd] = useState(() =>
    Object.fromEntries(SUB_CFG.map(c => [c.key, generateWave(c, N)]))
  );

  useEffect(() => {
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
        const lv = prev[prev.length - 1];
        const pv = prev[prev.length - 2] ?? lv;
        const nv = Math.max(2033, Math.min(2095, lv + (lv - pv) * 0.4 + (Math.random() - 0.47) * 3));
        return [...prev.slice(1), +nv.toFixed(2)];
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const goldLast  = gd[gd.length - 1] ?? 2062.90;
  const goldFirst = gd[0] ?? 2041.35;
  const goldDiff  = +(goldLast - goldFirst).toFixed(2);
  const goldPct   = +((goldDiff / goldFirst) * 100).toFixed(2);
  const goldUp    = goldDiff >= 0;

  const goldLWC = useMemo(() => toLWC(gd), [gd]);

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#070c14",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
      overflow: "hidden",
    }}>
      <style>{`::-webkit-scrollbar{display:none}`}</style>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4, padding: 5 }}>

        {/* Gold COMEX main chart */}
        <div style={{
          flex: "2.2", minHeight: 0,
          background: "linear-gradient(150deg,#0b1120,#080e1a)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "8px 0 4px 10px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column",
        }}>
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

          <div style={{ flex: 1, minHeight: 0 }}>
            <AreaLWC data={goldLWC} color="#22c55e" height={180} gradientOpacity={0.25} />
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          <SubPanel c={SUB_CFG[0]} data={sd.tr} />
          <SubPanel c={SUB_CFG[1]} data={sd.vx} />
        </div>

        {/* Row 3 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          <SubPanel c={SUB_CFG[2]} data={sd.dx} />
          <SubPanel c={SUB_CFG[3]} data={sd.us} />
        </div>

      </div>
    </div>
  );
}