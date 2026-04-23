import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { createChart, CrosshairMode, LineStyle, LineSeries } from "lightweight-charts";

// ─── DATA (SET & MAI) ────────────────────────────────────────────────────────
const SET_SECTORS = [
  { id: "AGRI",    label: "AGRI",    stocks: [{ sym: "STA", chg: +0.80, hasFlow: false }, { sym: "EE", chg: -0.40, hasFlow: false }, { sym: "GFPT", chg: +1.20, hasFlow: true }, { sym: "PCE", chg: -0.20, hasFlow: false }, { sym: "VPO", chg: +0.55, hasFlow: false }] },
  { id: "AUTO",    label: "AUTO",    stocks: [{ sym: "MGC", chg: +0.30, hasFlow: false }, { sym: "NEX", chg: +2.10, hasFlow: true }, { sym: "POLY", chg: -0.60, hasFlow: false }, { sym: "SAT", chg: +0.10, hasFlow: false }, { sym: "AH", chg: -0.30, hasFlow: false }] },
  { id: "BANK",    label: "BANK",    stocks: [{ sym: "KBANK", chg: -1.45, hasFlow: false }, { sym: "SCB", chg: +0.63, hasFlow: true }, { sym: "KTB", chg: +0.32, hasFlow: false }, { sym: "BBL", chg: +1.50, hasFlow: true }, { sym: "TTB", chg: -0.10, hasFlow: false }, { sym: "CREDIT", chg: +0.50, hasFlow: false }] },
  { id: "COMM",    label: "COMM",    stocks: [{ sym: "CPALL", chg: -0.67, hasFlow: false }, { sym: "CRC", chg: +0.80, hasFlow: true }, { sym: "HMPRO", chg: -0.20, hasFlow: false }, { sym: "COM7", chg: +1.10, hasFlow: true }, { sym: "BJC", chg: -0.40, hasFlow: false }] },
  { id: "CONMAT",  label: "CONMAT",  stocks: [{ sym: "SCC", chg: -2.10, hasFlow: false }, { sym: "TOA", chg: +1.50, hasFlow: true }, { sym: "TASCO", chg: +0.30, hasFlow: false }, { sym: "SCCC", chg: -0.80, hasFlow: false }, { sym: "EPG", chg: +0.20, hasFlow: false }] },
  { id: "CONS",    label: "CONS",    stocks: [{ sym: "CK", chg: +0.40, hasFlow: false }, { sym: "STEC", chg: -0.30, hasFlow: false }, { sym: "ITD", chg: -0.50, hasFlow: false }, { sym: "TEAMG", chg: +1.80, hasFlow: true }, { sym: "TRC", chg: +0.70, hasFlow: false }] },
  { id: "ENERG",   label: "ENERG",   stocks: [{ sym: "PTT", chg: +1.24, hasFlow: false }, { sym: "PTTEP", chg: +0.50, hasFlow: false }, { sym: "EA", chg: -0.88, hasFlow: true }, { sym: "TOP", chg: +2.11, hasFlow: true }, { sym: "GULF", chg: +0.90, hasFlow: false }, { sym: "BANPU", chg: -0.60, hasFlow: false }] },
  { id: "ETRON",   label: "ETRON",   stocks: [{ sym: "DELTA", chg: +3.72, hasFlow: true }, { sym: "KCE", chg: +1.50, hasFlow: true }, { sym: "HANA", chg: -0.40, hasFlow: false }, { sym: "CCET", chg: +0.80, hasFlow: false }, { sym: "SVI", chg: -0.20, hasFlow: false }] },
  { id: "FASHION", label: "FASHION", stocks: [{ sym: "SABINA", chg: +1.10, hasFlow: true }, { sym: "PAF", chg: +1.30, hasFlow: false }, { sym: "AURA", chg: -0.20, hasFlow: false }, { sym: "MC", chg: +0.40, hasFlow: false }, { sym: "CPH", chg: +0.60, hasFlow: false }, { sym: "CPL", chg: +0.40, hasFlow: false }, { sym: "WFX", chg: -0.10, hasFlow: false }] },
  { id: "FIN",     label: "FIN",     stocks: [{ sym: "KTC", chg: +0.80, hasFlow: false }, { sym: "MTC", chg: +1.60, hasFlow: true }, { sym: "TIDLOR", chg: +0.50, hasFlow: false }, { sym: "SAWAD", chg: -1.20, hasFlow: false }, { sym: "AEON", chg: -0.30, hasFlow: false }] },
  { id: "FOOD",    label: "FOOD",    stocks: [{ sym: "CPF", chg: -0.50, hasFlow: false }, { sym: "MINT", chg: +1.12, hasFlow: false }, { sym: "OSP", chg: +0.70, hasFlow: true }, { sym: "CBG", chg: -0.40, hasFlow: false }, { sym: "OISHI", chg: +0.20, hasFlow: false }] },
  { id: "HELTH",   label: "HELTH",   stocks: [{ sym: "BDMS", chg: +0.95, hasFlow: false }, { sym: "BCH", chg: +1.40, hasFlow: true }, { sym: "CHG", chg: -0.30, hasFlow: false }, { sym: "PR9", chg: +0.80, hasFlow: false }, { sym: "RJH", chg: +0.60, hasFlow: false }] },
  { id: "HOME",    label: "HOME",    stocks: [{ sym: "ILM", chg: +0.45, hasFlow: false }, { sym: "MODERN", chg: -0.10, hasFlow: false }, { sym: "DCON", chg: +0.00, hasFlow: false }] },
  { id: "ICT",     label: "ICT",     stocks: [{ sym: "ADVANC", chg: +2.50, hasFlow: true }, { sym: "TRUE", chg: +1.20, hasFlow: false }, { sym: "INTUCH", chg: +0.75, hasFlow: false }, { sym: "JMART", chg: -1.40, hasFlow: false }] },
  { id: "IMM",     label: "IMM",     stocks: [{ sym: "IND", chg: -0.20, hasFlow: false }, { sym: "PROUD", chg: +0.15, hasFlow: false }] },
  { id: "INSUR",   label: "INSUR",   stocks: [{ sym: "TLI", chg: +0.40, hasFlow: false }, { sym: "BLA", chg: -0.60, hasFlow: false }, { sym: "THREL", chg: +1.10, hasFlow: true }] },
  { id: "MEDIA",   label: "MEDIA",   stocks: [{ sym: "PLANB", chg: +1.30, hasFlow: true }, { sym: "VGI", chg: -0.80, hasFlow: false }, { sym: "BEC", chg: +0.20, hasFlow: false }, { sym: "ONEE", chg: -0.40, hasFlow: false }] },
  { id: "MINE",    label: "MINE",    stocks: [{ sym: "THL", chg: +0.00, hasFlow: false }] },
  { id: "PAPER",   label: "PAPER",   stocks: [{ sym: "UTP", chg: +0.60, hasFlow: false }] },
  { id: "PERSON",  label: "PERSON",  stocks: [{ sym: "STGT", chg: -1.50, hasFlow: false }, { sym: "TOG", chg: +0.70, hasFlow: true }] },
  { id: "PETRO",   label: "PETRO",   stocks: [{ sym: "IVL", chg: +1.80, hasFlow: true }, { sym: "PTTGC", chg: +0.40, hasFlow: false }, { sym: "IRPC", chg: -0.20, hasFlow: false }] },
  { id: "PF&REIT", label: "PF&REIT", stocks: [] },
  { id: "PKG",     label: "PKG",     stocks: [{ sym: "SCGP", chg: +1.25, hasFlow: true }, { sym: "BGC", chg: -0.30, hasFlow: false }, { sym: "SFLEX", chg: +0.50, hasFlow: false }] },
  { id: "PROF",    label: "PROF",    stocks: [{ sym: "SISB", chg: +2.10, hasFlow: true }] },
  { id: "PROP",    label: "PROP",    stocks: [{ sym: "CPN", chg: +1.50, hasFlow: false }, { sym: "SIRI", chg: +0.60, hasFlow: true }, { sym: "AP", chg: -0.40, hasFlow: false }, { sym: "SPALI", chg: +0.30, hasFlow: false }, { sym: "WHA", chg: +1.10, hasFlow: true }] },
  { id: "REHABCO", label: "REHABCO", stocks: [{ sym: "THAI", chg: +0.00, hasFlow: false }] },
  { id: "STEEL",   label: "STEEL",   stocks: [{ sym: "TMT", chg: +0.20, hasFlow: false }, { sym: "AMC", chg: -0.10, hasFlow: false }, { sym: "PERMAC", chg: +0.40, hasFlow: false }] },
  { id: "TOURISM", label: "TOURISM", stocks: [{ sym: "CENTEL", chg: +1.40, hasFlow: true }, { sym: "ERW", chg: +0.80, hasFlow: false }, { sym: "SHR", chg: -0.30, hasFlow: false }] },
  { id: "TRANS",   label: "TRANS",   stocks: [{ sym: "AOT", chg: +1.20, hasFlow: true }, { sym: "BEM", chg: +0.50, hasFlow: false }, { sym: "BTS", chg: -0.40, hasFlow: false }, { sym: "PSL", chg: +1.80, hasFlow: true }, { sym: "RCL", chg: -0.70, hasFlow: false }] },
].map(s => ({ ...s, market: "SET" }));

const MAI_SECTORS = [
  { id: "AGRO",    label: "AGRO",    stocks: [{ sym: "SUN", chg: +1.20, hasFlow: true }, { sym: "TMILL", chg: -0.40, hasFlow: false }, { sym: "XO", chg: +2.50, hasFlow: true }, { sym: "TACC", chg: +0.30, hasFlow: false }] },
  { id: "CONSUMP", label: "CONSUMP", stocks: [{ sym: "DOD", chg: -1.10, hasFlow: false }, { sym: "JDF", chg: +0.20, hasFlow: false }, { sym: "STC", chg: -0.50, hasFlow: false }, { sym: "TMI", chg: -0.10, hasFlow: false }] },
  { id: "FINCIAL", label: "FINCIAL", stocks: [{ sym: "MICRO", chg: +0.80, hasFlow: true }, { sym: "LIT", chg: -0.20, hasFlow: false }, { sym: "GCAP", chg: +0.10, hasFlow: false }, { sym: "CHAYO", chg: +1.50, hasFlow: true }] },
  { id: "INDUS",   label: "INDUS",   stocks: [{ sym: "PIMO", chg: -0.80, hasFlow: false }, { sym: "FPI", chg: +0.40, hasFlow: false }, { sym: "TNDT", chg: -0.30, hasFlow: false }, { sym: "COLOR", chg: -0.10, hasFlow: false }] },
  { id: "PROPCON", label: "PROPCON", stocks: [{ sym: "CHEWA", chg: +0.50, hasFlow: true }, { sym: "PPS", chg: -0.20, hasFlow: false }, { sym: "THANA", chg: +0.80, hasFlow: false }, { sym: "ARIN", chg: +0.10, hasFlow: false }] },
  { id: "RESOURC", label: "RESOURC", stocks: [{ sym: "QTC", chg: -0.60, hasFlow: false }, { sym: "UAC", chg: +0.20, hasFlow: false }, { sym: "AKP", chg: -1.20, hasFlow: false }, { sym: "TAE", chg: -0.10, hasFlow: false }] },
  { id: "SERVICE", label: "SERVICE", stocks: [{ sym: "SPA", chg: +1.80, hasFlow: true }, { sym: "AUCT", chg: +0.90, hasFlow: true }, { sym: "MASTER", chg: +2.10, hasFlow: true }, { sym: "WARRIX", chg: -0.40, hasFlow: false }] },
  { id: "TECH",    label: "TECH",    stocks: [{ sym: "BBIK", chg: -2.50, hasFlow: false }, { sym: "BE8", chg: -1.80, hasFlow: false }, { sym: "IIG", chg: -0.90, hasFlow: false }, { sym: "DITTO", chg: -1.20, hasFlow: false }, { sym: "SECURE", chg: +0.50, hasFlow: false }, { sym: "YGG", chg: -0.30, hasFlow: false }] },
].map(s => ({ ...s, market: "MAI" }));

const SET_SUMMARY = {
  id: "SET_ALL", label: "SET", market: "SET",
  stocks: [
    { sym: "KBANK", chg: -1.45, hasFlow: false },
    { sym: "PTTEP", chg: +0.50, hasFlow: true },
    { sym: "SCB",   chg: +0.63, hasFlow: false },
    { sym: "BDMS",  chg: +0.95, hasFlow: false },
    { sym: "DELTA", chg: +3.72, hasFlow: false },
  ],
};

const MAI_SUMMARY = {
  id: "MAI_ALL", label: "MAI", market: "MAI",
  stocks: [
    { sym: "SPA",    chg: +1.80, hasFlow: true },
    { sym: "XO",     chg: +2.50, hasFlow: true },
    { sym: "MASTER", chg: +2.10, hasFlow: true },
    { sym: "SUN",    chg: +1.20, hasFlow: true },
    { sym: "CHAYO",  chg: +1.50, hasFlow: true },
  ],
};

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
const C = {
  pageBg:      "#0a0f1a",
  panelBg:     "#0a0f1a",
  cardBg:      "#0d1422",
  toolbarBg:   "#070c15",
  dropdownBg:  "#0d1422",
  inputBg:     "#0f1828",
  border:      "#141f32",
  borderHover: "#1a2a44",
  textPrimary: "#cdd9ed",
  textMuted:   "#3a5070",
  textSub:     "#4e6480",
  accent:      "#06b6d4",
  accentBg:    "rgba(6,182,212,0.08)",
  accentBorder:"rgba(6,182,212,0.35)",
  green:       "#22c55e",
  greenBg:     "rgba(34,197,94,0.15)",
  greenBorder: "rgba(34,197,94,0.4)",
  yellow:      "#facc15",
  yellowBg:    "rgba(245,158,11,0.15)",
  yellowBorder:"rgba(245,158,11,0.4)",
  blue:        "#2d6be4",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function hashSym(s) {
  if (!s) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0); }
  return h;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeriesData(id, n = 160) {
  if (!id) return [];
  const r = rng(hashSym(id));
  const trend = (r() - 0.48) * 3.5;
  let cum = 1000, mom = 0;
  const startMs = new Date("2019-01-02").getTime();
  const endMs   = Date.now();
  const step    = (endMs - startMs) / (n - 1);
  const result  = [];
  for (let i = 0; i < n; i++) {
    mom = mom * 0.8 + (r() - 0.5) * 1.5;
    cum += (trend + mom) * (1 + r() * 0.3);
    const ts = Math.floor((startMs + step * i) / 1000);
    result.push({ time: ts, value: Math.max(100, cum) });
  }
  return result;
}

function getTopBadge(stocks) {
  if (!stocks || stocks.length === 0) return null;
  const top = [...stocks].sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))[0];
  const isUp = top.chg >= 0;
  return { sym: top.sym, color: isUp ? "#4ade80" : C.yellow, arrow: isUp ? "▲" : "▼", isUp };
}

// ─── CHART THEME ──────────────────────────────────────────────────────────────
function buildChartOptions(isUp, isExpanded) {
  return {
    layout: {
      background: { color: "transparent" },
      textColor: C.textMuted,
      fontSize: isExpanded ? 12 : 10,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: "rgba(23,34,54,0.9)", style: LineStyle.Dotted },
      horzLines: { color: "rgba(23,34,54,0.9)", style: LineStyle.Dotted },
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: { color: "rgba(100,130,170,0.35)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#111d30" },
      horzLine: { color: "rgba(100,130,170,0.35)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#111d30" },
    },
    rightPriceScale: { visible: false },
    leftPriceScale:  { visible: false },
    timeScale: {
      borderColor: C.border,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 0,
      fixRightEdge: true,
      fixLeftEdge: true,
      tickMarkFormatter: (time) => {
        const d = new Date(time * 1000);
        const yr = d.getFullYear();
        const mo = d.toLocaleString("en", { month: "short" });
        return isExpanded ? `${mo} '${String(yr).slice(2)}` : `'${String(yr).slice(2)}`;
      },
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
    handleScale:  { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
  };
}

function buildSeriesOptions(isUp) {
  const lineColor = isUp ? C.green : C.yellow;
  return {
    color: lineColor,
    lineWidth: 2,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBackgroundColor: lineColor,
    lastValueVisible: false,
    priceLineVisible: false,
  };
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d5470" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCaret     = () => <svg width="10" height="6"  viewBox="0 0 10 6" fill="#253a60"><path d="M5 6L0 0h10z"/></svg>;
const IconLineChart = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d5470" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const IconSearchZoom= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
const IconRefresh   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>;
const IconGrid3x3   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3"  y="3"  width="4" height="4" rx="1"/><rect x="10" y="3"  width="4" height="4" rx="1"/><rect x="17" y="3"  width="4" height="4" rx="1"/><rect x="3"  y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="17" y="10" width="4" height="4" rx="1"/><rect x="3"  y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/></svg>;
const IconGrid2x2   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4"  y="4"  width="6" height="6" rx="1"/><rect x="14" y="4"  width="6" height="6" rx="1"/><rect x="4"  y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
const IconList      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3"  y="6"  width="18" height="3" rx="1"/><rect x="3"  y="15" width="18" height="3" rx="1"/></svg>;
const IconX         = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function getTradingDates(numDays = 2087) {
  const dates = []; const base = new Date("2019-01-02"); let day = 0;
  while (dates.length < numDays) {
    const d = new Date(base); d.setDate(base.getDate() + day);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const dd = String(d.getDate()).padStart(2,"0");
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const yy = String(d.getFullYear()).slice(2);
      dates.push(`${dd}/${mm}/${yy}`);
    }
    day++;
  }
  return dates;
}
function parseKey(key) { const [dd,mm,yy] = key.split("/"); return { day:+dd, month:+mm, year:2000+(+yy) }; }
function toKey(year,month,day) { return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${String(year).slice(2)}`; }
function formatDisplay(key) {
  if (!key) return "";
  const { day,month,year } = parseKey(key);
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(day).padStart(2,"0")} ${M[month-1]} ${year}`;
}
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── DATE PICKER ──────────────────────────────────────────────────────────────
const DatePicker = memo(({ dates, selected, onChange }) => {
  const [open,setOpen] = useState(false);
  const [view,setView] = useState("day");
  const [popupPos,setPopupPos] = useState({ top:0, left:0 });
  const ref = useRef(null);
  const FULL_MONTH  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const initView = useMemo(() => {
    if (selected && selected.includes("/")) { const p=parseKey(selected); return { month:p.month, year:p.year }; }
    return { month:1, year:2025 };
  },[]);
  const [viewMonth,setViewMonth] = useState(initView.month);
  const [viewYear ,setViewYear ] = useState(initView.year);
  const tradableSet    = useMemo(() => new Set(dates),[dates]);
  const availableYears = useMemo(() => { const ys=new Set(dates.map(k=>2000+(+k.split("/")[2]))); return [...ys].sort((a,b)=>a-b); },[dates]);
  const availableMonths= useMemo(() => new Set(dates.filter(k=>2000+(+k.split("/")[2])===viewYear).map(k=>+k.split("/")[1])),[dates,viewYear]);
  const decadeStart    = Math.floor(viewYear/10)*10;
  const decadeYears    = useMemo(()=>Array.from({length:12},(_,i)=>decadeStart-1+i),[decadeStart]);
  useEffect(()=>{ if(!open)return; const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn); },[open]);
  const prevMonth=useCallback(()=>{ if(viewMonth===1){setViewMonth(12);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); },[viewMonth]);
  const nextMonth=useCallback(()=>{ if(viewMonth===12){setViewMonth(1);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); },[viewMonth]);
  const canPrev=useCallback(()=>{ if(!dates[0])return false; const p=parseKey(dates[0]); return viewYear>p.year||(viewYear===p.year&&viewMonth>p.month); },[dates,viewYear,viewMonth]);
  const canNext=useCallback(()=>{ if(!dates[dates.length-1])return false; const p=parseKey(dates[dates.length-1]); return viewYear<p.year||(viewYear===p.year&&viewMonth<p.month); },[dates,viewYear,viewMonth]);
  const calDays=useMemo(()=>{ const firstDow=new Date(viewYear,viewMonth-1,1).getDay(); const total=new Date(viewYear,viewMonth,0).getDate(); const cells=[]; for(let i=0;i<firstDow;i++)cells.push(null); for(let d=1;d<=total;d++)cells.push(d); while(cells.length%7!==0)cells.push(null); return cells; },[viewMonth,viewYear]);

  const popup     = { position:"fixed",top:popupPos.top,left:popupPos.left,zIndex:9999,width:252,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 16px 40px rgba(0,0,0,0.7)",fontFamily:"monospace",overflow:"hidden",maxHeight:`calc(100vh - ${popupPos.top}px - 8px)`,overflowY:"auto" };
  const dpHeader  = { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 8px",borderBottom:`1px solid ${C.border}` };
  const navBtn    = (active)=>({ width:26,height:26,borderRadius:5,border:"none",background:"transparent",color:active?"#7a9cc4":"#162035",cursor:active?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .1s" });
  const titleBtn  = { background:"transparent",border:"none",cursor:"pointer",color:C.textPrimary,fontSize:13,fontWeight:500,fontFamily:"monospace",letterSpacing:"0.03em",display:"flex",alignItems:"center",gap:3,padding:"4px 8px",borderRadius:5 };
  const body      = { padding:"8px 12px 10px" };
  const Chev=({d})=>(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{d==="left"&&<polyline points="15 18 9 12 15 6"/>}{d==="right"&&<polyline points="9 18 15 12 9 6"/>}{d==="down"&&<polyline points="6 9 12 15 18 9"/>}</svg>);

  return (
    <div ref={ref} style={{flexShrink:0}}>
      <button onClick={()=>{ if(!open&&selected&&selected.includes("/")){ const p=parseKey(selected); setViewMonth(p.month); setViewYear(p.year); } if(!open&&ref.current){ const rect=ref.current.getBoundingClientRect(); const POPUP_W=252; const clampedLeft=Math.min(rect.left,window.innerWidth-POPUP_W-8); const clampedTop=Math.min(rect.bottom+8,window.innerHeight-8); setPopupPos({top:clampedTop,left:Math.max(8,clampedLeft)}); } setOpen(o=>!o); setView("day"); }}
        style={{ display:"flex",alignItems:"center",gap:7,padding:"0 12px",height:36,background:open?"rgba(59,130,246,0.12)":C.inputBg,border:`1px solid ${open?"rgba(59,130,246,0.5)":C.border}`,borderRadius:8,cursor:"pointer",color:C.textPrimary,fontSize:13,fontWeight:500,fontFamily:"monospace",transition:"all .15s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {formatDisplay(selected)}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.6,transform:open?"rotate(180deg)":"none",transition:"transform .2s",marginLeft:4}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&(<div style={popup}>
        {view==="year"&&(<><div style={dpHeader}><button style={navBtn(decadeStart>(availableYears[0]??2025))} onClick={()=>setViewYear(decadeStart-1)} onMouseEnter={e=>{if(decadeStart>(availableYears[0]??2025))e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="left"/></button><span style={{color:C.textPrimary,fontSize:13,fontWeight:500,fontFamily:"monospace"}}>{decadeStart} – {decadeStart+9}</span><button style={navBtn(decadeStart+9<(availableYears[availableYears.length-1]??2025))} onClick={()=>setViewYear(decadeStart+10)} onMouseEnter={e=>{if(decadeStart+9<(availableYears[availableYears.length-1]??2025))e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="right"/></button></div><div style={{...body,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{decadeYears.map(yr=>{ const avail=availableYears.includes(yr); const isCur=yr===viewYear; const isOut=yr<decadeStart||yr>decadeStart+9; return(<button key={yr} onClick={()=>{if(avail){setViewYear(yr);setView("month");}}} style={{height:36,borderRadius:6,border:"none",cursor:avail?"pointer":"default",fontFamily:"monospace",fontSize:13,fontWeight:isCur?600:400,background:isCur?C.blue:"transparent",color:isCur?"#fff":avail?(isOut?"#334d6e":"#cbd5e1"):"#162035",transition:"all .1s"}} onMouseEnter={e=>{if(avail&&!isCur)e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>{if(avail&&!isCur)e.currentTarget.style.background="transparent";}}>{yr}</button>); })}</div></>)}
        {view==="month"&&(<><div style={dpHeader}><button style={navBtn(availableYears.includes(viewYear-1))} onClick={()=>setViewYear(y=>y-1)} onMouseEnter={e=>{if(availableYears.includes(viewYear-1))e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="left"/></button><button style={titleBtn} onClick={()=>setView("year")} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{viewYear} <Chev d="down"/></button><button style={navBtn(availableYears.includes(viewYear+1))} onClick={()=>setViewYear(y=>y+1)} onMouseEnter={e=>{if(availableYears.includes(viewYear+1))e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="right"/></button></div><div style={{...body,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{SHORT_MONTH.map((m,idx)=>{ const mNum=idx+1; const avail=availableMonths.has(mNum); const isCur=mNum===viewMonth; return(<button key={m} onClick={()=>{if(avail){setViewMonth(mNum);setView("day");}}} style={{height:38,borderRadius:6,border:"none",cursor:avail?"pointer":"default",fontFamily:"monospace",fontSize:13,fontWeight:isCur?600:400,background:isCur?C.blue:"transparent",color:isCur?"#fff":avail?"#cbd5e1":"#162035",transition:"all .1s"}} onMouseEnter={e=>{if(avail&&!isCur)e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>{if(avail&&!isCur)e.currentTarget.style.background="transparent";}}>{m}</button>); })}</div></>)}
        {view==="day"&&(<><div style={dpHeader}><button style={navBtn(canPrev())} onClick={prevMonth} onMouseEnter={e=>{if(canPrev())e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="left"/></button><button style={titleBtn} onClick={()=>setView("month")} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{FULL_MONTH[viewMonth-1]} {viewYear} <Chev d="down"/></button><button style={navBtn(canNext())} onClick={nextMonth} onMouseEnter={e=>{if(canNext())e.currentTarget.style.background="rgba(255,255,255,0.05)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Chev d="right"/></button></div><div style={body}><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>{DAY_NAMES.map(n=>(<div key={n} style={{textAlign:"center",fontSize:11,fontWeight:500,color:n==="Sun"||n==="Sat"?"#162035":"#334d6e",padding:"4px 0",letterSpacing:"0.06em"}}>{n}</div>))}</div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>{calDays.map((day,i)=>{ if(!day)return <div key={`e-${i}`}/>; const key=toKey(viewYear,viewMonth,day); const isTrade=tradableSet.has(key); const isSel=key===selected; const isWeekend=new Date(viewYear,viewMonth-1,day).getDay()%6===0; return(<button key={key} onClick={()=>{if(isTrade){onChange(key);setOpen(false);}}} style={{height:32,borderRadius:6,border:"none",cursor:isTrade?"pointer":"default",fontFamily:"monospace",fontSize:12,fontWeight:isSel?600:400,background:isSel?C.blue:"transparent",color:isSel?"#fff":isTrade?C.textPrimary:isWeekend?"#162035":"#253660",transition:"all .1s",position:"relative"}} onMouseEnter={e=>{if(isTrade&&!isSel)e.currentTarget.style.background="rgba(255,255,255,0.06)";}} onMouseLeave={e=>{if(isTrade&&!isSel)e.currentTarget.style.background="transparent";}}>{day}{isTrade&&!isSel&&(<span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.blue}}/>)}</button>); })}</div></div></>)}
      </div>)}
    </div>
  );
});

// ─── SINGLE MARKET SELECT ─────────────────────────────────────────────────────
function SingleMarketSelect({ selected, onChange }) {
  const [open,setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn); },[]);
  const options = ["SET","MAI","SET&MAI"];
  return (
    <div ref={ref} style={{position:"relative",zIndex:150}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,padding:"0 12px",height:36,width:180,cursor:"pointer"}}>
        <IconLineChart/>
        <span style={{color:selected?C.textPrimary:C.textMuted,fontSize:13,flex:1,fontWeight:selected?600:400}}>{selected||"Select market..."}</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {selected&&selected!=="SET&MAI"&&(<div onMouseDown={e=>{e.preventDefault();e.stopPropagation();onChange("SET&MAI");}} style={{display:"flex",alignItems:"center",color:"#7a9cc4",cursor:"pointer"}}><IconX/></div>)}
          <div style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",display:"flex",alignItems:"center"}}><IconCaret/></div>
        </div>
      </div>
      {open&&(<div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,width:180,zIndex:200,boxShadow:"0 10px 25px -5px rgba(0,0,0,0.8)",padding:"6px 0"}}>
        {options.map(opt=>(<div key={opt} onMouseDown={e=>{e.preventDefault();onChange(opt);setOpen(false);}} style={{padding:"10px 16px",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:10,color:selected===opt?C.accent:"#9ab",background:selected===opt?C.accentBg:"transparent",transition:"background .1s"}} onMouseEnter={e=>{if(selected!==opt)e.currentTarget.style.background="rgba(26,39,68,0.8)";}} onMouseLeave={e=>{if(selected!==opt)e.currentTarget.style.background="transparent";}}><span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:selected===opt?C.accent:"#253660"}}/>{opt}</div>))}
      </div>)}
    </div>
  );
}

// ─── SECTOR MULTI-SELECT ──────────────────────────────────────────────────────
function SectorMultiSelect({ options, selected, onChange, max=10 }) {
  const [isOpen,setIsOpen] = useState(false);
  const [search,setSearch]  = useState("");
  const dropdownRef = useRef(null);
  useEffect(()=>{ function h(e){if(dropdownRef.current&&!dropdownRef.current.contains(e.target))setIsOpen(false);} document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const toggleOption=(opt)=>{ if(selected.includes(opt))onChange(selected.filter(i=>i!==opt)); else if(selected.length<max)onChange([...selected,opt]); };
  const filtered=options.filter(o=>o.includes(search.toUpperCase()));
  return (
    <div ref={dropdownRef} style={{position:"relative",zIndex:150}}>
      <div onClick={()=>setIsOpen(!isOpen)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,padding:"0 12px",height:36,width:220,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><IconLineChart/><span style={{color:selected.length>0?C.textPrimary:C.textMuted,fontSize:13}}>{selected.length>0?`${selected.length}/${max} Selected`:"Search sub-sector..."}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {selected.length>0&&(<div onClick={e=>{e.stopPropagation();onChange([]);}} style={{display:"flex",alignItems:"center",color:"#7a9cc4",cursor:"pointer"}}><IconX/></div>)}
          <div style={{transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",display:"flex",alignItems:"center"}}><IconCaret/></div>
        </div>
      </div>
      {isOpen&&(<div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,width:220,zIndex:150,boxShadow:"0 10px 25px -5px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column",maxHeight:280}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"#9ab",fontSize:13,fontWeight:500}}>{selected.length}/{max} Selected</span><div style={{transform:"rotate(180deg)",cursor:"pointer",color:"#7a9cc4",display:"flex",alignItems:"center"}} onClick={e=>{e.stopPropagation();setIsOpen(false);}}><IconCaret/></div></div>
        <div style={{padding:"8px 14px"}}><input autoFocus type="text" placeholder="Search symbol..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",background:C.inputBg,border:`1px solid ${C.border}`,color:"#fff",fontSize:12,padding:"6px",borderRadius:4,outline:"none"}}/></div>
        <div className="custom-scrollbar" style={{padding:"6px 0",overflowY:"auto",flex:1}}>
          {filtered.length===0?(<div style={{padding:"12px",color:C.textMuted,fontSize:12,textAlign:"center"}}>No match found</div>):filtered.map(opt=>{ const isSel=selected.includes(opt); const isDis=!isSel&&selected.length>=max; return(<label key={opt} style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:12,cursor:isDis?"not-allowed":"pointer",opacity:isDis?0.5:1,margin:0}} onMouseEnter={e=>{if(!isDis)e.currentTarget.style.background="rgba(26,39,68,0.8)";}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><input type="checkbox" checked={isSel} disabled={isDis} onChange={()=>!isDis&&toggleOption(opt)} style={{width:16,height:16,cursor:isDis?"not-allowed":"pointer"}}/><span style={{color:isSel?C.textPrimary:"#7a9cc4",fontSize:13,fontWeight:isSel?600:400}}>{opt}</span></label>); })}
        </div>
        {selected.length>0&&(<div style={{padding:"8px",borderTop:`1px solid ${C.border}`}}><button onClick={()=>onChange([])} style={{width:"100%",padding:"6px",fontSize:12,color:"#7a9cc4",background:"transparent",border:"none",cursor:"pointer",borderRadius:4}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(26,39,68,0.8)";e.currentTarget.style.color="#f87171";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#7a9cc4";}}>Clear Selection</button></div>)}
      </div>)}
    </div>
  );
}

// ─── LIGHTWEIGHT CHART HOOK ───────────────────────────────────────────────────
// scrollTarget: { goto: "first" | "last" | "date", tick: number }
function useLightweightChart({ sectorId, isUp, isExpanded, dateVal, scrollTarget }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const seriesData   = useMemo(() => genSeriesData(sectorId, 160), [sectorId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, { autoSize: true, ...buildChartOptions(isUp, isExpanded) });
    const series = chart.addSeries(LineSeries, buildSeriesOptions(isUp));
    series.setData(seriesData);

    if (!isExpanded && seriesData.length > 0) {
      const last = seriesData[seriesData.length - 1].time;
      const from = seriesData[Math.max(0, seriesData.length - 40)].time;
      chart.timeScale().setVisibleRange({ from, to: last });
    } else {
      chart.timeScale().fitContent();
    }
    chartRef.current  = chart;
    seriesRef.current = series;

    const hideAttr = () => {
      const attr = el.querySelector('a[href*="tradingview"]') || el.querySelector('.tv-lightweight-charts a');
      if (attr) attr.style.display = "none";
      const logo = el.querySelector('[class*="attribution"]');
      if (logo) logo.style.display = "none";
    };
    const timer = setTimeout(hideAttr, 100);

    return () => {
      clearTimeout(timer);
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorId, isUp, isExpanded]);

  // ── scroll effect reacts to scrollTarget changes ──
  useEffect(() => {
    if (!chartRef.current || !scrollTarget) return;
    const ts = chartRef.current.timeScale();
    try {
      if (scrollTarget.goto === "last") {
        // เลื่อนไปขวาสุด (ข้อมูลล่าสุด)
        ts.scrollToRealTime();
      } else if (scrollTarget.goto === "first") {
        // เลื่อนไปซ้ายสุด (ข้อมูลเก่าสุด) ด้วย scrollToPosition ที่ติดลบมากพอ
        ts.scrollToRealTime(); // reset ก่อน แล้ว scroll ไปซ้าย
        // คำนวณจาก logical index ของ bar แรก
        if (seriesData.length > 0) {
          const firstTs = seriesData[0].time;
          const coord = ts.timeToCoordinate(firstTs);
          if (coord !== null) {
            const logical = ts.coordinateToLogical(coord);
            if (logical !== null) {
              ts.scrollToPosition(logical - 5, false);
            }
          } else {
            // fallback: ถ้า coordinate เป็น null ให้ scroll ไปตำแหน่งติดลบมากพอ
            ts.scrollToPosition(-seriesData.length, false);
          }
        }
      } else if (scrollTarget.goto === "date") {
        // เลื่อนไปวันที่ที่เลือก
        ts.scrollToRealTime();
        const p = parseKey(dateVal);
        const targetTs = Math.floor(new Date(p.year, p.month - 1, p.day).getTime() / 1000);
        const coord = ts.timeToCoordinate(targetTs);
        if (coord !== null) {
          const logical = ts.coordinateToLogical(coord);
          if (logical !== null) ts.scrollToPosition(logical, false);
        }
      }
    } catch (_) {}
  }, [scrollTarget, seriesData]);

  return { containerRef, chartRef, seriesRef };
}

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function SectorMiniChart({ sectorId, isUp, isEmpty, isExpanded, dateVal, scrollTarget }) {
  const { containerRef } = useLightweightChart({ sectorId, isUp, isExpanded, dateVal, scrollTarget });
  if (isEmpty) return null;
  return <div ref={containerRef} style={{ width:"100%", height:"100%" }}/>;
}

// ─── EXPANDED CHART ───────────────────────────────────────────────────────────
function ExpandedChart({ sector, dateVal, tradingDates, onClose, onFirst, onLast, onSectorChange, scrollTarget }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm,   setSearchTerm  ] = useState("");

  const allSectors = useMemo(() => [...SET_SECTORS, ...MAI_SECTORS].map(s => s.id), []);
  const topFlowStock = useMemo(() => {
    const fs = sector.stocks.filter(s => s.hasFlow);
    if (!fs.length) return null;
    return fs.sort((a,b) => Math.abs(b.chg)-Math.abs(a.chg))[0];
  }, [sector]);

  const isUp = useMemo(() => {
    const d = genSeriesData(sector.id, 160);
    return d.length > 0 ? d[d.length-1].value >= d[0].value : true;
  }, [sector.id]);

  const { containerRef, chartRef } = useLightweightChart({
    sectorId: sector.id,
    isUp,
    isExpanded: true,
    dateVal,
    scrollTarget,
  });

  const handleFirst = () => { if (chartRef.current) chartRef.current.timeScale().scrollToRealTime(); onFirst?.(); };
  const handleLast  = () => { if (chartRef.current) chartRef.current.timeScale().scrollToRealTime(); onLast?.(); };

  const btnBase = { background:"transparent", border:`1px solid ${C.accentBorder}`, borderRadius:6, padding:"0 14px", height:30, fontSize:11, fontWeight:600, cursor:"pointer", color:C.accent, letterSpacing:".04em", transition:"all .15s", fontFamily:"inherit" };

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:C.pageBg,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:52,background:C.toolbarBg,borderBottom:`1px solid ${C.border}`,flexShrink:0,zIndex:20,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",height:32,color:"#7a9cc4",cursor:"pointer",fontSize:13,fontFamily:"inherit",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#334d6e";e.currentTarget.style.color=C.textPrimary;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color="#7a9cc4";}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
            back
          </button>

          <div style={{position:"relative"}}>
            <div onClick={()=>setShowDropdown(true)} style={{display:"flex",alignItems:"center",gap:8,background:C.inputBg,padding:"0 12px",height:32,borderRadius:6,minWidth:160,cursor:"text",border:`1px solid ${C.borderHover}`}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              {showDropdown?(
                <input autoFocus type="text" placeholder="Search sector..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onBlur={()=>setTimeout(()=>setShowDropdown(false),200)} style={{background:"transparent",border:"none",color:"#fff",outline:"none",width:"100%",fontSize:13}}/>
              ):(
                <span style={{color:"#fff",fontWeight:"bold",fontSize:13,flex:1}}>{sector.id}</span>
              )}
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                {showDropdown&&searchTerm&&(<div onMouseDown={e=>{e.preventDefault();e.stopPropagation();setSearchTerm("");}} style={{cursor:"pointer",color:"#7a9cc4",display:"flex"}}><IconX/></div>)}
                <div style={{transform:showDropdown?"rotate(180deg)":"none",transition:"transform .2s",display:"flex"}}><IconCaret/></div>
              </div>
            </div>
            {showDropdown&&(
              <div className="custom-scrollbar" style={{position:"absolute",top:"100%",left:0,marginTop:4,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,width:"100%",zIndex:150,boxShadow:"0 10px 25px -5px rgba(0,0,0,0.8)",maxHeight:260,overflowY:"auto"}}>
                {allSectors.filter(id=>id.toLowerCase().includes(searchTerm.toLowerCase())).map(id=>(
                  <div key={id} onMouseDown={e=>{e.preventDefault();onSectorChange?.(id);setShowDropdown(false);setSearchTerm("");}}
                    style={{padding:"8px 14px",cursor:"pointer",fontSize:13,color:sector.id===id?C.accent:"#9ab",fontWeight:sector.id===id?"bold":"normal",background:sector.id===id?C.accentBg:"transparent"}}
                    onMouseEnter={e=>{if(sector.id!==id)e.currentTarget.style.background="rgba(26,39,68,0.8)";}}
                    onMouseLeave={e=>{if(sector.id!==id)e.currentTarget.style.background="transparent";}}>
                    {id}
                  </div>
                ))}
                {!allSectors.filter(id=>id.toLowerCase().includes(searchTerm.toLowerCase())).length&&(
                  <div style={{padding:"10px 14px",color:C.textMuted,fontSize:13,textAlign:"center"}}>No sectors found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{fontSize:15,fontWeight:"bold",color:"#fff",letterSpacing:"1px",flexShrink:0}}>{sector.id}</div>

        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,justifyContent:"flex-end"}}>
          {topFlowStock&&(
            <span style={{display:"inline-flex",alignItems:"center",gap:5,background:topFlowStock.chg>=0?C.greenBg:C.yellowBg,border:`1px solid ${topFlowStock.chg>=0?C.greenBorder:C.yellowBorder}`,color:topFlowStock.chg>=0?"#4ade80":"#fbbf24",fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:99}}>
              {topFlowStock.sym}<span style={{fontSize:10}}>{topFlowStock.chg>=0?"▲":"▼"}</span>
            </span>
          )}
          <button onClick={handleFirst} style={btnBase} onMouseEnter={e=>e.currentTarget.style.background=C.accentBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>FIRST DATA</button>
          <button onClick={handleLast}  style={btnBase} onMouseEnter={e=>e.currentTarget.style.background=C.accentBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>LAST DATA</button>
          <button onClick={handleLast} style={{width:30,height:30,borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMuted,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#334d6e";e.currentTarget.style.color=C.textPrimary;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;}}>
            <IconRefresh/>
          </button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden",padding:16,gap:16}}>
        <div ref={containerRef} style={{flex:1,background:C.panelBg,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",minHeight:300}}/>
        <div style={{width:140,display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
          <div style={{color:C.yellow,fontSize:12,fontWeight:700,textAlign:"center",letterSpacing:"0.5px",paddingBottom:4,borderBottom:`1px solid ${C.border}`}}>Symbol In Sector</div>
          <div className="custom-scrollbar" style={{display:"flex",flexDirection:"column",gap:4,overflowY:"auto",flex:1,paddingRight:2}}>
            {sector.stocks.map(st=>(
              <div key={st.sym} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(22,32,53,0.7)",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",gap:6}}>
                {st.hasFlow?(<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:st.chg>=0?C.green:"#f59e0b",color:"#fff",lineHeight:1,flexShrink:0}}>Flow</span>):(<span style={{width:28,flexShrink:0}}/>)}
                <span style={{fontSize:12,fontWeight:600,color:st.hasFlow?C.textPrimary:"#7a9cc4",textAlign:"right",flex:1}}>{st.sym}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STOCK DETAIL CARD ──────────────────────────────────────────────────
function StockDetailCard() {
  return (
    <div style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, display:"flex", flexDirection:"column", minHeight:280 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
        <span style={{ color:C.textMuted, fontSize:13, fontWeight:500 }}>Symbol...</span>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ background:"transparent", border:"none", color:C.textMuted, cursor:"pointer", padding:2 }}><IconSearchZoom/></button>
          <button style={{ background:"transparent", border:"none", color:C.textMuted, cursor:"pointer", padding:2 }}><IconRefresh/></button>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
        <svg width="40" height="32" viewBox="0 0 24 24" fill="#172236">
          <rect x="2" y="4" width="20" height="4" rx="1"/>
          <rect x="2" y="12" width="20" height="4" rx="1"/>
          <rect x="2" y="20" width="14" height="4" rx="1"/>
        </svg>
        <span style={{ color:"#253a60", fontSize:16, fontWeight:500 }}>Please select a stock.</span>
      </div>
    </div>
  );
}

// ─── SECTOR CARD ──────────────────────────────────────────────────────────────
function SectorCard({ sector, isExpanded, onExpand, onCollapse, dateVal, scrollTarget, onReset }) {
  const isEmpty = sector.stocks.length === 0;
  const top  = getTopBadge(sector.stocks);
  const isUp = top ? top.isUp : true;

  return (
    <div
      style={{
        background:C.cardBg, border:isExpanded?"none":`1px solid ${C.border}`, borderRadius:8,
        display:"flex", flexDirection:"column",
        position:isExpanded?"absolute":"relative",
        inset:isExpanded?0:"auto",
        height:isExpanded?"100%":"auto",
        minHeight:isExpanded?"100%":280,
        transition:"border-color .2s",
      }}
      onMouseEnter={e=>{if(!isExpanded)e.currentTarget.style.borderColor=C.borderHover;}}
      onMouseLeave={e=>{if(!isExpanded)e.currentTarget.style.borderColor=C.border;}}
    >
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,marginBottom:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",overflow:"hidden"}}>
          <span style={{fontSize:isExpanded?24:14,fontWeight:600,color:C.textMuted,letterSpacing:".05em",whiteSpace:"nowrap"}}>{sector.label}</span>
          {top&&(<span style={{fontSize:isExpanded?14:10,fontWeight:700,padding:isExpanded?"2px 12px":"1px 8px",borderRadius:12,border:`1px solid ${top.color}`,color:top.color,display:"flex",alignItems:"center",gap:4}}>{top.sym} <span style={{fontSize:isExpanded?12:9}}>{top.arrow}</span></span>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          {isExpanded?(
            <button onClick={onCollapse} style={{background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",padding:4}}><IconX/></button>
          ):(
            <button onClick={onExpand} style={{background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",padding:2}}><IconSearchZoom/></button>
          )}
          <button onClick={onReset} style={{background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",padding:2}}><IconRefresh/></button>
        </div>
      </div>

      {isEmpty ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:14,color:"rgba(74,96,128,0.6)",marginBottom:20}}>{sector.label}: ไม่มีข้อมูล</span>
        </div>
      ) : (
        <div style={{display:"flex",height:220}}>
          <div style={{flex:1,minWidth:0,height:220}}>
            <SectorMiniChart
              sectorId={sector.id}
              isUp={isUp}
              isEmpty={isEmpty}
              isExpanded={isExpanded}
              dateVal={dateVal}
              scrollTarget={scrollTarget}
            />
          </div>
          <div style={{
            width:60,
            flexShrink:0,
            display:"flex",flexDirection:"column",justifyContent:"space-around",
            padding:"6px 4px 20px 2px",
            pointerEvents:"none",
          }}>
            {sector.stocks.map(st=>(
              <div key={st.sym} style={{display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:3}}>
                {st.hasFlow&&(
                  <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:st.chg>=0?C.green:"#f59e0b",color:"#000",lineHeight:"14px",flexShrink:0}}>Flow</span>
                )}
                <span style={{
                  fontSize:11,
                  fontWeight:600,
                  color:st.hasFlow?C.textPrimary:C.textMuted,
                  textAlign:"right",
                  whiteSpace:"nowrap",
                  textShadow:"0 1px 4px rgba(0,0,0,0.9)",
                }}>{st.sym}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function SectorRotation() {
  const [selectedSectors,   setSelectedSectors  ] = useState([]);
  const [expandedSectorId,  setExpandedSectorId ] = useState(null);
  const [marketFilter,      setMarketFilter     ] = useState("SET");
  const [marketDropdownOpen,setMarketDropdownOpen] = useState(false);
  const [subMarketFilter,   setSubMarketFilter  ] = useState("");
  const [layoutMode,        setLayoutMode       ] = useState(29);
  const marketDropdownRef = useRef(null);

  const tradingDates    = useMemo(()=>getTradingDates(),[]);
  const defaultLastData = tradingDates[tradingDates.length-1];
  const [dateVal,setDateVal] = useState(defaultLastData);

  // ── scrollTarget แทน resetTick ──────────────────────────────────────────────
  // goto: "first" | "last" | "date"   tick: เปลี่ยนทุกครั้งเพื่อ trigger useEffect
  const [scrollTarget, setScrollTarget] = useState(null);

  useEffect(()=>{
    function h(e){ if(marketDropdownRef.current&&!marketDropdownRef.current.contains(e.target)) setMarketDropdownOpen(false); }
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleGoToFirst = useCallback(() => {
    setDateVal(tradingDates[0]);
    setScrollTarget({ goto: "first", tick: Date.now() });
  }, [tradingDates]);

  const handleGoToLast = useCallback(() => {
    setDateVal(defaultLastData);
    setScrollTarget({ goto: "last", tick: Date.now() });
  }, [defaultLastData]);

  const handleMarketChange=(opt)=>{
    setMarketFilter(opt); setMarketDropdownOpen(false); setSelectedSectors([]); setSubMarketFilter("");
    if(opt==="SET")     setLayoutMode(29);
    if(opt==="MAI")     setLayoutMode(8);
    if(opt==="SET&MAI") setLayoutMode(2);
  };

  const handleLayoutChange=(mode)=>{
    setLayoutMode(mode); setSelectedSectors([]);
    if(mode===29) setMarketFilter("SET");
    if(mode===8)  setMarketFilter("MAI");
    if(mode===2)  setMarketFilter("SET&MAI");
  };

  const availableSectors = useMemo(()=>{
    if(marketFilter==="SET") return SET_SECTORS.map(s=>s.label);
    if(marketFilter==="MAI") return MAI_SECTORS.map(s=>s.label);
    return [];
  },[marketFilter]);

  const visibleData = useMemo(()=>{
    let data=[];
    if(marketFilter==="SET") data=SET_SECTORS;
    else if(marketFilter==="MAI") data=MAI_SECTORS;
    if(selectedSectors.length>0) data=data.filter(sec=>selectedSectors.includes(sec.label));
    return data;
  },[marketFilter,selectedSectors]);

  const gridTemplate = useMemo(()=>{
    if(layoutMode===29) return "repeat(auto-fit, minmax(max(30%, 300px), 1fr))";
    if(layoutMode===8)  return "repeat(auto-fit, minmax(max(45%, 450px), 1fr))";
    if(layoutMode===2)  return "repeat(1, 1fr)";
    return "repeat(auto-fit, minmax(max(30%, 300px), 1fr))";
  },[layoutMode]);

  const boxStyle = { display:"flex",alignItems:"center",gap:8,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:6,padding:"0 12px",height:36,position:"relative",cursor:"pointer" };
  const btnStyle = (active)=>({ background:active?"rgba(37,54,96,0.8)":"transparent",border:`1px solid ${C.border}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",height:34,width:34,cursor:"pointer",color:active?C.textPrimary:C.textMuted,transition:"all .15s" });
  const dataBtn  = (label,onClick)=>(
    <button key={label} onClick={onClick}
      style={{background:"transparent",border:`1px solid ${C.accentBorder}`,borderRadius:4,padding:"0 14px",height:34,fontSize:11,fontWeight:600,cursor:"pointer",color:C.accent,letterSpacing:".04em",transition:"all .15s"}}
      onMouseEnter={e=>e.currentTarget.style.background=C.accentBg}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{label}</button>
  );

  return (
    <div style={{background:"transparent",color:C.textPrimary,fontFamily:"ui-sans-serif,system-ui,sans-serif",minHeight:"100%",padding:"20px"}}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #1e3050; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #253a60; }
        .tv-lightweight-charts a,
        a[href*="tradingview"],
        [class*="watermark"],
        [class*="attribution"] { display: none !important; }
      `}</style>

      {/* Toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div ref={marketDropdownRef} style={{...boxStyle,minWidth:220}} onClick={()=>setMarketDropdownOpen(!marketDropdownOpen)}>
              <IconSearch/>
              <span style={{color:C.textPrimary,fontSize:13,flex:1,fontWeight:"bold"}}>{marketFilter==="SET&MAI"?"SET & MAI":marketFilter}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {marketFilter!=="SET"&&(<div style={{display:"flex",alignItems:"center",cursor:"pointer",color:"#7a9cc4"}} onClick={e=>{e.stopPropagation();handleMarketChange("SET");}}><IconX/></div>)}
                <div style={{transform:marketDropdownOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",display:"flex",alignItems:"center"}}><IconCaret/></div>
              </div>
              {marketDropdownOpen&&(
                <div className="custom-scrollbar" style={{position:"absolute",top:"100%",left:0,marginTop:4,background:C.dropdownBg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 0",width:"100%",zIndex:200,boxShadow:"0 10px 25px -5px rgba(0,0,0,0.8)"}}>
                  {["SET","MAI","SET&MAI"].map(opt=>(<div key={opt} onMouseDown={e=>{e.preventDefault();e.stopPropagation();handleMarketChange(opt);}} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:12,fontSize:13,color:opt===marketFilter?C.textPrimary:"#7a9cc4",fontWeight:opt===marketFilter?"bold":"normal",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(26,39,68,0.8)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{width:6,height:6,borderRadius:"50%",background:marketFilter===opt?C.blue:"#253660"}}/>{opt==="SET&MAI"?"SET & MAI":opt}</div>))}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:4}}>
              {[29,8,2].map(col=>(<button key={col} onClick={()=>handleLayoutChange(col)} style={btnStyle(layoutMode===col)}>{col===29?<IconGrid3x3/>:col===8?<IconGrid2x2/>:<IconList/>}</button>))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",marginLeft:40}}>
            {marketFilter==="SET&MAI"?(
              <SingleMarketSelect selected={subMarketFilter} onChange={setSubMarketFilter}/>
            ):(
              <SectorMultiSelect options={availableSectors} selected={selectedSectors} onChange={setSelectedSectors} max={marketFilter==="MAI"?8:layoutMode}/>
            )}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"flex-end"}}>
          <div style={{display:"flex",gap:8}}>
            {dataBtn("FIRST DATA", handleGoToFirst)}
            {dataBtn("LAST DATA",  handleGoToLast)}
          </div>
          <DatePicker dates={tradingDates} selected={dateVal} onChange={(key) => {
            setDateVal(key);
            setScrollTarget({ goto: "date", tick: Date.now() });
          }}/>
        </div>
      </div>

      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:gridTemplate,gap:20,transition:"all 0.3s ease"}}>
        {marketFilter==="SET&MAI"?(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {(subMarketFilter==="SET"||subMarketFilter==="SET&MAI")&&(
              <SectorCard key={SET_SUMMARY.id} sector={SET_SUMMARY} dateVal={dateVal} scrollTarget={scrollTarget}
                onExpand={()=>setExpandedSectorId(SET_SUMMARY.id)}
                onReset={handleGoToLast}/>
            )}
            <StockDetailCard/>
            {(subMarketFilter==="MAI"||subMarketFilter==="SET&MAI")&&(
              <SectorCard key={MAI_SUMMARY.id} sector={MAI_SUMMARY} dateVal={dateVal} scrollTarget={scrollTarget}
                onExpand={()=>setExpandedSectorId(MAI_SUMMARY.id)}
                onReset={handleGoToLast}/>
            )}
          </div>
        ):(
          visibleData.map(sec=>(
            <SectorCard key={sec.id} sector={sec} dateVal={dateVal} scrollTarget={scrollTarget}
              onExpand={()=>setExpandedSectorId(sec.id)}
              onReset={handleGoToLast}/>
          ))
        )}
        {marketFilter!=="SET&MAI"&&visibleData.length===0&&(
          <div style={{gridColumn:"1 / -1",textAlign:"center",padding:"60px 0",color:C.textMuted}}>
            <span style={{fontSize:32,display:"block",marginBottom:10}}>🔍</span>ไม่พบข้อมูล
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {expandedSectorId&&(()=>{
        const sec=[...SET_SECTORS,...MAI_SECTORS,SET_SUMMARY,MAI_SUMMARY].find(s=>s.id===expandedSectorId);
        if(!sec) return null;
        return(
          <ExpandedChart
            sector={sec}
            dateVal={dateVal}
            tradingDates={tradingDates}
            scrollTarget={scrollTarget}
            onClose={()=>setExpandedSectorId(null)}
            onFirst={handleGoToFirst}
            onLast={handleGoToLast}
            onSectorChange={setExpandedSectorId}
          />
        );
      })()}
    </div>
  );
}

export default function App() {
  return <SectorRotation />;
}