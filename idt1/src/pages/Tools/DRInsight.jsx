// src/pages/tools/DRInsight.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import drIcon from "@/assets/icons/dr.svg";
import { Settings as SettingsIcon } from '@mui/icons-material';
import ToolHint from "@/components/ToolHint.jsx";
import DRInsightDashboard from "./components/DRInsightDashboard.jsx";
import { createChart, AreaSeries } from 'lightweight-charts';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = points; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    price += (Math.random() - 0.48) * (basePrice * 0.02);
    data.push({ time: `${yyyy}-${mm}-${dd}`, value: price });
  }
  return data;
};

/* ===============================
    TVCHART COMPONENT
================================ */
function TVChart({ data, themeColor = "#3b82f6" }) {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#64748b',
      },
      handleScroll: false,
      handleScale: false,
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(51, 65, 85, 0.1)' },
      },
      rightPriceScale: { 
        borderVisible: false,
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        entireTextOnly: true, 
      },
      timeScale: { 
        visible: false, 
        borderVisible: false,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
        mode: 1,
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: themeColor,
      topColor: themeColor + '40',
      bottomColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, themeColor]);

  return (
    <div className="relative w-full h-full tv-chart-container">
      <style>{`
        .tv-chart-container a { 
          display: none !important; 
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>
      <div ref={chartContainerRef} className="absolute inset-0 w-full h-full min-h-[150px]" />
    </div>
  );
}

/* ===============================
    WAVE SKELETON
================================ */
const shimmerKeyframes = `
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

function WaveSkeleton({ delay = 0, height = "180px" }) {
  return (
    <div
      className="w-full bg-[#0f172a] rounded-lg overflow-hidden relative flex-1 min-h-0"
      style={{ height: height === "100%" ? "100%" : height }}
    >
      <style>{shimmerKeyframes}</style>
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
          background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 40%, rgba(125,211,252,0.18) 50%, rgba(56,189,248,0.08) 60%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}
/* ===============================
    LEGEND PILLS
================================ */
function LegendPills() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { label: "ราคาน้ำมัน", color: "bg-blue-500" },
        { label: "PE Ratio", color: "bg-red-500" },
        { label: "Last", color: "bg-green-500" },
      ].map(item => (
        <div
          key={item.label}
          className="bg-[#111827] px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] text-slate-400 border border-slate-800 flex items-center gap-2 whitespace-nowrap"
        >
          <span>{item.label}</span>
          <div className={`w-5 sm:w-7 h-0.5 ${item.color} rounded`}></div>
        </div>
      ))}
    </div>
  );
}

/* ===============================
    SEARCH BAR
================================ */
function SearchBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-[#1a1f2b] border border-slate-700/60 rounded-xl px-3 py-2 sm:py-2.5">
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Filter symbol..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-xs sm:text-sm text-slate-300 focus:outline-none placeholder-slate-600 w-full"
      />
      {value && (
        <button onClick={() => onChange("")} className="text-slate-500 hover:text-white transition shrink-0">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ===============================
    STOCK LIST ITEM
================================ */
function StockListItem({ stock, idx, selectedSymbol, onClick, compact = false }) {
  const isSelected = selectedSymbol === stock.dr;
  return (
    <div
      onClick={() => onClick(stock.dr)}
      className={`flex justify-between items-center cursor-pointer transition-colors group rounded
        ${compact
          ? "text-[9px] p-1 sm:p-1.5"
          : "text-[10px] px-2 py-1.5 border-b border-slate-800/40"
        }
        ${isSelected
          ? "bg-cyan-500/20 border border-cyan-500/50"
          : "hover:bg-slate-800/60"
        }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[idx % dotColors.length]}`} />
        <span className={`font-bold tracking-wide truncate ${isSelected ? "text-cyan-400" : "text-slate-200 group-hover:text-white"}`}>
          {stock.dr}
        </span>
      </div>
      <span className="text-slate-500 truncate max-w-[55px] sm:max-w-[70px] text-right ml-1 shrink-0">
        {stock.real}
      </span>
    </div>
  );
}

/* ===============================
    STOCK PANEL (sidebar panel)
================================ */
function StockPanel({ title, stocks, selectedSymbol, onStockClick, globalFilter, compact = false, flex = "" }) {
  const filtered = stocks.filter(s =>
    s.dr.toLowerCase().includes(globalFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(globalFilter.toLowerCase())
  );

  return (
    <div className={`bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg min-h-0 ${flex}`}>
      <div className="px-2 sm:px-3 py-2 sm:py-2.5 flex justify-between items-center border-b border-slate-800/60 bg-[#141b2a] shrink-0">
        <span className="font-bold text-[11px] sm:text-[13px] text-white">{title}</span>
        <img src={drIcon} alt="dr" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      {!compact && (
        <div className="flex justify-between text-[8px] text-slate-500 px-2 py-1 font-semibold uppercase tracking-wider bg-[#111827] border-b border-slate-800/60 shrink-0">
          <span>DR/DRx</span>
          <span>TradingView</span>
        </div>
      )}
      <div className="overflow-y-auto flex-1 bg-[#0B1221] p-1.5 sm:p-2" style={scrollbarHideStyle}>
        {filtered.length === 0 ? (
          <div className="text-center text-[10px] text-slate-600 py-2">No results</div>
        ) : (
          filtered.map((stock, idx) => (
            <StockListItem
              key={stock.dr}
              stock={stock}
              idx={idx}
              selectedSymbol={selectedSymbol}
              onClick={onStockClick}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ===============================
    MOBILE: CountrySection
================================ */
function CountrySection({ title, stocks, selectedSymbol, onStockClick, globalFilter, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const filtered = stocks.filter(s =>
    s.dr.toLowerCase().includes(globalFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(globalFilter.toLowerCase())
  );
  const hasFilterMatch = globalFilter.length > 0 && filtered.length > 0;

  return (
    <div className="border-b border-slate-800">
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

      {(open || hasFilterMatch) && (
        <div className="bg-[#0d1220]">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-600 text-center">No results</div>
          ) : (
            filtered.map((stock) => (
              <button
                key={stock.dr}
                onClick={() => onStockClick(stock.dr)}
                className={`w-full flex items-center justify-between px-5 py-2.5 border-b border-slate-800/40 transition-colors text-left ${
                  selectedSymbol === stock.dr
                    ? "bg-cyan-500/15 border-l-2 border-l-cyan-400"
                    : "hover:bg-[#1a2030] active:bg-[#1e2638]"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500" />
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
function ChartCard({ chartKey, chartSelections, setChartSelections, chartData, themeColor, onFullscreen, onStockSelect, containerClass = "", customHeightClass = "h-[200px] shrink-0" }) {
  const stockName = chartSelections[chartKey];
  const data = chartData[chartKey];

  return (
    <div className={`bg-[#1a1f2b] border border-slate-700/60 rounded-xl overflow-hidden flex flex-col ${containerClass}`}>
      {/* ส่วนหัวของกราฟ (Dropdown) */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#1e2433] shrink-0 z-10">
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

      {/* พื้นที่ของกราฟ */}
      <div className={`relative bg-[#0B1221] w-full ${customHeightClass}`}>
        {!stockName && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-slate-600 text-xs">Select a symbol to display chart</span>
          </div>
        )}
        {stockName && data?.length > 0 && (
          <TVChart data={data} themeColor={themeColor} />
        )}
      </div>
    </div>
  );
}

/* ===============================
    MOBILE: Nested Country Section (เมนูย่อยกดพับได้)
================================ */
function NestedCountrySection({ region, selectedSymbol, onStockClick, globalFilter }) {
  const [open, setOpen] = useState(false); // ตั้งค่าเริ่มต้นเป็น false (ย่อปิดไว้)
  
  const filtered = region.stocks.filter(s =>
    s.dr.toLowerCase().includes(globalFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(globalFilter.toLowerCase())
  );
  
  const hasFilterMatch = globalFilter.length > 0 && filtered.length > 0;

  if (filtered.length === 0) return null;

  return (
    <div className="border-b border-slate-800/50 last:border-none">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-[#111827] hover:bg-[#1a2235] transition-colors"
      >
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>{region.icon}</span>
          <span>{region.title}</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${(open || hasFilterMatch) ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {(open || hasFilterMatch) && (
        <div className="bg-[#0d1220]">
          {filtered.map((stock) => (
            <button
              key={stock.dr}
              onClick={() => onStockClick(stock.dr)}
              className={`w-full flex items-center justify-between px-6 py-2.5 border-b border-slate-800/40 transition-colors text-left ${
                selectedSymbol === stock.dr
                  ? "bg-cyan-500/15 border-l-2 border-l-cyan-400"
                  : "hover:bg-[#1a2030] active:bg-[#1e2638]"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500" />
                <span className={`text-xs font-bold tracking-wide shrink-0 ${
                  selectedSymbol === stock.dr ? "text-cyan-400" : "text-slate-200"
                }`}>
                  {stock.dr}
                </span>
                <span className="text-xs text-slate-500 truncate">{stock.name}</span>
              </div>
              <span className="text-[10px] text-slate-600 shrink-0 ml-2">{stock.real}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===============================
    MOBILE: Asia Nested Section
================================ */
function AsiaMobileSection({ selectedSymbol, onStockClick, globalFilter, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  
  const regions = [
    { title: "Japan", stocks: japanStocks, icon: "🇯🇵" },
    { title: "China", stocks: chinaStocks, icon: "🇨🇳" },
    { title: "Singapore", stocks: singaporeStocks, icon: "🇸🇬" },
    { title: "Vietnam", stocks: vietnamStocks, icon: "🇻🇳" },
    { title: "Taiwan", stocks: taiwanStocks, icon: "🇹🇼" },
  ];

  const allAsiaStocks = regions.flatMap(r => r.stocks);
  const filteredAsiaStocks = allAsiaStocks.filter(s => 
    s.dr.toLowerCase().includes(globalFilter.toLowerCase()) || 
    s.name.toLowerCase().includes(globalFilter.toLowerCase())
  );
  const hasFilterMatch = globalFilter.length > 0 && filteredAsiaStocks.length > 0;

  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#181e2a] text-sm font-semibold text-white hover:bg-[#1e2535] active:bg-[#232b3e] transition-colors"
      >
        <span>Asia</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${(open || hasFilterMatch) ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {(open || hasFilterMatch) && (
        <div className="bg-[#0d1220]">
          {filteredAsiaStocks.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-600 text-center">No results</div>
          ) : (
            regions.map(region => (
              <NestedCountrySection
                key={region.title}
                region={region}
                selectedSymbol={selectedSymbol}
                onStockClick={onStockClick}
                globalFilter={globalFilter}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
/* ===============================
    MOBILE DASHBOARD COMPONENT
================================ */
function MobileDashboard({
  globalFilter, setGlobalFilter,
  selectedSymbol, onStockClick,
  chartSelections, setChartSelections,
  chartData, themeColors,
  isLoadingCharts,
  setFullscreenChart
}) {
  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Sticky Search */}
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

      {/* Accordions */}
      <div className="bg-[#0d1118]">
        <CountrySection title="USA" stocks={usaStocks} selectedSymbol={selectedSymbol} onStockClick={onStockClick} globalFilter={globalFilter} />
        <CountrySection title="Europe" stocks={europeStocks} selectedSymbol={selectedSymbol} onStockClick={onStockClick} globalFilter={globalFilter} />
        <AsiaMobileSection 
          selectedSymbol={selectedSymbol} 
          onStockClick={onStockClick} 
          globalFilter={globalFilter} 
        />
        <CountrySection title="ETC" stocks={etcStocks} selectedSymbol={selectedSymbol} onStockClick={onStockClick} globalFilter={globalFilter} />
      </div>

      {/* Legend */}
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

{/* Vertical Charts */}
      <div className="flex flex-col gap-3 px-3 pb-6">
        {isLoadingCharts ? (
          ['chart1', 'chart2', 'chart3'].map((chartKey, index) => (
            <div key={chartKey} className="bg-[#1a1f2b] border border-slate-700/60 rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#1e2433] shrink-0">
                <select disabled className="flex-1 mr-3 bg-[#0f151e] text-slate-300 border border-slate-700/50 rounded px-2 py-1.5 text-xs opacity-50 cursor-not-allowed">
                  <option>Select a symbol...</option>
                </select>
                <div className="flex items-center gap-3 text-slate-600 opacity-50">
                  <span className="text-sm">⛶</span>
                  <span className="text-sm">⚙</span>
                </div>
              </div>
              <div className="w-full h-[200px] shrink-0">
                <WaveSkeleton delay={index * 0.2} height="100%" />
              </div>
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
              themeColor={themeColors[index]}
              onFullscreen={setFullscreenChart}
              onStockSelect={onStockClick}
            />
          ))
        )}
      </div>
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
  const [chartData, setChartData] = useState({ chart1: [], chart2: [], chart3: [] });
  const [globalFilter, setGlobalFilter] = useState("");
  const [chartSelections, setChartSelections] = useState({ chart1: "", chart2: "", chart3: "" });
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  // Detect screen size for adaptive layouts
  const [screenSize, setScreenSize] = useState("mobile");

  const { accessData, isFreeAccess, currentUser } = useSubscription();

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      if (w < 950)       setScreenSize("mobile"); 
      else if (w < 1180) setScreenSize("tablet"); 
      else if (w < 1440) setScreenSize("laptop");
      else               setScreenSize("desktop");
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (isFreeAccess) { setIsMember(true); return; }
    const toolId = 'dr';
    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;
      try {
        expireDate = typeof expireTimestamp.toDate === 'function'
          ? expireTimestamp.toDate()
          : new Date(expireTimestamp);
      } catch (e) { expireDate = new Date(0); }
      setIsMember(expireDate.getTime() > new Date().getTime());
    } else {
      setIsMember(false);
    }
  }, [accessData, isFreeAccess]);

  const handleStockClick = (symbol) => {
    setIsLoadingCharts(true);
    setChartSelections({ chart1: symbol, chart2: symbol, chart3: symbol });
    setSelectedSymbol(symbol);
    setTimeout(() => setIsLoadingCharts(false), 700);
  };

  useEffect(() => {
    setChartData(() => {
      const newData = {};
      Object.keys(chartSelections).forEach((key) => {
        const stockName = chartSelections[key];
        newData[key] = stockName
          ? generateMockStockData((stockName.length * 15) + 50, 80)
          : [];
      });
      return newData;
    });
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

  const featuresSectionJSX = (
    <div className="w-full max-w-5xl mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
      <div className="relative group w-full" onMouseEnter={() => isPaused.current = true} onMouseLeave={() => isPaused.current = false}>
        <button
          onClick={() => scroll("left")}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        >
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
        <button
          onClick={() => scroll("right")}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        >
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

  /* CASE 1: Not a member */
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
          {dashboardPreviewJSX}
          {featuresSectionJSX}
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

  /* CASE 2: Member, not yet entered */
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
          {dashboardPreviewJSX}
          {featuresSectionJSX}
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

  /* CASE 3: Full dashboard */
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";
  const isDesktop = screenSize === "desktop";

  return (
    <div className="w-full bg-[#0B1221] text-white font-sans">

      {/* -----------------------------------------------
          MOBILE (<640px)
      ----------------------------------------------- */}
      {isMobile && (
        <MobileDashboard
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          selectedSymbol={selectedSymbol}
          onStockClick={handleStockClick}
          chartSelections={chartSelections}
          setChartSelections={setChartSelections}
          chartData={chartData}
          themeColors={themeColors}
          isLoadingCharts={isLoadingCharts}
          setFullscreenChart={setFullscreenChart}
        />
      )}

      {/* -----------------------------------------------
          TABLET (640–1023px หรือ 950–1180px) — The Split View 
      ----------------------------------------------- */}
      {isTablet && (
        <div className="flex flex-col h-screen overflow-hidden bg-[#0B1221] p-3 gap-3 animate-fade-in">
          
          {/* Top Bar: กล่องค้นหา และ Legend */}
          <div className="flex items-center gap-4 shrink-0 bg-[#111827] border border-slate-800/80 rounded-xl p-2.5 shadow-sm">
            <div className="w-[260px] shrink-0">
              <SearchBar value={globalFilter} onChange={setGlobalFilter} />
            </div>
            <div className="flex-1 flex justify-end pr-2">
              <LegendPills />
            </div>
          </div>

          {/* Main Area: แบ่งซ้าย-ขวา */}
          <div className="flex flex-1 gap-3 min-h-0">
            
            {/* ซ้าย: Sidebar รวมลิสต์หุ้นทั้งหมด (Scroll ได้อิสระ) */}
            <div className="w-[260px] shrink-0 bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden shadow-lg">
              <div className="px-4 py-3.5 border-b border-slate-800/60 bg-[#141b2a] shrink-0 flex items-center justify-between">
                <span className="font-bold text-[13px] text-white">Symbol List</span>
                <img src={drIcon} alt="dr" className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-y-auto bg-[#0d1220]" style={scrollbarHideStyle}>
                <CountrySection title="🇺🇸 USA" stocks={usaStocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} defaultOpen={true} />
                <CountrySection title="🇪🇺 Europe" stocks={europeStocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
                <AsiaMobileSection selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
                <CountrySection title="🪙 ETC" stocks={etcStocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} />
              </div>
            </div>

            {/* ขวา: Charts Grid (กราฟ 1-2 อยู่บน, กราฟ 3 ขยายยาวอยู่ล่าง) */}
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-w-0">
              {isLoadingCharts ? (
                ['chart1', 'chart2', 'chart3'].map((key, i) => (
                  <div key={key} className={`bg-[#1a1f2b] border border-slate-700/60 rounded-xl flex flex-col overflow-hidden ${i === 2 ? 'col-span-2' : 'col-span-1'}`}>
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-[#1e2433] shrink-0">
                      <select disabled className="flex-1 mr-3 bg-[#0f151e] text-slate-300 border border-slate-700/50 rounded px-2 py-1.5 text-xs opacity-50 cursor-not-allowed">
                        <option>Select a symbol...</option>
                      </select>
                      <div className="flex gap-3 text-slate-600 opacity-50">
                        <span className="text-sm">⛶</span><span className="text-sm">⚙</span>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 w-full">
                      <WaveSkeleton delay={i * 0.2} height="100%" />
                    </div>
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
                    themeColor={themeColors[index]}
                    onFullscreen={setFullscreenChart}
                    onStockSelect={handleStockClick}
                    // 👇 ทำให้กราฟจัด Grid อัตโนมัติ (ตัวที่ 3 กินพื้นที่ 2 คอลัมน์) 👇
                    containerClass={index === 2 ? "col-span-2 h-full" : "col-span-1 h-full"}
                    customHeightClass="flex-1 min-h-0" 
                  />
                ))
              )}
            </div>

          </div>
        </div>
      )}
      {/* -----------------------------------------------
          LAPTOP / DESKTOP (≥1024px)
      ----------------------------------------------- */}
      {(!isMobile && !isTablet) && (
        <div className={`flex flex-col h-screen overflow-hidden animate-fade-in ${isDesktop ? 'p-4 gap-4' : 'p-3 gap-3'}`}>
          <div className="flex items-center justify-center gap-6 shrink-0">
            <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
              Map every Thai DR to its global parent stock, track arbitrage opportunities, monitor real-time valuations, and analyze multi-market trends
            </ToolHint>
            <div className="w-52"><SearchBar value={globalFilter} onChange={setGlobalFilter} /></div>
            <LegendPills />
          </div>

          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            {/* Left panel */}
            <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">
              {[
                { title: "USA",    stocks: usaStocks,    flex: "flex-[4]" },
                { title: "Europe", stocks: europeStocks, flex: "flex-[3]" },
                { title: "ETC",    stocks: etcStocks,    flex: "flex-[2]" },
              ].map(({ title, stocks, flex }) => (
                <StockPanel key={title} title={title} stocks={stocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} flex={flex} />
              ))}
            </div>

            {/* Center panel */}
            <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
              {isLoadingCharts ? (
                ['chart1', 'chart2', 'chart3'].map((chartKey, index) => (
                  <div key={chartKey} className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col flex-1 overflow-hidden min-h-0">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-[#1e2433] shrink-0">
                      <select disabled className="flex-1 mr-3 px-3 py-1.5 bg-[#1a2235] border border-slate-700/50 rounded text-sm text-slate-300 opacity-50 cursor-not-allowed"><option>Select a symbol...</option></select>
                    </div>
                    <WaveSkeleton delay={index * 0.2} height="100%" />
                  </div>
                ))
              ) : (
                ['chart1', 'chart2', 'chart3'].map((chartKey, index) => {
                  const stockName = chartSelections[chartKey];
                  const lineColor = themeColors[index];
                  const data = chartData[chartKey];
                  return (
                    <div key={chartKey} className="bg-[#111827] border border-slate-700 rounded-xl flex flex-col flex-1 overflow-hidden min-h-0 relative">
                      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-[#1e2433] shrink-0 z-40 relative">
                        <select
                          value={stockName}
                          onChange={(e) => { handleStockClick(e.target.value); setChartSelections(prev => ({ ...prev, [chartKey]: e.target.value })); }}
                          className="flex-1 mr-3 px-3 py-1.5 bg-[#1a2235] border border-slate-700/50 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
                        >
                          <option value="" className="bg-[#1f2937] text-slate-300">Select a symbol...</option>
                          {allStockOptions.map(s => <option key={s.dr} value={s.dr} className="bg-[#1f2937] text-slate-300">{s.dr} - {s.name}</option>)}
                        </select>
                        <div className="flex gap-3 text-white">
                          <button onClick={() => setFullscreenChart(chartKey)} className="hover:text-cyan-400 transition">⛶</button>
                          <button className="hover:text-cyan-400 transition"><SettingsIcon sx={{ fontSize: 18 }} /></button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 bg-[#0B1221] border border-slate-800/40 rounded-b-xl relative overflow-hidden">
                        {!stockName && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><span className="text-slate-500 text-sm">Select a symbol to display chart</span></div>}
                        {stockName && data?.length > 0 && <TVChart data={data} themeColor={lineColor} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right panel: Asia */}
            <div className="col-span-3 flex flex-col h-full overflow-hidden">
              <div className="bg-[#111827] border border-slate-800/80 rounded-xl flex flex-col h-full overflow-hidden shadow-xl">
                <div className="text-center py-3 mb-0 border-b border-slate-800/60 shrink-0">
                  <span className="font-bold text-base text-white tracking-wide">Asia</span>
                </div>
                <div className={`grid ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'} gap-3 flex-1 overflow-hidden p-3`}>
                  <div className="flex flex-col gap-3 overflow-hidden">
                    {[
                      { title: "Japan",     stocks: japanStocks     },
                      { title: "Singapore", stocks: singaporeStocks },
                      { title: "Vietnam",   stocks: vietnamStocks   },
                    ].map(({ title, stocks }) => (
                      <StockPanel key={title} title={title} stocks={stocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} compact flex="flex-1" />
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 overflow-hidden">
                    {[
                      { title: "China",  stocks: chinaStocks,  flex: "flex-[3]" },
                      { title: "Taiwan", stocks: taiwanStocks, flex: "flex-1"   },
                    ].map(({ title, stocks, flex }) => (
                      <StockPanel key={title} title={title} stocks={stocks} selectedSymbol={selectedSymbol} onStockClick={handleStockClick} globalFilter={globalFilter} compact flex={flex} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN MODAL (Shared across all screen sizes) */}
      <FullscreenModal
        fullscreenChart={fullscreenChart}
        onClose={() => setFullscreenChart(null)}
        chartSelections={chartSelections}
        chartData={chartData}
        themeColors={themeColors}
      />

    </div>
  );
}

/* ===============================
    FULLSCREEN MODAL COMPONENT
================================ */
function FullscreenModal({ fullscreenChart, onClose, chartSelections, chartData, themeColors }) {
  if (!fullscreenChart) return null;

  const index = ['chart1', 'chart2', 'chart3'].indexOf(fullscreenChart);
  const lineColor = themeColors[index] ?? themeColors[0];
  const data = chartData[fullscreenChart];
  const symbol = chartSelections[fullscreenChart];

  return (
    <div className="fixed inset-0 bg-[#0d1117] z-[80] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-slate-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all flex-shrink-0"
        >
          ← Back
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-all flex-shrink-0">
          🔄
        </button>
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-white tracking-widest">{symbol}</h2>
          <span className="text-[11px] text-slate-500">
            {allStockOptions.find(s => s.dr === symbol)?.name || ""}
          </span>
        </div>
        <div style={{ width: '140px' }} />
      </div>
      <div className="flex-1 min-h-0 bg-[#0d1117] relative overflow-hidden">
        <TVChart data={data} themeColor={lineColor} />
      </div>
    </div>
  );
}