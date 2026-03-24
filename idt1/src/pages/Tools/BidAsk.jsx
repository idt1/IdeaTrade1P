// src/pages/tools/BidAsk.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

import BidAskDashboard from "./components/BidAskDashboard.jsx";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ToolHint from "@/components/ToolHint.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none'
};

export default function BidAsk() {
  const navigate = useNavigate();

  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [timeframe, setTimeframe] = useState("Day");

  const scrollContainerRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  const { accessData, isFreeAccess, currentUser } = useSubscription();

  /* ===============================  MEMBER CHECK  ================================ */
  useEffect(() => {
    if (isFreeAccess) {
      setIsMember(true);
      return;
    }

    const toolId = 'bidask';

    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;

      try {
        if (typeof expireTimestamp.toDate === 'function') {
          expireDate = expireTimestamp.toDate();
        } else {
          expireDate = new Date(expireTimestamp);
        }
      } catch (e) {
        expireDate = new Date(0);
      }

      if (expireDate.getTime() > new Date().getTime()) {
        setIsMember(true);
      } else {
        setIsMember(false);
      }
    } else {
      setIsMember(false);
    }
  }, [accessData, isFreeAccess]);

  /* ================= SCROLL LOGIC (Manual + Auto) ================= */
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } =
      scrollContainerRef.current;

    setShowLeft(scrollLeft > 1);
    setShowRight(
      Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2
    );
  };

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;

    isPaused.current = true;

    const { current } = scrollContainerRef;
    const scrollAmount = 350;

    if (direction === "left") {
      current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      scrollDirection.current = -1;
    } else {
      current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      scrollDirection.current = 1;
    }

    setTimeout(checkScroll, 300);
    setTimeout(() => { isPaused.current = false }, 500);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const speed = 1;
    const intervalTime = 15;

    const autoScrollInterval = setInterval(() => {
      if (isPaused.current || !container) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= maxScroll - 2) {
        scrollDirection.current = -1;
      } else if (scrollDirection.current === -1 && scrollLeft <= 2) {
        scrollDirection.current = 1;
      }

      container.scrollLeft += (scrollDirection.current * speed);
      checkScroll();
    }, intervalTime);

    return () => clearInterval(autoScrollInterval);
  }, [isMember, enteredTool]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const features = [
    {
      title: "Historical Market Replay",
      desc: "Replay market tick-by-tick to analyze order flow impact."
    },
    {
      title: "Supply & Demand Profiling",
      desc: "Analyze order density at every price level."
    },
    {
      title: "Comparative Liquidity View",
      desc: "Compare liquidity between assets side-by-side."
    },
    {
      title: "Momentum Visualization",
      desc: "Visualize bid/ask pressure over time."
    }
  ];

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  ========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}
        </style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                BidAsk
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Deciphering "Big Money" through Order Flow Intelligence
            </p>
          </div>

          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>

            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
              </div>

              <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden group">
                <div className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
                  <BidAskDashboard />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
              4 Main Features
            </h2>

            <div
              className="relative group"
              onMouseEnter={() => isPaused.current = true}
              onMouseLeave={() => isPaused.current = false}
            >

              <button
                onClick={() => scroll("left")}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 
                          w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                          hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                          hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                          flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                          active:scale-95
                          ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                aria-label="Scroll Left"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto gap-4 md:gap-6 py-4 px-1 hide-scrollbar"
                style={scrollbarHideStyle}
              >
                {features.map((item, index) => (
                  <div
                    key={index}
                    className="
                        w-[280px] md:w-[350px] lg:w-[400px] flex-shrink-0
                        group/card bg-[#0f172a]/60 border border-slate-700/50 p-6 md:p-8 rounded-xl 
                        hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300
                    "
                  >
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scroll("right")}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 
                          w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                          hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                          hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                          flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                          active:scale-95
                          ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                aria-label="Scroll Right"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

            </div>
          </div>

          {/* CTA Buttons */}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">

              {!currentUser && (
                <button
                  onClick={() => navigate("/login")}
                  className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
                >
                  Sign In
                </button>
              )}

              <button
                onClick={() => navigate("/member-register")}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
              >
                Join Membership
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ==========================================================
     CASE 2 : START SCREEN (MEMBER BUT NOT ENTERED)
  ========================================================== */
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}
        </style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                BidAsk
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Deciphering "Big Money" through Order Flow Intelligence
            </p>
          </div>

          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>

            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
              </div>

              <div className="aspect-[16/9] w-full bg-[#0B1221] relative overflow-hidden group">
                <div className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
                  <BidAskDashboard />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
              4 Main Features
            </h2>

            <div
              className="relative group"
              onMouseEnter={() => isPaused.current = true}
              onMouseLeave={() => isPaused.current = false}
            >

              <button
                onClick={() => scroll("left")}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 
                          w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                          hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                          hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                          flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                          active:scale-95
                          ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                aria-label="Scroll Left"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto gap-4 md:gap-6 py-4 px-1 hide-scrollbar"
                style={scrollbarHideStyle}
              >
                {features.map((item, index) => (
                  <div
                    key={index}
                    className="
                        w-[280px] md:w-[350px] lg:w-[400px] flex-shrink-0
                        group/card bg-[#0f172a]/60 border border-slate-700/50 p-6 md:p-8 rounded-xl 
                        hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300
                    "
                  >
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scroll("right")}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 
                          w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white 
                          hover:bg-cyan-500 hover:border-cyan-400 hover:text-white 
                          hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] 
                          flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                          active:scale-95
                          ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                aria-label="Scroll Right"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

            </div>
          </div>

          <div className="text-center w-full max-w-md mx-auto mt-4">
            <button
              onClick={() => {
                setEnteredTool(true);
                localStorage.setItem("BidAskToolEntered", "true");
              }}
              className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2">Start Using Tool</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ==========================================================
     CASE 3 : FULL PRODUCTION DASHBOARD
     - Mobile:          min-h-screen, panels stack vertically (h-[600px] each)
     - Tablet landscape (lg: 1024px+): side-by-side, fills h-screen
     - Desktop (xl):    same as lg
  ========================================================== */
  return (
    <div className="w-full min-h-screen lg:h-[calc(100dvh-64px)] lg:overflow-hidden bg-[#0b111a] text-white px-3 md:px-6 py-3 md:py-6 flex flex-col">
      <div className="max-w-[1800px] mx-auto flex-1 lg:min-h-0 flex flex-col">

        {/* TWO PANELS
            - Mobile:           stack vertically, each panel h-[600px]
            - Tablet landscape+ (lg): side-by-side, fill remaining height
        */}
        <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 overflow-visible pt-4">
          <ReplayPanel
            toolHint={
              <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                Replay market tick-by-tick data, analyze bid/ask pressure, and visualize order flow intelligence to decipher "big money" moves
              </ToolHint>
            }
          />
          <ReplayPanel />
        </div>

      </div>
    </div>
  );
}

// Sub-components
function Badge({ label, value, color }) {
  const colors = {
    green: "text-green-400",
    blue: "text-blue-400",
    red: "text-red-400",
  };

  return (
    <div className="flex items-center gap-2 bg-[#111827] border border-slate-700 px-4 py-2 rounded-full">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${colors[color]}`}>
        {value}
      </span>
    </div>
  );
}

function ChartCard({ title }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-[#0f172a] border-b border-slate-700 text-sm text-slate-300">
        {title}
      </div>
      <div className="h-[300px] flex items-center justify-center text-slate-500">
        Chart Area
      </div>
    </div>
  );
}

function ReplayPanel({ toolHint }) {
  const [symbol, setSymbol] = useState("");
  const [isSearched, setIsSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [symbolHistory, setSymbolHistory] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);

  const generateEmptyOrderBook = () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push({ bidVol: 0, bid: "-", ask: "-", askVol: 0 });
    }
    return rows;
  };

  const today = new Date();

  const formatDate = (date) => date.toISOString().split("T")[0];
  const formatTime = (date) => date.toTimeString().slice(0, 5);

  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate] = useState(formatDate(today));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime] = useState(formatTime(today));

  const [sliderValue, setSliderValue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [orderBook, setOrderBook] = useState([]);

  const totalBid = orderBook.reduce((sum, row) => sum + (row.bidVol || 0), 0);
  const totalAsk = orderBook.reduce((sum, row) => sum + (row.askVol || 0), 0);

  const toSeconds = (time) => {
    if (!time || !time.includes(":")) return 0;
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 3600 + m * 60;
  };

  const toHHMMSS = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem("bidask_symbol_history");
    if (saved) setSymbolHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!symbol.trim()) {
      setFilteredSymbols(symbolHistory);
      return;
    }
    const filtered = symbolHistory.filter((item) =>
      item.toLowerCase().includes(symbol.toLowerCase())
    );
    setFilteredSymbols(filtered);
  }, [symbol, symbolHistory]);

  useEffect(() => {
    const startSec = toSeconds(startTime);
    const endSec = toSeconds(endTime);
    if (endSec <= startSec) return;
    const total = endSec - startSec;
    const current = startSec + (Number(sliderValue) / 100) * total;
    setCurrentTime(toHHMMSS(Math.floor(current)));
  }, [sliderValue, startTime, endTime]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSliderValue((prev) => {
        if (prev >= 100) { setIsPlaying(false); return 100; }
        return prev + speed;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const generateOrderBook = (timePercent) => {
    const basePrice = 72 - (timePercent * 0.02);
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const bidPrice = (basePrice - i * 0.25).toFixed(2);
      const askPrice = (parseFloat(bidPrice) + 0.25).toFixed(2);
      const bidVol = Math.floor(200000 + Math.random() * 400000);
      const askVol = Math.floor(200000 + Math.random() * 400000);
      rows.push({ bidVol, bid: bidPrice, ask: askPrice, askVol });
    }
    return rows;
  };

  useEffect(() => {
    setIsSearched(false);
    setIsPlaying(false);
  }, [symbol]);

  useEffect(() => {
    if (!isSearched) {
      setOrderBook(generateEmptyOrderBook());
      setIsPlaying(false);
      return;
    }
    const newBook = generateOrderBook(sliderValue);
    setOrderBook(newBook);
  }, [sliderValue, isSearched]);

  return (
    /*
      Mobile:               fixed height 600px, scrollable internally
      Tablet landscape+ (lg): flex flex-col h-full min-h-0 (fills grid cell)
    */
    <div className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col h-[600px] lg:h-full lg:min-h-0 relative">

      {/* ToolHint — ลอยบนขอบบนซ้าย */}
      {toolHint && (
        <div style={{ position: "absolute", top: "-11px", left: "-11px", zIndex: 20 }}>
          {toolHint}
        </div>
      )}

      <div className="p-3 md:p-4 border-b border-slate-700 bg-[#0f172a] shrink-0 relative">
        {/* Row 1: Symbol | Start Date | End Date */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-2 md:mb-3 text-xs text-slate-500">

          {/* SYMBOL */}
          <div className="relative">
            <div className="relative bg-[#111827] border border-slate-600 rounded-md px-3 py-2 flex items-center">
              <input
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setShowSymbolDropdown(true);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setShowSymbolDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSymbolDropdown(false), 150);
                  setIsFocused(false);
                }}
                className="w-full bg-transparent outline-none text-white text-xs pr-5"
              />

              {/* ปุ่ม Clear */}
              {symbol && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSymbol("");
                    setIsSearched(false);
                    setIsPlaying(false);
                    setShowSymbolDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Clear symbol"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {showSymbolDropdown && filteredSymbols.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                {filteredSymbols.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSymbol(item);
                      setShowSymbolDropdown(false);
                    }}
                    className="px-3 py-2 text-xs text-white hover:bg-indigo-600 cursor-pointer transition"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}

            <label
              className={`absolute left-2 md:left-3 text-[10px] px-1 bg-[#0f172a] text-slate-300 transition-all duration-200 ease-in-out pointer-events-none ${
                isFocused || symbol ? "-top-2" : "top-2"
              }`}
            >
              Symbol*
            </label>
          </div>

          {/* START DATE */}
          <div className="relative">
            <div className="bg-[#111827] border border-slate-600 rounded-md px-2 md:px-3 py-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent outline-none text-white text-xs 
                          [&::-webkit-calendar-picker-indicator]:invert
                          [&::-webkit-calendar-picker-indicator]:opacity-70"
              />
            </div>
            <label className="absolute left-2 md:left-3 -top-2 text-[10px] px-1 bg-[#0f172a] text-slate-300">
              Start Date
            </label>
          </div>

          {/* END DATE (LOCKED) */}
          <div className="relative">
            <div className="bg-[#0f172a] border border-slate-700 rounded-md px-2 md:px-3 py-2 opacity-80">
              <input
                type="date"
                value={endDate}
                disabled
                className="w-full bg-transparent outline-none text-slate-500 text-xs cursor-not-allowed
                          [&::-webkit-calendar-picker-indicator]:invert
                          [&::-webkit-calendar-picker-indicator]:opacity-40"
              />
            </div>
            <label className="absolute left-2 md:left-3 -top-2 text-[10px] px-1 bg-[#0f172a] text-slate-300">
              End Date
            </label>
          </div>
        </div>

        {/* Row 2: Start Time | End Time | Speed + Search */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 text-xs text-slate-400">

          {/* START TIME */}
          <div className="relative">
            <div className="bg-[#111827] border border-slate-600 rounded-md px-2 md:px-3 py-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-transparent outline-none text-white text-xs
                          [&::-webkit-calendar-picker-indicator]:invert
                          [&::-webkit-calendar-picker-indicator]:opacity-80"
              />
            </div>
            <label className="absolute left-2 md:left-3 -top-2 text-[10px] px-1 bg-[#0f172a] text-slate-300">
              Start Time
            </label>
          </div>

          {/* END TIME */}
          <div className="relative">
            <div className="bg-[#0f172a] border border-slate-700 rounded-md px-2 md:px-3 py-2 opacity-80">
              <input
                type="time"
                value={endTime}
                disabled
                className="w-full bg-transparent outline-none text-slate-500 text-xs cursor-not-allowed
                          [&::-webkit-calendar-picker-indicator]:invert
                          [&::-webkit-calendar-picker-indicator]:opacity-40"
              />
            </div>
            <label className="absolute left-2 md:left-3 -top-2 text-[10px] px-1 bg-[#0f172a] text-slate-300">
              End Time
            </label>
          </div>

          {/* SPEED + SEARCH */}
          <div className="grid grid-cols-2 gap-1 md:gap-3">

            {/* SPEED */}
            <div className="relative">
              <div className="bg-[#111827] border border-slate-600 rounded-md px-2 md:px-3 py-2">
                <input
                  type="number"
                  value={speed}
                  min="1"
                  max="10"
                  step="1"
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full bg-transparent outline-none text-white text-xs"
                />
              </div>
              <label className="absolute left-2 md:left-3 -top-2 text-[10px] px-1 bg-[#0f172a] text-slate-300">
                Speed
              </label>
            </div>

            {/* SEARCH */}
            <button
              onClick={() => {
                if (!symbol.trim()) return;
                const updated = [
                  symbol,
                  ...symbolHistory.filter((s) => s !== symbol)
                ].slice(0, 10);
                setSymbolHistory(updated);
                localStorage.setItem("bidask_symbol_history", JSON.stringify(updated));
                setIsSearched(true);
                setSliderValue(0);
                setIsPlaying(true);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs md:text-sm font-semibold text-white transition"
            >
              SEARCH
            </button>

          </div>
        </div>

        <div className="mt-2 md:mt-3 bg-black text-yellow-400 font-mono text-center py-1.5 md:py-2 rounded text-sm md:text-base">
          {currentTime}
        </div>
      </div>

      {/* ORDER BOOK */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#0b111a]">

        {/* Scrollable Order Rows */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {orderBook.map((row, i) => (
            <OrderRow
              key={i}
              bidVol={row.bidVol.toLocaleString()}
              bid={row.bid}
              ask={row.ask}
              askVol={row.askVol.toLocaleString()}
            />
          ))}
        </div>

        {/* TOTAL ROW */}
        <div className="shrink-0 grid grid-cols-4 h-[36px] items-center border-t border-slate-700 bg-[#111827] text-[11px] md:text-[12px] font-semibold">
          <div className="text-right pr-2 md:pr-3 text-blue-400">
            Total: {totalBid.toLocaleString()}
          </div>
          <div></div>
          <div></div>
          <div className="text-left pl-2 md:pl-3 text-red-400">
            Total: {totalAsk.toLocaleString()}
          </div>
        </div>

      </div>

      {/* SLIDER */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-[#0f172a] border-t border-slate-700 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="flex-1 h-[3px] appearance-none bg-slate-600 rounded-full 
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-yellow-400
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <button
            onClick={() => {
              if (!symbol.trim()) return;
              setIsPlaying(!isPlaying);
            }}
            disabled={!isSearched}
            className={`w-8 h-8 flex items-center justify-center 
              rounded-full transition-all duration-200
              ${isSearched ? "text-white" : "text-slate-600 cursor-not-allowed"}
            `}
          >
            {isPlaying ? (
              <PauseIcon fontSize="small" />
            ) : (
              <PlayArrowIcon fontSize="small" />
            )}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 p-3 md:p-4 border-t border-slate-700 bg-[#0f172a] shrink-0">
        <StatSection title="In Range" />
        <StatSection title="Actual" />
      </div>

    </div>
  );
}

function OrderRow({ bidVol, bid, ask, askVol }) {
  const maxVolume = 500000;
  const bidWidth = (parseInt(bidVol.replace(/,/g, "")) / maxVolume) * 100;
  const askWidth = (parseInt(askVol.replace(/,/g, "")) / maxVolume) * 100;

  return (
    <div className="grid grid-cols-4 items-center text-[11px] md:text-[12px] h-[32px] border-b border-slate-800 relative">

      {/* BID VOL */}
      <div className="relative text-right pr-2 md:pr-3 text-slate-300 font-medium overflow-hidden">
        <div
          className="absolute right-0 top-0 h-full bg-blue-900/60"
          style={{ width: `${bidWidth}%` }}
        />
        <span className="relative z-10">{bidVol}</span>
      </div>

      {/* BID PRICE */}
      <div className="text-center text-green-400 font-semibold">
        {bid}
      </div>

      {/* ASK PRICE */}
      <div className="text-center text-red-400 font-semibold">
        {ask}
      </div>

      {/* ASK VOL */}
      <div className="relative text-left pl-2 md:pl-3 text-slate-300 font-medium overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-red-900/60"
          style={{ width: `${askWidth}%` }}
        />
        <span className="relative z-10">{askVol}</span>
      </div>

    </div>
  );
}

function StatSection({ title }) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded">
      <div className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] text-slate-400 border-b border-slate-700 bg-[#1e293b]">
        {title}
      </div>
      <div className="grid grid-cols-4 text-[9px] md:text-[10px] text-slate-500 px-2 md:px-3 pt-1.5 md:pt-2">
        <span>OPEN</span>
        <span>HIGH</span>
        <span>LOW</span>
        <span>CLOSE</span>
      </div>
      <div className="grid grid-cols-4 px-2 md:px-3 pb-2 md:pb-3 pt-1 text-[12px] md:text-[13px] font-semibold text-white">
        <span>71.00</span>
        <span>73.50</span>
        <span>70.75</span>
        <span>72.25</span>
      </div>
    </div>
  );
}

function StatBox({ title, value }) {
  return (
    <div className="bg-[#111827] border border-slate-700 p-2 rounded flex justify-between">
      <span className="text-slate-400">{title}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}