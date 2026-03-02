// src/pages/tools/DRInsight.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import DRInsightDashboard from "./components/DRInsightDashboard.jsx";

// Style ซ่อน Scrollbar
const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

/* ===============================
    DATA MOCKUP (Lists)
================================ */
const features = [
  { title: "Global Symbol Mapping", desc: "Instantly connects every DR on the Thai board to its underlying international parent stock." },
  { title: "Arbitrage Tracking", desc: "Compare the parent stock’s price against the Thai DR on a dual-pane screen." },
  { title: "Real-Time Valuation", desc: "Monitor live P/E ratios and key metrics of global underlying stocks." },
  { title: "Multi-Market Heatmap", desc: "Visualize global market trends (US, China, Vietnam) in one dashboard." },
];

const usaStocks = [
  { dr: "AAPL80X", real: "NASDAQ:AAPL", name: "Apple" },
  { dr: "AMZN80X", real: "NASDAQ:AMZN", name: "Amazon" },
  { dr: "BKNG80X", real: "NASDAQ:BKNG", name: "Booking" },
  { dr: "BRKB80X", real: "NYSE:BRK.B", name: "Berkshire Hathaway" },
  { dr: "GOOG80X", real: "NASDAQ:GOOG", name: "Alphabet (Google)" },
  { dr: "KO80X", real: "NYSE:KO", name: "Coca-Cola" },
  { dr: "META80X", real: "NASDAQ:META", name: "Meta Platforms" },
  { dr: "MSFT80X", real: "NASDAQ:MSFT", name: "Microsoft" },
  { dr: "NFLX80X", real: "NASDAQ:NFLX", name: "Netflix" },
  { dr: "NVDA80X", real: "NASDAQ:NVDA", name: "NVIDIA" },
  { dr: "PEP80X", real: "NASDAQ:PEP", name: "PepsiCo" },
  { dr: "SBUX80X", real: "NASDAQ:SBUX", name: "Starbucks" },
  { dr: "TSLA80X", real: "NASDAQ:TSLA", name: "Tesla" },
  { dr: "AMD80X", real: "NASDAQ:AMD", name: "AMD" },
  { dr: "AVGO80X", real: "NASDAQ:AVGO", name: "Broadcom" },
  { dr: "ESTEE80X", real: "NYSE:EL", name: "Estee Lauder" },
  { dr: "MA80X", real: "NYSE:MA", name: "Mastercard" },
  { dr: "NIKE80X", real: "NYSE:NKE", name: "Nike" },
  { dr: "VISA80X", real: "NYSE:V", name: "Visa" },
  { dr: "LLY80X", real: "NYSE:LLY", name: "Eli Lilly" },
  { dr: "LLY80", real: "NYSE:LLY", name: "Eli Lilly" },
];

const europeStocks = [
  { dr: "ASML01", real: "EURONEXT:ASML", name: "ASML Holding" },
  { dr: "FERRARI80", real: "MIL:RACE", name: "Ferrari" },
  { dr: "HERMES80", real: "EURONEXT:RMS", name: "Hermes" },
  { dr: "LOREAL80", real: "EURONEXT:OR", name: "L'Oreal" },
  { dr: "LVMH01", real: "EURONEXT:MC", name: "LVMH" },
  { dr: "NOVOB80", real: "OMXCOP:NOVO_B", name: "Novo Nordisk" },
  { dr: "SANOFI80", real: "EURONEXT:SAN", name: "Sanofi" },
];

const etcStocks = [
  { dr: "GOLD19", real: "SGX:GSD", name: "Gold" },
  { dr: "GOLD03", real: "HKEX:2840", name: "Gold" },
  { dr: "OIL03", real: "HKEX:3097", name: "Oil" },
];

const japanStocks = [
  { dr: "HONDA19", real: "TSE:7267", name: "Honda" },
  { dr: "MITSU19", real: "TSE:7011", name: "Mitsubishi" },
  { dr: "MUFG19", real: "TSE:8306", name: "MUFG" },
  { dr: "NINTENDO19", real: "TSE:7974", name: "Nintendo" },
  { dr: "SMFG19", real: "TSE:8316", name: "SMFG" },
  { dr: "SONY80", real: "TSE:6758", name: "Sony" },
  { dr: "TOYOTA80", real: "TSE:7203", name: "Toyota" },
  { dr: "UNIQLO80", real: "TSE:9983", name: "Fast Retailing" },
];

const singaporeStocks = [
  { dr: "DBS19", real: "SGX:D05", name: "DBS Group" },
  { dr: "INDIAESG19", real: "SGX:QK9", name: "India ESG" },
  { dr: "SIA19", real: "SGX:C6L", name: "Singapore Airlines" },
  { dr: "SINGTEL80", real: "SGX:Z74", name: "Singtel" },
  { dr: "STEG19", real: "SGX:S63", name: "ST Engineering" },
  { dr: "THAIBEV19", real: "SGX:Y92", name: "ThaiBev" },
  { dr: "UOB19", real: "SGX:U11", name: "UOB" },
  { dr: "VENTURE19", real: "SGX:V03", name: "Venture Corp" },
];

const vietnamStocks = [
  { dr: "E1VFVN3001", real: "HOSE:E1VFVN30", name: "Vietnam ETF" },
  { dr: "FUEVFVND01", real: "HOSE:FUEVFVND", name: "Vietnam Diamond ETF" },
  { dr: "VNM19", real: "HOSE:VNM", name: "Vinamilk" },
  { dr: "FPTVN19", real: "HOSE:FPT", name: "FPT Corp" },
  { dr: "MWG19", real: "HOSE:MWG", name: "Mobile World" },
  { dr: "VCB19", real: "HOSE:VCB", name: "Vietcombank" },
];

const chinaStocks = [
  { dr: "BABA80", real: "HKEX:9988", name: "Alibaba" },
  { dr: "BIDU80", real: "HKEX:9888", name: "Baidu" },
  { dr: "BYDCOM80", real: "HKEX:1211", name: "BYD" },
  { dr: "CN01", real: "HKEX:3188", name: "China ETF" },
  { dr: "CNTECH01", real: "HKEX:3088", name: "China Tech" },
  { dr: "HK01", real: "HKEX:2800", name: "Tracker Fund of HK" },
  { dr: "HK13", real: "HKEX:2800", name: "Tracker Fund of HK" },
  { dr: "HKCE01", real: "HKEX:2828", name: "Hang Seng China ETF" },
  { dr: "HKTECH13", real: "HKEX:3032", name: "Hang Seng Tech ETF" },
  { dr: "JAPAN13", real: "HKEX:3160", name: "Japan ETF" },
  { dr: "NDX01", real: "HKEX:3086", name: "Nasdaq ETF" },
  { dr: "NETEASE80", real: "HKEX:9999", name: "NetEase" },
  { dr: "PINGAN80", real: "HKEX:2318", name: "Ping An" },
  { dr: "SP50001", real: "HKEX:3195", name: "S&P 500 ETF" },
  { dr: "STAR5001", real: "HKEX:3151", name: "STAR 50 ETF" },
  { dr: "TENCENT80", real: "HKEX:700", name: "Tencent" },
  { dr: "XIAOMI80", real: "HKEX:1810", name: "Xiaomi" },
  { dr: "INDIA01", real: "HKEX:3404", name: "India ETF" },
  { dr: "JAPAN10001", real: "HKEX:3410", name: "Japan ETF" },
  { dr: "JAP03", real: "HKEX:3150", name: "Japan ETF" },
  { dr: "WORLD03", real: "HKEX:3422", name: "World ETF" },
  { dr: "JD80", real: "HKEX:9618", name: "JD.com" },
  { dr: "MEITUAN80", real: "HKEX:3690", name: "Meituan" },
  { dr: "NONGFU80", real: "HKEX:9633", name: "Nongfu Spring" },
  { dr: "POPMART80", real: "HKEX:9992", name: "Pop Mart" },
  { dr: "TRIPCOM80", real: "HKEX:9961", name: "Trip.com" },
  { dr: "BABA13", real: "HKEX:9988", name: "Alibaba" },
  { dr: "TENCENT13", real: "HKEX:700", name: "Tencent" },
  { dr: "XIAOMI13", real: "HKEX:1810", name: "Xiaomi" },
  { dr: "BABA01", real: "HKEX:9988", name: "Alibaba" },
  { dr: "BIDU01", real: "HKEX:9888", name: "Baidu" },
  { dr: "BYDCOM01", real: "HKEX:1211", name: "BYD" },
  { dr: "CHMOBILE19", real: "HKEX:941", name: "China Mobile" },
  { dr: "HAIERS19", real: "HKEX:6690", name: "Haier" },
  { dr: "MEITUAN19", real: "HKEX:3690", name: "Meituan" },
  { dr: "PINGAN01", real: "HKEX:2318", name: "Ping An" },
  { dr: "TENCENT01", real: "HKEX:700", name: "Tencent" },
  { dr: "TENCENT19", real: "HKEX:700", name: "Tencent" },
  { dr: "XIAOMI01", real: "HKEX:1810", name: "Xiaomi" },
  { dr: "XIAOMI19", real: "HKEX:1810", name: "Xiaomi" },
  { dr: "CATL01", real: "HKEX:3750", name: "CATL" },
  { dr: "BABA23", real: "HKEX:9988", name: "Alibaba" },
  { dr: "CATL23", real: "HKEX:3750", name: "CATL" },
  { dr: "HSHD23", real: "HKEX:3110", name: "HSHD" },
  { dr: "HKEX23", real: "HKEX", name: "HKEX" },
];

const taiwanStocks = [
  { dr: "TAIWAN19", real: "TWSE:0050", name: "Taiwan 50" },
  { dr: "TAIWANAI13", real: "TWSE:00952", name: "Taiwan AI" },
  { dr: "TAIWANHD13", real: "TWSE:00915", name: "Taiwan HD" },
];

const allStockOptions = [
    ...usaStocks, ...europeStocks, ...etcStocks,
    ...japanStocks, ...chinaStocks, ...singaporeStocks, ...vietnamStocks, ...taiwanStocks
];

// ชุดสีสำหรับจุดไข่ปลาหน้าชื่อหุ้น
const dotColors = ["bg-blue-500", "bg-orange-500", "bg-green-500", "bg-red-500", "bg-purple-500", "bg-cyan-500", "bg-yellow-500", "bg-pink-500"];

export default function DRInsight() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  // States
  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  
  // State สำหรับเก็บตำแหน่งแกน X (%)
  const [hoverPos, setHoverPos] = useState(null);       
  
  // ใช้ useRef เก็บ Path และ State เพื่อเก็บข้อมูลเส้นที่สแกนแล้ว
  const pathRefs = useRef([]);
  const [yLookupTable, setYLookupTable] = useState([[], [], []]);

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  // Filter States แยกของแต่ละประเทศ
  const [filters, setFilters] = useState({
    usa: "",
    europe: "",
    etc: "",
    Japan: "",
    China: "",
    Singapore: "",
    Vietnam: "",
    Taiwan: ""
  });

  const handleFilterChange = (region, value) => {
    setFilters(prev => ({ ...prev, [region]: value }));
  };

  const [chartSelections, setChartSelections] = useState({
    chart1: "AAPL80X",
    chart2: "ASML01",
    chart3: "BABA80",
  });

  /* ===============================
      0. PRE-CALCULATE GRAPH POINTS (Fixed Timing Bug)
  ================================ */
  // สแกนเส้นกราฟเมื่อหน้า Dashboard (enteredTool === true) ถูกเปิดขึ้นมาแล้วเท่านั้น!
  useEffect(() => {
    if (!enteredTool) return; // ออกทันทีถ้ายังอยู่หน้า Preview

    const timer = setTimeout(() => {
      const newLookup = [[], [], []];
      pathRefs.current.forEach((pathNode, index) => {
        if (pathNode) {
          const length = pathNode.getTotalLength();
          const lookup = new Array(1001).fill(null); // ความละเอียด 0.0% - 100.0%
          const step = length / 3000; // สแกนถี่ยิบ
          
          for (let i = 0; i <= length; i += step) {
            const point = pathNode.getPointAtLength(i);
            const xIndex = Math.round((point.x / 300) * 1000);
            if (xIndex >= 0 && xIndex <= 1000 && lookup[xIndex] === null) {
              lookup[xIndex] = point.y;
            }
          }
          
          let lastY = lookup[0] || 50;
          for (let i = 0; i <= 1000; i++) {
            if (lookup[i] === null) {
              lookup[i] = lastY;
            } else {
              lastY = lookup[i];
            }
          }
          newLookup[index] = lookup;
        }
      });
      setYLookupTable(newLookup);
    }, 300); // ให้เวลา Component วาด SVG ลงจอก่อนนิดนึง

    return () => clearTimeout(timer);
  }, [enteredTool]); // <--- เพิ่ม Dependency ตรงนี้เพื่อให้ทำงานถูกจังหวะ

  /* ===============================
      1. MEMBER CHECK & LOGIC
  ================================ */
  useEffect(() => {
    try {
      const userProfile = localStorage.getItem("userProfile");
      if (userProfile) {
        const user = JSON.parse(userProfile);
        if (user.unlockedItems && user.unlockedItems.includes("dr")) {
          setIsMember(true);
          const hasEntered = sessionStorage.getItem("drToolEntered");
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
      2. SCROLL LOGIC
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
    }
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
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  /* ===============================
      3. RENDER HELPER (Figma Theme)
  ================================ */
  const renderFigmaPanel = (title, filterKey, stocks, iconText = "🌐", flexClass = "flex-1") => {
    const currentFilter = filters[filterKey] || "";
    const filteredStocks = stocks.filter(s => s.dr.toLowerCase().includes(currentFilter.toLowerCase()));

    return (
      <div className={`bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 ${flexClass}`}>
          {/* Header */}
          <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a]">
              <span className="font-bold text-[13px] text-white">{title}</span>
              <span className="text-cyan-500 text-[11px] font-bold">{iconText}</span>
          </div>
          {/* Filter */}
          <div className="p-2 border-b border-slate-800/60 bg-[#0B1221]">
              <input
                  type="text"
                  placeholder="Filter..."
                  value={currentFilter}
                  onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                  className="w-full bg-[#1a2235] border border-slate-700/50 rounded flex-1 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
              />
          </div>
          {/* List - ใช้ style={scrollbarHideStyle} ซ่อน Scrollbar หนาๆ */}
          <div className="overflow-y-auto flex-1 p-2 bg-[#0B1221]" style={scrollbarHideStyle}>
              <div className="flex justify-between text-[9px] text-slate-500 mb-2 px-1 font-semibold uppercase tracking-wider sticky top-0 bg-[#0B1221] z-10 pb-1">
                 <span>DR/DRx</span>
                 <span>TradingView</span>
              </div>
              {filteredStocks.map((stock, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] p-1.5 hover:bg-slate-800/60 rounded cursor-pointer transition-colors group">
                      <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`}></div>
                          <span className="text-slate-200 group-hover:text-white font-bold tracking-wide">{stock.dr}</span>
                      </div>
                      <span className="text-slate-500 truncate max-w-[80px] text-right">{stock.real}</span>
                  </div>
              ))}
          </div>
      </div>
    );
  };

  /* ==========================================================
      CASE 1 : PREVIEW VERSION (Not Member)
  =========================================================== */
  if (!isMember || (isMember && !enteredTool)) {
    return (
      <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">DR Insight</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light">Your Gateway to Global Equity</p>
          </div>
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
                <DRInsightDashboard/>
              </div>
            </div>
          </div>
          <div className="w-full max-w-5xl mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
            <div className="relative group" onMouseEnter={() => isPaused.current = true} onMouseLeave={() => isPaused.current = false}>
              <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
              <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
                {features.map((item, index) => (
                  <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
            </div>
          </div>
          <div className="flex gap-4 justify-center w-full">
            {!isMember ? (
               <>
                 <button onClick={() => navigate("/login")} className="px-8 py-3 rounded-full bg-slate-800 border border-slate-600 hover:bg-slate-700 transition">Sign In</button>
                 <button onClick={() => navigate("/member-register")} className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 font-bold hover:shadow-lg transition">Join Membership</button>
               </>
            ) : (
                <button onClick={() => { setEnteredTool(true); localStorage.setItem("drToolEntered", "true"); }} className="group relative inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"><span className="mr-2 text-lg">Start Using Tool</span><svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
      CASE 3 : FULL DASHBOARD (Figma Theme)
  =========================================================== */
  return (
    <div className="w-full h-screen bg-[#0B1221] text-white p-3 animate-fade-in flex flex-col font-sans overflow-hidden">
      
      {/* 1. Top Bar: Indicators */}
      <div className="flex justify-center gap-6 mb-4 shrink-0">
         <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm">
            <span>ราคาน้ำมัน</span> 
            <div className="w-8 h-0.5 bg-[#3b82f6]"></div>
         </div>
         <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm">
            <span>PE Ratio</span> 
            <div className="w-8 h-0.5 bg-[#ef4444]"></div>
         </div>
         <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm">
            <span>Last</span> 
            <div className="w-8 h-0.5 bg-[#22c55e]"></div>
         </div>
      </div>

      {/* 2. Main Grid Layout (3 Columns: Left, Mid, Right) */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* === Left Column: USA, Europe, ETC (3/12) === */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            {renderFigmaPanel("USA", "usa", usaStocks, "🌎", "flex-[4]")}
            {renderFigmaPanel("Europe", "europe", europeStocks, "🌍", "flex-[3]")}
            {renderFigmaPanel("ETC", "etc", etcStocks, "⚙️", "flex-[2]")}
        </div>

        {/* === Middle Column: 3 Charts (6/12) === */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
            {['chart1', 'chart2', 'chart3'].map((chartKey, index) => {
                const stockName = chartSelections[chartKey];
                const stockData = allStockOptions.find(s => s.dr === stockName) || {};
                const themeColors = ["#3b82f6", "#ef4444", "#22c55e"]; 
                const lineColor = themeColors[index];

                // แปลงค่า X ของเมาส์ให้เป็น Index แล้วดึงค่า Y ของกราฟนั้นๆ มาแสดง
                const lookupIndex = hoverPos !== null ? Math.round(hoverPos * 10) : null;
                const currentYPercent = lookupIndex !== null && yLookupTable[index] && yLookupTable[index].length > 0 
                    ? yLookupTable[index][lookupIndex] 
                    : null;

                return (
                    <div key={chartKey} className="bg-[#111827] border border-slate-800/80 rounded-xl p-4 flex flex-col flex-1 shadow-lg overflow-hidden min-h-0">
                        
                        {/* Chart Header */}
                        <div className="flex justify-between items-start shrink-0">
                            {/* Select แบบใส ซ่อนไว้ทับ Text */}
                            <div className="relative group/select cursor-pointer flex items-baseline gap-2">
                                 <select
                                    value={stockName}
                                    onChange={(e) => setChartSelections({...chartSelections, [chartKey]: e.target.value})}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                 >
                                    {allStockOptions.map(s => (
                                        <option key={s.dr} value={s.dr} className="bg-[#1f2937] text-slate-300">
                                            {s.dr} {s.name ? `(${s.name})` : ""}
                                        </option>
                                    ))}
                                 </select>
                                 <span className="font-bold text-[15px] text-white tracking-wide">{stockName}</span>
                                 <span className="text-xs text-slate-500 font-medium">({stockData.name || "Company"})</span>
                            </div>
                            <div className="flex gap-3 text-slate-600">
                                <button className="hover:text-white transition">⛶</button>
                                <button className="hover:text-white transition">⚙</button>
                            </div>
                        </div>

                        {/* Graph Area */}
                        <div 
                          className="flex-1 w-full bg-[#0B1221] border border-slate-800/40 rounded-lg relative overflow-hidden flex items-end mt-3 group/chart cursor-crosshair"
                          onMouseMove={(e) => {
                            // หาตำแหน่ง X เพียงอย่างเดียว
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                            setHoverPos(Math.max(0, Math.min(100, xPercent)));
                          }}
                          onMouseLeave={() => {
                            setHoverPos(null);
                          }}
                        >
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                            
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* วาดเส้นกราฟหลัก และเก็บ ref ไว้สแกนค่า Y */}
                                <path 
                                    ref={(el) => (pathRefs.current[index] = el)}
                                    d={index === 0 
                                        ? "M0,80 C30,70 60,90 90,50 C120,30 150,60 180,40 C210,20 240,30 270,10 L300,25" 
                                        : index === 1 
                                        ? "M0,90 C40,90 80,60 120,80 C160,50 200,60 240,40 L300,20"
                                        : "M0,90 C50,90 100,70 150,70 C200,40 250,50 300,40"
                                    } 
                                    fill="none" 
                                    stroke={lineColor} 
                                    strokeWidth="2" 
                                    vectorEffect="non-scaling-stroke"
                                />
                                {/* พื้นหลังกราฟแบบไล่สี */}
                                <path 
                                    d={(index === 0 
                                        ? "M0,80 C30,70 60,90 90,50 C120,30 150,60 180,40 C210,20 240,30 270,10 L300,25" 
                                        : index === 1 
                                        ? "M0,90 C40,90 80,60 120,80 C160,50 200,60 240,40 L300,20"
                                        : "M0,90 C50,90 100,70 150,70 C200,40 250,50 300,40"
                                    ) + " V 100 H 0 Z"} 
                                    fill={`url(#grad-${index})`} 
                                    stroke="none" 
                                />
                            </svg>

                            <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between text-[8px] text-slate-600 text-right pointer-events-none">
                                <span>189.5</span>
                                <span>188.0</span>
                                <span>186.5</span>
                                <span>185.0</span>
                            </div>

                            {/* วาดแกน X, แกน Y และ จุด ก็ต่อเมื่อดึงค่า Y มาสำเร็จแล้ว */}
                            {hoverPos !== null && currentYPercent !== null && (
                                <>
                                    {/* เส้นแกน X (แนวตั้ง) */}
                                    <div 
                                        className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80"
                                        style={{ left: `${hoverPos}%` }}
                                    ></div>

                                    {/* เส้นแกน Y (แนวนอน) วิ่งเลาะตามเส้นกราฟ */}
                                    <div 
                                        className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80"
                                        style={{ top: `${currentYPercent}%` }}
                                    ></div>
                                    
                                    {/* จุดตัด (Dot) ล็อคตรงกลางพอดีเป๊ะ */}
                                    <div 
                                        className="absolute z-30 pointer-events-none w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                                        style={{ 
                                            left: `${hoverPos}%`, 
                                            top: `${currentYPercent}%`,
                                            backgroundColor: lineColor, 
                                            boxShadow: `0 0 10px ${lineColor}`
                                        }}
                                    ></div>
                                </>
                            )}

                        </div>
                    </div>
                );
            })}
        </div>

        {/* === Right Column: Asia Pacific (3/12) แบ่งเป็น 2 คอลัมน์ย่อย === */}
        <div className="col-span-12 md:col-span-3 flex flex-col h-full bg-[#111827] border border-slate-800/80 rounded-xl p-4 shadow-xl overflow-hidden">
            {/* Header Asia */}
            <div className="text-center pb-3 mb-4 border-b border-slate-800/60 shrink-0">
                <span className="font-bold text-base text-white tracking-wide">Asia</span>
            </div>
            
            {/* กรอบด้านใน แยก 2 คอลัมน์ (ซ้าย-ขวา) ล็อก overflow-hidden ไม่ให้ทะลุกรอบ */}
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                
                {/* ซีกซ้าย (Japan, Singapore, Vietnam) - ให้ flex-1 แบ่งความสูงเท่าๆ กัน 3 ส่วน */}
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    {renderFigmaPanel("Japan", "Japan", japanStocks, "JP", "flex-1")}
                    {renderFigmaPanel("Singapore", "Singapore", singaporeStocks, "SG", "flex-1")}
                    {renderFigmaPanel("Vietnam", "Vietnam", vietnamStocks, "VN", "flex-1")}
                </div>

                {/* ซีกขวา (China, Taiwan) - หุ้นจีนเยอะ เลยกำหนดให้ China กินพื้นที่ flex-[3] และ Taiwan เป็น flex-1 */}
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    {renderFigmaPanel("China", "China", chinaStocks, "CN", "flex-[3]")}
                    {renderFigmaPanel("Taiwan", "Taiwan", taiwanStocks, "TW", "flex-1")}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}