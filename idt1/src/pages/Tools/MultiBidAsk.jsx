// src/pages/Tools/MultiBidAsk.jsx
import React, { useState, useEffect, useRef } from "react";
import { ReplayPanel } from "./BidAsk";

const STORAGE_KEY = "multibidask_favorites";
const LAYOUT_KEY  = "multibidask_layout";

/* ── LAYOUT PRESETS ── */
const LAYOUTS = [
  { id: "2x1", cols: 2, rows: 1, label: "2",  icon: "grid-2"  },
  { id: "2x2", cols: 2, rows: 2, label: "4",  icon: "grid-4"  },
  { id: "3x2", cols: 3, rows: 2, label: "6",  icon: "grid-6"  },
  { id: "4x3", cols: 4, rows: 3, label: "12", icon: "grid-12" },
];

/* ── GRID ICON COMPONENTS ── */
const GridIcon = ({ cols, rows, active }) => {
  const color = active ? "#60a5fa" : "#6b7280";
  const size = 18;
  const gap = 1;
  const cellW = (size - (cols - 1) * gap) / cols;
  const cellH = (size - (rows - 1) * gap) / rows;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * (cellW + gap)}
            y={r * (cellH + gap)}
            width={cellW}
            height={cellH}
            rx={1.5}
            fill={color}
            opacity={active ? 1 : 0.6}
          />
        ))
      )}
    </svg>
  );
};

export default function MultiBidAsk() {
  /* ── STATE ── */
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(LAYOUT_KEY) || "2x2"; } catch { return "2x2"; }
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  /* panels: each slot can have a symbol assigned */
  const currentLayout = LAYOUTS.find(l => l.id === layout) || LAYOUTS[1];
  const panelCount = currentLayout.cols * currentLayout.rows;

  const [panelSymbols, setPanelSymbols] = useState(() => Array(12).fill(""));

  const dropdownRef = useRef(null);

  /* ── PERSIST ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  /* ── OUTSIDE CLICK ── */
  useEffect(() => {
    const fn = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* ── HANDLERS ── */
  const addFavorite = () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym || favorites.includes(sym)) { setShowAddInput(false); setAddInput(""); return; }
    setFavorites([...favorites, sym]);
    setAddInput("");
    setShowAddInput(false);
  };

  const removeFavorite = (sym) => setFavorites(favorites.filter((f) => f !== sym));

  const assignSymbolToPanel = (index, sym) => {
    setPanelSymbols(prev => {
      const next = [...prev];
      next[index] = sym;
      return next;
    });
  };

  return (
    <div className="w-full min-h-screen lg:h-[calc(100dvh-64px)] lg:overflow-hidden bg-[#0b111a] text-white flex flex-col">

      {/* ══════════ TOOLBAR ══════════ */}
      <div className="flex items-center justify-between gap-3 px-3 md:px-6 py-2.5 border-b border-slate-700/60 bg-[#0d1320] shrink-0">

        {/* LEFT: Layout Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline font-medium">Layout :</span>
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                layout === l.id
                  ? "bg-blue-500/20 ring-1 ring-blue-500/40"
                  : "hover:bg-white/5"
              }`}
              title={`${l.label} panels`}
            >
              <GridIcon cols={l.cols} rows={l.rows} active={layout === l.id} />
            </button>
          ))}
        </div>

        {/* RIGHT: Favorites & Add */}
        <div className="flex items-center gap-2">

          {/* Favorites Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm font-semibold transition-all duration-200 ${
                dropdownOpen
                  ? "bg-[#1e293b] border-blue-500/50 text-blue-300"
                  : "bg-[#111827] border-slate-600 hover:border-slate-400 text-white"
              }`}
            >
              {/* Heart icon */}
              <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="hidden sm:inline">Favorites</span>
              <span className="bg-slate-600/60 text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                {favorites.length}
              </span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-56 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
                <div className="px-3 py-2 border-b border-slate-700/50 text-[11px] text-slate-400 font-medium uppercase tracking-wide">
                  Saved Symbols
                </div>
                {favorites.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-slate-500 text-center">
                    <svg className="w-6 h-6 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    No favorites yet
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {favorites.map((sym) => (
                      <div key={sym} className="flex items-center justify-between px-3 py-2 hover:bg-slate-700/40 cursor-pointer group transition-colors">
                        <span className="text-sm font-bold text-white tracking-wide">{sym}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFavorite(sym); }}
                          className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs p-1 rounded hover:bg-red-500/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ADD TO FAVORITE */}
          {showAddInput ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={addInput}
                onChange={(e) => setAddInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") addFavorite(); if (e.key === "Escape") { setShowAddInput(false); setAddInput(""); } }}
                placeholder="Symbol..."
                className="px-3 py-1.5 bg-[#111827] border border-indigo-500 rounded-md text-sm text-white outline-none w-28 font-bold placeholder-slate-500"
              />
              <button onClick={addFavorite} className="px-3 py-1.5 bg-red-500 hover:bg-red-400 rounded-md text-sm font-bold text-white transition-colors">
                ADD
              </button>
              <button onClick={() => { setShowAddInput(false); setAddInput(""); }} className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm text-white transition-colors">
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 rounded-md text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════ GRID PANELS ══════════ */}
      <div className="flex-1 lg:min-h-0 overflow-auto p-2 md:p-4">
        <div
          className="h-full gap-2 md:gap-3"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${currentLayout.cols}, 1fr)`,
            gridTemplateRows: `repeat(${currentLayout.rows}, 1fr)`,
          }}
        >
          {Array.from({ length: panelCount }).map((_, i) => (
            <div key={`panel-${layout}-${i}`} className="min-h-[400px] lg:min-h-0">
              <ReplayPanel />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
