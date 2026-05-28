// src/pages/Tools/MultiBidAsk.jsx
import React, { useState, useEffect, useRef } from "react";
import { ReplayPanel } from "./BidAsk";

const STORAGE_KEY = "multibidask_favorites";

export default function MultiBidAsk() {
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const dropdownRef = useRef(null);

  /* persist */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  /* close dropdown on outside click */
  useEffect(() => {
    const fn = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const addFavorite = () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym || favorites.includes(sym)) { setShowAddInput(false); setAddInput(""); return; }
    setFavorites([...favorites, sym]);
    setAddInput("");
    setShowAddInput(false);
  };

  const removeFavorite = (sym) => setFavorites(favorites.filter((f) => f !== sym));

  return (
    <div className="w-full min-h-screen lg:h-[calc(100dvh-64px)] lg:overflow-hidden bg-[#0b111a] text-white flex flex-col">

      {/* ── FAVORITES TOOLBAR ── */}
      <div className="flex items-center justify-end gap-3 px-3 md:px-6 py-2 border-b border-slate-700 bg-[#0b111a] shrink-0">

        {/* Favorite List Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#111827] border border-slate-600 hover:border-slate-400 rounded text-sm font-semibold transition-colors"
          >
            <span>Favorite List</span>
            <svg className={`w-3 h-3 ml-1 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              {favorites.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400">No favorites yet</div>
              ) : (
                favorites.map((sym) => (
                  <div key={sym} className="flex items-center justify-between px-3 py-2 hover:bg-slate-700/50 cursor-pointer group">
                    <span className="text-sm font-bold text-white">{sym}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFavorite(sym); }}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >✕</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ADD TO FAVORITE */}
        {showAddInput ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={addInput}
              onChange={(e) => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") addFavorite(); if (e.key === "Escape") { setShowAddInput(false); setAddInput(""); } }}
              placeholder="Symbol..."
              className="px-3 py-1.5 bg-[#111827] border border-indigo-500 rounded text-sm text-white outline-none w-28 font-bold"
            />
            <button onClick={addFavorite} className="px-3 py-1.5 bg-red-500 hover:bg-red-400 rounded text-sm font-bold text-white transition-colors">
              ADD
            </button>
            <button onClick={() => { setShowAddInput(false); setAddInput(""); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-400 rounded text-sm font-bold text-white transition-colors"
          >
            <span>ADD TO FAVORITE</span>
          </button>
        )}
      </div>

      {/* ── PANELS ── */}
      <div className="flex-1 lg:min-h-0 flex flex-col px-2 md:px-6 py-2 md:py-4">
        <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          <ReplayPanel />
          <ReplayPanel />
        </div>
      </div>

    </div>
  );
}
