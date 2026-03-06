// src/pages/tools/components/BidAskDashboard.jsx
import { useState, useEffect, useRef } from "react";

/* ── helpers ── */
function seeded(s) {
  let x = s;
  return () => { x = Math.sin(x) * 99999; return x - Math.floor(x); };
}
function randInt(min, max, rng) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function makeBook(basePrice, seed) {
  const rng = seeded(seed);
  const step = 0.25;
  const bids = Array.from({ length: 10 }, (_, i) => ({
    price: +(basePrice - i * step).toFixed(2),
    vol: randInt(250000, 600000, rng),
  }));
  const asks = Array.from({ length: 10 }, (_, i) => ({
    price: +(basePrice + (i + 1) * step).toFixed(2),
    vol: randInt(200000, 600000, rng),
  }));
  return { bids, asks };
}
function tickBook(book, rng) {
  return {
    bids: book.bids.map(b => ({ ...b, vol: Math.max(50000, b.vol + Math.round((rng() - 0.5) * 60000)) })),
    asks: book.asks.map(a => ({ ...a, vol: Math.max(50000, a.vol + Math.round((rng() - 0.5) * 60000)) })),
  };
}
const fmt = v => v.toLocaleString();
const fmtM = v => (v / 1_000_000).toFixed(3) + "M";
const BAR_MAX = 650000;

/* ── Field ── */
function Field({ label, value, width }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: width || 1 }}>
      <label style={{ fontSize: 9, color: "#7a8499", letterSpacing: 0.3 }}>{label}</label>
      <input
        defaultValue={value}
        style={{ width: "100%", background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 4, color: "#c9d4e8", padding: "5px 8px", fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
      />
    </div>
  );
}

/* ── Panel ── */
function Panel({ cfg, book, time, slider, setSlider, sliderKey }) {
  const totalBid = book.bids.reduce((s, b) => s + b.vol, 0);
  const totalAsk = book.asks.reduce((s, a) => s + a.vol, 0);

  return (
    <div style={{ background: "#0b1120", border: "1px solid #1a2235", borderRadius: 6, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
      <style>{`
        .s-${sliderKey}{-webkit-appearance:none;width:100%;height:3px;border-radius:2px;outline:none;cursor:pointer;background:linear-gradient(to right,#f0c040 0%,#f0c040 ${slider}%,#1e2a3a ${slider}%,#1e2a3a 100%)}
        .s-${sliderKey}::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#f0c040;cursor:pointer}
        .s-${sliderKey}::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#f0c040;border:none}
      `}</style>

      {/* Inputs row 1 */}
      <div style={{ padding: "6px 8px 0", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          <Field label="Symbol *"   value={cfg.symbol}    width={0.8} />
          <Field label="Start Date" value={cfg.startDate} width={1.2} />
          <Field label="End Date"   value={cfg.endDate}   width={1.2} />
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          <Field label="Start Time" value={cfg.startTime} width={1.2} />
          <Field label="End Time"   value={cfg.endTime}   width={1.1} />
          <Field label="Speed"      value={cfg.speed}     width={0.5} />
          <button style={{ flex: 1, background: "#4a6cf7", color: "#fff", border: "none", borderRadius: 4, padding: "4px 0", fontSize: 10, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" }}>
            SEARCH
          </button>
        </div>
      </div>

      {/* Time */}
      <div style={{ background: "#060a10", margin: "5px 8px 0", borderRadius: 3, textAlign: "center", padding: "4px 0" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#f0c040", fontFamily: "monospace", letterSpacing: 2 }}>{time}</span>
      </div>

      {/* Order book */}
      <div style={{ padding: "0 8px", marginTop: 4 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 9, color: "#4a5568", paddingBottom: 2, borderBottom: "1px solid #1a2235" }}>
          <div style={{ flex: 1, textAlign: "right", paddingRight: 4 }}>Vol BID</div>
          <div style={{ width: 52, textAlign: "center", color: "#4caf78" }}>BID</div>
          <div style={{ width: 52, textAlign: "center", color: "#e05a3a" }}>ASK</div>
          <div style={{ flex: 1, textAlign: "left", paddingLeft: 4 }}>Vol ASK</div>
        </div>

        {book.bids.map((bid, i) => {
          const ask = book.asks[i];
          const bidPct = Math.min((bid.vol / BAR_MAX) * 100, 100);
          const askPct = Math.min((ask.vol / BAR_MAX) * 100, 100);
          const even = i % 2 === 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 18, borderBottom: "1px solid #0f1520" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", position: "relative", height: "100%", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: `${bidPct}%`, background: even ? "#1a3a6a" : "#152f5a", transition: "width .3s" }} />
                <span style={{ position: "relative", zIndex: 1, fontSize: 9, color: "#b0bcd4", paddingRight: 3, fontFamily: "monospace" }}>{fmt(bid.vol)}</span>
              </div>
              <div style={{ width: 52, textAlign: "center", fontSize: 10, fontWeight: 700, color: "#4caf78", fontFamily: "monospace" }}>{bid.price.toFixed(2)}</div>
              <div style={{ width: 52, textAlign: "center", fontSize: 10, fontWeight: 700, color: "#e05a3a", fontFamily: "monospace" }}>{ask.price.toFixed(2)}</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", position: "relative", height: "100%", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${askPct}%`, background: even ? "#5a1a0a" : "#4a1508", transition: "width .3s" }} />
                <span style={{ position: "relative", zIndex: 1, fontSize: 9, color: "#b0bcd4", paddingLeft: 3, fontFamily: "monospace" }}>{fmt(ask.vol)}</span>
              </div>
            </div>
          );
        })}

        {/* Totals */}
        <div style={{ display: "flex", alignItems: "center", padding: "3px 0", borderTop: "1px solid #1a2235" }}>
          <div style={{ flex: 1, textAlign: "right", paddingRight: 4, fontSize: 9, color: "#4a9fd4" }}>Total: {fmtM(totalBid)}</div>
          <div style={{ width: 104 }} />
          <div style={{ flex: 1, textAlign: "left", paddingLeft: 4, fontSize: 9, color: "#e05a3a" }}>Total: {fmtM(totalAsk)}</div>
        </div>
      </div>

      {/* Slider */}
      <div style={{ padding: "3px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="range" min={0} max={100} value={slider}
            onChange={e => setSlider(Number(e.target.value))}
            className={`s-${sliderKey}`} style={{ flex: 1 }} />
          <span style={{ color: "#4a5568", fontSize: 13 }}>▶</span>
        </div>
      </div>

      {/* OHLC footer */}
      <div style={{ display: "flex", gap: 5, padding: "0 8px 8px" }}>
        {[{ label: "In Range", data: cfg.inRange }, { label: "Actual", data: cfg.actual }].map(({ label, data }) => (
          <div key={label} style={{ flex: 1, background: "#060d18", border: "1px solid #1a2235", borderRadius: 4, padding: "4px 8px" }}>
            <div style={{ fontSize: 8, color: "#4a5568", marginBottom: 3 }}>{label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
              {["OPEN", "HIGH", "LOW", "CLOSE"].map((k, i) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 7, color: "#4a5568", letterSpacing: 0.3 }}>{k}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#c9d4e8", fontFamily: "monospace" }}>{data[i]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Scaled wrapper — contain fit (respects both width & height) ── */
function ScaledPreview({ children, designW = 900, designH = 680 }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = () => {
      const w = outer.getBoundingClientRect().width;
      const s = w / designW;
      inner.style.transform = `scale(${s})`;
      inner.style.transformOrigin = "top left";
      outer.style.height = `${designH * s}px`;
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [designW, designH]);

  return (
    <div ref={outerRef} style={{ width: "100%", overflow: "hidden", position: "relative", background: "#070c14" }}>
      <div ref={innerRef} style={{ width: designW, height: designH, position: "absolute", top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function BidAskDashboard() {
  const [time, setTime]   = useState("10:15:50");
  const [time2, setTime2] = useState("10:07:02");
  const [slider1, setSlider1] = useState(33);
  const [slider2, setSlider2] = useState(13);
  const [book1, setBook1] = useState(() => makeBook(70.56, 11));
  const [book2, setBook2] = useState(() => makeBook(71.36, 22));
  const rng1 = useRef(seeded(99));
  const rng2 = useRef(seeded(77));

  useEffect(() => {
    const tick = setInterval(() => {
      const bumpTime = p => {
        const [h, m, s] = p.split(":").map(Number);
        let ns = s + 1, nm = m, nh = h;
        if (ns >= 60) { ns = 0; nm++; }
        if (nm >= 60) { nm = 0; nh++; }
        return `${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}:${String(ns).padStart(2,"0")}`;
      };
      setTime(p => bumpTime(p));
      setTime2(p => bumpTime(p));
      setBook1(b => tickBook(b, rng1.current));
      setBook2(b => tickBook(b, rng2.current));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const cfg1 = { symbol: "OR",  startDate: "03/06/2026", endDate: "03/06/2026", startTime: "10:00 AM", endTime: "10:22 AM", speed: "1", inRange: ["71.00","73.50","70.75","72.25"], actual: ["71.00","73.50","70.75","72.25"] };
  const cfg2 = { symbol: "AOT", startDate: "03/06/2026", endDate: "03/06/2026", startTime: "10:00 AM", endTime: "10:22 AM", speed: "1", inRange: ["71.00","73.50","70.75","72.25"], actual: ["71.00","73.50","70.75","72.25"] };

  return (
    <ScaledPreview designW={900} designH={510}>
      <div style={{ width: "100%", height: "100%", background: "#070c14", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 8, boxSizing: "border-box", fontFamily: "'Consolas','Courier New',monospace", color: "#c9d4e8" }}>
        <style>{`::-webkit-scrollbar{display:none}`}</style>
        <Panel cfg={cfg1} book={book1} time={time}  slider={slider1} setSlider={setSlider1} sliderKey="a" />
        <Panel cfg={cfg2} book={book2} time={time2} slider={slider2} setSlider={setSlider2} sliderKey="b" />
      </div>
    </ScaledPreview>
  );
}