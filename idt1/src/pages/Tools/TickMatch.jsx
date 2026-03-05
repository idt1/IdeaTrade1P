// src/pages/tools/TickMatch.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import TickMatchDashboard from "./components/TickMatchDashboard.jsx";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import CloseIcon from "@mui/icons-material/Close";

// Style ซ่อน Scrollbar (เหมือนต้นแบบ DR)
const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

/* ===============================
    TICKMATCH DATA MOCKUP
================================ */
const features = [
  { title: "Net Accumulated Volume", desc: "Track global gold prices with an intelligent filtering system designed to eliminate market noise." },
  { title: "Flip Signal", desc: "Instantly detect the moment capital flow reverses direction from bullish to bearish." },
  { title: "Granular Tick Data", desc: "Audit every single transaction to scan for whale orders hidden within the noise." },
  { title: "Price-Based Distribution", desc: "Identifies price levels where the heaviest trading volume has occurred." },
];

const mockDatabase = {
  "": {
    sumBuy: "0", sumSell: "0", netVol: "0",
    ticks: [], flips: [], charts: []
  },
  "DELTA": {
    sumBuy: "2,871,341,000", sumSell: "2,799,804,200", netVol: "71,536,800",
    ticks: [
      { time: "09:58.472", last: "224.00", vol: "500", type: "S", sum: "43,321,300" },
      { time: "09:58.472", last: "224.00", vol: "10,000", type: "S", sum: "41,081,300" },
      { time: "09:58.472", last: "224.00", vol: "100", type: "S", sum: "41,058,900" },
      { time: "09:58.472", last: "224.00", vol: "2,000", type: "B", sum: "40,610,900" },
      { time: "09:58.472", last: "224.00", vol: "1,000", type: "S", sum: "40,386,900" },
      { time: "09:58.472", last: "224.00", vol: "100", type: "S", sum: "40,364,500" },
      { time: "09:58.472", last: "224.00", vol: "1,000", type: "B", sum: "40,140,500" },
    ],
    flips: [
      { id: 1, time: "15:42.905", from: "822,100", to: "-34,882,900" },
      { id: 2, time: "15:42.905", from: "18,480,200", to: "-17,204,800" },
      { id: 3, time: "16:36.001", from: "-175,452,500", to: "53,878,700" },
      { id: 4, time: "16:36.001", from: "-157,794,400", to: "71,536,800" },
    ],
    charts: [
      { price: "225.00", buy: 35, sell: 55 }, { price: "224.00", buy: 50, sell: 15 },
      { price: "226.00", buy: 55, sell: 20 }, { price: "227.00", buy: 15, sell: 10 },
      { price: "228.00", buy: 40, sell: 40 }, { price: "229.00", buy: 5, sell: 2 },
      { price: "223.00", buy: 15, sell: 20 }, { price: "222.00", buy: 5, sell: 5 },
      { price: "221.00", buy: 0, sell: 2 },
    ]
  },
  "NVDA": {
    sumBuy: "14,520,100,000", sumSell: "11,200,450,000", netVol: "3,319,650,000",
    ticks: [
      { time: "21:30.112", last: "138.50", vol: "4,500", type: "B", sum: "8,321,300" },
      { time: "21:30.114", last: "138.55", vol: "1,200", type: "B", sum: "8,581,300" },
      { time: "21:30.200", last: "138.50", vol: "500", type: "S", sum: "8,511,300" },
      { time: "21:30.450", last: "138.60", vol: "10,000", type: "B", sum: "9,911,300" },
    ],
    flips: [
      { id: 1, time: "22:15.000", from: "-1,200,500", to: "5,400,200" },
    ],
    charts: [
      { price: "138.00", buy: 60, sell: 15 }, { price: "138.50", buy: 45, sell: 30 },
      { price: "139.00", buy: 20, sell: 50 }, { price: "139.50", buy: 10, sell: 70 },
    ]
  },
  "TSLA": {
    sumBuy: "5,110,000,000", sumSell: "8,900,200,000", netVol: "-3,790,200,000",
    ticks: [
      { time: "21:45.001", last: "198.20", vol: "1,000", type: "S", sum: "-1,500,200" },
      { time: "21:45.005", last: "198.15", vol: "5,000", type: "S", sum: "-2,490,200" },
      { time: "21:45.010", last: "198.10", vol: "10,000", type: "S", sum: "-4,470,200" },
    ],
    flips: [
      { id: 1, time: "22:00.100", from: "500,000", to: "-1,500,000" },
      { id: 2, time: "23:15.400", from: "-2,000,000", to: "-3,790,200" },
    ],
    charts: [
      { price: "199.00", buy: 15, sell: 65 }, { price: "198.50", buy: 25, sell: 50 },
      { price: "198.00", buy: 10, sell: 80 }, { price: "197.50", buy: 40, sell: 40 },
    ]
  },
};

export default function TickMatch() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  // States
  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);

  // Scroll Button States
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // --- Refs สำหรับระบบเลื่อนอัตโนมัติ ---
  const scrollDirection = useRef(1); // 1 = ขวา, -1 = ซ้าย
  const isPaused = useRef(false);    // เก็บสถานะว่าเมาส์ชี้อยู่ไหม

  /* ===============================
      1. MEMBER CHECK & LOGIC
  ================================ */
  useEffect(() => {
    try {
      const userProfile = localStorage.getItem("userProfile");
      if (userProfile) {
        const user = JSON.parse(userProfile);
        if (user.unlockedItems && user.unlockedItems.includes("tickmatch")) {
          setIsMember(true);
          const hasEntered = sessionStorage.getItem("tickToolEntered");
          if (hasEntered === "true") {
            setEnteredTool(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking member status:", error);
    }
  }, []);

  /* ===============================
      2. SCROLL LOGIC (Manual & Auto)
  ================================ */
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 1);
      const isEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 2;
      setShowRight(!isEnd);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      // เมื่อกดปุ่ม ให้หยุด Auto ชั่วคราวกันตีกัน
      isPaused.current = true;

      const { current } = scrollContainerRef;
      const scrollAmount = 350;
      
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        scrollDirection.current = -1; // อัปเดตทิศทาง Auto ให้ไปทางซ้ายตาม
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        scrollDirection.current = 1;  // อัปเดตทิศทาง Auto ให้ไปทางขวาตาม
      }
      
      setTimeout(checkScroll, 300);
      
      // ปล่อยให้ Auto ทำงานต่อหลังจากกดปุ่มไปสักพัก (500ms)
      setTimeout(() => { isPaused.current = false }, 500);
    }
  };

  /* ===============================
      AUTO SCROLL EFFECT
  ================================ */
  useEffect(() => {
    const container = scrollContainerRef.current;
    
    // ถ้าหา container ไม่เจอ (เช่น อยู่หน้า Dashboard) ให้จบ
    if (!container) return;

    const speed = 1;         // ความเร็ว (pixel)
    const intervalTime = 15; // ความถี่ (ms)

    const autoScrollInterval = setInterval(() => {
      // ถ้าเมาส์ชี้อยู่ (Pause) หรือ Container หายไป ให้ข้ามรอบนี้
      if (isPaused.current || !container) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      // ตรวจสอบการชนขอบ เพื่อกลับทิศ
      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= maxScroll - 2) {
        scrollDirection.current = -1;
      } else if (scrollDirection.current === -1 && scrollLeft <= 2) {
        scrollDirection.current = 1;
      }

      // สั่งเลื่อน
      container.scrollLeft += (scrollDirection.current * speed);
      checkScroll();
    }, intervalTime);

    return () => clearInterval(autoScrollInterval);
  }, [isMember, enteredTool]); // รันใหม่เมื่อเปลี่ยนหน้า View

  // Resize listener
  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  /* ===============================
      3. COMPONENT: AnalysisPanel (เฉพาะของ TickMatch)
  ================================ */
const AnalysisPanel = ({ defaultSymbol = "", defaultDate = "" }) => {

  const [hasSearched, setHasSearched] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  const [flipCollapsed, setFlipCollapsed] = useState(false);
  const [chartZoomOpen, setChartZoomOpen] = useState(false);

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [symbolHistory, setSymbolHistory] = useState([]);
  const [filteredSymbols, setFilteredSymbols] = useState([]);

  const todayMax = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(defaultDate);
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tickmatch_symbol_history");
    if (saved) {
      setSymbolHistory(JSON.parse(saved));
    }
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

  const handleSearch = () => {
    if (!symbol.trim()) return;

    setIsSyncing(true);

    setTimeout(() => {
      setHasSearched(true); 
      setActiveSymbol(symbol.toUpperCase());

      const updated = [
        symbol.toUpperCase(),
        ...symbolHistory.filter((s) => s !== symbol.toUpperCase())
      ].slice(0, 10);

      setSymbolHistory(updated);
      localStorage.setItem(
        "tickmatch_symbol_history",
        JSON.stringify(updated)
      );

      setIsSyncing(false);
    }, 800);
  };

  const data = mockDatabase[activeSymbol?.toUpperCase()] || mockDatabase[""];

  const totalBuy = parseInt(data.sumBuy.replace(/,/g, "")) || 0;
  const totalSell = parseInt(data.sumSell.replace(/,/g, "")) || 0;
  const total = totalBuy + totalSell;
  const buyPercent = total === 0 ? 50 : (totalBuy / total) * 100;

    return (
      <div className="flex flex-col h-full bg-[#111827] border border-slate-700 rounded-lg p-3 shadow-lg overflow-hidden relative" style={scrollbarHideStyle}>
        
        {isSyncing && (
            <div className="absolute inset-0 bg-[#111827]/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

        {/* --- Header & Inputs --- */}
        <div className="grid grid-cols-12 gap-2 mb-2 items-end shrink-0">

          {/* SYNC */}
          <div className="col-span-2">
            <button
              onClick={() => setIsSynced(!isSynced)}
              className={`
                w-full h-[40px] flex items-center justify-center gap-2
                text-sm font-semibold rounded-lg transition-all duration-200
                ${isSynced
                  ? "bg-[#0E3A6D] hover:bg-[#124a8a] text-white"
                  : "bg-[#8FA3B5] hover:bg-[#7f95a8] text-white"
                }
              `}
            >
              {isSynced ? (
                <>
                  <LinkOutlinedIcon
                    sx={{
                      fontSize: 17,
                      opacity: 0.95
                    }}
                  />
                  SYNC
                </>
              ) : (
                <>
                  <LinkOffOutlinedIcon
                    sx={{
                      fontSize: 17,
                      opacity: 0.9
                    }}
                  />
                  UNSYNC
                </>
              )}
            </button>
          </div>

          {/* SYMBOL */}
          <div className="col-span-4 relative">

            <input
              value={symbol}
              placeholder=" "
              onChange={(e) => {
                setSymbol(e.target.value);
                setShowSymbolDropdown(true);
              }}
              onFocus={() => setShowSymbolDropdown(true)}
              onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 150)}
              className="peer w-full bg-[#111827] border border-slate-600 rounded-md px-3 py-2 text-white text-xs uppercase outline-none"
            />

            <label
              className="absolute left-3 px-1 text-[10px] bg-[#0f172a] text-slate-400 
                        transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-2 
                        peer-placeholder-shown:text-slate-500
                        peer-focus:-top-2 
                        peer-focus:text-cyan-400
                        -top-2"
            >
              Symbol*
            </label>

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
          </div>

          {/* DATE */}
          <div className="col-span-3 relative">

            <input
              type="date"
              value={date}
              max={todayMax}
              placeholder=" "
              onChange={(e) => setDate(e.target.value)}
              className="peer w-full bg-[#0B1221] border border-slate-600 rounded-md px-3 py-2 text-white text-xs outline-none
                        [&::-webkit-calendar-picker-indicator]:invert"
            />

            <label
              className="absolute left-3 px-1 text-[10px] bg-[#0f172a] text-slate-400 
                        transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:top-2
                        peer-placeholder-shown:text-slate-500
                        peer-focus:-top-2
                        peer-focus:text-cyan-400
                        -top-2"
            >
              Date
            </label>

          </div>

          {/* SEARCH */}
          <div className="col-span-3">
            <button
              onClick={handleSearch}
              disabled={isSyncing}
              className="w-full h-[38px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition active:scale-95 disabled:opacity-50"
            >
              SEARCH
            </button>
          </div>

        </div>

        {/* --- Summary --- */}
        <div className="grid grid-cols-3 gap-2 mb-1 shrink-0">
          <div className="bg-[#1e1e1e] border border-green-900/50 rounded p-2 flex flex-col relative overflow-hidden">
            <span className="text-[10px] text-slate-400">Sum Buy</span>
            <span className={`font-bold text-lg text-right ${activeSymbol ? 'text-green-500' : 'text-white'}`}>{data.sumBuy}</span>
            <div className="absolute bottom-0 left-0 h-[2px] bg-green-500 w-full"></div>
          </div>
          <div className="bg-[#1e1e1e] border border-red-900/50 rounded p-2 flex flex-col relative overflow-hidden">
             <span className="text-[10px] text-slate-400">Sum Sell</span>
             <span className={`font-bold text-lg text-right ${activeSymbol ? 'text-red-500' : 'text-white'}`}>{data.sumSell}</span>
             <div className="absolute bottom-0 left-0 h-[2px] bg-red-500 w-full"></div>
          </div>
          <div className="bg-[#1e1e1e] border border-slate-700/50 rounded p-2 flex flex-col relative overflow-hidden">
             <span className="text-[10px] text-slate-400">Net Acc. Vol</span>
             <span className={`${data.netVol === "0" ? 'text-white' : (data.netVol.includes('-') ? 'text-red-500' : 'text-green-500')} font-bold text-lg text-right`}>
                 {data.netVol}
             </span>
             <div className={`absolute bottom-0 left-0 h-[2px] w-full ${data.netVol === "0" ? 'bg-slate-500' : (data.netVol.includes('-') ? 'bg-red-500' : 'bg-green-500')}`}></div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1 bg-red-600 rounded-full mb-2 flex overflow-hidden shrink-0">
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${buyPercent}%` }}></div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-2">
          <button className="bg-slate-700 text-white text-[10px] px-3 py-1 rounded hover:bg-slate-600">All</button>
          <button className="bg-[#1f2937] text-slate-400 border border-slate-600 text-[10px] px-3 py-1 rounded hover:text-white">Buy Only</button>
          <button className="bg-[#1f2937] text-slate-400 border border-slate-600 text-[10px] px-3 py-1 rounded hover:text-white">Sell Only</button>
          <button className="bg-[#1f2937] text-slate-400 border border-slate-600 text-[10px] px-3 py-1 rounded hover:text-white">{'>'} 100K (Big Lot)</button>
        </div>

        {/* --- Tick Table --- */}
        <div className="rounded overflow-hidden border border-slate-800/50 bg-[#0B1221] shrink-0 h-[170px] overflow-y-auto mb-2" style={scrollbarHideStyle}>
           <table className="w-full text-right border-collapse">
             <thead className="bg-[#1f2937] text-slate-400 text-[10px] font-medium sticky top-0 z-10 shadow-sm">
               <tr>
                 <th className="p-2 text-center">Time</th>
                 <th className="p-2">Last</th>
                 <th className="p-2">Vol</th>
                 <th className="p-2 text-center">Type</th>
                 <th className="p-2">Sum</th>
               </tr>
             </thead>
             <tbody className="text-xs font-mono text-slate-300">
                {data.ticks.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <td className="p-2 text-center text-slate-400">{row.time}</td>
                    <td className="p-2 text-yellow-500">{row.last}</td>
                    <td className="p-2 font-bold text-slate-200">{row.vol}</td>
                    <td className="p-2 flex justify-center items-center">
                      <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-black ${row.type === 'B' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-2 text-slate-500">{row.sum}</td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>

        {/* --- Extra Sections (Flip & Charts) จะโชว์เมื่อมีการค้นหาข้อมูลแล้วเท่านั้น --- */}
        {hasSearched && (
          <>
            {/* ===== Flip Section ===== */}
            <div className="bg-[#0B1221] border border-slate-800/50 rounded mb-2 overflow-hidden shrink-0">

              <button
                onClick={() => setFlipCollapsed(!flipCollapsed)}
                className="w-full bg-[#1f2937] p-2 flex justify-between items-center hover:bg-[#263548] transition-colors"
              >
                <span className="text-xs font-bold text-white">
                  Total Flip Count: {data.flips.length}
                </span>
                <div className="flex gap-3 items-center text-[10px]">
                  <span className="flex items-center gap-1 text-red-400">
                    <div className="w-3 h-1.5 bg-red-500"></div> Net Vol &lt; 0
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <div className="w-3 h-1.5 bg-green-500"></div> Net Vol &gt; 0
                  </span>
                  {flipCollapsed
                    ? <ExpandMoreIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    : <ExpandLessIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                  }
                </div>
              </button>

              {!flipCollapsed && (
                <>
                  {/* Timeline Bar */}
                  <div className="p-2 border-b border-slate-700/50 bg-[#111827]">
                    <div className="h-2 w-full bg-slate-800 rounded overflow-hidden relative">
                      {data.flips.length > 0 ? (
                        data.flips.map((flip, i) => {
                          const posPercent = data.flips.length > 1 ? (i / (data.flips.length - 1)) * 100 : 50;
                          const isPositive = !flip.to.includes("-");
                          return (
                            <div
                              key={i}
                              className={`absolute top-0 w-1.5 h-full rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
                            />
                          );
                        })
                      ) : (
                        <div className="h-full w-full bg-slate-800 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Flip Table */}
                  <div className="overflow-y-auto max-h-[100px]" style={scrollbarHideStyle}>
                    <table className="w-full text-center border-collapse">
                      <thead className="bg-[#1f2937] text-slate-400 text-[10px] font-medium border-t border-slate-700/50 sticky top-0">
                        <tr>
                          <th className="p-1.5">ครั้งที่</th>
                          <th className="p-1.5">Time</th>
                          <th className="p-1.5">From Acc. Vol</th>
                          <th className="p-1.5">To Acc. Vol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.flips.length > 0 ? (
                          data.flips.map((flip) => (
                            <tr key={flip.id} className="border-b border-slate-800/30 hover:bg-slate-800/50">
                              <td className="p-1.5 text-xs text-slate-300">{flip.id}</td>
                              <td className="p-1.5 text-xs font-mono text-yellow-400">{flip.time}</td>
                              <td className={`p-1.5 text-xs font-mono ${flip.from.includes('-') ? 'text-red-400' : 'text-green-400'}`}>{flip.from}</td>
                              <td className={`p-1.5 text-xs font-mono ${flip.to.includes('-') ? 'text-red-400' : 'text-green-400'}`}>{flip.to}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="p-4 text-slate-500 text-xs">
                              No Flip Data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* ===== Chart Section ===== */}
            <div className="bg-[#0B1221] border border-slate-800/50 rounded shrink-0 overflow-hidden">
              {/* Chart Header */}
              <div className="bg-[#1f2937] px-2 py-1.5 flex justify-between items-center border-b border-slate-700/50">
                <span className="text-xs font-bold text-white">Price Distribution Chart</span>
                <button
                  onClick={() => setChartZoomOpen(true)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Zoom chart"
                >
                  <ZoomInIcon sx={{ fontSize: 16 }} />
                  <span>Zoom</span>
                </button>
              </div>
              {/* Chart Body */}
              <div className="p-3 h-[160px] flex flex-col justify-center items-center">
                {data.charts.length > 0 ? (
                  <div className="w-full h-full flex items-end gap-1 px-2">
                    {(() => {
                      const maxVal = Math.max(...data.charts.map(c => c.buy + c.sell));
                      return data.charts.map((bar, i) => {
                        const barHeight = maxVal > 0 ? ((bar.buy + bar.sell) / maxVal) * 100 : 0;
                        const buyRatio = (bar.buy + bar.sell) > 0 ? (bar.buy / (bar.buy + bar.sell)) * 100 : 50;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${barHeight}%` }}>
                              <div className="w-full bg-green-500/70" style={{ height: `${buyRatio}%` }} />
                              <div className="w-full bg-red-500/70" style={{ height: `${100 - buyRatio}%` }} />
                            </div>
                            <span className="text-[8px] text-slate-500 truncate w-full text-center">{bar.price}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <>
                    <div className="w-full h-24 bg-slate-800 rounded animate-pulse mb-4"></div>
                    <span className="text-xs text-slate-500">Chart will appear here</span>
                  </>
                )}
              </div>
            </div>

            {/* ===== Chart Zoom Modal ===== */}
            {chartZoomOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={() => setChartZoomOpen(false)}
              >
                <div
                  className="relative bg-[#0B1221] border border-slate-700 rounded-xl shadow-2xl w-[90vw] max-w-2xl p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-white">
                      Price Distribution Chart — {activeSymbol || "—"}
                    </span>
                    <button
                      onClick={() => setChartZoomOpen(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 mb-3 text-[10px]">
                    <span className="flex items-center gap-1 text-green-400"><div className="w-3 h-3 rounded-sm bg-green-500/70"></div> Buy Vol</span>
                    <span className="flex items-center gap-1 text-red-400"><div className="w-3 h-3 rounded-sm bg-red-500/70"></div> Sell Vol</span>
                  </div>
                  {/* Modal Chart */}
                  <div className="h-[300px] flex items-end gap-2 px-2">
                    {data.charts.length > 0 ? (
                      (() => {
                        const maxVal = Math.max(...data.charts.map(c => c.buy + c.sell));
                        return data.charts.map((bar, i) => {
                          const barHeight = maxVal > 0 ? ((bar.buy + bar.sell) / maxVal) * 100 : 0;
                          const buyRatio = (bar.buy + bar.sell) > 0 ? (bar.buy / (bar.buy + bar.sell)) * 100 : 50;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex flex-col-reverse rounded overflow-hidden" style={{ height: `${barHeight}%` }}>
                                <div className="w-full bg-green-500/80" style={{ height: `${buyRatio}%` }} />
                                <div className="w-full bg-red-500/80" style={{ height: `${100 - buyRatio}%` }} />
                              </div>
                              <span className="text-[9px] text-slate-400 truncate w-full text-center">{bar.price}</span>
                              <span className="text-[8px] text-slate-500">{bar.buy + bar.sell}</span>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-sm text-slate-500">No chart data available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  =========================================================== */
  if (!isMember) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                TickMatch
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Tracking "Big Money" Footprints
            </p>
          </div>

          {/* Preview Image Card */}
          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-700/50 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="w-full bg-[#0B1221]">
                <div className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500" />
                <TickMatchDashboard />
              </div>
            </div>
          </div>

          {/* Features Section (Scrollable) */}
          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
              4 Main Features
            </h2>
            
            {/* Wrapper เพื่อดักจับ Mouse Hover สำหรับหยุด Auto Scroll */}
            <div 
              className="relative group"
              onMouseEnter={() => isPaused.current = true}
              onMouseLeave={() => isPaused.current = false}
            >
              {/* Left Button */}
              <button 
                onClick={() => scroll("left")}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} 
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>

              {/* Scroll Container */}
              <div 
                ref={scrollContainerRef} 
                onScroll={checkScroll} 
                className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" 
                style={scrollbarHideStyle}
              >
                {features.map((item, index) => (
                  <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Right Button */}
              <button 
                onClick={() => scroll("right")}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
             <button onClick={() => navigate("/login")} className="px-8 py-3 rounded-full bg-slate-800 border border-slate-600 hover:bg-slate-700 transition">Sign In</button>
             <button onClick={() => navigate("/member-register")} className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 font-bold hover:shadow-lg transition">Join Membership</button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 2 : START SCREEN (MEMBER BUT NOT ENTERED)
  =========================================================== */
  if (isMember && !enteredTool) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                TickMatch
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">
              Tracking "Big Money" Footprints
            </p>
          </div>

          {/* Preview Image Card */}
          <div className="relative group w-full max-w-5xl mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
            <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-700/50 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="w-full bg-[#0B1221]">
                <div className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500" />
                <TickMatchDashboard />
              </div>
            </div>
          </div>
        
          {/* Features Section (Scrollable) */}
          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">
              4 Main Features
            </h2>
            
            {/* Wrapper เพื่อดักจับ Mouse Hover สำหรับหยุด Auto Scroll */}
            <div 
              className="relative group"
              onMouseEnter={() => isPaused.current = true}
              onMouseLeave={() => isPaused.current = false}
            >
              {/* Left Button */}
              <button 
                onClick={() => scroll("left")}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} 
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>

              {/* Scroll Container */}
              <div 
                ref={scrollContainerRef} 
                onScroll={checkScroll} 
                className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" 
                style={scrollbarHideStyle}
              >
                {features.map((item, index) => (
                  <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Right Button */}
              <button 
                onClick={() => scroll("right")}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Start Button */}
          <div className="flex gap-4 justify-center w-full">
            <button
              onClick={() => {
                setEnteredTool(true);
                localStorage.setItem("tickToolEntered", "true"); // จำสถานะของ TickMatch
              }}
              className="group relative inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
            >
              <span className="mr-2 text-lg">Start Using Tool</span>
              <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 3 : FULL TICKMATCH DASHBOARD
  =========================================================== */
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full min-h-screen bg-[#0B1221] text-white p-4 animate-fade-in flex flex-col gap-4">
      

      {/* Main Grid Layout (2 Panels ของ TickMatch) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-100px)]">
        
        {/* Left Panel: เริ่มมาหน้าว่างเปล่า (Select) */}
        <AnalysisPanel defaultSymbol="" defaultDate={todayStr} />

        {/* Right Panel: เริ่มมาหน้าว่างเปล่า (Select) */}
        <AnalysisPanel defaultSymbol="" defaultDate={todayStr} />

      </div>
    </div>
  );
}