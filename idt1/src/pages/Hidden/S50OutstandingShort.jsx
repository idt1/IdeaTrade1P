import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

/* ================= COLORS ================= */
const SYMBOL_COLORS = [
  "#60a5fa","#f97316","#34d399","#a78bfa","#fbbf24",
  "#f472b6","#22d3ee","#fb7185","#86efac","#c084fc",
  "#fdba74","#67e8f9","#fde68a","#d9f99d","#fca5a5",
];

const MOCK_TABLE = [
  { symbol: "KCE",    outshort: 3.90 }, { symbol: "HANA",   outshort: 2.88 },
  { symbol: "BH",     outshort: 2.38 }, { symbol: "MTC",    outshort: 2.15 },
  { symbol: "MINIT",  outshort: 2.14 }, { symbol: "BTS",    outshort: 1.99 },
  { symbol: "BANPU",  outshort: 1.95 }, { symbol: "AMATA",  outshort: 1.91 },
  { symbol: "SCC",    outshort: 1.88 }, { symbol: "SPRC",   outshort: 1.64 },
  { symbol: "IRPC",   outshort: 1.41 }, { symbol: "BDMS",   outshort: 1.38 },
  { symbol: "CBG",    outshort: 1.36 }, { symbol: "LH",     outshort: 1.36 },
  { symbol: "DOHOME", outshort: 1.02 }, { symbol: "COM7",   outshort: 1.02 },
  { symbol: "GLOBAL", outshort: 1.00 }, { symbol: "TIDLOR", outshort: 0.99 },
  { symbol: "SIRI",   outshort: 0.99 }, { symbol: "BGRIM",  outshort: 0.98 },
  { symbol: "TISCO",  outshort: 0.96 }, { symbol: "BBL",    outshort: 0.93 },
  { symbol: "JMT",    outshort: 0.91 }, { symbol: "BCP",    outshort: 0.90 },
  { symbol: "JAS",    outshort: 0.90 }, { symbol: "AWC",    outshort: 0.88 },
  { symbol: "CHG",    outshort: 0.84 }, { symbol: "BEM",    outshort: 0.82 },
  { symbol: "BAM",    outshort: 0.82 }, { symbol: "PTTGC",  outshort: 0.81 },
  { symbol: "SPALI",  outshort: 0.80 }, { symbol: "RCL",    outshort: 0.78 },
  { symbol: "IVL",    outshort: 0.75 }, { symbol: "EGCO",   outshort: 0.75 },
  { symbol: "CK",     outshort: 0.69 }, { symbol: "SCB",    outshort: 0.67 },
  { symbol: "CPN",    outshort: 0.62 }, { symbol: "BJC",    outshort: 0.62 },
  { symbol: "TTB",    outshort: 0.61 }, { symbol: "CENTEL", outshort: 0.58 },
  { symbol: "JMART",  outshort: 0.57 }, { symbol: "BCPG",   outshort: 0.57 },
  { symbol: "AP",     outshort: 0.56 }, { symbol: "GPSC",   outshort: 0.55 },
  { symbol: "CCET",   outshort: 0.54 }, { symbol: "RATCH",  outshort: 0.53 },
  { symbol: "PRM",    outshort: 0.52 }, { symbol: "TASCO",  outshort: 0.50 },
  { symbol: "SCGP",   outshort: 0.49 }, { symbol: "M",      outshort: 0.48 },
];

const ALL_SYMBOLS = [...MOCK_TABLE];

const RANGE_DAYS = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "YTD": 100, "MAX": 730 };
const RANGES = ["1M", "3M", "6M", "1Y", "YTD", "MAX"];

/* ================= DATE PICKER ================= */
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES         = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function isoToPickerKey(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${String(y).slice(2)}`;
}
function pickerKeyToIso(key) {
  if (!key) return "";
  const [dd, mm, yy] = key.split("/");
  return `20${yy}-${mm}-${dd}`;
}
function parsePickerKey(key) {
  const [dd, mm, yy] = key.split("/");
  return { day: +dd, month: +mm, year: 2000 + +yy };
}
function toPickerKey(year, month, day) {
  return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${String(year).slice(2)}`;
}
function formatPickerDisplay(key) {
  if (!key) return "";
  const { day, month, year } = parsePickerKey(key);
  return `${String(day).padStart(2,"0")} ${MONTH_NAMES_SHORT[month-1]} ${year}`;
}

function getTradingDatesBetween(startIso, endIso) {
  const keys = [];
  const start = new Date(startIso);
  const end   = new Date(endIso);
  const cur   = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const dd = String(cur.getDate()).padStart(2,"0");
      const mm = String(cur.getMonth()+1).padStart(2,"0");
      const yy = String(cur.getFullYear()).slice(2);
      keys.push(`${dd}/${mm}/${yy}`);
    }
    cur.setDate(cur.getDate()+1);
  }
  return keys;
}

const DatePicker = memo(({ label, value, onChange, minIso, maxIso }) => {
  const [open, setOpen]         = useState(false);
  const [view, setView]         = useState("day");
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const selectedKey = isoToPickerKey(value);
  const allKeys     = useMemo(() => getTradingDatesBetween(minIso || "2019-01-02", maxIso || new Date().toISOString().slice(0,10)), [minIso, maxIso]);
  const tradableSet = useMemo(() => new Set(allKeys), [allKeys]);

  const availableYears = useMemo(() => {
    const ys = new Set(allKeys.map(k => 2000 + +k.split("/")[2]));
    return [...ys].sort((a,b)=>a-b);
  }, [allKeys]);

  const initView = useMemo(() => {
    if (selectedKey) { const p = parsePickerKey(selectedKey); return { month: p.month, year: p.year }; }
    const today = new Date(); return { month: today.getMonth()+1, year: today.getFullYear() };
  }, []); // eslint-disable-line

  const [viewMonth, setViewMonth] = useState(initView.month);
  const [viewYear,  setViewYear]  = useState(initView.year);

  const availableMonths = useMemo(() =>
    new Set(allKeys.filter(k => 2000 + +k.split("/")[2] === viewYear).map(k => +k.split("/")[1])),
  [allKeys, viewYear]);

  const decadeStart = Math.floor(viewYear/10)*10;
  const decadeYears = useMemo(() => Array.from({length:12},(_,i)=>decadeStart-1+i),[decadeStart]);

  const calDays = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth-1, 1).getDay();
    const total    = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    for (let i=0; i<firstDow; i++) cells.push(null);
    for (let d=1; d<=total; d++) cells.push(d);
    while (cells.length%7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const canPrev = useCallback(() => {
    if (!allKeys[0]) return false;
    const p = parsePickerKey(allKeys[0]);
    return viewYear > p.year || (viewYear===p.year && viewMonth > p.month);
  }, [allKeys, viewYear, viewMonth]);

  const canNext = useCallback(() => {
    if (!allKeys[allKeys.length-1]) return false;
    const p = parsePickerKey(allKeys[allKeys.length-1]);
    return viewYear < p.year || (viewYear===p.year && viewMonth < p.month);
  }, [allKeys, viewYear, viewMonth]);

  const prevMonth = useCallback(() => {
    if (viewMonth===1) { setViewMonth(12); setViewYear(y=>y-1); }
    else setViewMonth(m=>m-1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth===12) { setViewMonth(1); setViewYear(y=>y+1); }
    else setViewMonth(m=>m+1);
  }, [viewMonth]);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const Chev = ({ d }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {d==="left"  && <polyline points="15 18 9 12 15 6"/>}
      {d==="right" && <polyline points="9 18 15 12 9 6"/>}
      {d==="down"  && <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );

  const popup = {
    position:"fixed", top:popupPos.top, left:popupPos.left, zIndex:9999,
    width:252, background:"#0f172a",
    border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:12,
    boxShadow:"0 16px 40px rgba(0,0,0,0.6)", fontFamily:"monospace",
    overflow:"hidden", maxHeight:`calc(100vh - ${popupPos.top}px - 8px)`, overflowY:"auto",
  };
  const dpHeader = {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"10px 14px 8px", borderBottom:"0.5px solid rgba(255,255,255,0.07)",
  };
  const navBtn = (active) => ({
    width:22, height:22, borderRadius:5, border:"none", background:"transparent",
    color: active ? "#94a3b8" : "#1e293b", cursor: active ? "pointer" : "default",
    display:"flex", alignItems:"center", justifyContent:"center", transition:"background .1s",
  });
  const titleBtn = {
    background:"transparent", border:"none", cursor:"pointer",
    color:"#e2e8f0", fontSize:13, fontWeight:500, fontFamily:"monospace",
    letterSpacing:"0.03em", display:"flex", alignItems:"center", gap:3,
    padding:"2px 4px", borderRadius:5,
  };
  const body = { padding:"8px 12px 10px" };

  return (
    <div ref={ref} style={{flexShrink:0}} className="relative">
      <div style={{fontSize:10, color:"#6b7280", marginBottom:1, paddingLeft:2, letterSpacing:"0.03em"}}>{label}</div>
      <button
        onClick={() => {
          if (!open && selectedKey) { const p=parsePickerKey(selectedKey); setViewMonth(p.month); setViewYear(p.year); }
          if (!open && ref.current) {
            const rect=ref.current.getBoundingClientRect();
            const POPUP_W=252;
            const clampedLeft=Math.min(rect.left, window.innerWidth-POPUP_W-8);
            const clampedTop=Math.min(rect.bottom+8, window.innerHeight-8);
            setPopupPos({ top:clampedTop, left:Math.max(8,clampedLeft) });
          }
          setOpen(o=>!o); setView("day");
        }}
        style={{
          display:"flex", alignItems:"center", gap:7, padding:"0 12px", height:34,
          background: open ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
          border:`0.5px solid ${open ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius:8, cursor:"pointer", color: open ? "#93c5fd" : "#d1d5db",
          fontSize:12, fontWeight:500, fontFamily:"monospace", transition:"all .15s",
          whiteSpace:"nowrap",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={open?"#60a5fa":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {selectedKey ? formatPickerDisplay(selectedKey) : "Select date"}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={open?"#60a5fa":"#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{opacity:.6, transform:open?"rotate(180deg)":"none", transition:"transform .2s"}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={popup}>
          {view==="year" && (<>
            <div style={dpHeader}>
              <button style={navBtn(decadeStart>(availableYears[0]??2025))} onClick={()=>setViewYear(decadeStart-1)}
                onMouseEnter={e=>{if(decadeStart>(availableYears[0]??2025))e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <span style={{color:"#e2e8f0",fontSize:12,fontWeight:500,fontFamily:"monospace"}}>
                {decadeStart} – {decadeStart+9}
              </span>
              <button style={navBtn(decadeStart+9<(availableYears[availableYears.length-1]??2025))} onClick={()=>setViewYear(decadeStart+10)}
                onMouseEnter={e=>{if(decadeStart+9<(availableYears[availableYears.length-1]??2025))e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={{...body,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
              {decadeYears.map(yr=>{
                const avail=availableYears.includes(yr);
                const isCur=yr===viewYear;
                const isOut=yr<decadeStart||yr>decadeStart+9;
                return (
                  <button key={yr} onClick={()=>{if(avail){setViewYear(yr);setView("month");}}}
                    style={{
                      height:30,borderRadius:6,border:"none",cursor:avail?"pointer":"default",
                      fontFamily:"monospace",fontSize:12,fontWeight:isCur?600:400,
                      background:isCur?"#3b82f6":"transparent",
                      color:isCur?"#fff":avail?(isOut?"#475569":"#cbd5e1"):"#1e3a5f",
                      transition:"all .1s",
                    }}
                    onMouseEnter={e=>{if(avail&&!isCur)e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                    onMouseLeave={e=>{if(avail&&!isCur)e.currentTarget.style.background="transparent";}}
                  >{yr}</button>
                );
              })}
            </div>
          </>)}

          {view==="month" && (<>
            <div style={dpHeader}>
              <button style={navBtn(availableYears.includes(viewYear-1))} onClick={()=>setViewYear(y=>y-1)}
                onMouseEnter={e=>{if(availableYears.includes(viewYear-1))e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <button style={titleBtn} onClick={()=>setView("year")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {viewYear} <Chev d="down"/>
              </button>
              <button style={navBtn(availableYears.includes(viewYear+1))} onClick={()=>setViewYear(y=>y+1)}
                onMouseEnter={e=>{if(availableYears.includes(viewYear+1))e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={{...body,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
              {MONTH_NAMES_SHORT.map((m,idx)=>{
                const mNum=idx+1;
                const avail=availableMonths.has(mNum);
                const isCur=mNum===viewMonth;
                return (
                  <button key={m} onClick={()=>{if(avail){setViewMonth(mNum);setView("day");}}}
                    style={{
                      height:32,borderRadius:6,border:"none",cursor:avail?"pointer":"default",
                      fontFamily:"monospace",fontSize:12,fontWeight:isCur?600:400,
                      background:isCur?"#3b82f6":"transparent",
                      color:isCur?"#fff":avail?"#cbd5e1":"#1e3a5f",
                      transition:"all .1s",
                    }}
                    onMouseEnter={e=>{if(avail&&!isCur)e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                    onMouseLeave={e=>{if(avail&&!isCur)e.currentTarget.style.background="transparent";}}
                  >{m}</button>
                );
              })}
            </div>
          </>)}

          {view==="day" && (<>
            <div style={dpHeader}>
              <button style={navBtn(canPrev())} onClick={prevMonth}
                onMouseEnter={e=>{if(canPrev())e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="left"/>
              </button>
              <button style={titleBtn} onClick={()=>setView("month")}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {MONTH_NAMES_FULL[viewMonth-1]} {viewYear} <Chev d="down"/>
              </button>
              <button style={navBtn(canNext())} onClick={nextMonth}
                onMouseEnter={e=>{if(canNext())e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Chev d="right"/>
              </button>
            </div>
            <div style={body}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                {DAY_NAMES.map(n=>(
                  <div key={n} style={{
                    textAlign:"center",fontSize:10,fontWeight:500,
                    color:n==="Sun"||n==="Sat"?"#1e3a5f":"#475569",
                    padding:"2px 0",letterSpacing:"0.06em",
                  }}>{n}</div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {calDays.map((day,i)=>{
                  if (!day) return <div key={`e-${i}`}/>;
                  const key      = toPickerKey(viewYear,viewMonth,day);
                  const isTrade  = tradableSet.has(key);
                  const isSel    = key===selectedKey;
                  const isWeekend= new Date(viewYear,viewMonth-1,day).getDay()%6===0;
                  return (
                    <button key={key} onClick={()=>{if(isTrade){onChange(pickerKeyToIso(key));setOpen(false);}}}
                      style={{
                        height:28,borderRadius:6,border:"none",
                        cursor:isTrade?"pointer":"default",fontFamily:"monospace",
                        fontSize:11,fontWeight:isSel?600:400,
                        background:isSel?"#3b82f6":"transparent",
                        color:isSel?"#fff":isTrade?"#e2e8f0":isWeekend?"#1e3a5f":"#334155",
                        transition:"all .1s",position:"relative",
                      }}
                      onMouseEnter={e=>{if(isTrade&&!isSel)e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
                      onMouseLeave={e=>{if(isTrade&&!isSel)e.currentTarget.style.background="transparent";}}
                    >
                      {day}
                      {isTrade&&!isSel&&(
                        <span style={{
                          position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",
                          width:3,height:3,borderRadius:"50%",background:"#3b82f6",
                        }}/>
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

/* ================= DATA GENERATION ================= */
const generateSeriesData = (days = 90, seed = 1, base = 20, amplitude = 4) => {
  const data = [];
  let val = base;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const r = ((Math.sin(seed * 9301 + i * 49297) + 1) / 2);
    val += (r - 0.49) * (amplitude / 25);
    val = Math.max(base - amplitude * 1.5, Math.min(base + amplitude * 1.5, val));
    data.push({ time: d.toISOString().slice(0, 10), value: parseFloat(val.toFixed(2)) });
  }
  return data;
};

const generatePriceData = (days = 90, seed = 1) => {
  const data = [];
  let val = 3.2 + (seed % 5) * 0.15;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const r = ((Math.sin(seed * 1234 + i * 5678) + 1) / 2);
    val += (r - 0.49) * 0.06;
    val = Math.max(2.4, Math.min(5.2, val));
    data.push({ time: d.toISOString().slice(0, 10), value: parseFloat(val.toFixed(2)) });
  }
  return data;
};

/* ================= ICONS ================= */
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={spinning ? "animate-spin" : ""}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const SortIcon = ({ asc }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {asc ? (
      <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
    ) : (
      <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
    )}
  </svg>
);

/* ================= MULTI LINE CHART (Show All) ================= */
function MultiLineChart({ allSeriesData }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const symbols = Object.keys(allSeriesData);
    if (symbols.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#6b7280",
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
        horzLine: { color: "rgba(255,255,255,0.15)", style: LineStyle.Dashed, labelBackgroundColor: "#1e2330" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#6b7280",
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    symbols.forEach((sym, i) => {
      const color = SYMBOL_COLORS[i % SYMBOL_COLORS.length];
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1.5,
        priceScaleId: "right",
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: false,
        title: sym,
      });
      series.setData(allSeriesData[sym]);
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [allSeriesData]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div ref={containerRef} style={{ flex:1, minHeight:0 }}/>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function S50OutstandingShort() {
  const chartContainerRef = useRef(null);
  const chartRef          = useRef(null);
  const outshortSeriesRef = useRef(null);
  const priceSeriesRef    = useRef(null);
  const dropdownRef       = useRef(null);
  const inputRef          = useRef(null);

  const today   = new Date().toISOString().slice(0,10);
  const minDate = "2019-01-02";

  const [range,           setRange]           = useState("");
  const [startDate,       setStartDate]       = useState("");
  const [endDate,         setEndDate]         = useState(today);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [selectedSymbol,  setSelectedSymbol]  = useState(null);
  const [isShowAll,       setIsShowAll]       = useState(false);
  const [spinning,        setSpinning]        = useState(false);
  const [sortAsc,         setSortAsc]         = useState(false);
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);
  const [allSeriesData,   setAllSeriesData]   = useState({});
  const [allPriceData,    setAllPriceData]    = useState({});

  const loadData = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      const days = RANGE_DAYS[range] || 90;
      const outshort = {};
      const price    = {};
      MOCK_TABLE.forEach((row, i) => {
        outshort[row.symbol] = generateSeriesData(days, i+1, row.outshort*7, row.outshort*1.5);
        price[row.symbol]    = generatePriceData(days, i+1);
      });
      setAllSeriesData(outshort);
      setAllPriceData(price);
      setSpinning(false);
    }, 400);
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setSearchQuery(selectedSymbol || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSymbol]);

  /* Single-symbol chart */
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      outshortSeriesRef.current = null;
      priceSeriesRef.current    = null;
    }
    if (!selectedSymbol) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background:{ color:"transparent" }, textColor:"#6b7280", fontFamily:"inherit", fontSize:11 },
      grid: { vertLines:{ color:"rgba(255,255,255,0.04)" }, horzLines:{ color:"rgba(255,255,255,0.04)" } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine:{ color:"rgba(255,255,255,0.15)", style:LineStyle.Dashed, labelBackgroundColor:"#1e2330" },
        horzLine:{ color:"rgba(255,255,255,0.15)", style:LineStyle.Dashed, labelBackgroundColor:"#1e2330" },
      },
      rightPriceScale:{ borderColor:"rgba(255,255,255,0.06)", textColor:"#6b7280", scaleMargins:{ top:0.08, bottom:0.08 } },
      leftPriceScale:{ visible:true, borderColor:"rgba(255,255,255,0.06)", textColor:"#6b7280", scaleMargins:{ top:0.08, bottom:0.08 } },
      timeScale:{ borderColor:"rgba(255,255,255,0.06)", timeVisible:false, fixLeftEdge:true, fixRightEdge:true },
      handleScroll:true, handleScale:true,
    });
    chartRef.current = chart;

    outshortSeriesRef.current = chart.addSeries(LineSeries, {
      color:"#f97316", lineWidth:2, priceScaleId:"right",
      crosshairMarkerVisible:true, crosshairMarkerRadius:4,
      crosshairMarkerBackgroundColor:"#f97316",
      lastValueVisible:true, priceLineVisible:false,
    });
    priceSeriesRef.current = chart.addSeries(LineSeries, {
      color:"#60a5fa", lineWidth:2, priceScaleId:"left",
      crosshairMarkerVisible:true, crosshairMarkerRadius:4,
      crosshairMarkerBackgroundColor:"#60a5fa",
      lastValueVisible:true, priceLineVisible:false,
    });

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current)
        chart.applyOptions({ width:chartContainerRef.current.clientWidth, height:chartContainerRef.current.clientHeight });
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [selectedSymbol]);

  useEffect(() => {
    if (!chartRef.current || !selectedSymbol || Object.keys(allSeriesData).length===0) return;
    if (outshortSeriesRef.current && allSeriesData[selectedSymbol])
      outshortSeriesRef.current.setData(allSeriesData[selectedSymbol]);
    if (priceSeriesRef.current && allPriceData[selectedSymbol])
      priceSeriesRef.current.setData(allPriceData[selectedSymbol]);
    chartRef.current?.timeScale().fitContent();
  }, [allSeriesData, allPriceData, selectedSymbol]);

  const applyRange = (r) => {
    setRange(r);
    const d    = new Date();
    const days = RANGE_DAYS[r] || 90;
    const s    = new Date(d);
    s.setDate(d.getDate() - days);
    setStartDate(s.toISOString().slice(0,10));
    setEndDate(d.toISOString().slice(0,10));
  };

  const handleReset = () => {
    setRange("");
    setStartDate("");
    setEndDate(today);
    setSearchQuery("");
    setSelectedSymbol(null);
    setIsShowAll(false);
    setSortAsc(false);
    loadData();
  };

  const filteredTable = MOCK_TABLE
    .filter(r => r.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a,b) => sortAsc ? a.outshort-b.outshort : b.outshort-a.outshort);

  const selectedIdx   = selectedSymbol ? MOCK_TABLE.findIndex(r => r.symbol===selectedSymbol) : -1;
  const selectedColor = selectedIdx >= 0 ? SYMBOL_COLORS[selectedIdx % SYMBOL_COLORS.length] : null;

  return (
    <div className="flex flex-col text-white font-sans relative" style={{ height:"100dvh", background:"#0d1117" }}>

      {/* ── TOP BAR ── */}
      <div className="flex flex-col md:flex-row md:items-end gap-2 px-4 pt-1 pb-2 border-b border-white/5 shrink-0 z-20">
        <div className="flex flex-row items-end gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pt-0 pb-1 md:pb-0">
          <div className="shrink-0 mb-1">
            <ToolHint onViewDetails={() => { window.scrollTo({ top:0 }); }}>
              S50 Outstanding Short
            </ToolHint>
          </div>
          <DatePicker
            label="Start Date"
            value={startDate || minDate}
            onChange={(iso) => { setStartDate(iso); setRange(""); }}
            minIso={minDate}
            maxIso={endDate || today}
          />
          <span className="text-gray-600 text-sm shrink-0 mb-2">—</span>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(iso) => { setEndDate(iso); setRange(""); }}
            minIso={startDate || minDate}
            maxIso={today}
          />
        </div>

        <div className="md:ml-auto w-full md:w-auto flex mt-1 md:mt-0 shrink-0">
          <button
            onClick={() => { setSelectedSymbol(null); setIsShowAll(true); setSearchQuery(""); }}
            className="w-full md:w-auto h-9 md:h-8 px-4 text-[12px] font-semibold tracking-wider uppercase rounded-lg transition-all"
            style={{
              background: (!selectedSymbol && isShowAll) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              color: (!selectedSymbol && isShowAll) ? "#ffffff" : "#9ca3af",
            }}>
            Show All
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden relative z-10">

        {/* ── CHART AREA ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-5 pt-4 pb-2 shrink-0 gap-3 md:gap-0">
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-white/90 tracking-tight">S50 Outstanding Short</span>
              {selectedSymbol && selectedColor && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background:"#f97316" }}/>
                    <span className="text-[12px] text-gray-400">Outshort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] inline-block"/>
                    <span className="text-[12px] text-gray-400">Price</span>
                  </div>
                </div>
              )}

            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
              {RANGES.map(r => (
                <button key={r} onClick={() => applyRange(r)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-all font-medium shrink-0
                    ${range===r ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ── CHART MOUNT ── */}
          <div className="flex-1 min-h-0 px-2 pb-3 relative">
            {/* Single symbol chart */}
            <div ref={chartContainerRef} className="w-full h-full"
              style={{ visibility: selectedSymbol ? "visible" : "hidden" }}/>

            {/* Show All — multi-line chart */}
            {!selectedSymbol && isShowAll && Object.keys(allSeriesData).length > 0 && (
              <div className="absolute inset-0">
                <MultiLineChart allSeriesData={allSeriesData} />
              </div>
            )}

            {/* Empty state */}
            {!selectedSymbol && !isShowAll && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-[16px] text-gray-600 tracking-wide">
                  Select a symbol or click "Show All" to view chart.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── TABLE PANEL ── */}
        <div className="w-full md:w-[290px] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-l border-white/5" style={{ background:"#0b0e14" }}>

          <div className="flex items-center gap-1.5 px-4 md:px-2.5 pt-3 md:pt-2.5 pb-3 md:pb-2 shrink-0">
            {/* Search + Dropdown */}
            <div className="flex-1 relative min-w-0" ref={dropdownRef}>
              <div className="relative bg-[#111827] border border-slate-700 rounded-lg px-2.5 flex items-center shadow-inner h-9 transition-colors focus-within:border-blue-500/50 focus-within:bg-[#1e293b]">
                <SearchIcon/>
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  onFocus={() => { setIsDropdownOpen(true); if (selectedSymbol) setSearchQuery(""); }}
                  placeholder="Type a Symbol..."
                  className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-slate-500 min-w-0 pl-1.5 pr-1"
                />
                <div className="flex items-center shrink-0">
                  {searchQuery && (
                    <button
                      onClick={e => { e.stopPropagation(); setSearchQuery(""); inputRef.current?.focus(); }}
                      className="text-[10px] text-slate-400 hover:text-white mr-1 px-1 flex items-center justify-center h-full"
                    >✕</button>
                  )}
                  <span onClick={() => { setIsDropdownOpen(!isDropdownOpen); if (!isDropdownOpen) inputRef.current?.focus(); }}
                    className="text-slate-400 cursor-pointer flex items-center px-1">
                    <div style={{ transform:isDropdownOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}>
                      <ChevronDownIcon/>
                    </div>
                  </span>
                </div>
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full mt-1.5 left-0 w-full min-w-[200px] bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[60] custom-scrollbar">
                  {filteredTable.length > 0 ? (
                    filteredTable.map((item, index) => {
                      const isSelected = selectedSymbol === item.symbol;
                      const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===item.symbol);
                      const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
                      return (
                        <div key={index}
                          onClick={() => {
                            setSelectedSymbol(item.symbol);
                            setSearchQuery(item.symbol);
                            setIsShowAll(false);
                            applyRange("MAX");
                            setIsDropdownOpen(false);
                          }}
                          className={`px-4 py-3 text-[13px] transition flex items-center gap-3 cursor-pointer
                            ${isSelected ? "bg-cyan-500/20 text-white" : "text-slate-300 hover:bg-[#1e293b] hover:text-white"}`}>
                          <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background:dotColor }}/>
                          <span className="flex-1">{item.symbol}</span>
                          <span className={isSelected ? "text-cyan-400" : "text-slate-400"}>{item.outshort.toFixed(2)}%</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-[13px] text-slate-500 text-center">No results found</div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setSortAsc(o=>!o)}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 bg-[#111827] border border-slate-700"
              title={sortAsc ? "Sorted: Low→High" : "Sorted: High→Low"}>
              <SortIcon asc={sortAsc}/>
            </button>

            <button onClick={handleReset}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 bg-[#111827] border border-slate-700">
              <RefreshIcon spinning={spinning}/>
            </button>
          </div>

          {/* Table Header (PC only) */}
          <div className="hidden md:flex items-center px-4 py-2 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span className="flex-1 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">Symbol</span>
            <button onClick={() => setSortAsc(o=>!o)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#60a5fa] tracking-wider uppercase hover:text-blue-300 transition-colors">
              Outshort % <SortIcon asc={sortAsc}/>
            </button>
          </div>

          {/* Symbol List (PC only) */}
          <div className="hidden md:block flex-1 overflow-y-auto no-scrollbar pb-2 md:pb-0">
            {filteredTable.map((row, i) => {
              const isSelected = selectedSymbol === row.symbol;
              const realIdx    = MOCK_TABLE.findIndex(r => r.symbol===row.symbol);
              const dotColor   = SYMBOL_COLORS[realIdx % SYMBOL_COLORS.length];
              return (
                <button key={i}
                  onClick={() => {
                    if (selectedSymbol===row.symbol) { setSelectedSymbol(null); setIsShowAll(true); }
                    else { setSelectedSymbol(row.symbol); setIsShowAll(false); applyRange("MAX"); }
                  }}
                  className="w-full flex items-center px-2 py-1 transition-all cursor-pointer">
                  <span className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full transition-all"
                    style={{ background: isSelected ? "rgba(59,130,246,0.2)" : "transparent" }}>
                    <span className="shrink-0 w-3 h-3 rounded-full" style={{ background: isSelected ? "#60a5fa" : dotColor }}/>
                    <span className="flex-1 text-left text-[13px] font-semibold" style={{ color: isSelected ? "#ffffff" : "#9ca3af" }}>
                      {row.symbol}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: isSelected ? "#34d399" : "#6b7280" }}>
                      {row.outshort.toFixed(2)}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .custom-scrollbar::-webkit-scrollbar { width:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#475569; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#64748b; }
      `}</style>
    </div>
  );
}