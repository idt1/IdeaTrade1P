import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import ToolHint from "@/components/ToolHint.jsx";

const scrollbarHide = { msOverflowStyle: "none", scrollbarWidth: "none" };

const EXCHANGES = ["S50", "USD", "GO,GF,GF10", "SVF", "DW", "DR", "SET", "MAI"];

const SYMBOL_POOL = [
  { symbol: "SNNP",   base: 10.00 },
  { symbol: "CPALL",  base: 45.75 },
  { symbol: "EA",     base: 2.94 },
  { symbol: "AMARC",  base: 2.08 },
  { symbol: "PK",     base: 0.76 },
  { symbol: "BDMS",   base: 21.10 },
  { symbol: "GUNKUL", base: 1.52 },
  { symbol: "PTTGC",  base: 20.70 },
  { symbol: "XPG",    base: 0.78 },
  { symbol: "BGRIM",  base: 9.95 },
  { symbol: "COMAN",  base: 0.53 },
  { symbol: "MITSIB", base: 0.55 },
  { symbol: "GPSC",   base: 31.75 },
  { symbol: "PTT",    base: 36.25 },
  { symbol: "PTTEP",  base: 145.00 },
  { symbol: "IVL",    base: 28.50 },
  { symbol: "TOP",    base: 52.00 },
  { symbol: "GULF",   base: 47.75 },
  { symbol: "BANPU",  base: 4.92 },
  { symbol: "BCP",    base: 33.00 },
];

const ORDERBOOK_ROW_COUNT = 10;

function fmt(n, dec = 2) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedKey) {
  return mulberry32(hashString(seedKey));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function generateTrades(seedKey, count) {
  const rng = makeRng(seedKey);
  const trades = [];
  let ms = 0;

  for (let i = 0; i < count; i++) {
    const pick = SYMBOL_POOL[Math.floor(rng() * SYMBOL_POOL.length)];
    const side = rng() > 0.5 ? "B" : "S";
    const volTier = rng();
    const vol = volTier < 0.5
      ? Math.round((100 + rng() * 900) / 100) * 100
      : volTier < 0.85
        ? Math.round((1000 + rng() * 9000) / 100) * 100
        : Math.round((10000 + rng() * 30000) / 100) * 100;
    const priceDrift = (rng() - 0.5) * pick.base * 0.01;
    const price = Math.max(0.01, pick.base + priceDrift);
    ms += Math.round(rng() * 3) + 1;
    const sec = 10 + Math.floor(ms / 1000) % 5;
    const msPart = ms % 1000;

    trades.push({
      symbol: pick.symbol,
      t: side,
      vol,
      price,
      time: `10:${pad2(sec)}.${String(msPart).padStart(3, "0")}`,
      highlight: rng() > 0.93,
    });
  }
  return trades;
}

function generateOrderbook(seedKey, base) {
  const rng = makeRng(seedKey);
  const rows = [];
  let bid = base;
  let ask = base + Math.max(0.01, base * 0.001);

  for (let i = 0; i < ORDERBOOK_ROW_COUNT; i++) {
    const volBid = Math.round((100 + rng() * 20000) / 100) * 100;
    const volAsk = Math.round((100 + rng() * 20000) / 100) * 100;
    rows.push({
      volBid,
      bid: Math.max(0.01, bid),
      ask: Math.max(0.01, ask),
      volAsk,
    });
    bid -= base * (0.0005 + rng() * 0.001);
    ask += base * (0.0005 + rng() * 0.001);
  }

  const sumBid = rows.reduce((s, r) => s + r.volBid, 0);
  const sumAsk = rows.reduce((s, r) => s + r.volAsk, 0);
  return { rows, sumBid, sumAsk };
}

function useDropdown(ref) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, ref]);
  return [open, setOpen];
}

function TradeTable({ trades, loading }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.6)" }}>
          {["SYMBOL", "T", "VOL", "PRICE", "TIME"].map((h) => (
            <th key={h} style={{
              padding: "10px 6px",
              color: "#93c5fd", fontWeight: 700, textAlign: "center",
              letterSpacing: "0.06em", fontSize: 10,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody style={{ opacity: loading ? 0.35 : 1, transition: "opacity 0.15s" }}>
        {trades.map((row, i) => {
          const isBuy = row.t === "B";
          const highlightBg = isBuy ? "rgba(20, 83, 45, 0.35)" : "rgba(127, 29, 29, 0.35)";
          const normalBg = i % 2 === 0 ? "#0d1320" : "#111827";
          const activeBg = row.highlight ? highlightBg : normalBg;
          const leftBorderColor = row.highlight ? (isBuy ? "#34d399" : "#f87171") : "transparent";

          return (
            <tr key={i} style={{
              background: activeBg,
              borderLeft: `3px solid ${leftBorderColor}`,
              borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isBuy ? "rgba(52, 211, 153, 0.08)" : "rgba(248, 113, 113, 0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = activeBg; }}
            >
              <td style={{ ...td(row), fontWeight: 600 }}>{row.symbol}</td>
              <td style={{ ...td(row), color: isBuy ? "#34d399" : "#f87171", fontWeight: 700 }}>{row.t}</td>
              <td style={{ ...td(row), fontFamily: "'JetBrains Mono', monospace" }}>{fmt(row.vol, 0)}</td>
              <td style={{ ...td(row), color: row.highlight ? (isBuy ? "#86efac" : "#fca5a5") : "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(row.price)}</td>
              <td style={{ ...td(row), color: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{row.time}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function td(row) {
  return { padding: "10px 8px", color: row.highlight ? "#d1fae5" : "#cbd5e1", textAlign: "center" };
}

function Field({ label, value, onChange, icon, width = 150 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, width, position: "relative" }}>
      {label && (
        <span style={{
          fontSize: 9, color: focused ? "#3b82f6" : "#64748b",
          marginLeft: 12, pointerEvents: "none",
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600
        }}>
          {label}
        </span>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, height: 44,
        background: "#111827", border: `1px solid ${focused ? "#3b82f6" : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: focused ? "0 0 0 2.5px rgba(59, 130, 246, 0.2)" : "none",
        borderRadius: 20, padding: "0 14px", boxSizing: "border-box",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => { if (!focused) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }}
      onMouseLeave={(e) => { if (!focused) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "#e2e8f0", fontSize: 14, width: "100%", minWidth: 0,
          }}
        />
        {icon && <span style={{ color: "#334155", fontSize: 15, flexShrink: 0 }}>{icon}</span>}
      </div>
    </div>
  );
}

const SYMBOLS = SYMBOL_POOL.map((s) => s.symbol).sort();

function SymbolDropdown({ value, onChange, width = 180 }) {
  const ref = useRef(null);
  const [open, setOpen] = useDropdown(ref);
  const [q, setQ] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => { setQ(value); }, [value]);

  const filtered = SYMBOLS.filter((s) => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, width, position: "relative" }}>
      <span style={{
        fontSize: 9, color: (focused || open) ? "#3b82f6" : "#64748b",
        marginLeft: 12, pointerEvents: "none",
        letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600
      }}>
        Symbol *
      </span>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, height: 44,
        background: "#111827", border: `1px solid ${focused || open ? "#3b82f6" : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: (focused || open) ? "0 0 0 2.5px rgba(59, 130, 246, 0.2)" : "none",
        borderRadius: 20, padding: "0 14px", boxSizing: "border-box",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => { if (!focused && !open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }}
      onMouseLeave={(e) => { if (!focused && !open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
      >
        <span style={{ color: "#475569", fontSize: 14 }}>⌕</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => { setOpen(true); setFocused(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search symbol…"
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "#e2e8f0", fontSize: 14, width: "100%", minWidth: 0,
          }}
        />
        {(value || q) && (
          <button
            onClick={() => { setQ(""); onChange(""); setOpen(false); }}
            style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12, padding: 0 }}
          >✕</button>
        )}
        <span
          onClick={() => setOpen((o) => !o)}
          style={{
            color: "#475569", fontSize: 11, cursor: "pointer",
            transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
          }}
        >▾</span>
      </div>
      {open && (
        <ul style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, width: "100%",
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)", maxHeight: 240, overflowY: "auto",
          zIndex: 100, padding: "6px", margin: 0, listStyle: "none",
          ...scrollbarHide,
        }}>
          {filtered.length > 0 ? filtered.map((sym) => (
            <li
              key={sym}
              onClick={() => { setQ(sym); onChange(sym); setOpen(false); }}
              style={{
                padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: value === sym ? "#fff" : "#94a3b8",
                background: value === sym ? "#1e293b" : "transparent",
                marginBottom: 2,
              }}
              onMouseEnter={(e) => { if (value !== sym) e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)"; }}
              onMouseLeave={(e) => { if (value !== sym) e.currentTarget.style.background = "transparent"; }}
            >
              {sym}
              {value === sym && (
                <span style={{
                  width: 16, height: 16, borderRadius: "50%", background: "#06b6d4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff",
                }}>✓</span>
              )}
            </li>
          )) : (
            <li style={{ padding: "10px 12px", color: "#475569", fontSize: 13, textAlign: "center" }}>
              No results
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTH  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseDMY(key) {
  if (!key) return null;
  const [dd, mm, yyyy] = key.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return { day: dd, month: mm, year: yyyy };
}
function toDMY(year, month, day) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
function formatDisplayDMY(key) {
  const p = parseDMY(key);
  if (!p) return "";
  return `${String(p.day).padStart(2, "0")} ${MONTH_NAMES[p.month - 1]} ${p.year}`;
}

function buildCalendarCells(viewYear, viewMonth) {
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const total    = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const calNavBtn = {
  width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent",
  color: "#94a3b8", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", transition: "background .1s",
};
const calTitleBtn = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "#e2e8f0", fontSize: 13, fontWeight: 500,
  letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 3,
  padding: "2px 4px", borderRadius: 5,
};
const calBody = { padding: "8px 12px 10px" };

function CalChev({ d }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {d === "left"  && <polyline points="15 18 9 12 15 6" />}
      {d === "right" && <polyline points="9 18 15 12 9 6" />}
      {d === "down"  && <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function DatePicker({ label, value, onChange, width = 160 }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("day");
  const ref = useRef(null);

  const init = useMemo(() => parseDMY(value) || { month: new Date().getMonth() + 1, year: new Date().getFullYear() }, [value]); // eslint-disable-line
  const [viewMonth, setViewMonth] = useState(init.month);
  const [viewYear,  setViewYear]  = useState(init.year);

  const decadeStart = Math.floor(viewYear / 10) * 10;
  const decadeYears = useMemo(() => Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i), [decadeStart]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  const calDays = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const openCalendar = () => {
    const p = parseDMY(value);
    if (p) { setViewMonth(p.month); setViewYear(p.year); }
    setOpen((o) => !o);
    setView("day");
  };

  const popup = {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
    width: 252, background: "#0f172a",
    border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12,
    boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
    overflow: "hidden", maxHeight: 360, overflowY: "auto",
  };
  const dpHeader = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px 8px", borderBottom: "0.5px solid rgba(255,255,255,0.07)",
  };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, width, position: "relative" }}>
      {label && (
        <span style={{
          fontSize: 9, color: open ? "#3b82f6" : "#64748b",
          marginLeft: 12, pointerEvents: "none",
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600
        }}>
          {label}
        </span>
      )}
      <button onClick={openCalendar} style={{
        display: "flex", alignItems: "center", gap: 7, padding: "0 14px", height: 44, width: "100%",
        background: "#111827", border: `1px solid ${open ? "#3b82f6" : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: open ? "0 0 0 2.5px rgba(59, 130, 246, 0.2)" : "none",
        borderRadius: 20, cursor: "pointer", color: "#e2e8f0", fontSize: 14,
        transition: "all 0.2s ease", justifyContent: "space-between",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }}
      onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
          <CalIcon />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {formatDisplayDMY(value) || "เลือกวันที่"}
          </span>
        </span>
      </button>

      {open && (
        <div style={popup}>
          {view === "year" && (
            <>
              <div style={dpHeader}>
                <button style={calNavBtn} onClick={() => setViewYear(decadeStart - 1)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="left" />
                </button>
                <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500 }}>
                  {decadeStart} – {decadeStart + 9}
                </span>
                <button style={calNavBtn} onClick={() => setViewYear(decadeStart + 10)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="right" />
                </button>
              </div>
              <div style={{ ...calBody, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {decadeYears.map((yr) => {
                  const isCur = yr === viewYear;
                  const isOut = yr < decadeStart || yr > decadeStart + 9;
                  return (
                    <button key={yr} onClick={() => { setViewYear(yr); setView("month"); }}
                      style={{
                        height: 30, borderRadius: 6, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: isCur ? 600 : 400,
                        background: isCur ? "#3b82f6" : "transparent",
                        color: isCur ? "#fff" : isOut ? "#475569" : "#cbd5e1",
                        transition: "all .1s",
                      }}
                      onMouseEnter={(e) => { if (!isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { if (!isCur) e.currentTarget.style.background = "transparent"; }}
                    >{yr}</button>
                  );
                })}
              </div>
            </>
          )}

          {view === "month" && (
            <>
              <div style={dpHeader}>
                <button style={calNavBtn} onClick={() => setViewYear((y) => y - 1)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="left" />
                </button>
                <button style={calTitleBtn} onClick={() => setView("year")}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  {viewYear} <CalChev d="down" />
                </button>
                <button style={calNavBtn} onClick={() => setViewYear((y) => y + 1)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="right" />
                </button>
              </div>
              <div style={{ ...calBody, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {MONTH_NAMES.map((m, idx) => {
                  const mNum  = idx + 1;
                  const isCur = mNum === viewMonth;
                  return (
                    <button key={m} onClick={() => { setViewMonth(mNum); setView("day"); }}
                      style={{
                        height: 32, borderRadius: 6, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: isCur ? 600 : 400,
                        background: isCur ? "#3b82f6" : "transparent",
                        color: isCur ? "#fff" : "#cbd5e1",
                        transition: "all .1s",
                      }}
                      onMouseEnter={(e) => { if (!isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { if (!isCur) e.currentTarget.style.background = "transparent"; }}
                    >{m}</button>
                  );
                })}
              </div>
            </>
          )}

          {view === "day" && (
            <>
              <div style={dpHeader}>
                <button style={calNavBtn} onClick={prevMonth}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="left" />
                </button>
                <button style={calTitleBtn} onClick={() => setView("month")}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  {FULL_MONTH[viewMonth - 1]} {viewYear} <CalChev d="down" />
                </button>
                <button style={calNavBtn} onClick={nextMonth}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <CalChev d="right" />
                </button>
              </div>
              <div style={calBody}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                  {DAY_NAMES.map((n) => (
                    <div key={n} style={{
                      textAlign: "center", fontSize: 10, fontWeight: 500,
                      color: n === "Sun" || n === "Sat" ? "#3b82f6" : "#475569",
                      padding: "2px 0", letterSpacing: "0.06em",
                    }}>{n}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const key   = toDMY(viewYear, viewMonth, day);
                    const isSel = key === value;
                    const isWeekend = new Date(viewYear, viewMonth - 1, day).getDay() % 6 === 0;
                    return (
                      <button key={key} onClick={() => { onChange(key); setOpen(false); }}
                        style={{
                          height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                          fontSize: 11, fontWeight: isSel ? 600 : 400,
                          background: isSel ? "#3b82f6" : "transparent",
                          color: isSel ? "#fff" : isWeekend ? "#60a5fa" : "#e2e8f0",
                          transition: "all .1s",
                        }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                      >{day}</button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
            dates.push(`${dd}/${mm}/${yy}`);
        }
        day++;
    }
    return dates;
}
function parseTradingKey(key) {
    if (!key) return { day: 1, month: 1, year: 2025 };
    const [dd, mm, yy] = key.split("/");
    return { day: +dd, month: +mm, year: 2000 + +yy };
}
function toTradingKey(year, month, day) {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(2)}`;
}
function formatTradingDisplay(key) {
    if (!key) return "";
    const { day, month, year } = parseTradingKey(key);
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(day).padStart(2, "0")} ${M[month - 1]} ${year}`;
}

const TradingDatePicker = memo(({ dates, selected, onChange, label, disabled, align = "left" }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState("day");
    const ref = useRef(null);

    const FULL_MONTH_T = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const initView = useMemo(() => {
        if (selected) { const p = parseTradingKey(selected); return { month: p.month, year: p.year }; }
        return { month: 1, year: 2025 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [viewMonth, setViewMonth] = useState(initView.month);
    const [viewYear, setViewYear] = useState(initView.year);

    const tradableSet = useMemo(() => new Set(dates), [dates]);
    const availableYears = useMemo(() => {
        const ys = new Set(dates.map(k => 2000 + +k.split("/")[2]));
        return [...ys].sort((a, b) => a - b);
    }, [dates]);
    const availableMonths = useMemo(() => {
        return new Set(dates.filter(k => 2000 + +k.split("/")[2] === viewYear).map(k => +k.split("/")[1]));
    }, [dates, viewYear]);

    const decadeStart = Math.floor(viewYear / 10) * 10;
    const decadeYears = useMemo(() => Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i), [decadeStart]);

    useEffect(() => {
        if (!open) return;
        const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, [open]);

    const prevMonth = useCallback(() => {
        if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }, [viewMonth]);

    const nextMonth = useCallback(() => {
        if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }, [viewMonth]);

    const canPrev = useCallback(() => {
        if (!dates[0]) return false;
        const p = parseTradingKey(dates[0]);
        return viewYear > p.year || (viewYear === p.year && viewMonth > p.month);
    }, [dates, viewYear, viewMonth]);

    const canNext = useCallback(() => {
        if (!dates[dates.length - 1]) return false;
        const p = parseTradingKey(dates[dates.length - 1]);
        return viewYear < p.year || (viewYear === p.year && viewMonth < p.month);
    }, [dates, viewYear, viewMonth]);

    const calDays = useMemo(() => {
        const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
        const total = new Date(viewYear, viewMonth, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDow; i++) cells.push(null);
        for (let d = 1; d <= total; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [viewMonth, viewYear]);

    const popup = {
        position: "absolute", top: "calc(100% + 6px)",
        ...(align === "right" ? { right: 0 } : { left: 0 }),
        zIndex: 9999,
        width: 252, background: "#0f172a",
        border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)", fontFamily: "monospace",
        overflow: "hidden", maxHeight: 360, overflowY: "auto"
    };
    const dpHeader = {
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
    const body = { padding: "8px 12px 10px" };
    const Chev = ({ d }) => (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {d === "left" && <polyline points="15 18 9 12 15 6" />}
            {d === "right" && <polyline points="9 18 15 12 9 6" />}
            {d === "down" && <polyline points="6 9 12 15 18 9" />}
        </svg>
    );

    const openCalendar = () => {
        if (disabled) return;
        const p = parseTradingKey(selected);
        if (p) { setViewMonth(p.month); setViewYear(p.year); }
        setOpen(o => !o);
        setView("day");
    };

    return (
        <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, opacity: disabled ? 0.8 : 1, width: "100%", position: "relative" }}>
            {label && (
              <span style={{
                fontSize: 9,
                color: disabled ? "#475569" : (open ? "#3b82f6" : "#64748b"),
                marginLeft: 12, pointerEvents: "none",
                letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600
              }}>
                {label}
              </span>
            )}
            <button onClick={openCalendar} style={{
                background: "#111827",
                border: disabled ? "1px solid rgba(255, 255, 255, 0.05)" : (open ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)"),
                borderRadius: 20, cursor: disabled ? "default" : "pointer",
                color: disabled ? "#475569" : "#e2e8f0",
                height: 44, width: "100%",
                fontSize: 12, fontWeight: 500, fontFamily: "monospace", transition: "all .2s ease",
                boxShadow: open ? "0 0 0 2.5px rgba(59, 130, 246, 0.2)" : "none",
                boxSizing: "border-box",
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px",
            }}
            onMouseEnter={(e) => { if (!disabled && !open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }}
            onMouseLeave={(e) => { if (!disabled && !open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={disabled ? "#64748b" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span style={{ fontSize: 12 }}>{formatTradingDisplay(selected)}</span>
                </div>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={disabled ? "#64748b" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: .8, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && !disabled && (
                <div style={popup}>
                    {view === "year" && (<>
                        <div style={dpHeader}>
                            <button style={navBtn(decadeStart > (availableYears[0] ?? 2025))} onClick={() => setViewYear(decadeStart - 1)}
                                onMouseEnter={e => { if (decadeStart > (availableYears[0] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="left" />
                            </button>
                            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>
                                {decadeStart} – {decadeStart + 9}
                            </span>
                            <button style={navBtn(decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025))} onClick={() => setViewYear(decadeStart + 10)}
                                onMouseEnter={e => { if (decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="right" />
                            </button>
                        </div>
                        <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                            {decadeYears.map(yr => {
                                const avail = availableYears.includes(yr);
                                const isCur = yr === viewYear;
                                const isOut = yr < decadeStart || yr > decadeStart + 9;
                                return (
                                    <button key={yr} onClick={() => { if (avail) { setViewYear(yr); setView("month"); } }}
                                        style={{
                                            height: 30, borderRadius: 6, border: "none",
                                            cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                                            fontSize: 12, fontWeight: isCur ? 600 : 400,
                                            background: isCur ? "#3b82f6" : "transparent",
                                            color: isCur ? "#fff" : avail ? (isOut ? "#475569" : "#cbd5e1") : "#1e3a5f",
                                            transition: "all .1s",
                                        }}
                                        onMouseEnter={e => { if (avail && !isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                        onMouseLeave={e => { if (avail && !isCur) e.currentTarget.style.background = "transparent"; }}
                                    >{yr}</button>
                                );
                            })}
                        </div>
                    </>)}

                    {view === "month" && (<>
                        <div style={dpHeader}>
                            <button style={navBtn(availableYears.includes(viewYear - 1))} onClick={() => setViewYear(y => y - 1)}
                                onMouseEnter={e => { if (availableYears.includes(viewYear - 1)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="left" />
                            </button>
                            <button style={titleBtn} onClick={() => setView("year")}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                {viewYear} <Chev d="down" />
                            </button>
                            <button style={navBtn(availableYears.includes(viewYear + 1))} onClick={() => setViewYear(y => y + 1)}
                                onMouseEnter={e => { if (availableYears.includes(viewYear + 1)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="right" />
                            </button>
                        </div>
                        <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                            {SHORT_MONTH.map((m, idx) => {
                                const mNum = idx + 1;
                                const avail = availableMonths.has(mNum);
                                const isCur = mNum === viewMonth;
                                return (
                                    <button key={m} onClick={() => { if (avail) { setViewMonth(mNum); setView("day"); } }}
                                        style={{
                                            height: 32, borderRadius: 6, border: "none",
                                            cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                                            fontSize: 12, fontWeight: isCur ? 600 : 400,
                                            background: isCur ? "#3b82f6" : "transparent",
                                            color: isCur ? "#fff" : avail ? "#cbd5e1" : "#1e3a5f",
                                            transition: "all .1s",
                                        }}
                                        onMouseEnter={e => { if (avail && !isCur) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                        onMouseLeave={e => { if (avail && !isCur) e.currentTarget.style.background = "transparent"; }}
                                    >{m}</button>
                                );
                            })}
                        </div>
                    </>)}

                    {view === "day" && (<>
                        <div style={dpHeader}>
                            <button style={navBtn(canPrev())} onClick={prevMonth}
                                onMouseEnter={e => { if (canPrev()) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="left" />
                            </button>
                            <button style={titleBtn} onClick={() => setView("month")}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                {FULL_MONTH_T[viewMonth - 1]} {viewYear} <Chev d="down" />
                            </button>
                            <button style={navBtn(canNext())} onClick={nextMonth}
                                onMouseEnter={e => { if (canNext()) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="right" />
                            </button>
                        </div>
                        <div style={body}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                                {DAY_NAMES.map(n => (
                                    <div key={n} style={{
                                        textAlign: "center", fontSize: 10, fontWeight: 500,
                                        color: n === "Sun" || n === "Sat" ? "#1e3a5f" : "#475569",
                                        padding: "2px 0", letterSpacing: "0.06em",
                                    }}>{n}</div>
                                ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                                {calDays.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const key = toTradingKey(viewYear, viewMonth, day);
                                    const isTrade = tradableSet.has(key);
                                    const isSel = key === selected;
                                    const isWeekend = new Date(viewYear, viewMonth - 1, day).getDay() % 6 === 0;
                                    return (
                                        <button key={key} onClick={() => { if (isTrade) { onChange(key); setOpen(false); } }}
                                            style={{
                                                height: 28, borderRadius: 6, border: "none",
                                                cursor: isTrade ? "pointer" : "default", fontFamily: "monospace",
                                                fontSize: 11, fontWeight: isSel ? 600 : 400,
                                                background: isSel ? "#3b82f6" : "transparent",
                                                color: isSel ? "#fff" : isTrade ? "#e2e8f0" : isWeekend ? "#1e3a5f" : "#334155",
                                                transition: "all .1s", position: "relative",
                                            }}
                                            onMouseEnter={e => { if (isTrade && !isSel) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                                            onMouseLeave={e => { if (isTrade && !isSel) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            {day}
                                            {isTrade && !isSel && (
                                                <span style={{
                                                    position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                                                    width: 3, height: 3, borderRadius: "50%", background: "#3b82f6",
                                                }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>)}
                </div>
            )}
        </div>
    );
});

const SLOT_STEP = 30;

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 1; h <= 12; h++)
    for (let m = 0; m < 60; m += SLOT_STEP)
      slots.push({ h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
  return slots;
})();

function timeTo24(h, m, period) {
  let h24 = h;
  if (period === "PM" && h !== 12) h24 += 12;
  if (period === "AM" && h === 12) h24 = 0;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeFrom24(val = "10:00") {
  const [rawH, rawM] = (val || "10:00").split(":").map(Number);
  const h24 = Number.isFinite(rawH) ? rawH : 10;
  const rawM2 = Number.isFinite(rawM) ? rawM : 0;
  const period = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const snapped = Math.round(rawM2 / SLOT_STEP) * SLOT_STEP;
  const m = snapped >= 60 ? 60 - SLOT_STEP : snapped;
  return { h, m, period };
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TimeDropdown({ label, value, onChange, width = 160 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);

  const parsed = timeFrom24(value);
  const [h, setH] = useState(parsed.h);
  const [m, setM] = useState(parsed.m);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    const p = timeFrom24(value);
    setH(p.h); setM(p.m); setPeriod(p.period);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const sel = listRef.current.querySelector("[data-selected='true']");
    if (sel) setTimeout(() => sel.scrollIntoView({ block: "center" }), 0);
  }, [open]);

  const pickSlot = (slot) => {
    setH(slot.h);
    setM(slot.m);
    onChange(timeTo24(slot.h, slot.m, period));
    setOpen(false);
  };

  const togglePeriod = (p) => {
    setPeriod(p);
    onChange(timeTo24(h, m, p));
  };

  const display = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;

  const popup = {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
    width: 200, background: "#0f172a",
    border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12,
    boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
    overflow: "hidden",
  };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, width, position: "relative" }}>
      {label && (
        <span style={{
          fontSize: 9, color: open ? "#3b82f6" : "#64748b",
          marginLeft: 12, pointerEvents: "none",
          letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600
        }}>
          {label}
        </span>
      )}
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", gap: 7, padding: "0 14px", height: 44, width: "100%",
        background: "#111827", border: `1px solid ${open ? "#3b82f6" : "rgba(255, 255, 255, 0.08)"}`,
        boxShadow: open ? "0 0 0 2.5px rgba(59, 130, 246, 0.2)" : "none",
        borderRadius: 20, cursor: "pointer", color: "#e2e8f0", fontSize: 14,
        transition: "all 0.2s ease", justifyContent: "space-between",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; }}
      onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
          <ClockIcon />
          <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{display}</span>
        </span>
        <span style={{
          color: "#475569", fontSize: 11,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
          flexShrink: 0,
        }}>▾</span>
      </button>

      {open && (
        <div style={popup}>
          <div style={{
            display: "flex", gap: 4, padding: "8px 8px 6px",
            borderBottom: "0.5px solid rgba(255,255,255,0.07)",
          }}>
            {["AM", "PM"].map((p) => (
              <button
                key={p}
                onClick={() => togglePeriod(p)}
                style={{
                  flex: 1, height: 28, borderRadius: 6,
                  border: period === p ? "none" : "1px solid #1e293b",
                  background: period === p ? "#3b82f6" : "transparent",
                  color: period === p ? "#fff" : "#64748b",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all .12s",
                }}
              >{p}</button>
            ))}
          </div>
          <div
            ref={listRef}
            style={{ maxHeight: 200, overflowY: "auto", padding: "4px 6px 6px", ...scrollbarHide }}
          >
            {TIME_SLOTS.map((slot) => {
              const isSel = slot.h === h && slot.m === m;
              return (
                <div
                  key={slot.label}
                  data-selected={isSel}
                  onClick={() => pickSlot(slot)}
                  style={{
                    padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    color: isSel ? "#3b82f6" : "#cbd5e1",
                    background: isSel ? "rgba(59, 130, 246, 0.12)" : "transparent",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  {slot.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SearchBtn({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        height: 44, padding: "0 22px", borderRadius: 20, border: "none",
        cursor: loading ? "default" : "pointer",
        background: loading ? "#1e293b" : "linear-gradient(135deg, #06b6d4, #3b82f6)",
        color: loading ? "#64748b" : "#fff",
        fontWeight: 700, fontSize: 14, letterSpacing: "0.04em",
        boxShadow: loading ? "none" : "0 0 16px rgba(6,182,212,0.35)",
        transition: "all 0.2s ease",
        alignSelf: "flex-end",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.filter = "brightness(1.15)";
          e.currentTarget.style.boxShadow = "0 0 24px rgba(6,182,212,0.55)";
          e.currentTarget.style.transform = "scale(1.02)";
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.filter = "brightness(1)";
          e.currentTarget.style.boxShadow = "0 0 16px rgba(6,182,212,0.35)";
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
    >
      {loading && (
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#67e8f9",
          animation: "spin 0.7s linear infinite", display: "inline-block",
        }} />
      )}
      {!loading && <SearchIcon />}
      {loading ? "SEARCHING" : "SEARCH"}
    </button>
  );
}

function ExcBadge({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);

  let border = active ? "1px solid #06b6d4" : "1px solid #1e293b";
  let color = active ? "#67e8f9" : "#64748b";
  let background = active ? "rgba(6,182,212,0.15)" : "#111827";

  if (!active && hovered) {
    border = "1px solid #475569";
    color = "#94a3b8";
    background = "#162032";
  } else if (active && hovered) {
    background = "rgba(6,182,212,0.25)";
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "6px 16px", borderRadius: 8,
        border, background, color,
        fontWeight: 600, fontSize: 13, cursor: "pointer",
        boxShadow: active ? "0 0 10px rgba(6, 182, 212, 0.25)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

export default function HisDayTrade() {
  const [activeExc, setActiveExc] = useState([...EXCHANGES]);

  const [leftDate, setLeftDate] = useState("13/06/2025");
  const [leftTime, setLeftTime] = useState("10:00");
  const [symbol, setSymbol] = useState("");

  const tradingDates = useMemo(() => getTradingDates(), []);
  const [startDate, setStartDate] = useState(() => tradingDates[tradingDates.length - 1] ?? "13/06/2026");
  const [endDate, setEndDate] = useState(() => tradingDates[tradingDates.length - 1] ?? "13/06/2026");

  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("16:30");
  const [speed, setSpeed] = useState("1");
  const [sliderVal, setSliderVal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timer, setTimer] = useState(0);

  const [tradesLeft, setTradesLeft] = useState(() => generateTrades("init-left", 10));
  const [tradesRight, setTradesRight] = useState(() => generateTrades("init-right", 10));
  const [tradeLoading, setTradeLoading] = useState(false);

  const [orderbook, setOrderbook] = useState(null);
  const [obLoading, setObLoading] = useState(false);
  const [obBaseSeed, setObBaseSeed] = useState(null);
  const [obBasePrice, setObBasePrice] = useState(null);

  const toggleExc = (label) =>
    setActiveExc((p) => p.includes(label) ? p.filter((e) => e !== label) : [...p, label]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const speedNum = Math.max(0.1, Number(speed) || 1);
    const stepMs = 150;
    const stepAmount = 0.5 * speedNum;
    const id = setInterval(() => {
      setSliderVal((v) => {
        const next = v + stepAmount;
        if (next >= 100) { clearInterval(id); setPlaying(false); return 100; }
        return next;
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [playing, speed]);

  useEffect(() => {
    if (!obBaseSeed || obBasePrice == null) return;
    const progressStep = Math.floor(sliderVal);
    const seed = `${obBaseSeed}|tick-${progressStep}`;
    setOrderbook(generateOrderbook(seed, obBasePrice));
  }, [sliderVal, obBaseSeed, obBasePrice]);

  const fmtTimer = (s) => {
    const h   = String(Math.floor(s / 3600)).padStart(2, "0");
    const m   = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const handleSearch = useCallback(() => {
    setPlaying(false);
    setSliderVal(0);
    setTimer(0);
    setObBaseSeed(null);
    setObBasePrice(null);
    setOrderbook(null);
    setTradeLoading(true);
    setObLoading(true);

    setTimeout(() => {
      const excKey = activeExc.slice().sort().join(",");
      const leftSeed  = `trades-left|${leftDate}|${leftTime}|${excKey}`;
      const rightSeed = `trades-right|${leftDate}|${leftTime}|${excKey}`;
      setTradesLeft(generateTrades(leftSeed, 10));
      setTradesRight(generateTrades(rightSeed, 10));
      setTradeLoading(false);
    }, 500);

    setTimeout(() => {
      if (symbol) {
        const pick = SYMBOL_POOL.find((s) => s.symbol === symbol) || SYMBOL_POOL[0];
        const obSeed = `orderbook|${symbol}|${startDate}|${endDate}|${startTime}|${endTime}`;
        setObBaseSeed(obSeed);
        setObBasePrice(pick.base);
        setOrderbook(generateOrderbook(`${obSeed}|tick-0`, pick.base));
        setPlaying(true);
      } else {
        setObBaseSeed(null);
        setObBasePrice(null);
        setOrderbook(null);
      }
      setObLoading(false);
    }, 650);
  }, [symbol, leftDate, leftTime, activeExc, startDate, endDate, startTime, endTime]);

  const card = {
    background: "rgba(17, 24, 39, 0.85)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  };

  const sectionLabel = {
    fontSize: 10, color: "#64748b", letterSpacing: "0.12em",
    textTransform: "uppercase", marginBottom: 16, display: "block",
    fontWeight: 600,
  };

  return (
    <div style={{
      background: "radial-gradient(circle at 50% 50%, #0f1626 0%, #070a12 100%)",
      height: "100vh", padding: 16,
      fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#e2e8f0",
      boxSizing: "border-box", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
      `}</style>

      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex: "2 1 520px", minWidth: 340, position: "relative", overflow: "visible", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ position: "absolute", top: -12, left: -12, zIndex: 20 }}>
            <ToolHint onViewDetails={() => {}}>
              Trade History — Select an exchange, pick a date & time, then hit Search. Compare left vs right columns for two sessions.
              Order Book Replay — Pick a symbol & date, hit Search, then use Play / Pause and the speed slider to simulate the live order book.
            </ToolHint>
          </div>
          <div style={{ ...card, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div style={{ marginBottom: 14, flexShrink: 0 }}>
              <span style={sectionLabel}>Exchange</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {EXCHANGES.map((exc) => (
                  <ExcBadge key={exc} label={exc} active={activeExc.includes(exc)} onClick={() => toggleExc(exc)} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 14, flexShrink: 0 }}>
              <DatePicker label="Select Date" value={leftDate} onChange={setLeftDate} width={168} />
              <TimeDropdown label="Select Time" value={leftTime} onChange={setLeftTime} width={170} />
              <SearchBtn onClick={handleSearch} loading={tradeLoading || obLoading} />
            </div>

            <div style={{ height: 1, background: "rgba(255, 255, 255, 0.05)", marginBottom: 14, flexShrink: 0 }} />

            <div className="custom-scroll" style={{ flex: 1, minHeight: 0, display: "flex", gap: 20, overflow: "auto", alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 240 }}><TradeTable trades={tradesLeft} loading={tradeLoading} /></div>
              <div style={{
                width: 1, flexShrink: 0,
                background: "linear-gradient(to bottom, transparent 0%, rgba(148,163,184,0.45) 12%, rgba(148,163,184,0.45) 88%, transparent 100%)",
              }} />
              <div style={{ flex: 1, minWidth: 240 }}><TradeTable trades={tradesRight} loading={tradeLoading} /></div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: "1 1 320px", minWidth: 300, position: "relative", overflow: "visible", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ ...card, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "visible" }}>

            <span style={{ ...sectionLabel, flexShrink: 0 }}>Order Book Replay</span>

            {/* Row 1: Symbol + Start Date + End Date */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexShrink: 0, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <SymbolDropdown value={symbol} onChange={setSymbol} width="100%" />
              </div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <TradingDatePicker dates={tradingDates} selected={startDate} onChange={setStartDate} label="Start Date" />
              </div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <TradingDatePicker dates={tradingDates} selected={endDate} onChange={setEndDate} label="End Date" align="right" />
              </div>
            </div>

            {/* Row 2: Start Time + End Time + Speed */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 10, flexShrink: 0 }}>
              <div style={{ flex: 2, minWidth: 0 }}><TimeDropdown label="Start Time" value={startTime} onChange={setStartTime} width="100%" /></div>
              <div style={{ flex: 2, minWidth: 0 }}><TimeDropdown label="End Time" value={endTime} onChange={setEndTime} width="100%" /></div>
              <div style={{ flex: 1, minWidth: 0 }}><Field label="Speed" value={speed} onChange={setSpeed} width="100%" /></div>
            </div>

            {/* Row 3: Timer + Play/Pause + Search */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
              <div style={{
                flexShrink: 0,
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: "0 12px",
                height: 44,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
                  color: playing ? "#34d399" : "#cbd5e1",
                  transition: "color 0.3s", whiteSpace: "nowrap",
                }}>
                  {fmtTimer(timer)}
                </span>
                <button
                  disabled={!orderbook}
                  onClick={() => setPlaying(!playing)}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", border: "none",
                    background: !orderbook ? "#1e293b" : "linear-gradient(135deg, #06b6d4, #3b82f6)",
                    color: !orderbook ? "#475569" : "#fff",
                    cursor: !orderbook ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: !orderbook || !playing ? "none" : "0 0 10px rgba(6,182,212,0.4)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (orderbook) e.currentTarget.style.filter = "brightness(1.15)"; }}
                  onMouseLeave={(e) => { if (orderbook) e.currentTarget.style.filter = "brightness(1)"; }}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
              </div>
              <SearchBtn onClick={handleSearch} loading={tradeLoading || obLoading} />
            </div>

            {/* Orderbook table */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", ...scrollbarHide }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Vol BID", "BID", "ASK", "Vol ASK"].map((h) => (
                      <th key={h} style={{
                        padding: "8px 6px", background: "#1e3a5f",
                        color: "#93c5fd", fontWeight: 700, textAlign: "center",
                        fontSize: 11, letterSpacing: "0.04em", borderBottom: "1px solid #1e3a8a",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ opacity: obLoading ? 0.35 : 1, transition: "opacity 0.15s" }}>
                  {Array.from({ length: ORDERBOOK_ROW_COUNT }).map((_, i) => {
                    const row = orderbook?.rows?.[i];
                    const bidRaw = row?.volBid || 0;
                    const askRaw = row?.volAsk || 0;

                    let bidVolColor = "#64748b";
                    let bidVolWeight = "normal";
                    let bidVolShadow = "none";
                    let askVolColor = "#64748b";
                    let askVolWeight = "normal";
                    let askVolShadow = "none";

                    if (row) {
                      if (bidRaw > askRaw * 1.5) {
                        bidVolColor = "#4ade80"; bidVolWeight = "bold";
                        bidVolShadow = "drop-shadow(0 0 6px rgba(74, 222, 128, 0.5))";
                      } else if (askRaw > bidRaw * 1.5) {
                        askVolColor = "#f87171"; askVolWeight = "bold";
                        askVolShadow = "drop-shadow(0 0 6px rgba(248, 113, 113, 0.5))";
                      }
                    }

                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                        <td style={{ padding: "6px", textAlign: "center", color: row ? bidVolColor : "#334155", fontWeight: row ? bidVolWeight : "normal", filter: bidVolShadow, fontSize: 12 }}>
                          {row ? fmt(row.volBid, 0) : "—"}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center", color: row ? "#ffffff" : "#334155", fontWeight: row ? 600 : "normal", fontSize: 12 }}>
                          {row ? fmt(row.bid) : "—"}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center", color: row ? "#ffffff" : "#334155", fontWeight: row ? 600 : "normal", fontSize: 12 }}>
                          {row ? fmt(row.ask) : "—"}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center", color: row ? askVolColor : "#334155", fontWeight: row ? askVolWeight : "normal", filter: askVolShadow, fontSize: 12 }}>
                          {row ? fmt(row.volAsk, 0) : "—"}
                        </td>
                      </tr>
                    );
                  })}

                  <tr style={{ background: "#0f172a", borderTop: "1px solid #1e293b" }}>
                    <td colSpan={2} style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 10, color: "#475569", display: "block" }}>Sum Bid</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>
                        {orderbook ? fmt(orderbook.sumBid, 0) : 0}
                      </span>
                    </td>
                    <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right" }}>
                      <span style={{ fontSize: 10, color: "#475569", display: "block" }}>Sum Ask</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>
                        {orderbook ? fmt(orderbook.sumAsk, 0) : 0}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Slider */}
            <div style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ flex: 1, position: "relative", height: 6, background: "#1e293b", borderRadius: 3 }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  width: `${sliderVal}%`,
                  background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                  borderRadius: 3, transition: "width 0.1s",
                }} />
                <input
                  type="range" min={0} max={100} value={sliderVal}
                  onChange={(e) => { setPlaying(false); setSliderVal(Number(e.target.value)); }}
                  disabled={!orderbook}
                  style={{
                    position: "absolute", inset: 0, width: "100%", margin: 0,
                    opacity: 0, cursor: orderbook ? "pointer" : "default", height: "100%",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: "#475569", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {Math.round(sliderVal)}%
              </span>
            </div>

          </div>{/* end card */}
        </div>{/* end right panel */}

      </div>{/* end left+right flex row */}
    </div>/* end root */
  );
}