import { useState, useRef, useEffect, useCallback } from "react";

// ── Scrollbar hide ────────────────────────────────────────────────────────────
const scrollbarHide = { msOverflowStyle: "none", scrollbarWidth: "none" };

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Deterministic seeded RNG ─────────────────────────────────────────────────
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

// ── Mock trade generator ─────────────────────────────────────────────────────
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

// ── Mock orderbook generator ─────────────────────────────────────────────────
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

// ── useDropdown ───────────────────────────────────────────────────────────────
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

// ── TradeTable ────────────────────────────────────────────────────────────────
function TradeTable({ trades, loading }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          {["SYMBOL", "T", "VOL", "PRICE", "TIME"].map((h) => (
            <th key={h} style={{
              padding: "9px 6px", background: "#1e3a5f",
              color: "#93c5fd", fontWeight: 700, textAlign: "center",
              letterSpacing: "0.04em", fontSize: 11, borderBottom: "1px solid #1e3a8a",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody style={{ opacity: loading ? 0.35 : 1, transition: "opacity 0.15s" }}>
        {trades.map((row, i) => (
          <tr key={i} style={{
            background: row.highlight ? "#14532d" : i % 2 === 0 ? "#0f172a" : "#111827",
            transition: "background 0.15s",
          }}>
            <td style={td(row)}>{row.symbol}</td>
            <td style={{ ...td(row), color: row.t === "B" ? "#34d399" : "#f87171" }}>{row.t}</td>
            <td style={td(row)}>{fmt(row.vol, 0)}</td>
            <td style={{ ...td(row), color: row.highlight ? "#86efac" : "#e2e8f0" }}>{fmt(row.price)}</td>
            <td style={{ ...td(row), color: "#64748b", fontSize: 11 }}>{row.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function td(row) {
  return { padding: "6px 6px", color: row.highlight ? "#d1fae5" : "#cbd5e1", textAlign: "center" };
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, value, onChange, icon, width = 150 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {label && (
        <span style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "#111827", border: "1px solid #1e293b",
        borderRadius: 8, padding: "7px 10px", width,
        transition: "border-color 0.2s",
      }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "#e2e8f0", fontSize: 13, width: "100%", minWidth: 0,
          }}
        />
        {icon && <span style={{ color: "#334155", fontSize: 15, flexShrink: 0 }}>{icon}</span>}
      </div>
    </div>
  );
}

// ── SymbolDropdown ────────────────────────────────────────────────────────────
const SYMBOLS = SYMBOL_POOL.map((s) => s.symbol).sort();

function SymbolDropdown({ value, onChange }) {
  const ref = useRef(null);
  const [open, setOpen] = useDropdown(ref);
  const [q, setQ] = useState(value);
  useEffect(() => { setQ(value); }, [value]);

  const filtered = SYMBOLS.filter((s) => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative", width: 180 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Symbol *
        </span>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#111827", border: "1px solid #1e293b",
          borderRadius: 8, padding: "7px 10px",
          transition: "border-color 0.2s",
        }}>
          <span style={{ color: "#475569", fontSize: 14 }}>⌕</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); onChange(""); }}
            onFocus={() => setOpen(true)}
            placeholder="Search symbol…"
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 13, width: "100%", minWidth: 0,
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
              onMouseEnter={(e) => { if (value !== sym) e.currentTarget.style.background = "#162032"; }}
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

// ── SearchBtn ─────────────────────────────────────────────────────────────────
function SearchBtn({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "8px 20px", borderRadius: 8, border: "none",
        cursor: loading ? "default" : "pointer",
        background: loading ? "#1e293b" : "linear-gradient(135deg, #06b6d4, #3b82f6)",
        color: loading ? "#64748b" : "#fff",
        fontWeight: 700, fontSize: 13, letterSpacing: "0.04em",
        boxShadow: loading ? "none" : "0 0 16px rgba(6,182,212,0.35)",
        transition: "filter 0.2s, box-shadow 0.2s, background 0.2s",
        alignSelf: "flex-end",
        display: "flex", alignItems: "center", gap: 6,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.filter = "brightness(1.15)";
          e.currentTarget.style.boxShadow = "0 0 24px rgba(6,182,212,0.55)";
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.filter = "brightness(1)";
          e.currentTarget.style.boxShadow = "0 0 16px rgba(6,182,212,0.35)";
        }
      }}
    >
      {loading && (
        <span style={{
          width: 11, height: 11, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#67e8f9",
          animation: "spin 0.7s linear infinite", display: "inline-block",
        }} />
      )}
      {loading ? "SEARCHING" : "SEARCH"}
    </button>
  );
}

// ── ExcBadge ──────────────────────────────────────────────────────────────────
function ExcBadge({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 11px", borderRadius: 6,
        border: `1px solid ${active ? "#06b6d4" : "#1e293b"}`,
        background: active ? "rgba(6,182,212,0.15)" : "#111827",
        color: active ? "#67e8f9" : "#64748b",
        fontWeight: 600, fontSize: 12, cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HisDayTrade() {
  // ── เปิดทุก exchange เป็น default ──
  const [activeExc, setActiveExc] = useState([...EXCHANGES]);

  const [leftDate, setLeftDate] = useState("13/06/2025");
  const [leftTime, setLeftTime] = useState("10:00");
  const [symbol, setSymbol] = useState("");
  const [startDate, setStartDate] = useState("13/06/2026");
  const [endDate, setEndDate] = useState("13/06/2026");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("16:30");
  const [speed, setSpeed] = useState("1");
  const [sliderVal, setSliderVal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timer, setTimer] = useState(0);

  // ── Trade tables state ──
  const [tradesLeft, setTradesLeft] = useState(() => generateTrades("init-left", 10));
  const [tradesRight, setTradesRight] = useState(() => generateTrades("init-right", 10));
  const [tradeLoading, setTradeLoading] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);

  // ── Orderbook state ──
  const [orderbook, setOrderbook] = useState(null);
  const [obLoading, setObLoading] = useState(false);
  const [obBaseSeed, setObBaseSeed] = useState(null);
  const [obBasePrice, setObBasePrice] = useState(null);

  const toggleExc = (label) =>
    setActiveExc((p) => p.includes(label) ? p.filter((e) => e !== label) : [...p, label]);

  // ── Timer tick ──
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  // ── Slider replay tick (ขยับช้าๆ ตาม speed) ──
  useEffect(() => {
    if (!playing) return;
    const speedNum = Math.max(0.1, Number(speed) || 1);
    const stepMs = 150; // อัปเดตทุก 150ms
    const stepAmount = 0.5 * speedNum; // % ต่อ tick

    const id = setInterval(() => {
      setSliderVal((v) => {
        const next = v + stepAmount;
        if (next >= 100) {
          clearInterval(id);
          setPlaying(false);
          return 100;
        }
        return next;
      });
    }, stepMs);

    return () => clearInterval(id);
  }, [playing, speed]);

  // ── Orderbook ขยับตาม % ของ replay แบบ deterministic ──
  useEffect(() => {
    if (!obBaseSeed || obBasePrice == null) return;
    const progressStep = Math.floor(sliderVal); // 0-100 ทีละ 1%
    const seed = `${obBaseSeed}|tick-${progressStep}`;
    setOrderbook(generateOrderbook(seed, obBasePrice));
  }, [sliderVal, obBaseSeed, obBasePrice]);

  const fmtTimer = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // ── SEARCH handler ──
  const handleSearch = useCallback(() => {
    setTradeLoading(true);
    setObLoading(true);

    setTimeout(() => {
      const excKey = activeExc.slice().sort().join(",");
      const leftSeed  = `trades-left|${leftDate}|${leftTime}|${excKey}`;
      const rightSeed = `trades-right|${leftDate}|${leftTime}|${excKey}`;
      setTradesLeft(generateTrades(leftSeed, 10));
      setTradesRight(generateTrades(rightSeed, 10));
      setLastSearch({ date: leftDate, time: leftTime });
      setTradeLoading(false);
    }, 500);

    setTimeout(() => {
      if (symbol) {
        const pick = SYMBOL_POOL.find((s) => s.symbol === symbol) || SYMBOL_POOL[0];
        const obSeed = `orderbook|${symbol}|${startDate}|${endDate}|${startTime}|${endTime}`;
        setObBaseSeed(obSeed);
        setObBasePrice(pick.base);
        setOrderbook(generateOrderbook(`${obSeed}|tick-0`, pick.base));
        setSliderVal(0);
        setTimer(0);
        setPlaying(false);
      }
      setObLoading(false);
    }, 650);
  }, [symbol, leftDate, leftTime, activeExc, startDate, endDate, startTime, endTime]);

  const card = {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
  };

  const sectionLabel = {
    fontSize: 10, color: "#475569", letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: 12, display: "block",
  };

  return (
    <div style={{
      background: "#0c111b", minHeight: "100vh", padding: 20,
      fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#e2e8f0",
      boxSizing: "border-box",
    }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Page title ── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em",
          background: "linear-gradient(90deg, #67e8f9, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: 0,
        }}>His Day Trade</h1>
        <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Historical trade viewer · SET market</p>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* LEFT PANEL */}
        <div style={{ ...card, flex: "2 1 520px", minWidth: 340 }}>

          {/* Exchange filter */}
          <div style={{ marginBottom: 14 }}>
            <span style={sectionLabel}>Exchange</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#475569", marginRight: 4 }}>Exc:</span>
              {EXCHANGES.map((exc) => (
                <ExcBadge key={exc} label={exc} active={activeExc.includes(exc)} onClick={() => toggleExc(exc)} />
              ))}
            </div>
          </div>

          {/* Date / time / search row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 8 }}>
            <Field label="Select Date" value={leftDate} onChange={setLeftDate} icon="📅" width={148} />
            <Field label="Select Time" value={leftTime} onChange={setLeftTime} icon="🕐" width={110} />
            <SearchBtn onClick={handleSearch} loading={tradeLoading || obLoading} />
          </div>

          {lastSearch && (
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>
              ผลลัพธ์สำหรับ {lastSearch.date} {lastSearch.time}
            </div>
          )}
          {!lastSearch && <div style={{ marginBottom: 14 }} />}

          {/* Divider */}
          <div style={{ height: 1, background: "#1e293b", marginBottom: 14 }} />

          {/* Trade tables */}
          <div style={{ display: "flex", gap: 1, overflowX: "auto", ...scrollbarHide }}>
            <div style={{ flex: 1, minWidth: 240 }}><TradeTable trades={tradesLeft} loading={tradeLoading} /></div>
            <div style={{ width: 1, background: "#1e293b", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 240 }}><TradeTable trades={tradesRight} loading={tradeLoading} /></div>
          </div>
        </div>

        {/* RIGHT PANEL — Order Book */}
        <div style={{ ...card, flex: "1 1 320px", minWidth: 300 }}>

          <span style={sectionLabel}>Order Book Replay</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <SymbolDropdown value={symbol} onChange={setSymbol} />
            <Field label="Start Date" value={startDate} onChange={setStartDate} icon="📅" width={130} />
            <Field label="End Date"   value={endDate}   onChange={setEndDate}   icon="📅" width={130} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
            <Field label="Start Time" value={startTime} onChange={setStartTime} icon="🕐" width={100} />
            <Field label="End Time"   value={endTime}   onChange={setEndTime}   icon="🕐" width={100} />
            <Field label="Speed"      value={speed}     onChange={setSpeed}             width={60} />
            <SearchBtn onClick={handleSearch} loading={tradeLoading || obLoading} />
          </div>

          {/* Timer display */}
          <div style={{
            background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10,
            padding: "10px 0", textAlign: "center", marginBottom: 14,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: 26, fontWeight: 700, letterSpacing: "0.12em",
              color: playing ? "#34d399" : "#cbd5e1",
              transition: "color 0.3s",
            }}>
              {fmtTimer(timer)}
            </span>
          </div>

          {/* Order book table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }}>
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
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                    <td style={{ padding: "6px", textAlign: "center", color: row ? "#34d399" : "#334155", fontSize: 12 }}>
                      {row ? fmt(row.volBid, 0) : "—"}
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", color: row ? "#86efac" : "#334155", fontSize: 12 }}>
                      {row ? fmt(row.bid) : "—"}
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", color: row ? "#fca5a5" : "#334155", fontSize: 12 }}>
                      {row ? fmt(row.ask) : "—"}
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", color: row ? "#f87171" : "#334155", fontSize: 12 }}>
                      {row ? fmt(row.volAsk, 0) : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Sum row */}
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

          {/* Playback controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <button
              onClick={() => setPlaying((p) => !p)}
              disabled={!orderbook}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "none",
                cursor: orderbook ? "pointer" : "default",
                background: !orderbook
                  ? "#1e293b"
                  : playing
                    ? "rgba(248,113,113,0.15)"
                    : "linear-gradient(135deg, #06b6d4, #3b82f6)",
                color: !orderbook ? "#475569" : playing ? "#f87171" : "#fff",
                fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: playing || !orderbook ? "none" : "0 0 12px rgba(6,182,212,0.4)",
                transition: "all 0.2s",
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <div style={{ flex: 1, position: "relative", height: 4, background: "#1e293b", borderRadius: 2 }}>
              <div style={{
                position: "absolute", left: 0, top: 0, height: "100%",
                width: `${sliderVal}%`,
                background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                borderRadius: 2, transition: "width 0.1s",
              }} />
              <input
                type="range" min={0} max={100} value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                disabled={!orderbook}
                style={{
                  position: "absolute", inset: 0, width: "100%", margin: 0,
                  opacity: 0, cursor: orderbook ? "pointer" : "default", height: "100%",
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>{sliderVal}%</span>
          </div>

        </div>
      </div>
    </div>
  );
}