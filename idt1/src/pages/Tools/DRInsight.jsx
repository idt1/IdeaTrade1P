// src/pages/tools/DRInsight.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import drIcon from "@/assets/icons/dr.svg";
import { Fullscreen, Settings as SettingsIcon } from '@mui/icons-material';
import ToolHint from "@/components/ToolHint.jsx";

import DRInsightDashboard from "./components/DRInsightDashboard.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

const features = [
  { title: "Global Symbol Mapping", desc: "Instantly connects every DR on the Thai board to its underlying international parent stock." },
  { title: "Arbitrage Tracking", desc: "Compare the parent stock's price against the Thai DR on a dual-pane screen." },
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

const dotColors = ["bg-blue-500", "bg-orange-500", "bg-green-500", "bg-red-500", "bg-purple-500", "bg-cyan-500", "bg-yellow-500", "bg-pink-500"];

/* ===============================
    MOCK DATA GENERATOR
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

/* ===============================
    MOBILE: CountrySection
    flat row + expandable inline stock list
================================ */
function CountrySection({ title, stocks, selectedSymbol, onStockClick, globalFilter, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const filtered = stocks.filter(s =>
    s.dr.toLowerCase().includes(globalFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(globalFilter.toLowerCase())
  );

  // Auto-open if filter matches something inside
  const hasFilterMatch = globalFilter.length > 0 && filtered.length > 0;

  return (
    <div className="border-b border-slate-800">
      {/* Country Row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#181e2a] text-sm font-semibold text-white hover:bg-[#1e2535] active:bg-[#232b3e] transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${(open || hasFilterMatch) ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Stock List */}
      {(open || hasFilterMatch) && (
        <div className="bg-[#0d1220]">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-600 text-center">No results</div>
          ) : (
            filtered.map((stock, idx) => (
              <button
                key={idx}
                onClick={() => onStockClick(stock.dr)}
                className={`w-full flex items-center justify-between px-5 py-2.5 border-b border-slate-800/40 transition-colors text-left ${
                  selectedSymbol === stock.dr
                    ? "bg-cyan-500/15 border-l-2 border-l-cyan-400"
                    : "hover:bg-[#1a2030] active:bg-[#1e2638]"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[idx % dotColors.length]}`} />
                  <span className={`text-xs font-bold tracking-wide shrink-0 ${
                    selectedSymbol === stock.dr ? "text-cyan-400" : "text-slate-200"
                  }`}>
                    {stock.dr}
                  </span>
                  <span className="text-xs text-slate-500 truncate">{stock.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 ml-2">{stock.real}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ===============================
    CHART CARD COMPONENT
================================ */
function ChartCard({ chartKey, chartSelections, setChartSelections, chartData, chartMinMax, hoverPos, setHoverPos, themeColor, onFullscreen, onStockSelect }) {
  const stockName = chartSelections[chartKey];
  const index = ['chart1', 'chart2', 'chart3'].indexOf(chartKey);

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

  return (
      <div className="bg-[#1a1f2b] border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#1e2433]">
          <select
            value={stockName}
            onChange={(e) => {
              onStockSelect(e.target.value);
              setChartSelections(prev => ({ ...prev, [chartKey]: e.target.value }));
            }}
            className="flex-1 mr-3 bg-[#0f151e] text-slate-300 border border-slate-700/50 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
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
          <div className="flex items-center gap-3 text-slate-600">
            <button onClick={() => onFullscreen(chartKey)} className="hover:text-cyan-400 transition text-slate-400" title="Fullscreen">⛶</button>
            <button className="hover:text-cyan-400 transition text-slate-400">
              <SettingsIcon sx={{ fontSize: 16, color: "inherit" }} />
            </button>
          </div>
        </div>

      <div
        className="relative bg-[#0B1221] cursor-crosshair"
        style={{ height: "180px" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverPos(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
        }}
        onMouseLeave={() => setHoverPos(null)}
        onTouchEnd={() => setHoverPos(null)}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}></div>

        {!stockName && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-600 text-xs">Select a symbol to display chart</span>
          </div>
        )}

        {stockName && (
          <>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`mob-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={pathD} fill="none" stroke={themeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={pathD + " V 100 H 0 Z"} fill={`url(#mob-grad-${index})`} stroke="none" />
            </svg>
            <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[8px] text-slate-600 text-right pointer-events-none z-10">
              <span>{max.toFixed(2)}</span>
              <span>{(min + range * 0.5).toFixed(2)}</span>
              <span>{min.toFixed(2)}</span>
            </div>
            {hoverPos !== null && currentYPercent !== null && (
              <>
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80"
                  style={{ left: `${actualXPercent}%` }}></div>
                <div className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80"
                  style={{ top: `${currentYPercent}%` }}></div>
                <div className="absolute z-30 pointer-events-none w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${actualXPercent}%`, top: `${currentYPercent}%`, backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
                <div className="absolute right-0 z-30 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] rounded shadow-md border border-slate-600 pointer-events-none mr-2"
                  style={{ top: `${currentYPercent}%` }}>
                  {hoverValue?.toFixed(2)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WaveSkeleton({ delay = 0 }) {
  return (
    <div className="w-full h-[180px] bg-[#0f172a] rounded-lg overflow-hidden relative">
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex gap-2">
          <div className="h-2 rounded-full bg-slate-800 w-1/3" />
          <div className="h-2 rounded-full bg-slate-800 w-1/5" />
        </div>
        <div className="flex-1 my-3 rounded bg-slate-800/60" />
        <div className="flex gap-3 justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2 rounded-full bg-slate-800 flex-1" />
          ))}
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

/* ===============================
    MAIN COMPONENT
================================ */
export default function DRInsight() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const scrollDirection = useRef(1);
  const isPaused = useRef(false);

  const [fullscreenChart, setFullscreenChart] = useState(null);
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
  const [globalFilter, setGlobalFilter] = useState("");
  const [chartSelections, setChartSelections] = useState({ chart1: "", chart2: "", chart3: "" });
  const [selectedSymbol, setSelectedSymbol] = useState("");

  const { accessData, isFreeAccess, currentUser } = useSubscription();
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  useEffect(() => {
    if (isFreeAccess) { setIsMember(true); return; }
    const toolId = 'dr';
    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;
      try {
        expireDate = typeof expireTimestamp.toDate === 'function' ? expireTimestamp.toDate() : new Date(expireTimestamp);
      } catch (e) { expireDate = new Date(0); }
      setIsMember(expireDate.getTime() > new Date().getTime());
    } else { setIsMember(false); }
  }, [accessData, isFreeAccess]);

  const handleStockClick = (symbol) => {
  setIsLoadingCharts(true);
  setChartSelections({ chart1: symbol, chart2: symbol, chart3: symbol });
  setSelectedSymbol(symbol);

  setTimeout(() => {
    setIsLoadingCharts(false);
  }, 700);
};

  useEffect(() => {
    const newData = { ...chartData };
    const newMinMax = { ...chartMinMax };
    Object.keys(chartSelections).forEach((key) => {
      const stockName = chartSelections[key];
      if (stockName) {
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

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 1);
      setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      isPaused.current = true;
      scrollContainerRef.current.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
      scrollDirection.current = direction === "left" ? -1 : 1;
      setTimeout(checkScroll, 300);
      setTimeout(() => { isPaused.current = false; }, 500);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const autoScrollInterval = setInterval(() => {
      if (isPaused.current || !container) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      if (scrollDirection.current === 1 && Math.ceil(scrollLeft) >= maxScroll - 2) scrollDirection.current = -1;
      else if (scrollDirection.current === -1 && scrollLeft <= 2) scrollDirection.current = 1;
      container.scrollLeft += scrollDirection.current;
      checkScroll();
    }, 15);
    return () => clearInterval(autoScrollInterval);
  }, [isMember, enteredTool]);

  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const themeColors = ["#3b82f6", "#ef4444", "#22c55e"];

  /* ==========================================================
      SHARED JSX — Features Scroll & Preview Section
  ========================================================== */
  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
      <div className="relative group w-full" onMouseEnter={() => isPaused.current = true} onMouseLeave={() => isPaused.current = false}>
        <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1" style={scrollbarHideStyle}>
          {features.map((item, index) => (
            <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
              <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const dashboardPreviewJSX = (
    <div className="relative group w-full max-w-5xl mb-16">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
      <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-700/50 flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <div className="w-full bg-[#0B1221]">
          <DRInsightDashboard />
        </div>
      </div>
    </div>
  );

  /* ==========================================================
      CASE 1 : PREVIEW / NOT MEMBER
  =========================================================== */
  if (!isMember) {
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

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

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
      CASE 2 : START SCREEN (Member but not entered)
  ========================================================== */
  if (isMember && !enteredTool) {
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

          {/* Dashboard Preview */}
          {dashboardPreviewJSX}

          {/* Features */}
          {featuresSectionJSX}

          {/* CTA Button */}
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <button
              onClick={() => setEnteredTool(true)}
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
      CASE 3 : FULL DASHBOARD
  =========================================================== */
  return (
    <div className="w-full bg-[#0B1221] text-white font-sans">

      {/* =============================================
          MOBILE LAYOUT (< md)
          Layout: scroll page = symbol list on top + charts below
      ============================================= */}
      <div className="md:hidden flex flex-col min-h-screen">

        {/* Search Bar — sticky at top */}
        <div className="sticky top-0 z-40 bg-[#0B1221] px-3 pt-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-[#1a1f2b] border border-slate-700/60 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter symbol..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none placeholder-slate-600 w-full"
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter("")} className="text-slate-500 hover:text-white transition shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Country Sections — inline, no drawer */}
        <div className="bg-[#0d1118]">
          <CountrySection title="USA"    stocks={usaStocks}    selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
          <CountrySection title="Europe" stocks={europeStocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
          <CountrySection
            title="Asia"
            stocks={[...japanStocks, ...chinaStocks, ...singaporeStocks, ...vietnamStocks, ...taiwanStocks]}
            selectedSymbol={selectedSymbol}
            onStockClick={handleStockClick}
            globalFilter={globalFilter}
          />
          <CountrySection title="ETC"    stocks={etcStocks}    selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
        </div>

        {/* Legend Bar */}
        <div className="mx-3 mt-3 mb-2 flex justify-between items-center bg-[#1a1f2b] border border-slate-800 rounded-full px-4 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-6 h-0.5 bg-blue-500 rounded"></div>
            <span>ราคาน้ำมัน</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-6 h-0.5 bg-red-500 rounded"></div>
            <span>PE Ratio</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <div className="w-6 h-0.5 bg-green-500 rounded"></div>
            <span>Last</span>
          </div>
        </div>

        {/* Charts */}
        <div className="flex flex-col gap-3 px-3 pb-6">
        {isLoadingCharts ? (
          ['chart1', 'chart2', 'chart3'].map((chartKey, index) => (
            <div key={chartKey} className="bg-[#1a1f2b] border border-slate-700/60 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#1e2433]">
                <select
                  disabled
                  value={chartSelections[chartKey]}
                  className="flex-1 mr-3 bg-[#0f151e] text-slate-300 border border-slate-700/50 rounded px-2 py-1.5 text-xs opacity-50 cursor-not-allowed"
                >
                  <option>Select a symbol...</option>
                </select>
                <div className="flex items-center gap-3 text-slate-600 opacity-50">
                  <span className="text-sm">⛶</span>
                  <span className="text-sm">⚙</span>
                </div>
              </div>
              <WaveSkeleton delay={index * 0.2} />
            </div>
          ))
        ) : (
          ['chart1', 'chart2', 'chart3'].map((chartKey, index) => (
            <ChartCard
              key={chartKey}
              chartKey={chartKey}
              chartSelections={chartSelections}
              setChartSelections={setChartSelections}
              chartData={chartData}
              chartMinMax={chartMinMax}
              hoverPos={hoverPos}
              setHoverPos={setHoverPos}
              themeColor={themeColors[index]}
              onFullscreen={setFullscreenChart}
              onStockSelect={handleStockClick}
            />
          ))
        )}
      </div>

      </div>
      {/* END MOBILE LAYOUT */}

      {/* =============================================
          DESKTOP LAYOUT (>= md) — unchanged
      ============================================= */}
      <div className="hidden md:flex md:flex-col h-screen p-3 overflow-hidden animate-fade-in">

        <div className="flex items-center justify-center gap-6 mb-4 shrink-0">
<ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
    ​เครื่องมือวิเคราะห์ DR ที่เชื่อมข้อมูลหุ้นแม่ในต่างประเทศเข้ากับกระดานหุ้นไทย
  </ToolHint>

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
          {globalFilter && (
    <button
      onClick={() => setGlobalFilter("")}
      className="text-slate-500 hover:text-white transition shrink-0"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )}
</div>
          {[{ label: "ราคาน้ำมัน", color: "bg-blue-500" }, { label: "PE Ratio", color: "bg-red-500" }, { label: "Last", color: "bg-green-500" }].map(item => (
            <div key={item.label} className="bg-[#111827] px-5 py-2 rounded-full text-[11px] text-slate-400 border border-slate-800 flex items-center gap-3 shadow-sm whitespace-nowrap">
              <span>{item.label}</span>
              <div className={`w-8 h-0.5 ${item.color}`}></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

          <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          {[
            // บรรทัดที่ประมาณ 800+ แทน emoji 🌎 🌍 🌐
          { title: "USA", stocks: usaStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[4]" },
          { title: "Europe", stocks: europeStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[3]" },
          { title: "ETC", stocks: etcStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[2]" },
          ].map(({ title, stocks, icon, flex }) => {
            const filtered = stocks.filter(s => s.dr.toLowerCase().includes(globalFilter.toLowerCase()));
            return (
              <div key={title} className={`bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 ${flex}`}>
                <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a]">
                  <span className="font-bold text-[12px] text-white">{title}</span>
                  <span className="text-cyan-500 text-[10px] font-bold">{icon}</span>
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 px-2 py-1 font-semibold uppercase tracking-wider sticky top-0 bg-[#111827] border-b border-slate-800/60 z-20">
                  <span>DR/DRx</span>
                  <span>TradingView</span>
                </div>
                <div className="overflow-y-auto flex-1 bg-[#0B1221] p-2" style={scrollbarHideStyle}>
                  {filtered.map((stock, idx) => (
                    <div key={idx} onClick={() => handleStockClick(stock.dr)}
                      className={`flex justify-between items-center text-[9px] p-1.5 rounded cursor-pointer transition-colors group ${selectedSymbol === stock.dr ? 'bg-cyan-500/20 border border-cyan-500/50' : 'hover:bg-slate-800/60'}`}>
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
          })}
        </div>

         <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
  {isLoadingCharts ? (
    ['chart1', 'chart2', 'chart3'].map((chartKey, index) => (
      <div key={chartKey} className="bg-[#111827] border border-slate-700 rounded-xl p-4 flex flex-col flex-1 overflow-hidden min-h-0 relative">
        <div className="flex justify-between items-start shrink-0 z-40 relative mb-3">
          <select
            disabled
            value={chartSelections[chartKey]}
            className="flex-1 mr-3 px-3 py-1.5 bg-[#1a2235] border border-slate-700/50 rounded text-sm text-slate-300 opacity-50 cursor-not-allowed"
          >
            <option>Select a symbol...</option>
          </select>
          <div className="flex gap-3 text-slate-600 opacity-50">
            <button disabled>⛶</button>
            <button disabled>⚙</button>
          </div>
        </div>
        <WaveSkeleton delay={index * 0.2} />
      </div>
    ))
  ) : (
    ['chart1', 'chart2', 'chart3'].map((chartKey, index) => {
      const stockName = chartSelections[chartKey];
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

      return (
        <div key={chartKey} className="bg-[#111827] border border-slate-700 rounded-xl p-4 flex flex-col flex-1 overflow-hidden min-h-0 relative">
          <div className="flex justify-between items-start shrink-0 z-40 relative mb-3">
            <select
              value={stockName}
              onChange={(e) => setChartSelections({ ...chartSelections, [chartKey]: e.target.value })}
              className="flex-1 mr-3 px-3 py-1.5 bg-[#1a2235] border border-slate-700/50 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px'
              }}
            >
              <option value="" className="bg-[#1f2937] text-slate-300">Select a symbol...</option>
              {allStockOptions.map(s => (
                <option key={s.dr} value={s.dr} className="bg-[#1f2937] text-slate-300">{s.dr} - {s.name}</option>
              ))}
            </select>
            <div className="flex gap-3 text-slate-600">
              <div className="flex gap-3 text-white">
                <button onClick={() => setFullscreenChart(chartKey)} className="hover:text-cyan-400 transition" title="Fullscreen">⛶</button>
                <button className="hover:text-cyan-400 transition">
                  <SettingsIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
          </div>
          <div
            className="flex-1 w-full bg-[#0B1221] border border-slate-800/40 rounded-lg relative overflow-hidden flex items-end cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
            }}
            onMouseLeave={() => setHoverPos(null)}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            {!stockName && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-slate-500 text-sm">Select a symbol to display chart</span>
              </div>
            )}
            {stockName && (
              <>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <path d={pathD + " V 100 H 0 Z"} fill={`url(#grad-${index})`} stroke="none" />
                </svg>
                <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between text-[8px] text-slate-600 text-right pointer-events-none z-10">
                  {[max, min + range * 0.75, min + range * 0.5, min + range * 0.25, min].map((v, i) => (
                    <span key={i}>{v.toFixed(2)}</span>
                  ))}
                </div>
                {hoverPos !== null && currentYPercent !== null && (
                  <>
                    <div className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80" style={{ left: `${actualXPercent}%` }}></div>
                    <div className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80" style={{ top: `${currentYPercent}%` }}></div>
                    <div className="absolute z-30 pointer-events-none w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${actualXPercent}%`, top: `${currentYPercent}%`, backgroundColor: lineColor, boxShadow: `0 0 10px ${lineColor}` }}></div>
                    <div className="absolute right-0 z-30 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] rounded shadow-md border border-slate-600 pointer-events-none"
                      style={{ top: `${currentYPercent}%` }}>{hoverValue?.toFixed(2)}</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    })
  )}
</div>

          <div className="col-span-3 flex flex-col h-full bg-[#111827] border border-slate-800/80 rounded-xl p-4 shadow-xl overflow-hidden">
            <div className="text-center pb-3 mb-4 border-b border-slate-800/60 shrink-0">
              <span className="font-bold text-base text-white tracking-wide">Asia</span>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              <div className="flex flex-col gap-4 h-full overflow-hidden">
              {[
                { title: "Japan", stocks: japanStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[4]" },
                { title: "Singapore", stocks: singaporeStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[2]" },
                { title: "Vietnam", stocks: vietnamStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[2]" },
              ].map(({ title, stocks, icon, flex }) => {
                const filtered = stocks.filter(s => s.dr.toLowerCase().includes(globalFilter.toLowerCase()));
                return (
                  <div key={title} className="bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 flex-1">
                    <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a]">
                      <span className="font-bold text-[13px] text-white">{title}</span>
                      <span className="text-cyan-500 text-[11px] font-bold">{icon}</span>
                    </div>
                    <div className="overflow-y-auto flex-1 bg-[#0B1221] p-2" style={scrollbarHideStyle}>
                      {filtered.map((stock, idx) => (
                        <div key={idx} onClick={() => handleStockClick(stock.dr)}
                          className={`w-full flex items-center justify-between px-5 py-2.5 border-b border-slate-800/40 transition-colors text-left ${
                          selectedSymbol === stock.dr
                            ? "bg-cyan-500/15 border-l-2 border-l-cyan-400"
                            : "hover:bg-[#1a2030] active:bg-[#1e2638]"
                        }`}
                      >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`}></div>
                            {/* ✅ เพิ่ม text-[10px] ที่นี่ */}
                            <span className="text-[10px] text-slate-200 group-hover:text-white font-bold tracking-wide">{stock.dr}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate max-w-[55px] text-right">{stock.real}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                {[
                  { title: "China", stocks: chinaStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-[3]" },
                  { title: "Taiwan", stocks: taiwanStocks, icon: <img src={drIcon} alt="dr" className="w-4 h-4" />, flex: "flex-1" },
                ].map(({ title, stocks, icon, flex }) => {
                  const filtered = stocks.filter(s => s.dr.toLowerCase().includes(globalFilter.toLowerCase()));
                  return (
                    <div key={title} className={`bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 ${flex}`}>
                      <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a]">
                        <span className="font-bold text-[13px] text-white">{title}</span>
                        <span className="text-cyan-500 text-[11px] font-bold">{icon}</span>
                      </div>
                      <div className="overflow-y-auto flex-1 bg-[#0B1221] p-2" style={scrollbarHideStyle}>
                        {filtered.map((stock, idx) => (
                          <div key={idx} onClick={() => handleStockClick(stock.dr)}
                            className={`flex justify-between items-center text-[10px] p-1.5 rounded cursor-pointer transition-colors group ${selectedSymbol === stock.dr ? 'bg-cyan-500/20 border border-cyan-500/50' : 'hover:bg-slate-800/60'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${dotColors[idx % dotColors.length]}`}></div>
                              <span className="text-slate-200 group-hover:text-white font-bold tracking-wide">{stock.dr}</span>
                            </div>
                            <span className="text-slate-500 truncate max-w-[55px] text-right">{stock.real}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* END DESKTOP LAYOUT */}

      {/* FULLSCREEN MODAL */}
{fullscreenChart && (
  <div className="fixed inset-0 bg-[#0d1117] z-[80] flex flex-col">
    
    {/* Header — เหมือน FlowIntraday */}
    <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-slate-800 flex-shrink-0">
      
      {/* Back Button */}
      <button
        onClick={() => setFullscreenChart(null)}
        className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all flex-shrink-0"
      >
        ← Back
      </button>

      {/* Refresh Button */}
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-all flex-shrink-0"
      >
        🔄
      </button>

      {/* Title — Center */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-white tracking-widest">
          {chartSelections[fullscreenChart]}
        </h2>
        <span className="text-[11px] text-slate-500">
          {allStockOptions.find(s => s.dr === chartSelections[fullscreenChart])?.name || ""}
        </span>
      </div>

      {/* Spacer for balance */}
      <div style={{ width: '140px' }} />
    </div>

    {/* Chart Container */}
    <div className="flex-1 min-h-0 bg-[#0d1117] relative overflow-hidden cursor-crosshair"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      }}
      onTouchMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverPos(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
      }}
      onMouseLeave={() => setHoverPos(null)}
      onTouchEnd={() => setHoverPos(null)}
    >
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      {(() => {
        const index = ['chart1', 'chart2', 'chart3'].indexOf(fullscreenChart);
        const lineColor = themeColors[index];
        const data = chartData[fullscreenChart];
        const { min, max } = chartMinMax[fullscreenChart];
        const range = max - min || 1;
        const pathD = buildSvgPath(data, min, max);

        return (
          <>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`fullscreen-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={pathD + " V 100 H 0 Z"} fill={`url(#fullscreen-grad-${index})`} stroke="none" />
            </svg>

            {/* Y-axis Labels */}
            <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between text-[10px] text-slate-600 text-right pointer-events-none z-10">
              {[max, min + range * 0.75, min + range * 0.5, min + range * 0.25, min].map((v, i) => (
                <span key={i} className="font-semibold">{v.toFixed(2)}</span>
              ))}
            </div>

            {/* Hover Indicators */}
            {hoverPos !== null && (() => {
              const dataIndex = Math.min(data.length - 1, Math.max(0, Math.round((hoverPos / 100) * (data.length - 1))));
              const hoverValue = data[dataIndex];
              const currentYPercent = 100 - ((hoverValue - min) / range) * 100;
              const actualXPercent = (dataIndex / (data.length - 1)) * 100;
              return (
                <>
                  <div className="absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed border-slate-400 opacity-80" 
                    style={{ left: `${actualXPercent}%` }} />
                  <div className="absolute left-0 right-0 z-20 pointer-events-none border-t border-dashed border-slate-400 opacity-80" 
                    style={{ top: `${currentYPercent}%` }} />
                  <div className="absolute z-30 pointer-events-none w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{ 
                      left: `${actualXPercent}%`, 
                      top: `${currentYPercent}%`, 
                      backgroundColor: lineColor, 
                      boxShadow: `0 0 15px ${lineColor}` 
                    }} />
                  <div className="absolute right-0 z-30 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-md border border-slate-600 pointer-events-none font-semibold mr-2"
                    style={{ top: `${currentYPercent}%` }}>
                    {hoverValue?.toFixed(2)}
                  </div>
                </>
              );
            })()}
          </>
        );
      })()}
    </div>
  </div>
)}

    </div>
  );
}