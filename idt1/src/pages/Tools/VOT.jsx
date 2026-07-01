import React, { useState, useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// ----------------- ICONS -----------------
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
const FilterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

// ----------------- UI COMPONENTS -----------------
const ChartHeader = ({ title, value, subValue, isGreen }) => (
  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#1a1e29]/60 backdrop-blur-md rounded-t-xl shrink-0 z-10">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${isGreen !== false ? 'bg-[#00ff47] shadow-[0_0_10px_rgba(0,255,71,0.8)]' : 'bg-[#ff3b30] shadow-[0_0_10px_rgba(255,59,48,0.8)]'} animate-pulse`}></div>
      <span className="text-[12px] font-bold text-white uppercase tracking-wider">{title}</span>
    </div>
    {value && (
      <div className="flex flex-col items-end">
        <span className={`text-sm font-bold ${isGreen ? 'text-[#00ff47]' : 'text-[#ff3b30]'}`}>{value}</span>
        {subValue && <span className="text-[10px] text-gray-400">{subValue}</span>}
      </div>
    )}
  </div>
);

const EmptyChart = ({ isSearching }) => {
  if (isSearching) {
    return (
      <div className="flex-1 p-5 flex flex-col gap-3">
        <Skeleton height={30} width={120} baseColor="#1e222d" highlightColor="#2b313d" />
        <Skeleton height={140} baseColor="#1e222d" highlightColor="#2b313d" />
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-500/40 min-h-[220px]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 opacity-30">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
      <span className="text-[10px] uppercase tracking-[0.2em]">No Data Available</span>
    </div>
  );
};

// ----------------- PREMIUM MOCK CHARTS -----------------
const MockPriceChart = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);
  const heights = [30, 45, 40, 60, 50, 70, 85, 60, 90, 75, 95, 100];
  
  return (
    <div className="flex-1 p-5 flex flex-col relative overflow-hidden">
      {/* Background Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between px-5 py-8 pointer-events-none opacity-20">
        {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-dashed border-gray-500"></div>)}
      </div>
      <div className="flex items-end justify-between h-32 mt-auto w-full gap-2 relative z-10">
        {heights.map((h, i) => (
          <div key={i} className="w-full group relative flex justify-center h-full items-end">
            <div 
              className="w-full bg-gradient-to-t from-blue-600/30 to-blue-400/90 rounded-t-md transition-all duration-700 ease-out group-hover:to-white group-hover:shadow-[0_0_15px_rgba(96,165,250,0.8)] cursor-pointer" 
              style={{ height: loaded ? `${h}%` : '0%' }}
            ></div>
            <div className="absolute -top-8 bg-[#1e222d] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-20">
              Vol: {(h * 1.5).toFixed(1)}k
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockBarChart = ({ color = "green" }) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);
  const fromColor = color === "green" ? "from-[#00ff47]/20" : "from-[#ff3b30]/20";
  const toColor = color === "green" ? "to-[#00ff47]/90" : "to-[#ff3b30]/90";
  const hoverGlow = color === "green" ? "group-hover:shadow-[0_0_15px_rgba(0,255,71,0.6)]" : "group-hover:shadow-[0_0_15px_rgba(255,59,48,0.6)]";
  const heights = [20, 60, 35, 80, 45, 90, 55, 75];

  return (
    <div className="flex-1 p-5 flex relative overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-between px-5 py-6 pointer-events-none opacity-10">
        {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-gray-400"></div>)}
      </div>
      <div className="flex items-end justify-between h-full w-full gap-3 relative z-10">
        {heights.map((h, i) => (
          <div key={i} className="w-full group relative flex justify-center h-full items-end">
            <div 
              className={`w-full bg-gradient-to-t ${fromColor} ${toColor} rounded-t-md transition-all duration-1000 ease-out group-hover:to-white ${hoverGlow} cursor-pointer`} 
              style={{ height: loaded ? `${h}%` : '0%' }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockLineChart = ({ isNetValue }) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);
  const pathData = isNetValue 
    ? "M0,45 L10,50 L20,35 L30,40 L40,25 L50,15 L60,30 L70,10 L80,20 L90,5 L100,25"
    : "M0,25 L10,20 L20,35 L30,10 L40,15 L50,45 L60,25 L70,40 L80,5 L90,15 L100,5";
  const areaData = pathData + " L100,50 L0,50 Z";
  const color = isNetValue ? "#00ff47" : "#4379EE";
  
  return (
    <div className="flex-1 p-5 relative flex items-center justify-center h-full">
      <div className="absolute inset-0 flex flex-col justify-between px-5 py-6 pointer-events-none opacity-10">
        {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-gray-400"></div>)}
      </div>
      <div className={`w-full h-full transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(67,121,238,0.5)]" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${isNetValue}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="path-anim" />
          <path d={areaData} fill={`url(#grad-${isNetValue})`} stroke="none" />
        </svg>
      </div>
      <style>{`
        .path-anim { stroke-dasharray: 200; stroke-dashoffset: 200; animation: dash 1.5s ease-out forwards; }
        @keyframes dash { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
};

// --------------------------------------------------------

const VOT = () => {
  const [symbol, setSymbol] = useState("");
  const [date, setDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasData, setHasData] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!symbol || !date) return;
    setIsSearching(true);
    setHasData(false);
    setTimeout(() => { setIsSearching(false); setHasData(true); }, 1500);
  };

  return (
    <div className="w-full h-full bg-[#0b0e14] text-white flex flex-col overflow-hidden font-sans">
      
      {/* Premium Top Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0b0e14]/80 backdrop-blur-xl shrink-0 z-20">
        <form onSubmit={handleSubmit} className="flex items-center gap-4">
          
          <button type="button" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1e29] border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-sm">
            <FilterIcon />
          </button>

          <div className="flex items-center bg-[#1a1e29] border border-white/10 rounded-lg h-9 px-3 focus-within:border-[#4379EE] focus-within:ring-1 focus-within:ring-[#4379EE]/50 transition-all shadow-inner">
            <SearchIcon className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search symbol..." 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              required
              className="bg-transparent border-none text-[13px] text-white placeholder-gray-500 w-40 ml-2 focus:outline-none uppercase font-medium"
            />
          </div>

          <div className="flex items-center bg-[#1a1e29] border border-white/10 rounded-lg h-9 px-3 focus-within:border-[#4379EE] focus-within:ring-1 focus-within:ring-[#4379EE]/50 transition-all shadow-inner">
             <span className="text-gray-400 text-[10px] mr-3 uppercase tracking-wider font-bold">Date</span>
             <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-transparent border-none text-[13px] text-white focus:outline-none font-medium [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
              />
          </div>

          <button 
            type="submit"
            disabled={isSearching}
            className={`h-9 px-8 rounded-lg text-[12px] font-bold tracking-wider transition-all flex items-center gap-2
              ${isSearching 
                ? "bg-[#1a1e29] text-gray-400 cursor-not-allowed border border-white/10" 
                : "bg-gradient-to-r from-[#4379EE] to-[#3261cf] hover:from-[#5185f5] hover:to-[#4379EE] text-white shadow-[0_4px_15px_rgba(67,121,238,0.3)] hover:shadow-[0_4px_25px_rgba(67,121,238,0.5)] border border-[#4379EE]/50 hover:-translate-y-[1px]"
              }`}
          >
            {isSearching ? (
               <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
               <SearchIcon />
            )}
            {isSearching ? "ANALYZING..." : "SEARCH"}
          </button>
        </form>
        
        <button type="button" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1e29] border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
          <HelpIcon />
        </button>
      </div>

      {/* Main Content Dashboard */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8 bg-gradient-to-b from-[#0b0e14] to-[#0f1219]">
        <div className="max-w-[1800px] mx-auto flex flex-col gap-6 h-full min-h-[850px]">
          
          <div className="flex-[1.2] bg-[#11141c]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <ChartHeader title="Price Movement" value={hasData ? "145.50" : null} subValue={hasData ? "+2.50 (1.75%)" : null} isGreen={true} />
            {hasData ? <MockPriceChart /> : <EmptyChart isSearching={isSearching} />}
          </div>

          <div className="flex-[2] grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-[#11141c]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative group hover:border-white/10 transition-colors">
              <ChartHeader title="Frequency Exceed" value={hasData ? "1,245" : null} subValue={hasData ? "Transactions" : null} isGreen={true} />
              {hasData ? <MockBarChart color="green" /> : <EmptyChart isSearching={isSearching} />}
            </div>

            <div className="bg-[#11141c]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative group hover:border-white/10 transition-colors">
              <ChartHeader title="Intraday Price Analysis" value={hasData ? "Avg: 144.20" : null} subValue={hasData ? "VWAP" : null} isGreen={false} />
              {hasData ? <MockLineChart isNetValue={false} /> : <EmptyChart isSearching={isSearching} />}
            </div>

            <div className="bg-[#11141c]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative group hover:border-white/10 transition-colors">
              <ChartHeader title="Exceed Value" value={hasData ? "-45.2M" : null} subValue={hasData ? "Baht" : null} isGreen={false} />
              {hasData ? <MockBarChart color="red" /> : <EmptyChart isSearching={isSearching} />}
            </div>

            <div className="bg-[#11141c]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative group hover:border-white/10 transition-colors">
              <ChartHeader title="Intraday Net Value" value={hasData ? "+12.8M" : null} subValue={hasData ? "Baht" : null} isGreen={true} />
              {hasData ? <MockLineChart isNetValue={true} /> : <EmptyChart isSearching={isSearching} />}
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};

export default VOT;
