// src/pages/tools/BidAsk.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

// 🟢 ดึงข้อมูลผู้ใช้จากศูนย์กลาง
import { useAuth } from "@/context/AuthContext"; 

import BidAskDashboard from "./components/BidAskDashboard.jsx";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import CloseIcon from "@mui/icons-material/Close";
import ToolHint from "@/components/ToolHint.jsx";

const scrollbarHideStyle = { msOverflowStyle: "none", scrollbarWidth: "none" };

export default function BidAsk() {
    const navigate = useNavigate();

    const [isMember, setIsMember] = useState(false);
    const [enteredTool, setEnteredTool] = useState(false);

    const scrollContainerRef = useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);
    const scrollDirection = useRef(1);
    const isPaused = useRef(false);

    const { userData, currentUser, loading } = useAuth();

    /* ================= MEMBER CHECK ================= */
    useEffect(() => {
        if (loading) return; 

        const toolId = "bidask"; 

        if (userData && userData.subscriptions && userData.subscriptions[toolId]) {
            const expireTimestamp = userData.subscriptions[toolId];
            let expireDate;
            try { 
                expireDate = typeof expireTimestamp.toDate === "function" 
                    ? expireTimestamp.toDate() 
                    : new Date(expireTimestamp); 
            } catch (e) { 
                expireDate = new Date(0); 
            }
            setIsMember(expireDate.getTime() > new Date().getTime());
        } else { 
            const saved = localStorage.getItem("userProfile");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setIsMember(parsed.role === "member" || parsed.role === "membership" || parsed.unlockedItems?.includes("bidask"));
                } catch (error) {
                    setIsMember(false);
                }
            } else {
                setIsMember(false);
            }
        }
    }, [userData, loading]);

    /* ================= SCROLL LOGIC ================= */
    const checkScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeft(scrollLeft > 1);
        setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
    };

    const scroll = (direction) => {
        if (!scrollContainerRef.current) return;
        isPaused.current = true;
        scrollContainerRef.current.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
        scrollDirection.current = direction === "left" ? -1 : 1;
        setTimeout(checkScroll, 300);
        setTimeout(() => { isPaused.current = false; }, 500);
    };

    // 🟢 แก้ไข 2: ใช้ requestAnimationFrame + Delta time เพื่อการเลื่อนที่สมูทขั้นสุด (60fps/120fps)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let animationFrameId;
        let lastTime = performance.now();
        const speed = 0.05; // ความเร็ว 0.05 px ต่อ ms (ปรับให้ลื่นไหลพอดี)

        const scrollLoop = (time) => {
            if (!isPaused.current && container) {
                const deltaTime = time - lastTime;
                const { scrollLeft, scrollWidth, clientWidth } = container;
                const maxScroll = scrollWidth - clientWidth;
                
                if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= maxScroll - 2) {
                    scrollDirection.current = -1;
                } else if (scrollDirection.current === -1 && scrollLeft <= 2) {
                    scrollDirection.current = 1;
                }
                
                container.scrollLeft += scrollDirection.current * (deltaTime * speed);
            }
            lastTime = time;
            animationFrameId = requestAnimationFrame(scrollLoop);
        };

        animationFrameId = requestAnimationFrame(scrollLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isMember, enteredTool]);

    useEffect(() => {
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, []);

    /* ================= SHARED PREVIEW JSX ================= */
    const features = [
        { title: "Historical Market Replay", desc: "Replay market tick-by-tick to analyze order flow impact." },
        { title: "Supply & Demand Profiling", desc: "Analyze order density at every price level." },
        { title: "Comparative Liquidity View", desc: "Compare liquidity between assets side-by-side." },
        { title: "Momentum Visualization", desc: "Visualize bid/ask pressure over time." }
    ];

    const headerJSX = (
        <div className="text-center mb-8 md:mb-10 mt-6 md:mt-0">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    BidAsk
                </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg lg:text-xl font-light px-4">
                Deciphering "Big Money" through Order Flow Intelligence
            </p>
        </div>
    );

const dashboardPreviewJSX = ( 
        <div className="relative group w-full max-w-5xl mb-12 md:mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-[#0f172a] px-4 py-2 md:py-3 flex items-center justify-between border-b border-slate-700/50">
                    <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80" />
                    </div>
                </div>
                
                <div className="aspect-video md:aspect-[19/10] w-full bg-[#0B1221] relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
                        <BidAskDashboard />
                    </div>
                </div>
            </div>
        </div>
    );

  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
        4 Main Features
      </h2>
      <div 
        className="relative group" 
        onMouseEnter={() => { isPaused.current = true; }} 
        onMouseLeave={() => { isPaused.current = false; }}
      >
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll Left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20
                      w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white
                      hover:bg-cyan-500 hover:border-cyan-400 hover:text-white
                      hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
                      flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95
                      ${showLeft ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div 
          ref={scrollContainerRef} 
          onScroll={checkScroll} 
          className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" 
          style={scrollbarHideStyle}
        >
          {features.map((item, index) => (
            <div 
              key={index} 
              className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">
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
          aria-label="Scroll Right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20
                      w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white
                      hover:bg-cyan-500 hover:border-cyan-400 hover:text-white
                      hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
                      flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95
                      ${showRight ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

    /* ==========================================================
       CASE 1 : PREVIEW VERSION (Not Member)
    ========================================================== */
    if (!isMember) {
        return (
            <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
                    {headerJSX}
                    {dashboardPreviewJSX}
                    {featuresSectionJSX}
                    <div className="text-center w-full max-w-md mx-auto mt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                        {!currentUser && (
                            <button onClick={() => navigate("/login")} className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">
                                Sign In
                            </button>
                        )}
                        <button onClick={() => navigate("/member-register")} className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">
                            Join Membership
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ==========================================================
       CASE 2 : START SCREEN (MEMBER BUT NOT ENTERED)
    ========================================================== */
    if (!enteredTool) {
        return (
            <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
                    {headerJSX}
                    {dashboardPreviewJSX}
                    {featuresSectionJSX}
                    <div className="text-center w-full max-w-md mx-auto mt-4">
                        <button
                            onClick={() => setEnteredTool(true)}
                            className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
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
    ========================================================== */
    return (
        <div className="w-full min-h-screen lg:h-[calc(100dvh-64px)] lg:overflow-hidden bg-[#0b111a] text-white px-2 md:px-6 py-2 md:py-6 flex flex-col">
            <div className="w-full max-w-none mx-auto flex-1 lg:min-h-0 flex flex-col">
                <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 overflow-visible pt-2 md:pt-4">
                    <ReplayPanel
                        toolHint={
                            <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
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

// ---------------- Sub Components ----------------

function ReplayPanel({ toolHint }) {
    const [symbol, setSymbol] = useState("");
    const [isSearched, setIsSearched] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [symbolHistory, setSymbolHistory] = useState(["PTT", "TOP", "DELTA", "AOT", "ADVANC", "SCB", "KBANK", "CPALL"]);

    const filteredSymbols = useMemo(() => {
        if (!symbol) return symbolHistory.slice(0, 8);
        return symbolHistory.filter(s => s.toLowerCase().includes(symbol.toLowerCase()));
    }, [symbol, symbolHistory]);

    const tradingDates = useMemo(() => getTradingDates(), []);
    const [startDate, setStartDate] = useState(() => tradingDates[tradingDates.length - 1] ?? null);
    const [sliderValue, setSliderValue] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [startTime, setStartTime] = useState("10:00");
    const [endTime, setEndTime] = useState("14:46");
    const [currentTime, setCurrentTime] = useState("10:00:00");
    
    const [orderBook, setOrderBook] = useState(Array(20).fill({ bidVol: 0, bid: "-", ask: "-", askVol: 0 }));

    const totalBid = orderBook.reduce((sum, row) => sum + (row.bidVol || 0), 0);
    const totalAsk = orderBook.reduce((sum, row) => sum + (row.askVol || 0), 0);

    const sum5Bid = orderBook.slice(0, 5).reduce((sum, row) => sum + (row.bidVol || 0), 0);
    const sum5Ask = orderBook.slice(0, 5).reduce((sum, row) => sum + (row.askVol || 0), 0);
    const sum5Total = sum5Bid + sum5Ask;

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

    useEffect(() => {
        if (!isSearched) return;
        const basePrice = 72 - (sliderValue * 0.02);
        
        const newBook = Array(20).fill(0).map((_, i) => ({
            bidVol: Math.floor(200000 + Math.random() * 400000),
            bid: (basePrice - i * 0.25).toFixed(2),
            ask: (basePrice - i * 0.25 + 0.25).toFixed(2),
            askVol: Math.floor(200000 + Math.random() * 400000),
        }));
        setOrderBook(newBook);
    }, [sliderValue, isSearched]);

    return (
        <div className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col h-[550px] sm:h-[600px] lg:h-full lg:min-h-0 relative">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            `}</style>
            
            {/* 🟢 แก้ไข 3: ปรับ z-index ให้อยู่ระดับ 10 เพื่อไม่ให้ทะลุ Sidebar (ซึ่งปกติอยู่ > 40) */}
            {toolHint && <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 z-10">{toolHint}</div>}
            
            <div className="p-2 sm:p-3 md:p-4 border-b border-slate-700 bg-[#0f172a] shrink-0 relative">
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="relative flex-1 min-w-[150px] sm:min-w-[200px] basis-full sm:basis-auto">
                        <div className={`flex items-center bg-[#111827] border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 ${isFocused ? 'border-cyan-500' : 'border-slate-600'}`}>
                            <input
                                value={symbol}
                                onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setShowSymbolDropdown(true); }}
                                onFocus={() => { setIsFocused(true); setShowSymbolDropdown(true); }}
                                onBlur={() => setTimeout(() => { setShowSymbolDropdown(false); setIsFocused(false); }, 200)}
                                placeholder=""
                                className="w-full bg-transparent outline-none text-white text-xs font-bold"
                            />
                            {symbol && <button onClick={() => { setSymbol(""); setIsSearched(false); }} className="text-slate-500 hover:text-red-400"><CloseIcon sx={{ fontSize: 14 }} /></button>}
                        </div>
                        {showSymbolDropdown && (
                            <div className="absolute left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-md shadow-2xl z-40 max-h-40 overflow-y-auto custom-scrollbar">
                                {filteredSymbols.map(s => (
                                    <div key={s} onMouseDown={(e) => { e.preventDefault(); setSymbol(s); setShowSymbolDropdown(false); }} className="px-3 py-2 text-xs hover:bg-cyan-500/20 cursor-pointer font-bold">{s}</div>
                                ))}
                            </div>
                        )}
                        <label className="absolute left-2 -top-2 text-[9px] sm:text-[10px] px-1 bg-[#0f172a] text-slate-300">Symbol*</label>
                    </div>
                    <div className="flex-1 min-w-[120px] sm:min-w-[140px] z-20">
                        <DatePicker
                            dates={tradingDates}
                            selected={startDate}
                            onChange={setStartDate}
                            label="Start Date"
                        />
                    </div>
                    <div className="flex-1 min-w-[120px] sm:min-w-[140px] z-10">
                        <DatePicker
                            dates={tradingDates}
                            selected={startDate}
                            disabled={true}
                            label="End Date"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <div className="relative flex-1 min-w-[80px] sm:min-w-[100px]">
                        <div className="flex items-center justify-between bg-[#111827] border border-slate-600 rounded-md px-2 sm:px-3 h-[34px] sm:h-[38px] relative overflow-hidden group hover:border-slate-400 transition-colors">
                            <input 
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-transparent outline-none text-white text-[10px] sm:text-xs font-mono appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-10"
                                style={{ colorScheme: 'dark' }}
                            />
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 absolute right-2 sm:right-3 pointer-events-none group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <label className="absolute left-2 -top-2 text-[9px] sm:text-[10px] px-1 bg-[#0f172a] text-slate-300">Start Time</label>
                    </div>

                    <div className="relative flex-1 min-w-[80px] sm:min-w-[100px]">
                        <div className="flex items-center justify-between bg-[#111827] border border-slate-700 opacity-80 rounded-md px-2 sm:px-3 h-[34px] sm:h-[38px] relative overflow-hidden group hover:border-slate-500 transition-colors">
                            <input 
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-transparent outline-none text-slate-300 text-[10px] sm:text-xs font-mono appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-10"
                                style={{ colorScheme: 'dark' }}
                            />
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 absolute right-2 sm:right-3 pointer-events-none group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <label className="absolute left-2 -top-2 text-[9px] sm:text-[10px] px-1 bg-[#0f172a] text-slate-400">End Time</label>
                    </div>

                    <div className="relative flex-[0.5] min-w-[60px] sm:min-w-[70px]">
                        <div className="flex items-center bg-[#111827] border border-slate-600 rounded-md px-2 h-[34px] sm:h-[38px]">
                            <input 
                                type="number" 
                                min="1" max="10" 
                                value={speed} 
                                onChange={(e) => setSpeed(Number(e.target.value))} 
                                className="w-full bg-transparent outline-none text-white text-[10px] sm:text-xs font-mono" 
                            />
                        </div>
                        <label className="absolute left-2 -top-2 text-[9px] sm:text-[10px] px-1 bg-[#0f172a] text-slate-300">Speed</label>
                    </div>

                    <button onClick={() => { if (symbol) setIsSearched(true); setIsPlaying(true); }} className="flex-[1.5] min-w-[80px] sm:min-w-[100px] bg-indigo-600 hover:bg-indigo-500 rounded-md h-[34px] sm:h-[38px] text-[10px] sm:text-xs font-bold text-white transition-colors">SEARCH</button>
                </div>
                <div className="mt-2 bg-black text-yellow-400 font-mono text-center py-1 sm:py-1.5 rounded text-[9px] sm:text-[10px]">10:00:00</div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col bg-[#0b111a]">
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                    {orderBook.map((row, i) => (
                        <OrderRow key={i} bidVol={row.bidVol.toLocaleString()} bid={row.bid} ask={row.ask} askVol={row.askVol.toLocaleString()} />
                    ))}
                </div>
                <div className="shrink-0 grid grid-cols-4 items-center border-t border-slate-700 bg-[#111827] text-[9px] xl:text-xs h-8 sm:h-10 px-1 sm:px-0">
                    <div className="flex items-center justify-end pr-1 sm:pr-3 font-bold text-blue-400 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="hidden xl:inline">Total:&nbsp;</span>{totalBid.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-center gap-1 xl:gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="text-blue-400 text-[7px] xl:text-[10px] font-semibold hidden lg:inline">SUM5 BID</span>
                        <span className="text-white font-bold">{sum5Bid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 xl:gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="text-red-400 text-[7px] xl:text-[10px] font-semibold hidden lg:inline">SUM5 ASK</span>
                        <span className="text-white font-bold">{sum5Ask.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-start pl-1 sm:pl-3 font-bold text-red-400 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="hidden xl:inline">Total:&nbsp;</span>{totalAsk.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-[#0f172a] border-t border-slate-700 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                    <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => setSliderValue(e.target.value)} className="flex-1 h-1 bg-slate-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                    <button onClick={() => setIsPlaying(!isPlaying)} disabled={!isSearched} className={isSearched ? "text-white hover:text-yellow-400 transition-colors" : "text-slate-600"}>
                        {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 border-t border-slate-700 bg-[#0f172a] shrink-0">
                <StatSection title="In Range" />
                <StatSection title="Actual" />
            </div>
        </div>
    );
}

function OrderRow({ bidVol, bid, ask, askVol }) {
    const bidWidth = (parseInt(bidVol.replace(/,/g, "")) / 600000) * 100;
    const askWidth = (parseInt(askVol.replace(/,/g, "")) / 600000) * 100;
    return (
        <div className="grid grid-cols-4 items-center text-[9px] sm:text-[10px] md:text-xs flex-1 min-h-[20px] sm:min-h-[24px] border-b border-slate-800 relative">
            <div className="relative text-right pr-2 sm:pr-3 text-slate-300 overflow-hidden h-full flex items-center justify-end">
                <div className="absolute right-0 top-0 h-full bg-blue-900/40" style={{ width: `${bidWidth}%` }} />
                <span className="relative z-10">{bidVol === "0" ? "-" : bidVol}</span>
            </div>
            <div className="text-center text-green-400 font-bold">{bid}</div>
            <div className="text-center text-red-400 font-bold">{ask}</div>
            <div className="relative text-left pl-2 sm:pl-3 text-slate-300 overflow-hidden h-full flex items-center justify-start">
                <div className="absolute left-0 top-0 h-full bg-red-900/40" style={{ width: `${askWidth}%` }} />
                <span className="relative z-10">{askVol === "0" ? "-" : askVol}</span>
            </div>
        </div>
    );
}

function StatSection({ title }) {
    return (
        <div className="bg-[#111827] border border-slate-700 rounded overflow-hidden">
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] text-slate-400 border-b border-slate-700 bg-[#1e293b]">{title}</div>
            <div className="grid grid-cols-4 px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[10px] md:text-xs font-bold text-white">
                <span>71.00</span><span className="text-center">73.50</span><span className="text-center">70.75</span><span className="text-right">72.25</span>
            </div>
        </div>
    );
}

// ---------------- CUSTOM DATE PICKER ----------------

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
function parseKey(key) {
    const [dd, mm, yy] = key.split("/");
    return { day: +dd, month: +mm, year: 2000 + +yy };
}
function toKey(year, month, day) {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(2)}`;
}
function formatDisplay(key) {
    if (!key) return "";
    const { day, month, year } = parseKey(key);
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(day).padStart(2, "0")} ${M[month - 1]} ${year}`;
}
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DatePicker = memo(({ dates, selected, onChange, label, disabled }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState("day");
    const ref = useRef(null);

    const FULL_MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const initView = useMemo(() => {
        if (selected) { const p = parseKey(selected); return { month: p.month, year: p.year }; }
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
        const p = parseKey(dates[0]);
        return viewYear > p.year || (viewYear === p.year && viewMonth > p.month);
    }, [dates, viewYear, viewMonth]);

    const canNext = useCallback(() => {
        if (!dates[dates.length - 1]) return false;
        const p = parseKey(dates[dates.length - 1]);
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
        position: "absolute", top: "110%", left: 0, zIndex: 9999,
        width: 252, background: "#0f172a",
        border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)", fontFamily: "monospace",
        overflow: "hidden"
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

    return (
        <div ref={ref} style={{ flexShrink: 0, position: "relative", opacity: disabled ? 0.8 : 1 }}>
            {label && <label className="absolute left-2 -top-2 text-[9px] sm:text-[10px] px-1 bg-[#0f172a] text-slate-300 z-10 pointer-events-none">{label}</label>}
            <button onClick={() => {
                if (disabled) return;
                if (!open && selected) { const p = parseKey(selected); setViewMonth(p.month); setViewYear(p.year); }
                setOpen(o => !o); setView("day");
            }} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 h-[34px] sm:h-[38px] w-full justify-between" style={{
                background: "#111827",
                border: disabled ? "1px solid #334155" : (open ? "1px solid #06b6d4" : "1px solid #475569"),
                borderRadius: 6, cursor: disabled ? "default" : "pointer", 
                color: disabled ? "#94a3b8" : "#f8fafc", 
                fontSize: 10, fontWeight: 500, fontFamily: "monospace", transition: "all .15s"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke={disabled ? "#64748b" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-[10px] sm:text-xs">{formatDisplay(selected)}</span>
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
                                {FULL_MONTH[viewMonth - 1]} {viewYear} <Chev d="down" />
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
                                    const key = toKey(viewYear, viewMonth, day);
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