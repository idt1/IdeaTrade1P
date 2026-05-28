// src/pages/Tools/MultiBidAsk.jsx
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";

/* ─────────────── CONSTANTS ─────────────── */
const STORAGE_KEY = "multibidask_favorites";
const LAYOUTS = [
  { id: "1x1", label: "1", cols: 1, count: 1 },
  { id: "1x2", label: "2", cols: 2, count: 2 },
  { id: "2x2", label: "4", cols: 2, count: 4 },
  { id: "2x4", label: "8", cols: 4, count: 8 },
];

/* ─────────────── MAIN COMPONENT ─────────────── */
export default function MultiBidAsk() {
  const [layout, setLayout] = useState(LAYOUTS[2]); // default 2x2
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [favDropOpen, setFavDropOpen] = useState(false);
  const [panelSymbols, setPanelSymbols] = useState({});
  const favDropRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fn = (e) => { if (favDropRef.current && !favDropRef.current.contains(e.target)) setFavDropOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const addFavorite = (symbol) => {
    if (!symbol || favorites.includes(symbol)) return;
    setFavorites((prev) => [...prev, symbol]);
  };

  const removeFavorite = (sym) => setFavorites((prev) => prev.filter((s) => s !== sym));

  const loadFavoriteToPanel = (sym) => {
    const firstEmpty = Array.from({ length: layout.count }, (_, i) => i).find(
      (i) => !panelSymbols[i]
    );
    const target = firstEmpty ?? 0;
    setPanelSymbols((prev) => ({ ...prev, [target]: sym }));
    setFavDropOpen(false);
  };

  const onSymbolChange = useCallback((idx, sym) => {
    setPanelSymbols((prev) => ({ ...prev, [idx]: sym }));
  }, []);

  const panels = Array.from({ length: layout.count }, (_, i) => i);

  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 xl:grid-cols-2",
    4: "grid-cols-1 xl:grid-cols-2",
    8: "grid-cols-2 xl:grid-cols-4",
  }[layout.count] || "grid-cols-2";

  return (
    <div className="w-full min-h-screen bg-[#0b111a] text-white flex flex-col">
      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-slate-700/60 shrink-0 flex-wrap gap-2">
        {/* Layout selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-2 hidden sm:inline">Layout</span>
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l)}
              className={`w-8 h-8 rounded text-xs font-bold transition-all border ${
                layout.id === l.id
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:border-indigo-500 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Favorites */}
        <div className="flex items-center gap-2" ref={favDropRef}>
          {/* Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFavDropOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 h-8 rounded bg-slate-800 border border-slate-600 text-xs text-slate-200 hover:border-indigo-500 transition-all"
            >
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Favorites
              <svg className={`w-3 h-3 transition-transform ${favDropOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {favDropOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                {favorites.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-500 text-center">No favorites yet</div>
                ) : (
                  favorites.map((sym) => (
                    <div key={sym} className="flex items-center justify-between px-3 py-2 hover:bg-indigo-500/10 group">
                      <button
                        onClick={() => loadFavoriteToPanel(sym)}
                        className="flex-1 text-left text-sm font-bold text-white"
                      >
                        {sym}
                      </button>
                      <button
                        onClick={() => removeFavorite(sym)}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ADD button */}
          <button
            onClick={() => {
              const anySymbol = Object.values(panelSymbols).find(Boolean);
              if (anySymbol) addFavorite(anySymbol);
            }}
            className="flex items-center gap-1.5 px-3 h-8 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            ADD
          </button>
        </div>
      </div>

      {/* ── PANELS GRID ── */}
      <div className={`flex-1 grid ${gridClass} gap-2 p-2 overflow-auto`}>
        {panels.map((idx) => (
          <ReplayPanel
            key={idx}
            idx={idx}
            initialSymbol={panelSymbols[idx] || ""}
            onSymbolChange={onSymbolChange}
            onAddFavorite={addFavorite}
            compact={layout.count >= 4}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── REPLAY PANEL ─────────────── */
function ReplayPanel({ idx, initialSymbol, onSymbolChange, onAddFavorite, compact }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isSearched, setIsSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sliderValue, setSliderValue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:03");
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [orderBook, setOrderBook] = useState(Array(compact ? 10 : 20).fill({ bidVol: 0, bid: "-", ask: "-", askVol: 0 }));
  const [startDate, setStartDate] = useState(todayKey());
  const symbolHistory = ["PTT", "TOP", "DELTA", "AOT", "ADVANC", "SCB", "KBANK", "CPALL", "BBL", "MINT"];

  const filtered = symbol
    ? symbolHistory.filter((s) => s.toLowerCase().includes(symbol.toLowerCase()))
    : symbolHistory.slice(0, 6);

  useEffect(() => {
    setSymbol(initialSymbol);
  }, [initialSymbol]);

  // Time display
  useEffect(() => {
    const toSec = (t) => { const [h, m] = t.split(":").map(Number); return h * 3600 + m * 60; };
    const s = toSec(startTime), e = toSec(endTime);
    if (e <= s) { setCurrentTime("00:00:00"); return; }
    const cur = s + (sliderValue / 100) * (e - s);
    const h = String(Math.floor(cur / 3600)).padStart(2, "0");
    const m = String(Math.floor((cur % 3600) / 60)).padStart(2, "0");
    const sec = String(Math.floor(cur % 60)).padStart(2, "0");
    setCurrentTime(`${h}:${m}:${sec}`);
  }, [sliderValue, startTime, endTime]);

  // Playback
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      setSliderValue((p) => {
        if (p >= 100) { setIsPlaying(false); return 100; }
        return Math.min(p + speed, 100);
      });
    }, 100);
    return () => clearInterval(iv);
  }, [isPlaying, speed]);

  // Generate order book
  useEffect(() => {
    if (!isSearched) return;
    const base = 72 - sliderValue * 0.02;
    const rows = Array.from({ length: compact ? 10 : 20 }, (_, i) => ({
      bidVol: Math.floor(200000 + Math.random() * 400000),
      bid: (base - i * 0.25).toFixed(2),
      ask: (base - i * 0.25 + 0.25).toFixed(2),
      askVol: Math.floor(200000 + Math.random() * 400000),
    }));
    setOrderBook(rows);
  }, [sliderValue, isSearched, compact]);

  const totalBid = orderBook.reduce((s, r) => s + (r.bidVol || 0), 0);
  const totalAsk = orderBook.reduce((s, r) => s + (r.askVol || 0), 0);
  const sum5Bid = orderBook.slice(0, 5).reduce((s, r) => s + (r.bidVol || 0), 0);
  const sum5Ask = orderBook.slice(0, 5).reduce((s, r) => s + (r.askVol || 0), 0);

  const handleSearch = () => {
    if (!symbol) return;
    onSymbolChange(idx, symbol);
    setIsSearched(true);
    setIsPlaying(true);
  };

  const p = compact ? "p-1.5" : "p-3";
  const txt = compact ? "text-[9px]" : "text-xs";
  const h = compact ? "h-[30px]" : "h-[38px]";

  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col min-h-0 relative overflow-hidden">
      <style>{`.cs::-webkit-scrollbar{width:3px}.cs::-webkit-scrollbar-track{background:#1e293b}.cs::-webkit-scrollbar-thumb{background:#475569;border-radius:4px}`}</style>

      {/* Header */}
      <div className={`${p} border-b border-slate-700 bg-[#0f172a] shrink-0`}>
        {/* Row 1: Symbol, Start Date, End Date */}
        <div className="flex gap-1.5 mb-1.5">
          {/* Symbol */}
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center bg-[#111827] border rounded px-2 ${h} ${isFocused ? "border-cyan-500" : "border-slate-600"}`}>
              <input
                value={symbol}
                onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setShowDrop(true); }}
                onFocus={() => { setIsFocused(true); setShowDrop(true); }}
                onBlur={() => setTimeout(() => { setShowDrop(false); setIsFocused(false); }, 150)}
                placeholder=""
                className={`w-full bg-transparent outline-none text-white font-bold ${txt}`}
              />
              {symbol && (
                <button onClick={() => { setSymbol(""); setIsSearched(false); onSymbolChange(idx, ""); }} className="text-slate-500 hover:text-red-400 ml-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <label className={`absolute left-2 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>Symbol*</label>
            {showDrop && filtered.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-0.5 bg-[#0f172a] border border-slate-700 rounded shadow-xl z-50 max-h-32 overflow-y-auto cs">
                {filtered.map((s) => (
                  <div key={s} onMouseDown={(e) => { e.preventDefault(); setSymbol(s); setShowDrop(false); onSymbolChange(idx, s); }}
                    className={`px-2 py-1 hover:bg-cyan-500/20 cursor-pointer font-bold ${txt}`}>{s}</div>
                ))}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center bg-[#111827] border border-slate-600 rounded px-2 ${h}`}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className={`w-full bg-transparent outline-none text-white ${txt}`} style={{ colorScheme: "dark" }} />
            </div>
            <label className={`absolute left-2 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>Start Date</label>
          </div>

          {/* End Date */}
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center bg-[#111827] border border-slate-600 rounded px-2 ${h} opacity-70`}>
              <input type="date" value={startDate} disabled
                className={`w-full bg-transparent outline-none text-slate-400 ${txt}`} style={{ colorScheme: "dark" }} />
            </div>
            <label className={`absolute left-2 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>End Date</label>
          </div>
        </div>

        {/* Row 2: Times + Speed + Search */}
        <div className="flex gap-1.5">
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center bg-[#111827] border border-slate-600 rounded px-2 ${h}`}>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className={`w-full bg-transparent outline-none text-white font-mono ${txt}`} style={{ colorScheme: "dark" }} />
            </div>
            <label className={`absolute left-2 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>Start Time</label>
          </div>
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center bg-[#111827] border border-slate-600 rounded px-2 ${h}`}>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className={`w-full bg-transparent outline-none text-white font-mono ${txt}`} style={{ colorScheme: "dark" }} />
            </div>
            <label className={`absolute left-2 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>End Time</label>
          </div>
          <div className="relative" style={{ width: compact ? 36 : 48 }}>
            <div className={`flex items-center bg-[#111827] border border-slate-600 rounded px-1.5 ${h}`}>
              <input type="number" min="1" max="10" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                className={`w-full bg-transparent outline-none text-white font-mono text-center ${txt}`} />
            </div>
            <label className={`absolute left-1 -top-1.5 px-0.5 bg-[#0f172a] text-slate-400 ${compact ? "text-[8px]" : "text-[9px]"}`}>Spd</label>
          </div>
          <button onClick={handleSearch}
            className={`bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-white transition-colors flex items-center justify-center ${compact ? "px-2" : "px-3"} ${h} ${txt}`}>
            {compact
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
              : "SEARCH"}
          </button>
          {/* Star favorite */}
          <button onClick={() => symbol && onAddFavorite(symbol)}
            title="Add to Favorites"
            className={`flex items-center justify-center rounded border border-slate-600 bg-[#111827] hover:border-yellow-400 hover:text-yellow-400 text-slate-500 transition-all ${h} ${compact ? "w-7" : "w-9"}`}>
            <svg className={compact ? "w-3 h-3" : "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>

        {/* Time display */}
        <div className={`mt-1.5 bg-black text-yellow-400 font-mono text-center rounded ${compact ? "py-0.5 text-[9px]" : "py-1 text-xs"}`}>
          {currentTime}
        </div>
      </div>

      {/* Order Book */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#0b111a] overflow-hidden">
        {/* Column headers */}
        <div className={`grid grid-cols-4 border-b border-slate-700 bg-[#111827] ${compact ? "text-[8px] py-0.5" : "text-[10px] py-1"} text-slate-400 font-semibold`}>
          <div className="text-right pr-2">Vol BID</div>
          <div className="text-center">BID</div>
          <div className="text-center">ASK</div>
          <div className="text-left pl-2">Vol ASK</div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto cs">
          {orderBook.map((row, i) => (
            <OrderRow key={i} bidVol={typeof row.bidVol === "number" ? row.bidVol.toLocaleString() : "0"}
              bid={row.bid} ask={row.ask} askVol={typeof row.askVol === "number" ? row.askVol.toLocaleString() : "0"} compact={compact} />
          ))}
        </div>

        {/* Summary row */}
        <div className={`grid grid-cols-4 border-t border-slate-700 bg-[#111827] font-bold shrink-0 ${compact ? "text-[8px] py-0.5" : "text-[10px] py-1"}`}>
          <div className="text-right pr-2 text-blue-400">{isSearched ? totalBid.toLocaleString() : "0"}</div>
          <div className="text-center text-blue-300 truncate px-1">{isSearched ? `${sum5Bid.toLocaleString()}` : "0"}</div>
          <div className="text-center text-red-300 truncate px-1">{isSearched ? `${sum5Ask.toLocaleString()}` : "0"}</div>
          <div className="text-left pl-2 text-red-400">{isSearched ? totalAsk.toLocaleString() : "0"}</div>
        </div>
      </div>

      {/* Slider */}
      <div className={`${compact ? "px-2 py-1" : "px-3 py-2"} bg-[#0f172a] border-t border-slate-700 shrink-0`}>
        <div className="flex items-center gap-2">
          <input type="range" min="0" max="100" value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="flex-1 h-1 bg-slate-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
          <button onClick={() => isSearched && setIsPlaying((p) => !p)}
            className={`flex items-center justify-center rounded-full transition-colors ${isSearched ? "text-yellow-400 hover:text-yellow-300" : "text-slate-600"}`}>
            {isPlaying
              ? <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              : <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 gap-1.5 ${compact ? "p-1.5" : "p-3"} border-t border-slate-700 bg-[#0f172a] shrink-0`}>
        <StatBox title="In Range" compact={compact} />
        <StatBox title="Actual" compact={compact} />
      </div>
    </div>
  );
}

/* ─────────────── ORDER ROW ─────────────── */
function OrderRow({ bidVol, bid, ask, askVol, compact }) {
  const bv = parseInt((bidVol || "0").replace(/,/g, "")) || 0;
  const av = parseInt((askVol || "0").replace(/,/g, "")) || 0;
  const bidW = Math.min((bv / 600000) * 100, 100);
  const askW = Math.min((av / 600000) * 100, 100);
  const h = compact ? "min-h-[18px]" : "min-h-[24px]";
  const t = compact ? "text-[8px]" : "text-[10px]";

  return (
    <div className={`grid grid-cols-4 items-center ${t} ${h} border-b border-slate-800/60 relative`}>
      <div className="relative text-right pr-2 text-slate-300 overflow-hidden h-full flex items-center justify-end">
        <div className="absolute right-0 top-0 h-full bg-blue-900/40" style={{ width: `${bidW}%` }} />
        <span className="relative z-10">{bidVol === "0" ? "-" : bidVol}</span>
      </div>
      <div className="text-center text-green-400 font-bold">{bid}</div>
      <div className="text-center text-red-400 font-bold">{ask}</div>
      <div className="relative text-left pl-2 text-slate-300 overflow-hidden h-full flex items-center">
        <div className="absolute left-0 top-0 h-full bg-red-900/40" style={{ width: `${askW}%` }} />
        <span className="relative z-10">{askVol === "0" ? "-" : askVol}</span>
      </div>
    </div>
  );
}

/* ─────────────── STAT BOX ─────────────── */
function StatBox({ title, compact }) {
  const t = compact ? "text-[8px]" : "text-[10px]";
  return (
    <div className="bg-[#111827] border border-slate-700 rounded overflow-hidden">
      <div className={`px-2 py-0.5 ${t} text-slate-400 border-b border-slate-700 bg-[#1e293b]`}>{title}</div>
      <div className={`grid grid-cols-4 px-2 ${compact ? "py-1" : "py-1.5"} ${t} font-bold text-white`}>
        <span>OPEN</span><span className="text-center">HIGH</span><span className="text-center">LOW</span><span className="text-right">CLOSE</span>
      </div>
      <div className={`grid grid-cols-4 px-2 pb-1 ${compact ? "text-[8px]" : "text-[10px]"} text-slate-300`}>
        <span>0</span><span className="text-center">0</span><span className="text-center">0</span><span className="text-right">0</span>
      </div>
    </div>
  );
}

/* ─────────────── HELPERS ─────────────── */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
