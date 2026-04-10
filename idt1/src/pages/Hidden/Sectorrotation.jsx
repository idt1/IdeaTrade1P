import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ToolHint from "@/components/ToolHint.jsx";

// ─── DATA (SET & MAI) ────────────────────────────────────────────────────────
const SET_SECTORS = [
    { id: "AGRI", label: "AGRI", stocks: [{ sym: "STA", chg: +0.80, hasFlow: false }, { sym: "EE", chg: -0.40, hasFlow: false }, { sym: "GFPT", chg: +1.20, hasFlow: true }, { sym: "PCE", chg: -0.20, hasFlow: false }, { sym: "VPO", chg: +0.55, hasFlow: false }] },
    { id: "AUTO", label: "AUTO", stocks: [{ sym: "MGC", chg: +0.30, hasFlow: false }, { sym: "NEX", chg: +2.10, hasFlow: true }, { sym: "POLY", chg: -0.60, hasFlow: false }, { sym: "SAT", chg: +0.10, hasFlow: false }, { sym: "AH", chg: -0.30, hasFlow: false }] },
    { id: "BANK", label: "BANK", stocks: [{ sym: "KBANK", chg: -1.45, hasFlow: false }, { sym: "SCB", chg: +0.63, hasFlow: true }, { sym: "KTB", chg: +0.32, hasFlow: false }, { sym: "BBL", chg: +1.50, hasFlow: true }, { sym: "TTB", chg: -0.10, hasFlow: false }, { sym: "CREDIT", chg: +0.50, hasFlow: false }] },
    { id: "COMM", label: "COMM", stocks: [{ sym: "CPALL", chg: -0.67, hasFlow: false }, { sym: "CRC", chg: +0.80, hasFlow: true }, { sym: "HMPRO", chg: -0.20, hasFlow: false }, { sym: "COM7", chg: +1.10, hasFlow: true }, { sym: "BJC", chg: -0.40, hasFlow: false }] },
    { id: "CONMAT", label: "CONMAT", stocks: [{ sym: "SCC", chg: -2.10, hasFlow: false }, { sym: "TOA", chg: +1.50, hasFlow: true }, { sym: "TASCO", chg: +0.30, hasFlow: false }, { sym: "SCCC", chg: -0.80, hasFlow: false }, { sym: "EPG", chg: +0.20, hasFlow: false }] },
    { id: "CONS", label: "CONS", stocks: [{ sym: "CK", chg: +0.40, hasFlow: false }, { sym: "STEC", chg: -0.30, hasFlow: false }, { sym: "ITD", chg: -0.50, hasFlow: false }, { sym: "TEAMG", chg: +1.80, hasFlow: true }, { sym: "TRC", chg: +0.70, hasFlow: false }] },
    { id: "ENERG", label: "ENERG", stocks: [{ sym: "PTT", chg: +1.24, hasFlow: false }, { sym: "PTTEP", chg: +0.50, hasFlow: false }, { sym: "EA", chg: -0.88, hasFlow: true }, { sym: "TOP", chg: +2.11, hasFlow: true }, { sym: "GULF", chg: +0.90, hasFlow: false }, { sym: "BANPU", chg: -0.60, hasFlow: false }] },
    { id: "ETRON", label: "ETRON", stocks: [{ sym: "DELTA", chg: +3.72, hasFlow: true }, { sym: "KCE", chg: +1.50, hasFlow: true }, { sym: "HANA", chg: -0.40, hasFlow: false }, { sym: "CCET", chg: +0.80, hasFlow: false }, { sym: "SVI", chg: -0.20, hasFlow: false }] },
    { id: "FASHION", label: "FASHION", stocks: [{ sym: "SABINA", chg: +1.10, hasFlow: true }, { sym: "PAF", chg: +1.30, hasFlow: false }, { sym: "AURA", chg: -0.20, hasFlow: false }, { sym: "MC", chg: +0.40, hasFlow: false }, { sym: "CPH", chg: +0.60, hasFlow: false }, { sym: "CPL", chg: +0.40, hasFlow: false }, { sym: "WFX", chg: -0.10, hasFlow: false }] },
    { id: "FIN", label: "FIN", stocks: [{ sym: "KTC", chg: +0.80, hasFlow: false }, { sym: "MTC", chg: +1.60, hasFlow: true }, { sym: "TIDLOR", chg: +0.50, hasFlow: false }, { sym: "SAWAD", chg: -1.20, hasFlow: false }, { sym: "AEON", chg: -0.30, hasFlow: false }] },
    { id: "FOOD", label: "FOOD", stocks: [{ sym: "CPF", chg: -0.50, hasFlow: false }, { sym: "MINT", chg: +1.12, hasFlow: false }, { sym: "OSP", chg: +0.70, hasFlow: true }, { sym: "CBG", chg: -0.40, hasFlow: false }, { sym: "OISHI", chg: +0.20, hasFlow: false }] },
    { id: "HELTH", label: "HELTH", stocks: [{ sym: "BDMS", chg: +0.95, hasFlow: false }, { sym: "BCH", chg: +1.40, hasFlow: true }, { sym: "CHG", chg: -0.30, hasFlow: false }, { sym: "PR9", chg: +0.80, hasFlow: false }, { sym: "RJH", chg: +0.60, hasFlow: false }] },
    { id: "HOME", label: "HOME", stocks: [{ sym: "ILM", chg: +0.45, hasFlow: false }, { sym: "MODERN", chg: -0.10, hasFlow: false }, { sym: "DCON", chg: +0.00, hasFlow: false }] },
    { id: "ICT", label: "ICT", stocks: [{ sym: "ADVANC", chg: +2.50, hasFlow: true }, { sym: "TRUE", chg: +1.20, hasFlow: false }, { sym: "INTUCH", chg: +0.75, hasFlow: false }, { sym: "JMART", chg: -1.40, hasFlow: false }] },
    { id: "IMM", label: "IMM", stocks: [{ sym: "IND", chg: -0.20, hasFlow: false }, { sym: "PROUD", chg: +0.15, hasFlow: false }] },
    { id: "INSUR", label: "INSUR", stocks: [{ sym: "TLI", chg: +0.40, hasFlow: false }, { sym: "BLA", chg: -0.60, hasFlow: false }, { sym: "THREL", chg: +1.10, hasFlow: true }] },
    { id: "MEDIA", label: "MEDIA", stocks: [{ sym: "PLANB", chg: +1.30, hasFlow: true }, { sym: "VGI", chg: -0.80, hasFlow: false }, { sym: "BEC", chg: +0.20, hasFlow: false }, { sym: "ONEE", chg: -0.40, hasFlow: false }] },
    { id: "MINE", label: "MINE", stocks: [{ sym: "THL", chg: +0.00, hasFlow: false }] },
    { id: "PAPER", label: "PAPER", stocks: [{ sym: "UTP", chg: +0.60, hasFlow: false }] },
    { id: "PERSON", label: "PERSON", stocks: [{ sym: "STGT", chg: -1.50, hasFlow: false }, { sym: "TOG", chg: +0.70, hasFlow: true }] },
    { id: "PETRO", label: "PETRO", stocks: [{ sym: "IVL", chg: +1.80, hasFlow: true }, { sym: "PTTGC", chg: +0.40, hasFlow: false }, { sym: "IRPC", chg: -0.20, hasFlow: false }] },
    { id: "PF&REIT", label: "PF&REIT", stocks: [] },
    { id: "PKG", label: "PKG", stocks: [{ sym: "SCGP", chg: +1.25, hasFlow: true }, { sym: "BGC", chg: -0.30, hasFlow: false }, { sym: "SFLEX", chg: +0.50, hasFlow: false }] },
    { id: "PROF", label: "PROF", stocks: [{ sym: "SISB", chg: +2.10, hasFlow: true }] },
    { id: "PROP", label: "PROP", stocks: [{ sym: "CPN", chg: +1.50, hasFlow: false }, { sym: "SIRI", chg: +0.60, hasFlow: true }, { sym: "AP", chg: -0.40, hasFlow: false }, { sym: "SPALI", chg: +0.30, hasFlow: false }, { sym: "WHA", chg: +1.10, hasFlow: true }] },
    { id: "REHABCO", label: "REHABCO", stocks: [{ sym: "THAI", chg: +0.00, hasFlow: false }] },
    { id: "STEEL", label: "STEEL", stocks: [{ sym: "TMT", chg: +0.20, hasFlow: false }, { sym: "AMC", chg: -0.10, hasFlow: false }, { sym: "PERMAC", chg: +0.40, hasFlow: false }] },
    { id: "TOURISM", label: "TOURISM", stocks: [{ sym: "CENTEL", chg: +1.40, hasFlow: true }, { sym: "ERW", chg: +0.80, hasFlow: false }, { sym: "SHR", chg: -0.30, hasFlow: false }] },
    { id: "TRANS", label: "TRANS", stocks: [{ sym: "AOT", chg: +1.20, hasFlow: true }, { sym: "BEM", chg: +0.50, hasFlow: false }, { sym: "BTS", chg: -0.40, hasFlow: false }, { sym: "PSL", chg: +1.80, hasFlow: true }, { sym: "RCL", chg: -0.70, hasFlow: false }] },
].map(s => ({ ...s, market: "SET" }));

const MAI_SECTORS = [
    { id: "AGRO", label: "AGRO", stocks: [{ sym: "SUN", chg: +1.20, hasFlow: true }, { sym: "TMILL", chg: -0.40, hasFlow: false }, { sym: "XO", chg: +2.50, hasFlow: true }, { sym: "TACC", chg: +0.30, hasFlow: false }] },
    { id: "CONSUMP", label: "CONSUMP", stocks: [{ sym: "DOD", chg: -1.10, hasFlow: false }, { sym: "JDF", chg: +0.20, hasFlow: false }, { sym: "STC", chg: -0.50, hasFlow: false }, { sym: "TMI", chg: -0.10, hasFlow: false }] },
    { id: "FINCIAL", label: "FINCIAL", stocks: [{ sym: "MICRO", chg: +0.80, hasFlow: true }, { sym: "LIT", chg: -0.20, hasFlow: false }, { sym: "GCAP", chg: +0.10, hasFlow: false }, { sym: "CHAYO", chg: +1.50, hasFlow: true }] },
    { id: "INDUS", label: "INDUS", stocks: [{ sym: "PIMO", chg: -0.80, hasFlow: false }, { sym: "FPI", chg: +0.40, hasFlow: false }, { sym: "TNDT", chg: -0.30, hasFlow: false }, { sym: "COLOR", chg: -0.10, hasFlow: false }] },
    { id: "PROPCON", label: "PROPCON", stocks: [{ sym: "CHEWA", chg: +0.50, hasFlow: true }, { sym: "PPS", chg: -0.20, hasFlow: false }, { sym: "THANA", chg: +0.80, hasFlow: false }, { sym: "ARIN", chg: +0.10, hasFlow: false }] },
    { id: "RESOURC", label: "RESOURC", stocks: [{ sym: "QTC", chg: -0.60, hasFlow: false }, { sym: "UAC", chg: +0.20, hasFlow: false }, { sym: "AKP", chg: -1.20, hasFlow: false }, { sym: "TAE", chg: -0.10, hasFlow: false }] },
    { id: "SERVICE", label: "SERVICE", stocks: [{ sym: "SPA", chg: +1.80, hasFlow: true }, { sym: "AUCT", chg: +0.90, hasFlow: true }, { sym: "MASTER", chg: +2.10, hasFlow: true }, { sym: "WARRIX", chg: -0.40, hasFlow: false }] },
    { id: "TECH", label: "TECH", stocks: [{ sym: "BBIK", chg: -2.50, hasFlow: false }, { sym: "BE8", chg: -1.80, hasFlow: false }, { sym: "IIG", chg: -0.90, hasFlow: false }, { sym: "DITTO", chg: -1.20, hasFlow: false }, { sym: "SECURE", chg: +0.50, hasFlow: false }, { sym: "YGG", chg: -0.30, hasFlow: false }] },
].map(s => ({ ...s, market: "MAI" }));

const SET_SUMMARY = {
    id: "SET_ALL",
    label: "SET (Overall)",
    market: "SET",
    stocks: SET_SECTORS.flatMap(s => s.stocks).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 5)
};

const MAI_SUMMARY = {
    id: "MAI_ALL",
    label: "MAI (Overall)",
    market: "MAI",
    stocks: MAI_SECTORS.flatMap(s => s.stocks).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 5)
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function hashSym(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0); }
    return h;
}

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s += 0x6d2b79f5; let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function genSectorData(id, n = 35) {
    const r = rng(hashSym(id));
    const trend = (r() - 0.48) * 3.5;
    let cum = 0, mom = 0;
    const vals = [];
    for (let i = 0; i < n; i++) {
        mom = mom * 0.8 + (r() - 0.5) * 1.5;
        cum += (trend + mom) * (1 + r() * 0.3);
        vals.push(Math.round(cum * 100));
    }
    return vals;
}

function getTopBadge(stocks) {
    if (!stocks || stocks.length === 0) return null;
    const top = [...stocks].sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))[0];
    const isUp = top.chg >= 0;
    const color = isUp ? "#4ade80" : "#facc15";
    const bg = isUp ? "rgba(74,222,128,.15)" : "rgba(250,204,21,.15)";
    const arrow = isUp ? "▲" : "▼";
    return { sym: top.sym, color, bg, arrow, isUp };
}

function useWindowWidth() {
    const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return w;
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
const IconCaret = () => <svg width="10" height="6" viewBox="0 0 10 6" fill="#475569"><path d="M5 6L0 0h10z" /></svg>;
const IconLineChart = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>;
const IconCalendar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconQuestion = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IconSearchZoom = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>;
const IconRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>;
const IconGrid3x3 = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="4" rx="1" /><rect x="10" y="3" width="4" height="4" rx="1" /><rect x="17" y="3" width="4" height="4" rx="1" /><rect x="3" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="17" y="10" width="4" height="4" rx="1" /><rect x="3" y="17" width="4" height="4" rx="1" /><rect x="10" y="17" width="4" height="4" rx="1" /><rect x="17" y="17" width="4" height="4" rx="1" /></svg>;
const IconGrid2x2 = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
const IconList = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="3" rx="1" /><rect x="3" y="15" width="18" height="3" rx="1" /></svg>;
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;

/* ================= DATE HELPERS ================= */
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

/* ================= DATE PICKER ================= */
const DatePicker = memo(({ dates, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState("day");
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const ref = useRef(null);

    const FULL_MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const initView = useMemo(() => {
        if (selected && selected.includes("/")) { const p = parseKey(selected); return { month: p.month, year: p.year }; }
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
        position: "fixed", top: popupPos.top, left: popupPos.left, zIndex: 9999,
        width: 252, background: "#0f172a",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)", fontFamily: "monospace",
        overflow: "hidden", maxHeight: `calc(100vh - ${popupPos.top}px - 8px)`, overflowY: "auto",
    };
    const dpHeader = {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)",
    };
    const navBtn = (active) => ({
        width: 26, height: 26, borderRadius: 5, border: "none", background: "transparent",
        color: active ? "#94a3b8" : "#1e293b", cursor: active ? "pointer" : "default",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "background .1s",
    });
    const titleBtn = {
        background: "transparent", border: "none", cursor: "pointer",
        color: "#e2e8f0", fontSize: 13, fontWeight: 500, fontFamily: "monospace",
        letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 3,
        padding: "4px 8px", borderRadius: 5,
    };
    const body = { padding: "8px 12px 10px" };
    const footer = {
        borderTop: "1px solid rgba(255,255,255,0.07)", padding: "6px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
    };
    const Chev = ({ d }) => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {d === "left" && <polyline points="15 18 9 12 15 6" />}
            {d === "right" && <polyline points="9 18 15 12 9 6" />}
            {d === "down" && <polyline points="6 9 12 15 18 9" />}
        </svg>
    );

    return (
        <div ref={ref} style={{ flexShrink: 0 }}>
            <button onClick={() => {
                if (!open && selected && selected.includes("/")) { const p = parseKey(selected); setViewMonth(p.month); setViewYear(p.year); }
                if (!open && ref.current) {
                    const rect = ref.current.getBoundingClientRect();
                    const POPUP_W = 252;
                    const clampedLeft = Math.min(rect.left, window.innerWidth - POPUP_W - 8);
                    const clampedTop = Math.min(rect.bottom + 8, window.innerHeight - 8);
                    setPopupPos({ top: clampedTop, left: Math.max(8, clampedLeft) });
                }
                setOpen(o => !o); setView("day");
            }} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "0 12px", height: 36,
                background: open ? "rgba(59,130,246,0.15)" : "#0d1520",
                border: `1px solid ${open ? "rgba(59,130,246,0.5)" : "rgba(51,65,85,0.6)"}`,
                borderRadius: 8, cursor: "pointer", color: "#e2e8f0", fontSize: 13, fontWeight: 500,
                fontFamily: "monospace", transition: "all .15s",
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDisplay(selected)}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: .6, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", marginLeft: 4 }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div style={popup}>
                    {view === "year" && (<>
                        <div style={dpHeader}>
                            <button style={navBtn(decadeStart > (availableYears[0] ?? 2025))} onClick={() => setViewYear(decadeStart - 1)}
                                onMouseEnter={e => { if (decadeStart > (availableYears[0] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="left" />
                            </button>
                            <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>
                                {decadeStart} – {decadeStart + 9}
                            </span>
                            <button style={navBtn(decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025))} onClick={() => setViewYear(decadeStart + 10)}
                                onMouseEnter={e => { if (decadeStart + 9 < (availableYears[availableYears.length - 1] ?? 2025)) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <Chev d="right" />
                            </button>
                        </div>
                        <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                            {decadeYears.map(yr => {
                                const avail = availableYears.includes(yr);
                                const isCur = yr === viewYear;
                                const isOut = yr < decadeStart || yr > decadeStart + 9;
                                return (
                                    <button key={yr} onClick={() => { if (avail) { setViewYear(yr); setView("month"); } }}
                                        style={{
                                            height: 36, borderRadius: 6, border: "none",
                                            cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                                            fontSize: 13, fontWeight: isCur ? 600 : 400,
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
                        <div style={{ ...body, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                            {SHORT_MONTH.map((m, idx) => {
                                const mNum = idx + 1;
                                const avail = availableMonths.has(mNum);
                                const isCur = mNum === viewMonth;
                                return (
                                    <button key={m} onClick={() => { if (avail) { setViewMonth(mNum); setView("day"); } }}
                                        style={{
                                            height: 38, borderRadius: 6, border: "none",
                                            cursor: avail ? "pointer" : "default", fontFamily: "monospace",
                                            fontSize: 13, fontWeight: isCur ? 600 : 400,
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
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                                {DAY_NAMES.map(n => (
                                    <div key={n} style={{
                                        textAlign: "center", fontSize: 11, fontWeight: 500,
                                        color: n === "Sun" || n === "Sat" ? "#1e3a5f" : "#475569",
                                        padding: "4px 0", letterSpacing: "0.06em",
                                    }}>{n}</div>
                                ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                                {calDays.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const key = toKey(viewYear, viewMonth, day);
                                    const isTrade = tradableSet.has(key);
                                    const isSel = key === selected;
                                    const isWeekend = new Date(viewYear, viewMonth - 1, day).getDay() % 6 === 0;
                                    return (
                                        <button key={key} onClick={() => { if (isTrade) { onChange(key); setOpen(false); } }}
                                            style={{
                                                height: 32, borderRadius: 6, border: "none",
                                                cursor: isTrade ? "pointer" : "default", fontFamily: "monospace",
                                                fontSize: 12, fontWeight: isSel ? 600 : 400,
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
                                                    width: 4, height: 4, borderRadius: "50%", background: "#3b82f6",
                                                }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={footer}>
                            <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase" }}>Trading Days</span>
                            <span style={{
                                fontSize: 11, fontWeight: 500, color: "#60a5fa",
                                background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: 99,
                                border: "1px solid rgba(59,130,246,0.2)",
                            }}>{dates.length}</span>
                        </div>
                    </>)}
                </div>
            )}
        </div>
    );
});

// ─── CHECKBOX DROPDOWN (สำหรับเลือก Sectors) ──────────────────────────────────
function SectorMultiSelect({ options, selected, onChange, max = 10 }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (opt) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(item => item !== opt));
        } else {
            if (selected.length < max) onChange([...selected, opt]);
        }
    };

    const filteredOptions = options.filter(o => o.includes(search.toUpperCase()));

    return (
        <div ref={dropdownRef} style={{ position: "relative", zIndex: 150 }}>
            {/* Trigger Box */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#0f172a", border: "1px solid #1e293b",
                    borderRadius: 8, padding: "0 12px", height: 36, width: 220, cursor: "pointer",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconLineChart />
                    <span style={{ color: selected.length > 0 ? "#e2e8f0" : "#64748b", fontSize: 13 }}>
                        {selected.length > 0 ? `${selected.length}/${max} Selected` : "Search sub-sector..."}
                    </span>
                </div>

                {/* 🟢 จัดการกากบาท (Clear) และสามเหลี่ยม (Caret) */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {selected.length > 0 && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            style={{ display: "flex", alignItems: "center", color: "#94a3b8", cursor: "pointer" }}
                        >
                            <IconX />
                        </div>
                    )}
                    <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex", alignItems: "center" }}>
                        <IconCaret />
                    </div>
                </div>
            </div>

                       {/* Dropdown List */}
            {isOpen && (
                <div style={{
                    position: "absolute", top: "100%", left: 0, marginTop: 4,
                    background: "#0f172a", border: "1px solid #1e293b",
                    borderRadius: 8, width: 220, zIndex: 150,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                    display: "flex", flexDirection: "column",
                    maxHeight: 280,
                }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(51,65,85,0.4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 500 }}>{selected.length}/{max} Selected</span>
                        <div style={{ transform: "rotate(180deg)", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }} onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                            <IconCaret />
                        </div>
                    </div>

                    <div style={{ padding: "8px 14px" }}>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search symbol..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: 12, padding: "6px", borderRadius: 4, outline: "none" }}
                        />
                    </div>

                    <div className="custom-scrollbar" style={{ padding: "6px 0", overflowY: "auto", flex: 1 }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: "12px", color: "#64748b", fontSize: 12, textAlign: "center" }}>No match found</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = selected.includes(opt);
                                const isDisabled = !isSelected && selected.length >= max;
                                return (
                                    <label key={opt} style={{
                                        padding: "8px 14px", display: "flex", alignItems: "center", gap: 12,
                                        cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.5 : 1, margin: 0
                                    }}
                                        onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = "rgba(51,65,85,0.4)" }}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isDisabled}
                                            onChange={() => !isDisabled && toggleOption(opt)}
                                            style={{ width: 16, height: 16, cursor: isDisabled ? "not-allowed" : "pointer" }}
                                        />
                                        <span style={{ color: isSelected ? "#e2e8f0" : "#94a3b8", fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>
                                            {opt}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    {selected.length > 0 && (
                        <div style={{ padding: "8px", borderTop: "1px solid rgba(51,65,85,0.4)" }}>
                            <button onClick={() => onChange([])} style={{ width: "100%", padding: "6px", fontSize: 12, color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(51,65,85,0.4)"; e.currentTarget.style.color = "#f87171"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                                Clear Selection
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── FULLSCREEN EXPANDED CHART ─────────────────────────────────────────────────
function ExpandedChart({ sector, dateVal, tradingDates, onClose, onFirst, onLast, onSectorChange }) {
    const canvasRef = useRef(null);
    const scrollRef = useRef(null);
    const flowBadgeRef = useRef(null);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const allSectors = useMemo(() => {
        return [...SET_SECTORS, ...MAI_SECTORS].map(s => s.id);
    }, []);

    const chartData = useMemo(() => {
        return genSectorData(sector.id, 160);
    }, [sector.id]);

    const hasFlow = useMemo(() => sector.stocks.some(s => s.hasFlow), [sector]);

    const updateFlowBadgePosition = useCallback(() => {
        if (!scrollRef.current || !flowBadgeRef.current || !chartData.length) return;

        const scrollDiv = scrollRef.current;
        const frameW = scrollDiv.clientWidth;
        const currentScroll = scrollDiv.scrollLeft;
        const rightEdgeX = currentScroll + frameW;

        const padL = 40, padR = 60, padT = 50, padB = 40;
        const W = Math.max(window.innerWidth * 2, 1200);
        const chartW = W - padL - padR;

        let fractionalIndex = ((rightEdgeX - padL) / chartW) * (chartData.length - 1);
        fractionalIndex = Math.max(0, Math.min(chartData.length - 1, fractionalIndex));

        const idx1 = Math.floor(fractionalIndex);
        const idx2 = Math.ceil(fractionalIndex);
        const weight = fractionalIndex - idx1;

        const val1 = chartData[idx1];
        const val2 = chartData[idx2];
        const currentVal = val1 + (val2 - val1) * weight;

        const mn = Math.min(...chartData);
        const mx = Math.max(...chartData);
        const range = mx - mn || 1;
        const perc = (mx - currentVal) / range;

        flowBadgeRef.current.style.top = `calc(${padT}px + ${perc} * (100% - ${padT + padB}px))`;
    }, [chartData]);

    const handleFirst = () => {
        if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        if (onFirst) onFirst();
    };

    const handleLast = () => {
        if (scrollRef.current) scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
        if (onLast) onLast();
    };

    const onMouseDown = (e) => {
        if (!scrollRef.current) return;
        isDragging.current = true;
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
        scrollRef.current.style.cursor = 'grabbing';
    };

    const onMouseLeave = () => {
        if (!scrollRef.current) return;
        isDragging.current = false;
        scrollRef.current.style.cursor = 'grab';
    };

    const onMouseUp = () => {
        if (!scrollRef.current) return;
        isDragging.current = false;
        scrollRef.current.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
        if (!isDragging.current || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || chartData.length === 0) return;
        const dpr = window.devicePixelRatio || 1;

        const W = Math.max(window.innerWidth * 2, 1200);
        const H = canvas.parentElement.offsetHeight;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = `${W}px`;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const padL = 40, padR = 60, padT = 50, padB = 40;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        ctx.clearRect(0, 0, W, H);

        const mn = Math.min(...chartData), mx = Math.max(...chartData);
        let range = mx - mn;
        if (range === 0) range = 1;

        ctx.strokeStyle = "rgba(51,65,85,0.3)";
        ctx.lineWidth = 1;
        const cols = 20;
        for (let i = 1; i <= cols; i++) {
            const x = padL + (chartW / cols) * i;
            ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
        }

        const isUp = chartData[chartData.length - 1] >= chartData[0];
        const lineColor = isUp ? "#22c55e" : "#facc15";

        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        chartData.forEach((v, i) => {
            const x = padL + (i / (chartData.length - 1)) * chartW;
            const y = padT + ((mx - v) / range) * chartH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        const totalPoints = chartData.length; // 160
        const startDate = new Date("2019-01-02");
        const endDate = new Date();

        ctx.fillStyle = "#64748b";
        ctx.font = "11px ui-sans-serif,system-ui,sans-serif";

        for (let i = 0; i <= cols; i++) {
            const x = padL + (i / cols) * chartW;
            
            // หาว่า x นี้ตรงกับ index ที่เท่าไหร่
            const dataIdx = Math.round((i / cols) * (totalPoints - 1));
            
            // interpolate วันที่
            const t = dataIdx / (totalPoints - 1);
            const ts = startDate.getTime() + t * (endDate.getTime() - startDate.getTime());
            const d = new Date(ts);
            
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            const label = `${dd}/${mm}/${yyyy}`;
            
            // สลับ textAlign ขอบซ้าย-ขวาไม่ให้ถูก clip
            if (i === 0) ctx.textAlign = "left";
            else if (i === cols) ctx.textAlign = "right";
            else ctx.textAlign = "center";
            
            ctx.fillText(label, x, H - padB + 18);
        }

        if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        setTimeout(updateFlowBadgePosition, 10);

    }, [chartData, hasFlow, updateFlowBadgePosition]);

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgb(21, 26, 34)",
            display: "flex", padding: 20, gap: 16
        }}>
            <div style={{
                flex: 1, position: "relative",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8, display: "flex", flexDirection: "column",
                overflow: "hidden"
            }}>
                {/* Top Toolbar */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", background: "#0b1121", borderBottom: "1px solid #1e293b",
                    zIndex: 20, flexShrink: 0
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap", rowGap: 8 }}>
                              <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
                                Sectorrotation
                              </ToolHint>

                        <button onClick={onClose} style={{
                                display: "flex", alignItems: "center", gap: 5,
                                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 6, padding: "5px 12px",
                                color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 3L5 8l5 5"/>
                                </svg>
                                back
                            </button>

                            <button onClick={handleLast} style={{
                                width: 30, height: 30, borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "transparent", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b",
                            }} title="Reset"
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#64748b"; e.currentTarget.style.color = "#e2e8f0"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#64748b"; }}
                            >
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13.5 6A6 6 0 1 0 14 10"/><path d="M14 4v3h-3"/>
                                </svg>
                            </button>

                        {/* 🟢 Dropdown พร้อมปุ่มกากบาท (Clear) และสามเหลี่ยม (Caret) */}
                        <div style={{ position: "relative" }}>
                            <div
                                onClick={() => { setShowDropdown(true); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8, background: "#1e293b", padding: "0 12px",
                                    height: 32, borderRadius: 6, minWidth: 200, cursor: "text"
                                }}
                            >
                                <IconSearch />
                                {showDropdown ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search sub-sector (id)..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                        style={{ background: "transparent", border: "none", color: "#fff", outline: "none", width: "100%", flex: 1, fontSize: 13 }}
                                    />
                                ) : (
                                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: 13, flex: 1, letterSpacing: "0.5px" }}>{sector.id}</span>
                                )}

                                {/* 🟢 จัดการกากบาท (Clear) และสามเหลี่ยม (Caret) */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {showDropdown && searchTerm && (
                                        <div
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSearchTerm("");
                                            }}
                                            style={{ cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
                                        >
                                            <IconX />
                                        </div>
                                    )}
                                    <div style={{ transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex", alignItems: "center" }}>
                                        <IconCaret />
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Menu */}
                            {showDropdown && (
                                <div className="custom-scrollbar" style={{
                                    position: "absolute", top: "100%", left: 0, marginTop: 4,
                                    background: "#0f172a", border: "1px solid #1e293b",
                                    borderRadius: 8, width: "100%", zIndex: 150,
                                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                                    display: "flex", flexDirection: "column",
                                    maxHeight: 280, overflowY: "auto"
                                }}>
                                    {allSectors.filter(id => id.toLowerCase().includes(searchTerm.toLowerCase())).map(id => (
                                        <div
                                            key={id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                if (onSectorChange) onSectorChange(id);
                                                setShowDropdown(false);
                                                setSearchTerm("");
                                            }}
                                            style={{
                                                padding: "8px 14px", color: sector.id === id ? "#06b6d4" : "#cbd5e1",
                                                fontWeight: sector.id === id ? "bold" : "normal", cursor: "pointer",
                                                fontSize: 13,
                                                background: sector.id === id ? "rgba(6,182,212,0.1)" : "transparent"
                                            }}
                                            onMouseEnter={e => { if (sector.id !== id) e.currentTarget.style.background = "rgba(51,65,85,0.4)"; }}
                                            onMouseLeave={e => { if (sector.id !== id) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            {id}
                                        </div>
                                    ))}

                                    {allSectors.filter(id => id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <div style={{ padding: "10px 14px", color: "#64748b", fontSize: 13, textAlign: "center" }}>No sectors found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ fontSize: 15, fontWeight: "bold", color: "#fff", letterSpacing: "1px", marginLeft: 40 }}>
                        {sector.id}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={handleFirst} style={{
                            background: "transparent", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.4)",
                            padding: "0 12px", height: 30, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold"
                        }}>FIRST DATA</button>
                        <button onClick={handleLast} style={{
                            background: "transparent", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.4)",
                            padding: "0 12px", height: 30, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: "bold"
                        }}>LAST DATA</button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={updateFlowBadgePosition}
                    onMouseDown={onMouseDown}
                    onMouseLeave={onMouseLeave}
                    onMouseUp={onMouseUp}
                    onMouseMove={onMouseMove}
                    style={{
                        flex: 1, position: "relative",
                        overflowX: "hidden", overflowY: "hidden",
                        display: "flex",
                        cursor: "grab"
                    }}
                >
                    <div style={{ minWidth: "200%", height: "100%", position: "relative" }}>
                        <canvas ref={canvasRef} style={{ height: "100%", display: "block" }} />
                    </div>
                </div>

                {hasFlow && (() => {
                    const isUp = chartData[chartData.length - 1] >= chartData[0];
                    const badgeBg = isUp ? "#22c55e" : "#f59e0b";

                    return (
                        <div
                            ref={flowBadgeRef}
                            style={{
                                position: "absolute",
                                right: 4,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: badgeBg,
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: "bold",
                                padding: "3px 7px",
                                borderRadius: 4,
                                pointerEvents: "none",
                                zIndex: 30,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                                transition: "top 0.05s ease-out"
                            }}
                        >
                            Flow
                        </div>
                    );
                })()}
            </div>

            <div style={{
                width: 140, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0
            }}>
                <div style={{
                    color: "#facc15", fontSize: 13, fontWeight: "700",
                    textAlign: "center", letterSpacing: "0.2px"
                }}>
                    Symbol In Sector
                </div>
                <div className="custom-scrollbar" style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    overflowY: "auto", paddingRight: 4, paddingBottom: 10
                }}>
                    {sector.stocks.map(st => (
                        <div
                            key={st.sym}
                            style={{
                                background: "rgba(30,41,59,0.7)",
                                color: "#cbd5e1",
                                padding: "10px 0",
                                border: "1px solid #1e293b",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: "600",
                                textAlign: "center",
                                width: "100%",
                                userSelect: "none"
                            }}
                        >
                            {st.sym}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── MINI CHART CANVAS ────────────────────────────────────────────────────────
function SectorMiniChart({ sectorId, isUp, isEmpty, isExpanded, dateVal, resetTick }) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const innerRef = useRef(null);
    const [vals, setVals] = useState([]);
    const [hoverInfo, setHoverInfo] = useState(null);

    const getSimulatedDate = useCallback((index) => {
        const start = new Date("2019-01-02").getTime();
        const end = new Date().getTime();
        const timeAtIdx = start + ((end - start) * (index / 159));
        return new Date(timeAtIdx).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    }, []);

    useEffect(() => {
        let newVals = genSectorData(sectorId, 160);
        setVals(newVals);
    }, [sectorId]);

    useEffect(() => {
        if (!wrapperRef.current) return;
        const wrap = wrapperRef.current;

        setTimeout(() => {
            const start = new Date("2019-01-02").getTime();
            const end = new Date().getTime();

            let cur = start;
            if (dateVal && dateVal.includes('/')) {
                const p = parseKey(dateVal);
                cur = new Date(p.year, p.month - 1, p.day).getTime();
            } else {
                cur = new Date(dateVal || "2019-01-02").getTime();
            }

            let perc = (cur - start) / (end - start);
            if (perc < 0) perc = 0; if (perc > 1) perc = 1;

            const maxScroll = wrap.scrollWidth - wrap.clientWidth;
            wrap.scrollTo({ left: maxScroll * perc, behavior: 'smooth' });
        }, 50);
    }, [dateVal, vals]);

    useEffect(() => {
        if (!wrapperRef.current || resetTick === 0) return;
        const wrap = wrapperRef.current;
        wrap.scrollTo({ left: wrap.scrollWidth, behavior: 'smooth' });
    }, [resetTick]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty || vals.length === 0) return;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.offsetWidth || 180;
        const H = canvas.offsetHeight || 120;
        canvas.width = W * dpr; canvas.height = H * dpr;
        const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);

        const padL = isExpanded ? 20 : 0;
        const padR = isExpanded ? 20 : 0;
        const padT = isExpanded ? 30 : 16;
        const padB = isExpanded ? 50 : 28;
        const mn = Math.min(...vals), mx = Math.max(...vals);
        const range = mx - mn || 1;
        const chartH = H - padT - padB;
        const chartW = W - padL - padR;

        const lineColor = isUp ? "#22c55e" : "#facc15";

        ctx.strokeStyle = "rgba(51,65,85,0.4)"; ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        for (let i = 0; i < 4; i++) {
            const y = padT + (chartH / 5) * (i + 1);
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W, y); ctx.stroke();
        }
        for (let i = 1; i < 3; i++) {
            const x = padL + (chartW / 3) * i;
            ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.strokeStyle = "rgba(51,65,85,0.6)"; ctx.lineWidth = 1;
        ctx.moveTo(padL, H - padB);
        ctx.lineTo(W, H - padB);
        ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = lineColor; ctx.lineWidth = 1.4; ctx.lineJoin = "round";
        vals.forEach((v, i) => {
            const x = padL + (i / (vals.length - 1)) * chartW;
            const y = padT + ((mx - v) / range) * chartH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(padL, padT + ((mx - vals[0]) / range) * chartH, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor; ctx.fill();

        ctx.fillStyle = "#64748b";
        const fontSize = isExpanded ? 16 : 11;
        ctx.font = `${fontSize}px ui-sans-serif,system-ui,sans-serif`;
        const textY = H - (isExpanded ? 16 : 8);

        ctx.textAlign = "left"; ctx.fillText("Aug '21", padL + 12, textY);
        ctx.textAlign = "center"; ctx.fillText("2023", (W - padL - padR) / 2 + padL, textY);
        ctx.textAlign = "right"; ctx.fillText("Today", W - padR - 12, textY);

    }, [vals, isUp, isEmpty, isExpanded, dateVal]);

    useEffect(() => { const t = setTimeout(redraw, 0); return () => clearTimeout(t); }, [redraw]);
    useEffect(() => {
        const ro = new ResizeObserver(redraw);
        if (canvasRef.current) ro.observe(canvasRef.current);
        return () => ro.disconnect();
    }, [redraw]);

    if (isEmpty) return null;

    const handleMouseMove = (e) => {
        if (!innerRef.current || vals.length === 0) return;
        const rect = innerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const W = innerRef.current.offsetWidth || 180;

        const padL = isExpanded ? 20 : 0;
        const padR = isExpanded ? 20 : 0;
        const chartW = W - padL - padR;

        let i = Math.round(((mouseX - padL) / chartW) * (vals.length - 1));
        if (i < 0) i = 0;
        if (i >= vals.length) i = vals.length - 1;

        const val = vals[i];
        const padT = isExpanded ? 30 : 16;
        const padB = isExpanded ? 50 : 28;
        const H = innerRef.current.offsetHeight || 120;
        const chartH = H - padT - padB;
        const mn = Math.min(...vals), mx = Math.max(...vals);
        const range = mx - mn || 1;

        const ptX = padL + (i / (vals.length - 1)) * chartW;
        const ptY = padT + ((mx - val) / range) * chartH;

        setHoverInfo({ x: ptX, y: ptY, val, index: i });
    };

    return (
        <div ref={wrapperRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", cursor: "crosshair" }}
            onMouseDown={e => {
                const wrap = wrapperRef.current;
                let startX = e.pageX - wrap.offsetLeft;
                let scrollLeft = wrap.scrollLeft;
                let isDragging = false;
                wrap.style.cursor = "grabbing";

                const onMouseMoveDrag = (moveE) => {
                    isDragging = true;
                    const x = moveE.pageX - wrap.offsetLeft;
                    wrap.scrollLeft = scrollLeft - (x - startX);
                    setHoverInfo(null);
                };

                const onMouseUpDrag = () => {
                    wrap.style.cursor = "crosshair";
                    document.removeEventListener('mousemove', onMouseMoveDrag);
                    document.removeEventListener('mouseup', onMouseUpDrag);
                };

                document.addEventListener('mousemove', onMouseMoveDrag);
                document.addEventListener('mouseup', onMouseUpDrag);
            }}
        >
            <div
                ref={innerRef}
                style={{ position: "relative", width: vals.length > 50 ? `${vals.length * 3}%` : "100%", height: "100%" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverInfo(null)}
            >
                <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

                {hoverInfo && (
                    <>
                        <div style={{ position: "absolute", left: hoverInfo.x, top: isExpanded ? 30 : 16, bottom: isExpanded ? 50 : 28, width: 1, borderLeft: "1px dashed rgba(148,163,184,0.6)", pointerEvents: "none" }} />
                        <div style={{ position: "absolute", left: hoverInfo.x - 4, top: hoverInfo.y - 4, width: 8, height: 8, background: "#0a0f16", border: `2px solid ${isUp ? "#22c55e" : "#facc15"}`, borderRadius: "50%", pointerEvents: "none" }} />
                        <div style={{
                            position: "absolute",
                            ...(hoverInfo.index > vals.length / 2 ? { right: innerRef.current?.offsetWidth - hoverInfo.x + 12 } : { left: hoverInfo.x + 12 }),
                            top: Math.max(0, hoverInfo.y - 42),
                            background: "rgba(15,23,42,0.95)",
                            border: `1px solid rgba(51,65,85,0.8)`,
                            padding: "6px 10px",
                            borderRadius: 6,
                            color: "#fff",
                            fontSize: 11,
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                            zIndex: 20
                        }}>
                            <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>{getSimulatedDate(hoverInfo.index)}</div>
                            <div style={{ fontWeight: 600, color: isUp ? "#4ade80" : "#facc15", fontSize: 13, letterSpacing: "0.02em" }}>{hoverInfo.val.toLocaleString()} <span style={{ fontSize: 9, fontWeight: 400, color: "#64748b" }}>pts</span></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── SECTOR CARD ──────────────────────────────────────────────────────────────
function SectorCard({ sector, isExpanded, onExpand, onCollapse, dateVal, onReset }) {
    const isEmpty = sector.stocks.length === 0;
    const top = getTopBadge(sector.stocks);
    const isUp = top ? top.isUp : true;
    const [resetTick, setResetTick] = useState(0);

    const handleLocalReset = () => {
        setResetTick(prev => prev + 1);
        if (onReset) onReset();
    };

    return (
        <div style={{
            background: "#0f172a", border: isExpanded ? "none" : "1px solid #1e293b", borderRadius: 8,
            display: "flex", flexDirection: "column", position: isExpanded ? "absolute" : "relative",
            inset: isExpanded ? 0 : "auto", height: isExpanded ? "100%" : "auto", minHeight: isExpanded ? "100%" : 230,
            transition: "border-color .2s", padding: isExpanded ? "30px 20px 20px 20px" : "16px 0 0 0"
        }}
            onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.borderColor = "#334155" }}
            onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.borderColor = "#1e293b" }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isExpanded ? "0 20px" : "0 16px", marginBottom: isExpanded ? 20 : 12, zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", overflow: "hidden" }}>
                    <span style={{ fontSize: isExpanded ? 24 : 13, fontWeight: 700, color: "#94a3b8", letterSpacing: ".05em", whiteSpace: "nowrap" }}>
                        {sector.label}
                    </span>
                    {top && (
                        <span style={{
                            fontSize: isExpanded ? 14 : 10, fontWeight: 700, padding: isExpanded ? "2px 12px" : "1px 8px", borderRadius: 12,
                            border: `1px solid ${top.color}`,
                            color: top.color, display: "flex", alignItems: "center", gap: 4
                        }}>
                            {top.sym} <span style={{ fontSize: isExpanded ? 12 : 9 }}>{top.arrow}</span>
                        </span>
                    )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    {isExpanded ? (
                        <button onClick={onCollapse} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><IconX /></button>
                    ) : (
                        <button onClick={onExpand} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}><IconSearchZoom /></button>
                    )}
                    <button onClick={handleLocalReset} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}><IconRefresh /></button>
                </div>
            </div>

            {isEmpty ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, color: "rgba(148,163,184,0.6)", marginBottom: 20 }}>{sector.label}:ไม่มีข้อมูล</span>
                </div>
            ) : (
                <div style={{ display: "flex", flex: 1 }}>
                    <div style={{ flex: 1, position: "relative", minWidth: 0, borderRight: "1px solid rgba(30,41,59,0.8)" }}>
                        <SectorMiniChart sectorId={sector.id} isUp={isUp} isEmpty={isEmpty} isExpanded={isExpanded} dateVal={dateVal} resetTick={resetTick} />
                    </div>

                    <div style={{ width: isExpanded ? 100 : 68, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: isExpanded ? "20px 0 50px 0" : "8px 0 28px 0", zIndex: 5 }}>
                        {sector.stocks.slice(0, 4).map(st => {
                            return (
                                <div key={st.sym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isExpanded ? 6 : 3 }}>
                                    <span style={{ fontSize: isExpanded ? 16 : 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{st.sym}</span>
                                    {st.hasFlow && (
                                        <span style={{
                                            fontSize: isExpanded ? 12 : 9, fontWeight: 700, padding: isExpanded ? "4px 10px" : "3px 6px", borderRadius: 4,
                                            background: st.chg >= 1.0 ? "#22c55e" : "#f59e0b",
                                            color: "#fff", lineHeight: 1
                                        }}>
                                            Flow
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── MAIN APP COMPONENT ───────────────────────────────────────────────────────
export default function SectorRotation() {
    const [selectedSectors, setSelectedSectors] = useState([]);
    const [expandedSectorId, setExpandedSectorId] = useState(null);
    const [marketFilter, setMarketFilter] = useState("SET");
    const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
    const marketDropdownRef = useRef(null);

    const tradingDates = useMemo(() => getTradingDates(), []);
    const defaultLastData = tradingDates[tradingDates.length - 1];
    const [dateVal, setDateVal] = useState(defaultLastData);

    const [layoutMode, setLayoutMode] = useState(29);

    const windowWidth = useWindowWidth();
    const isMobile = windowWidth < 640;

    useEffect(() => {
        function handleClickOutsideMarket(event) {
            if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target)) {
                setMarketDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutsideMarket);
        return () => document.removeEventListener("mousedown", handleClickOutsideMarket);
    }, []);

    const handleMarketChange = (opt) => {
        setMarketFilter(opt);
        setMarketDropdownOpen(false);
        setSelectedSectors([]);
        if (opt === "SET") setLayoutMode(29);
        if (opt === "MAI") setLayoutMode(8);
        if (opt === "SET&MAI") setLayoutMode(2);
    };

    const handleLayoutChange = (mode) => {
        setLayoutMode(mode);
        setSelectedSectors([]);
        if (mode === 29) setMarketFilter("SET");
        if (mode === 8) setMarketFilter("MAI");
        if (mode === 2) setMarketFilter("SET&MAI");
    };

    const availableSectors = useMemo(() => {
        if (marketFilter === "SET") return SET_SECTORS.map(s => s.label);
        if (marketFilter === "MAI") return MAI_SECTORS.map(s => s.label);
        if (marketFilter === "SET&MAI") return [SET_SUMMARY.label, MAI_SUMMARY.label];
        return [];
    }, [marketFilter]);

    const visibleData = useMemo(() => {
        let data = [];
        if (marketFilter === "SET") data = SET_SECTORS;
        else if (marketFilter === "MAI") data = MAI_SECTORS;
        else if (marketFilter === "SET&MAI") data = [SET_SUMMARY, MAI_SUMMARY];

        if (selectedSectors.length > 0) {
            data = data.filter(sec => selectedSectors.includes(sec.label));
        }
        return data;
    }, [marketFilter, selectedSectors]);

    const gridTemplate = useMemo(() => {
        if (layoutMode === 29) return "repeat(auto-fit, minmax(max(30%, 300px), 1fr))";
        if (layoutMode === 8) return "repeat(auto-fit, minmax(max(45%, 450px), 1fr))";
        if (layoutMode === 2) return "repeat(auto-fit, minmax(100%, 1fr))";
        return "repeat(auto-fit, minmax(max(30%, 300px), 1fr))";
    }, [layoutMode]);

    const boxStyle = { display: "flex", alignItems: "center", gap: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "0 12px", height: 36, position: "relative", cursor: "pointer" };
    const btnStyle = (active) => ({
        background: active ? "rgba(51,65,85,0.8)" : "transparent", border: "1px solid #1e293b", borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center", height: 34, width: 34, cursor: "pointer", color: active ? "#e2e8f0" : "#64748b", transition: "all .15s", fontSize: "12px", fontWeight: "bold"
    });
    const dataBtn = (label, onClick) => (
        <button key={label} onClick={onClick} style={{ background: "transparent", border: "1px solid rgba(6,182,212,0.4)", borderRadius: 4, padding: "0 14px", height: 34, fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#06b6d4", letterSpacing: ".04em", transition: "all .15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{label}</button>
    );

    return (
        <div style={{ background: "#080c14", color: "#e2e8f0", fontFamily: "ui-sans-serif,system-ui,sans-serif", minHeight: "100vh", padding: "20px" }}>

            {/* 🟢 ฝัง CSS ลงไปเลยเพื่อแก้ปัญหา Scrollbar สีขาวในรูป */}
            <style>
                {`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #64748b;
                }
                `}
            </style>

            {/* ── Toolbar ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
                {/* Left Group */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="flex items-center gap-2">
                        <ToolHint onViewDetails={() => { window.scrollTo({ top: 0 }); }}>
                            Sectorrotation
                        </ToolHint>

                        <div ref={marketDropdownRef} style={{ ...boxStyle, minWidth: 220 }} onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}>
                            <IconSearch />
                            <span style={{ color: "#e2e8f0", fontSize: 13, flex: 1, fontWeight: "bold" }}>
                                {marketFilter === "SET&MAI" ? "SET & MAI" : marketFilter}
                            </span>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {marketFilter !== "SET" && (
                                    <div
                                        style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#94a3b8" }}
                                        onClick={(e) => { e.stopPropagation(); handleMarketChange("SET"); }}
                                    >
                                        <IconX />
                                    </div>
                                )}
                                <div style={{ transform: marketDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex", alignItems: "center" }}>
                                    <IconCaret />
                                </div>
                            </div>

                            {marketDropdownOpen && (
                                <div className="custom-scrollbar" style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 0", width: "100%", zIndex: 200, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)" }}>
                                    {["SET", "MAI", "SET&MAI"].map(opt => (
                                        <div
                                            key={opt}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleMarketChange(opt);
                                            }}
                                            style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: opt === marketFilter ? "#e2e8f0" : "#94a3b8", fontWeight: opt === marketFilter ? "bold" : "normal", cursor: "pointer" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(51,65,85,0.4)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        >
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: marketFilter === opt ? "#3b82f6" : "#475569" }} />
                                            {opt === "SET&MAI" ? "SET & MAI" : opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {marketFilter === "SET" && (
                            <div style={{ display: "flex", gap: 4 }}>
                                {[29, 8, 2].map(col => (
                                    <button key={col} onClick={() => handleLayoutChange(col)} style={btnStyle(layoutMode === col)}>
                                        {col === 29 ? <IconGrid3x3 /> : col === 8 ? <IconGrid2x2 /> : <IconList />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {marketFilter === "SET" && (
                        <div style={{ display: "flex", alignItems: "center", marginLeft: 40 }}>
                            <SectorMultiSelect
                                options={availableSectors}
                                selected={selectedSectors}
                                onChange={setSelectedSectors}
                                max={layoutMode}
                            />
                        </div>
                    )}
                </div>

                {/* Right Group (Dates) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        {dataBtn("FIRST DATA", () => setDateVal(tradingDates[0]))}
                        {dataBtn("LAST DATA", () => setDateVal(defaultLastData))}
                    </div>
                    <DatePicker
                        dates={tradingDates}
                        selected={dateVal}
                        onChange={setDateVal}
                    />
                </div>
            </div>

            {/* ── Grid Area ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: gridTemplate,
                gap: 20,
                transition: "all 0.3s ease"
            }}>
                {visibleData.map(sec => (
                    <SectorCard key={sec.id} sector={sec} dateVal={dateVal} onExpand={() => setExpandedSectorId(sec.id)} onReset={() => setDateVal(defaultLastData)} />
                ))}

                {visibleData.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                        <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>🔍</span>
                        ไม่พบข้อมูล
                    </div>
                )}
            </div>

            {/* ── Expanded Modal Area ── */}
            {expandedSectorId && (() => {
                const sec = [...SET_SECTORS, ...MAI_SECTORS, SET_SUMMARY, MAI_SUMMARY].find(s => s.id === expandedSectorId);
                if (!sec) return null;
                return (
                    <ExpandedChart
                        sector={sec}
                        dateVal={dateVal}
                        tradingDates={tradingDates}
                        onClose={() => setExpandedSectorId(null)}
                        onFirst={() => setDateVal(tradingDates[0])}
                        onLast={() => setDateVal(defaultLastData)}
                        onSectorChange={setExpandedSectorId}
                    />
                );
            })()}

        </div>
    );
}