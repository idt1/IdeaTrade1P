import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";
import ToolHint from "@/components/ToolHint.jsx";

// ─── Rotate Modal ─────────────────────────────────────────────────────────────
function RotateModal({ onClose }) {
  return createPortal(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#1c1c1e", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, width:"100%", maxWidth:360, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.7)", fontFamily:"'Inter',sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"flex-end", padding:"14px 14px 0" }}>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
          >✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 28px 28px" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(245,193,66,0.15)", border:"1px solid rgba(245,193,66,0.35)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <style>{`@keyframes tiltPhone{0%,15%{transform:rotate(0deg)}40%,65%{transform:rotate(-90deg)}85%,100%{transform:rotate(0deg)}}`}</style>
            <svg style={{ width:32, height:32, color:"#f5c842", animation:"tiltPhone 2.5s ease-in-out infinite" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <h3 style={{ fontSize:20, fontWeight:700, color:"#fff", margin:"0 0 8px", textAlign:"center" }}>Rotate Screen</h3>
          <p style={{ fontSize:13, color:"#94a3b8", textAlign:"center", lineHeight:1.6, margin:"0 0 24px" }}>
            To achieve the best fullscreen charting experience<br/>
            Please rotate your phone to <span style={{ color:"#fff", fontWeight:600 }}>landscape mode</span>
          </p>
          <button onClick={onClose}
            style={{ width:"100%", padding:"14px", borderRadius:12, background:"#f5c842", border:"none", color:"#000", fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background="#ffd84d"}
            onMouseLeave={e => e.currentTarget.style.background="#f5c842"}
          >Accept</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function seedRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSeries(basePrice, startDate, days, seed) {
  const rng = seedRng(seed);
  const dates = [], prices = [], callPut = [], oi = [];
  let price = basePrice, cpAccum = 0, oiAccum = 0;
  let d = new Date(startDate);
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const drift = -0.15 + (rng() - 0.5) * 1.8;
    price = Math.max(600, Math.min(1100, price + drift));
    cpAccum += Math.round(500 + rng() * 2500 + i * 15);
    oiAccum += Math.round(3000 + rng() * 12000 + i * 80);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${dd}/${mm}/${d.getFullYear()}`);
    prices.push(parseFloat(price.toFixed(2)));
    callPut.push(cpAccum);
    oi.push(oiAccum);
    d.setDate(d.getDate() + 1);
  }
  return { dates, prices, callPut, oi };
}

const MONTHS = { H: "03", M: "06", U: "09", Z: "12" };
const MONTH_DAYS = { H: 55, M: 60, U: 58, Z: 52 };
const BASE_PRICES = {
  2020: { H: 860, M: 832, U: 798, Z: 771 },
  2021: { H: 882, M: 895, U: 870, Z: 855 },
  2022: { H: 920, M: 908, U: 875, Z: 840 },
  2023: { H: 871, M: 892, U: 845, Z: 830 },
  2024: { H: 910, M: 930, U: 895, Z: 875 },
  2025: { H: 891, M: 920, U: 880, Z: 860 },
};
const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

function getSeriesData(year, month) {
  const base = BASE_PRICES[year]?.[month] ?? 850;
  const startDate = new Date(`${year}-${MONTHS[month]}-01`);
  startDate.setMonth(startDate.getMonth() - 3);
  const days = MONTH_DAYS[month] ?? 55;
  const seed = year * 100 + month.charCodeAt(0);
  return generateSeries(base, startDate, days, seed);
}

const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M5 1v3M11 1v3M2 7h12" /></svg>
);
const TrendIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l4-4 3 3 5-6" /><path d="M11 5h3v3" /></svg>
);
const YearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M5 1v3M11 1v3M2 7h12" /></svg>
);

function VDivider() {
  return <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)", flexShrink:0, marginLeft:6, marginRight:6 }} />;
}

function FsDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position:"relative", marginTop: 4 }}>
      <div onClick={() => setOpen(!open)} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 12px", height:34, cursor:"pointer",
        minWidth:120, boxSizing:"border-box",
        border:"1px solid rgba(255,255,255,0.15)",
        borderRadius:6, background:"transparent",
        transition:"border-color 0.15s",
      }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor="rgba(90,159,212,0.4)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; }}
      >
        <span style={{
          position:"absolute", top:-7, left:8,
          background:"#111827", 
          padding:"0 4px", fontSize:11, color:"#5a7a9a", lineHeight:1
        }}>{label}</span>
        
        <span style={{ fontSize:13, color:"#c8d8e8", whiteSpace:"nowrap" }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#5a7a9a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.15s", marginLeft:12 }}><path d="M1 3l4 4 4-4"/></svg>
      </div>

      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, marginTop:4, width:"100%", background:"#151e30", border:"1px solid #2a4060", borderRadius:8, zIndex:99999, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
          {options.map(opt => (
            <div key={opt} onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", color:opt===value?"#5a9fd4":"#c8d8e8", background:opt===value?"rgba(90,159,212,0.08)":"transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background="rgba(90,159,212,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background=opt===value?"rgba(90,159,212,0.08)":"transparent")}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split("/")[2]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("/")[1]) - 1 : new Date().getMonth());
  const wrapRef = useRef(null);
  const pickerRef = useRef(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target) && !pickerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, left: rect.left });
    }
    if (value) { const [, m, y] = value.split("/"); setViewYear(parseInt(y)); setViewMonth(parseInt(m) - 1); }
    setOpen(true);
  };

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const handleSelect = (day) => { onChange(`${String(day).padStart(2,"0")}/${String(viewMonth+1).padStart(2,"0")}/${viewYear}`); setOpen(false); };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDay = value ? (() => { const [d, m, y] = value.split("/"); return parseInt(y) === viewYear && parseInt(m) - 1 === viewMonth ? parseInt(d) : null; })() : null;
  const today = new Date(); const isToday = (day) => today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  const cells = Array(startDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));

  const picker = open && createPortal(
    <div ref={pickerRef} style={{ position:"fixed", top:pickerPos.top, left:pickerPos.left, background:"#111827", border:"1px solid rgba(90,159,212,0.25)", borderRadius:12, zIndex:99999, padding:14, width:240, boxShadow:"0 12px 40px rgba(0,0,0,0.6)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <button onClick={prevMonth} style={calBtnStyle}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg></button>
        <span style={{ color:"#c8d8e8", fontSize:13, fontWeight:600 }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={calBtnStyle}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAY_NAMES.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, color:"#4a6a8a", fontWeight:600, padding:"2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isSel = day === selectedDay, isTod = isToday(day);
          return (
            <div key={day} onMouseDown={(e) => { e.preventDefault(); handleSelect(day); }}
              style={{ textAlign:"center", fontSize:12, padding:"5px 0", borderRadius:6, cursor:"pointer", color:isSel?"#fff":isTod?"#5a9fd4":"#c8d8e8", background:isSel?"#2563eb":"transparent", fontWeight:isSel||isTod?600:400, border:isTod&&!isSel?"1px solid rgba(90,159,212,0.4)":"1px solid transparent" }}
            >{day}</div>
          );
        })}
      </div>
      {value && <div style={{ marginTop:10, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:8, textAlign:"center" }}><button onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }} style={{ background:"none", border:"none", color:"#5a7a9a", fontSize:12, cursor:"pointer" }}>Clear</button></div>}
    </div>,
    document.body
  );

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <div onClick={openPicker} style={{ display:"flex", alignItems:"center", gap:5, padding:"0 8px", height:32, cursor:"pointer", minWidth:110, border:"1px solid rgba(255,255,255,0.12)", borderRadius:6 }}>
        <span style={{ color:"#5a7a9a", display:"flex" }}><CalendarIcon /></span>
        <span style={{ fontSize:12, color:value?"#c8d8e8":"#5a7a9a" }}>{value || label}</span>
      </div>
      {picker}
    </div>
  );
}

const calBtnStyle = { background:"transparent", border:"none", color:"#5a7a9a", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4, borderRadius:4 };

function Dropdown({ label, value, options, onChange, icon }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <div onClick={() => setOpen(!open)} style={{ display:"flex", alignItems:"center", gap:5, padding:"0 8px", height:32, cursor:"pointer", minWidth:120, border:"1px solid rgba(255,255,255,0.12)", borderRadius:6 }}>
        <span style={{ color:"#5a7a9a", display:"flex" }}>{icon}</span>
        <span style={{ flex:1, fontSize:12, color:value?"#c8d8e8":"#5a7a9a" }}>{value || label}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#5a7a9a" strokeWidth="1.8" strokeLinecap="round" style={{ transform:open?"rotate(180deg)":"rotate(0deg)" }}><path d="M1 3l4 4 4-4"/></svg>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, marginTop:4, width:"100%", background:"#151e30", border:"1px solid #2a4060", borderRadius:8, zIndex:99999, overflow:"hidden" }}>
          {options.map(opt => (
            <div key={opt} onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", color:opt===value?"#5a9fd4":"#c8d8e8", background:opt===value?"rgba(90,159,212,0.08)":"transparent" }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, dashed }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center" }}>
      <span style={{ display:"inline-block", width:22, height:2.5, background:dashed?"transparent":color, borderTop:dashed?`2px dashed ${color}`:"none", verticalAlign:"middle", marginRight:5, flexShrink:0 }} />
      <span style={{ color:"#8aa8c8", fontSize:12 }}>{label}</span>
    </span>
  );
}

function DualChart({ cardLabel, dates, leftData, rightData, leftColor, rightColor, legendLeft, legendRight, currentYear, currentMonth, dataKey, onFullscreen }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const leftSeriesRef = useRef(null);
  const rightSeriesRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [fsYear, setFsYear] = useState(currentYear);
  const [fsMonth, setFsMonth] = useState(currentMonth);

  useEffect(() => { if (!isFullscreen) { setFsYear(currentYear); setFsMonth(currentMonth); } }, [currentYear, currentMonth, isFullscreen]);

  const fsSeriesOptions = useMemo(() => Object.keys(MONTHS).map(m => `S50${m}${String(fsYear).slice(2)}`), [fsYear]);
  const fsSeriesLabel = `S50${fsMonth}${String(fsYear).slice(2)}`;
  const fsData = useMemo(() => getSeriesData(fsYear, fsMonth), [fsYear, fsMonth]);
  const handleFsYearChange = (val) => { setFsYear(Number(val)); setFsMonth("H"); };
  const handleFsSeriesChange = (val) => setFsMonth(val[3]);

  const activeDates = isFullscreen ? fsData.dates : dates;
  const activeLeftData = isFullscreen ? fsData.prices : leftData;
  const activeRightData = isFullscreen ? (dataKey === "oi" ? fsData.oi : fsData.callPut) : rightData;

  const toISO = (dmy) => { const [d, m, y] = dmy.split("/"); return `${y}-${m}-${d}`; };
  const handleReset = () => {
    chartRef.current?.timeScale().fitContent();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight || (window.innerHeight - 56);
        chartRef.current.applyOptions({ width: w, height: h });
        chartRef.current.timeScale().fitContent();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background:{ type:ColorType.Solid, color:"transparent" }, textColor:"rgba(200,216,232,0.6)", fontSize:11 },
      grid: { vertLines:{ color:"rgba(255,255,255,0.04)" }, horzLines:{ color:"rgba(255,255,255,0.04)" } },
      crosshair: { vertLine:{ color:"rgba(90,159,212,0.4)", labelBackgroundColor:"#1a2a40" }, horzLine:{ color:"rgba(90,159,212,0.4)", labelBackgroundColor:"#1a2a40" } },
      rightPriceScale: { borderColor:"transparent", visible:false },
      leftPriceScale: { borderColor:"transparent", visible:true, textColor:"rgba(200,216,232,0.6)" },
      timeScale: { borderColor:"rgba(255,255,255,0.06)", timeVisible:false, tickMarkFormatter:(t) => { const d=new Date(t*1000); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; } },
      watermark: { visible:false },
      handleScroll: true, handleScale: true,
    });
    chart.priceScale("left").applyOptions({ scaleMargins:{ top:0.1, bottom:0.1 } });
    chart.priceScale("right").applyOptions({ scaleMargins:{ top:0.1, bottom:0.1 } });
    const leftSeries = chart.addSeries(LineSeries, { color:leftColor, lineWidth:2, priceScaleId:"left", crosshairMarkerVisible:false, lastValueVisible:true, priceLineVisible:false });
    const rightSeries = chart.addSeries(LineSeries, { color:rightColor, lineWidth:2, lineStyle:LineStyle.Solid, priceScaleId:"right", crosshairMarkerVisible:false, lastValueVisible:true, priceLineVisible:false });
    chart.priceScale("right").applyOptions({ visible:true, textColor:"rgba(200,216,232,0.6)", borderColor:"transparent" });
    chartRef.current = chart; leftSeriesRef.current = leftSeries; rightSeriesRef.current = rightSeries;
    setChartReady(true);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight || 240 });
      }
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); setChartReady(false); };
  }, []);

  useEffect(() => {
    if (!chartReady || !leftSeriesRef.current || !rightSeriesRef.current || !activeDates.length) return;
    const leftD = activeDates.map((dmy,i) => ({ time:Math.floor(new Date(toISO(dmy)).getTime()/1000), value:activeLeftData[i] })).filter(p => !isNaN(p.time));
    const rightD = activeDates.map((dmy,i) => ({ time:Math.floor(new Date(toISO(dmy)).getTime()/1000), value:activeRightData[i] })).filter(p => !isNaN(p.time));
    leftSeriesRef.current.setData(leftD);
    rightSeriesRef.current.setData(rightD);
    chartRef.current?.timeScale().fitContent();
  }, [activeDates, activeLeftData, activeRightData, chartReady, isFullscreen]);

  if (isFullscreen) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#0b101e", display:"flex", flexDirection:"column" }}>
        {/* ── Fullscreen Toolbar ── */}
        <div style={{
          height:60, background:"#111827", 
          borderBottom:"1px solid rgba(255,255,255,0.05)",
          display:"flex", alignItems:"center",
          padding:"0 16px", flexShrink:0, gap:16,
        }}>
          {/* ซ้าย: ?, Back, Dropdowns */}
          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1 }}>
            
            {/* ส่ง onViewDetails เป็นฟังก์ชันเปล่าเพื่อป้องกันปุ่มพัง */}
            <div style={{
              width:34, height:34, borderRadius:6, 
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.08)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
            }}>
              <ToolHint onViewDetails={() => {}}>
                {cardLabel === "Volume"
                  ? "Fullscreen Volume Chart — Monitor accumulated Call and Put option transaction volumes alongside the underlying S50 Futures price tracking line."
                  : "Fullscreen Open Interest Chart — Analyze accumulated Open Interest (OI) metrics correlated with historical S50 Futures price movements."}
              </ToolHint>
            </div>

            {/* ปุ่ม Back */}
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                display:"flex", alignItems:"center", gap:6,
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:6, padding:"0 12px", height:34,
                color:"#94a3b8", cursor:"pointer",
                fontSize:12, fontWeight:500, fontFamily:"inherit",
                transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5"/>
              </svg>
              Back
            </button>

            {/* Floating Dropdowns */}
            <FsDropdown label="Series" value={fsSeriesLabel} options={fsSeriesOptions} onChange={handleFsSeriesChange} />
            <FsDropdown label="Select Year" value={String(fsYear)} options={AVAILABLE_YEARS.map(String)} onChange={handleFsYearChange} />
          </div>

          {/* ตรงกลาง: VOLUME / OI */}
          <div style={{
            position:"absolute", left:"50%", transform:"translateX(-50%)",
            fontSize:18, fontWeight:700, color:"#fff", letterSpacing:"0.05em", whiteSpace:"nowrap"
          }}>
            {cardLabel.toUpperCase()}
          </div>

          {/* ขวา: Legends + Refresh */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
            <LegendDot color={rightColor} label={legendRight} />
            <LegendDot color={leftColor} label={legendLeft} />
            
            <button
              onClick={handleReset}
              style={{
                width:34, height:34, borderRadius:"50%",
                border:"1px solid rgba(255,255,255,0.15)",
                background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#94a3b8", fontSize:14, transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#64748b"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"; e.currentTarget.style.color="#94a3b8"; }}
            >
              <span style={{ display:"inline-block", transition:"transform 0.6s ease", transform:spinning?"rotate(360deg)":"rotate(0deg)" }}>⟳</span>
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div style={{ flex:1, position:"relative", minHeight:0 }}>
          <div ref={containerRef} style={{ width:"100%", height:"100%" }} />
        </div>
      </div>
    );
  }

  // ── หน้าปกติ ──
  return (
    <div style={styles.cardWrap}>
      <div style={styles.cardHeader}>
        <span style={styles.cardLabel}>{cardLabel}</span>
        <div style={styles.legendRow}>
          <LegendDot color={rightColor} label={legendRight} />
          <LegendDot color={leftColor} label={legendLeft} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto", flexShrink:0 }}>
          <button onClick={() => { setIsFullscreen(true); onFullscreen(); }} style={styles.iconBtn} title="Fullscreen">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"/></svg>
          </button>
          <button onClick={handleReset} style={styles.iconBtn} title="Reset">
            <span style={{ display:"inline-block", fontSize:13, transition:"transform 0.6s ease", transform:spinning?"rotate(360deg)":"rotate(0deg)" }}>⟳</span>
          </button>
        </div>
      </div>
      <div style={{ position:"relative" }}>
        <div ref={containerRef} style={{ width:"100%", height:240 }} />
      </div>
    </div>
  );
}

export default function Options() {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedMonth, setSelectedMonth] = useState("H");
  const [selectedDate, setSelectedDate] = useState("");
  const [showRotateModal, setShowRotateModal] = useState(false);

  const seriesOptions = useMemo(() => Object.keys(MONTHS).map(m => `S50${m}${String(selectedYear).slice(2)}`), [selectedYear]);
  const selectedSeriesLabel = `S50${selectedMonth}${String(selectedYear).slice(2)}`;
  const data = useMemo(() => getSeriesData(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const handleYearChange = (val) => { setSelectedYear(Number(val)); setSelectedMonth("H"); setSelectedDate(""); };
  const handleSeriesChange = (val) => setSelectedMonth(val[3]);

  const handleFullscreenTrigger = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) { setShowRotateModal(true); }
  };

  return (
    <div style={styles.pageWrap}>
      <style>{`.tv-lightweight-charts a, .tv-lightweight-charts a * { display: none !important; }`}</style>
      {showRotateModal && <RotateModal onClose={() => setShowRotateModal(false)} />}
      <div style={styles.topBar}>
        <div style={styles.topGroup}>
          <ToolHint onViewDetails={() => { window.scrollTo({ top:0 }); }}>S50 Options Dashboard — View accumulated Call-Put volume and Open Interest alongside S50 futures price. Select a contract series and year to compare</ToolHint>
          <VDivider />
          <DatePicker label="Select Date..." value={selectedDate} onChange={setSelectedDate} />
          <VDivider />
          <Dropdown label="Series..." value={selectedSeriesLabel} options={seriesOptions} onChange={handleSeriesChange} icon={<TrendIcon />} />
        </div>
        <div style={styles.topGroup}>
          <Dropdown label="Select Year..." value={String(selectedYear)} options={AVAILABLE_YEARS.map(String)} onChange={handleYearChange} icon={<YearIcon />} />
        </div>
      </div>
      <DualChart cardLabel="Volume" dates={data.dates} leftData={data.prices} rightData={data.callPut} leftColor="#e84040" rightColor="#00cc55" legendLeft="Futures Price" legendRight="Call-Put (Accumulated)" currentYear={selectedYear} currentMonth={selectedMonth} dataKey="callPut" onFullscreen={handleFullscreenTrigger} />
      <DualChart cardLabel="OI" dates={data.dates} leftData={data.prices} rightData={data.oi} leftColor="#e84040" rightColor="#f5c842" legendLeft="Futures Price" legendRight="Open Interest (Accumulated)" currentYear={selectedYear} currentMonth={selectedMonth} dataKey="oi" onFullscreen={handleFullscreenTrigger} />
    </div>
  );
}

const styles = {
  pageWrap: { background:"#0d0f1a", minHeight:"100vh", padding:16, fontFamily:"'Inter',sans-serif", display:"flex", flexDirection:"column", gap:16 },
  topBar: { display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", width:"100%" },
  topGroup: { display:"flex", alignItems:"center", gap:6, background:"#151c2c", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"0 8px", height:50, boxSizing:"border-box" },
  cardWrap: { background:"#151c2c", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.3)" },
  cardHeader: { display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" },
  cardLabel: { color:"#c8d8e8", fontSize:12, fontWeight:700, letterSpacing:0.5, flexShrink:0 },
  legendRow: { display:"flex", gap:12, alignItems:"center", flex:1, flexWrap:"wrap" },
  iconBtn: { background:"transparent", color:"#5a7a9a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:5, padding:"3px 6px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" },
};