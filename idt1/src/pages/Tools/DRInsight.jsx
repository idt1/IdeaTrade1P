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

/* ===============================
    MOCK DATA GENERATOR (แทน API)
================================ */
const generateMockStockData = (basePrice, points = 100) => {
  let price = basePrice;
  const data = [];
  for (let i = 0; i < points; i++) {
      price += (Math.random() - 0.48) * (basePrice * 0.02);
      data.push(price);
  }
  return data;
};

const buildSvgPath = (data, min, max) => {
  if (!data || data.length === 0) return "M0,50 L300,50";
  const range = max - min || 1;
  const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * 300;
      const y = 100 - ((val - min) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(" ");
};

export default function DRInsight() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  // เพิ่ม State ใหม่
const [fullscreenChart, setFullscreenChart] = useState(null); // ✅ เก็บ chart ที่ fullscreen

  // States
  const [isMember, setIsMember] = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  
  const [hoverPos, setHoverPos] = useState(null);       
  
  const [chartData, setChartData] = useState({ chart1: [], chart2: [], chart3: [] });
  const [chartMinMax, setChartMinMax] = useState({
      chart1: { min: 0, max: 100 },
      chart2: { min: 0, max: 100 },
      chart3: { min: 0, max: 100 }
  });

  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  const [globalFilter, setGlobalFilter] = useState("");

 const [chartSelections, setChartSelections] = useState({
  chart1: "",  // ✅ เริ่มแรกว่างเปล่า
  chart2: "",
  chart3: "",
});

const [selectedSymbol, setSelectedSymbol] = useState(""); // ✅ เก็บ symbol ที่เลือกเดียว

  // -----------------------------------------------------------------
  // 🌟 NEW: State สำหรับเช็คว่ากราฟไหนกำลังทำงานอยู่ (ถูกคลิกโฟกัสไว้)
  // -----------------------------------------------------------------
  const [activeTargetChart, setActiveTargetChart] = useState("chart1");

  // ฟังก์ชันสำหรับกดเลือกหุ้นจาก List ด้านข้าง
const handleStockClick = (symbol) => {
  // ✅ เลือกได้แค่ตัวเดียว - อัปเดตทั้ง 3 chart พร้อมกัน
  setChartSelections({
    chart1: symbol,
    chart2: symbol,
    chart3: symbol,
  });
  setSelectedSymbol(symbol);
};

  // อัปเดตกราฟเมื่อ chartSelections เปลี่ยน
useEffect(() => {
  const newData = { ...chartData };
  const newMinMax = { ...chartMinMax };

  Object.keys(chartSelections).forEach((key) => {
      const stockName = chartSelections[key];
      if (stockName) { // ✅ ถ้าไม่มี symbol ไม่ต้องสร้างกราฟ
        const basePrice = (stockName.length * 15) + 50; 
        const data = generateMockStockData(basePrice, 80); 
        
        newData[key] = data;
        newMinMax[key] = { min: Math.min(...data), max: Math.max(...data) };
      } else {
        newData[key] = [];
      }
  });

  setChartData(newData);
  setChartMinMax(newMinMax);
}, [chartSelections]);

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
const renderFigmaPanel = (title, stocks, iconText = "🌐", flexClass = "flex-1") => {
  const filteredStocks = stocks.filter(s => s.dr.toLowerCase().includes(globalFilter.toLowerCase()));

  return (
    <div className={`bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 ${flexClass}`}>
        <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a]">
            <span className="font-bold text-[13px] text-white">{title}</span>
            <span className="text-cyan-500 text-[11px] font-bold">{iconText}</span>
        </div>

        <div className="flex justify-between text-[9px] text-slate-500 px-2 py-1 font-semibold uppercase tracking-wider sticky top-0 bg-[#111827] border-b border-slate-800/60 z-20">
          <span>DR/DRx</span>
          <span>TradingView</span>
        </div>

        <div className="overflow-y-auto flex-1 bg-[#0B1221] p-2" style={scrollbarHideStyle}>
            {filteredStocks.map((stock, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleStockClick(stock.dr)}
                  // ✅ Highlight ถ้าเลือก
                  className={`flex justify-between items-center text-[10px] p-1.5 rounded cursor-pointer transition-colors group ${
                    selectedSymbol === stock.dr 
                      ? 'bg-cyan-500/20 border border-cyan-500/50' 
                      : 'hover:bg-slate-800/60'
                  }`}
                >
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
      
      {/* 1. Top Bar: Search Filter + Market Indicators */}
      <div className="flex items-center justify-center gap-6 mb-4 shrink-0">
        {/* กลาง: ค้นหา + ตัวบ่งชี้ตลาด */}
        <div className="flex justify-center items-center gap-6">
          {/* ค้นหา - ทำให้เป็นรูป pill เหมือน market indicators */}
          <div className="bg-[#111827] border border-slate-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter symbol..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none placeholder-slate-600 w-40"
            />
          </div>

          {/* ตัวบ่งชี้ตลาด */}
          <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm whitespace-nowrap">
            <span>ราคาน้ำมัน</span> 
            <div className="w-8 h-0.5 bg-[#3b82f6]"></div>
          </div>
          <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm whitespace-nowrap">
            <span>PE Ratio</span> 
            <div className="w-8 h-0.5 bg-[#ef4444]"></div>
          </div>
          <div className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm whitespace-nowrap">
            <span>Last</span> 
            <div className="w-8 h-0.5 bg-[#22c55e]"></div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid Layout (3 Columns: Left, Mid, Right) */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* === Left Column: USA, Europe, ETC (3/12) === */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            {renderFigmaPanel("USA", usaStocks, "🌎", "flex-[4]")}
            {renderFigmaPanel("Europe", europeStocks, "🌍", "flex-[3]")}
            {renderFigmaPanel("ETC", etcStocks, "🌎", "flex-[2]")}
        </div>

        {/* === Middle Column: 3 Charts (6/12) === */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
           {['chart1', 'chart2', 'chart3'].map((chartKey, index) => {
              const stockName = chartSelections[chartKey];
              const stockData = allStockOptions.find(s => s.dr === stockName) || {};
              
              // ✅ สร้างชื่อกราฟตามรูปแบบ
              let chartTitle = "";
              if (index === 0) {
                chartTitle = stockData.real || "Select a symbol"; 
              } else if (index === 1) {
                chartTitle = `PE:${stockData.real || "Select a symbol"}`; 
              } else {
                chartTitle = stockName || "Select a symbol"; 
              }

              const themeColors = ["#3b82f6", "#ef4444", "#22c55e"]; 
              const lineColor = themeColors[index];

              const data = chartData[chartKey];
              const { min, max } = chartMinMax[chartKey];
              const range = max - min || 1;
              const pathD = buildSvgPath(data, min, max);

              let currentYPercent = null;
              let hoverValue = null;
              let actualXPercent = hoverPos;

              if (hoverPos !== null && data.length > 0) {
                  const dataIndex = Math.min(data.length - 1, Math.max(0, Math.round((hoverPos / 100) * (data.length - 1))));
                  hoverValue = data[dataIndex];
                  currentYPercent = 100 - ((hoverValue - min) / range) * 100;
                  actualXPercent = (dataIndex / (data.length - 1)) * 100;
              }

              const isActive = activeTargetChart === chartKey;

    return (
        <div 
            key={chartKey} 
            onClick={() => setActiveTargetChart(chartKey)}
            className={`bg-[#111827] border border-slate-700 rounded-xl p-4 flex flex-col flex-1 overflow-hidden min-h-0 relative transition-all duration-200 cursor-pointer`}
        >
                        
        {/* Chart Header */}
        <div className="flex justify-between items-start shrink-0 z-40 relative mb-3">
          {/* ✅ Dropdown Select */}
            <div className="relative group/select cursor-pointer flex items-baseline gap-2">
                  <select
                    value={stockName}
                    onChange={(e) => {
                      setChartSelections({...chartSelections, [chartKey]: e.target.value});
                      setActiveTargetChart(chartKey);
                    }}
                    className="w-full px-3 py-1.5 bg-[#1a2235] border border-slate-700/50 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500 placeholder-slate-600 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      paddingRight: '28px'
                    }}
                 >
                     <option value="" className="bg-[#1f2937] text-slate-300">Select a symbol...</option>
                    {allStockOptions.map(s => (
                        <option key={s.dr} value={s.dr} className="bg-[#1f2937] text-slate-300">
                            {s.dr} - {s.name}
                        </option>
                    ))}
                 </select>
                 {/* ✅ แสดงชื่อกราฟตามรูปแบบ */}
                 
                 {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-2 animate-pulse"></span>}
            </div>
            <div className="flex gap-3 text-slate-600">
                 {/* Fullscreen Button */}
                <button 
                  onClick={() => setFullscreenChart(chartKey)}
                  className="hover:text-cyan-400 transition"
                  title="Fullscreen"
                >
                  ⛶
                </button>
                <button className="hover:text-white transition">⚙</button>
            </div>
        </div>

                        {/* Graph Area */}
                        <div 
                          className="flex-1 w-full bg-[#0B1221] border border-slate-800/40 rounded-lg relative overflow-hidden flex items-end group/chart cursor-crosshair"
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                            setHoverPos(Math.max(0, Math.min(100, xPercent)));
                          }}
                          onMouseLeave={() => setHoverPos(null)}
                        >
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                            
                            {/* ✅ ถ้าไม่มี symbol ให้แสดง placeholder */}
                            {!stockName && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-slate-500 text-sm">Select a symbol to display chart</span>
                              </div>
                            )}
                            
                            {/* ✅ ถ้ามี symbol จึงแสดง SVG */}
                            {stockName && (
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                                  <defs>
                                      <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                                              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                                      </linearGradient>
                                  </defs>
                                  <path 
                                      d={pathD} 
                                      fill="none" 
                                      stroke={lineColor} 
                                      strokeWidth="2" 
                                      vectorEffect="non-scaling-stroke"
                                  />
                                  <path 
                                      d={pathD + " V 100 H 0 Z"} 
                                      fill={`url(#grad-${index})`} 
                                      stroke="none" 
                                  />
                              </svg>
                            )}

                            {stockName && (
                              <>
                                <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between text-[8px] text-slate-600 text-right pointer-events-none z-10">
                                    <span>{max.toFixed(2)}</span>
                                    <span>{(min + range * 0.75).toFixed(2)}</span>
                                    <span>{(min + range * 0.5).toFixed(2)}</span>
                                    <span>{(min + range * 0.25).toFixed(2)}</span>
                                    <span>{min.toFixed(2)}</span>
                                </div>

                                {hoverPos !== null && currentYPercent !== null && (
                                    <>
                                        <div 
                                            className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80"
                                            style={{ left: `${actualXPercent}%` }}
                                        ></div>

                                        <div 
                                            className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80"
                                            style={{ top: `${currentYPercent}%` }}
                                        ></div>
                                        
                                        <div 
                                            className="absolute z-30 pointer-events-none w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                                            style={{ 
                                                left: `${actualXPercent}%`, 
                                                top: `${currentYPercent}%`,
                                                backgroundColor: lineColor, 
                                                boxShadow: `0 0 10px ${lineColor}`
                                            }}
                                        ></div>

                                        <div 
                                            className="absolute right-0 z-30 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] rounded shadow-md border border-slate-600 pointer-events-none"
                                            style={{ top: `${currentYPercent}%` }}
                                        >
                                            {hoverValue?.toFixed(2)}
                                        </div>
                                    </>
                                )}
                              </>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ✅ FULLSCREEN MODAL */}
                  {fullscreenChart && (() => {
                    const stockName = chartSelections[fullscreenChart];
                    const stockData = allStockOptions.find(s => s.dr === stockName) || {};
                    const index = ['chart1', 'chart2', 'chart3'].indexOf(fullscreenChart);
                    const themeColors = ["#3b82f6", "#ef4444", "#22c55e"];
                    const lineColor = themeColors[index];

                    // ✅ สร้างชื่อกราฟตามรูปแบบ
                    let chartTitle = "";
                    if (index === 0) {
                      chartTitle = stockData.real || stockName;
                    } else if (index === 1) {
                      chartTitle = `PE:${stockData.real || stockName}`;
                    } else {
                      chartTitle = stockName;
                    }

                    const data = chartData[fullscreenChart];
                    const { min, max } = chartMinMax[fullscreenChart];
                    const range = max - min || 1;
                    const pathD = buildSvgPath(data, min, max);

                    return (
                      <div className="fixed inset-0 bg-[#0B1221] z-50 flex flex-col p-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">{chartTitle}</h2>
                            <span className="text-sm text-slate-500">({stockData.name || "Company"})</span>
                          </div>
                          <button 
                            onClick={() => setFullscreenChart(null)}
                            className="text-3xl text-slate-400 hover:text-white transition"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Fullscreen Chart Area */}
                        <div 
                          className="flex-1 bg-[#111827] border border-slate-700 rounded-xl relative overflow-hidden group/chart cursor-crosshair"
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                            setHoverPos(Math.max(0, Math.min(100, xPercent)));
                          }}
                          onMouseLeave={() => setHoverPos(null)}
                        >
                          {/* Grid Background */}
                          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                          
                          {/* SVG Chart */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`fullscreen-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke={lineColor} 
                              strokeWidth="2" 
                              vectorEffect="non-scaling-stroke"
                            />
                            <path 
                              d={pathD + " V 100 H 0 Z"} 
                              fill={`url(#fullscreen-grad-${index})`} 
                              stroke="none" 
                            />
                          </svg>

                          {/* Y-axis Labels */}
                          <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between text-[10px] text-slate-600 text-right pointer-events-none z-10">
                            <span className="font-semibold">{max.toFixed(2)}</span>
                            <span>{(min + range * 0.75).toFixed(2)}</span>
                            <span>{(min + range * 0.5).toFixed(2)}</span>
                            <span>{(min + range * 0.25).toFixed(2)}</span>
                            <span className="font-semibold">{min.toFixed(2)}</span>
                          </div>

                          {/* Hover Lines */}
                          {hoverPos !== null && (() => {
                            const dataIndex = Math.min(data.length - 1, Math.max(0, Math.round((hoverPos / 100) * (data.length - 1))));
                            const hoverValue = data[dataIndex];
                            const currentYPercent = 100 - ((hoverValue - min) / range) * 100;
                            const actualXPercent = (dataIndex / (data.length - 1)) * 100;

                            return (
                              <>
                                {/* Vertical Line */}
                                <div 
                                  className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80"
                                  style={{ left: `${actualXPercent}%` }}
                                ></div>

                                {/* Horizontal Line */}
                                <div 
                                  className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80"
                                  style={{ top: `${currentYPercent}%` }}
                                ></div>
                                
                                {/* Point */}
                                <div 
                                  className="absolute z-30 pointer-events-none w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
                                  style={{ 
                                    left: `${actualXPercent}%`, 
                                    top: `${currentYPercent}%`,
                                    backgroundColor: lineColor, 
                                    boxShadow: `0 0 15px ${lineColor}`
                                  }}
                                ></div>

                                {/* Tooltip */}
                                <div 
                                  className="absolute right-0 z-30 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-md border border-slate-600 pointer-events-none font-semibold mr-2"
                                  style={{ top: `${currentYPercent}%` }}
                                >
                                  {hoverValue?.toFixed(2)}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

        </div>

        {/* === Right Column: Asia Pacific (3/12) === */}
        <div className="col-span-12 md:col-span-3 flex flex-col h-full bg-[#111827] border border-slate-800/80 rounded-xl p-4 shadow-xl overflow-hidden">
            <div className="text-center pb-3 mb-4 border-b border-slate-800/60 shrink-0">
                <span className="font-bold text-base text-white tracking-wide">Asia</span>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    {renderFigmaPanel("Japan", japanStocks, "JP", "flex-1")}
                    {renderFigmaPanel("Singapore", singaporeStocks, "SG", "flex-1")}
                    {renderFigmaPanel("Vietnam", vietnamStocks, "VN", "flex-1")}
                </div>
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    {renderFigmaPanel("China", chinaStocks, "CN", "flex-[3]")}
                    {renderFigmaPanel("Taiwan", taiwanStocks, "TW", "flex-1")}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}