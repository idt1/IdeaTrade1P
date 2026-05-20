import { useState, useEffect, useRef, useMemo } from "react";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";

// ─── Mock Data Generator ────────────────────────────────────────────────────
function seedRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSeries(basePrice, startDate, days, seed) {
  const rng = seedRng(seed);
  const dates = [];
  const prices = [];
  const callPut = [];
  const oi = [];

  let price = basePrice;
  let cpAccum = 0;
  let oiAccum = 0;
  let d = new Date(startDate);

  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);

    const drift = -0.15 + (rng() - 0.5) * 1.8;
    price = Math.max(600, Math.min(1100, price + drift));

    const dailyVol = Math.round(500 + rng() * 2500 + i * 15);
    cpAccum += dailyVol;

    const dailyOI = Math.round(3000 + rng() * 12000 + i * 80);
    oiAccum += dailyOI;

    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = d.getFullYear();
    dates.push(`${dd}/${mm}/${yy}`);
    prices.push(parseFloat(price.toFixed(2)));
    callPut.push(cpAccum);
    oi.push(oiAccum);

    d.setDate(d.getDate() + 1);
  }

  return { dates, prices, callPut, oi };
}

// ─── Catalogue ───────────────────────────────────────────────────────────────
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

// ─── Sub-components ──────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={styles.dropLabel}>{label}</div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={styles.dropBtn}
      >
        {value}
        <span style={{ marginLeft: 8, fontSize: 10, color: "#5a9fd4" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div style={styles.dropMenu}>
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                ...styles.dropItem,
                color: opt === value ? "#5a9fd4" : "#c8d8e8",
                fontWeight: opt === value ? 500 : 400,
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, dashed }) {
  return (
    <span style={styles.legendItem}>
      <span style={{
        display: "inline-block", width: 28, height: 2.5,
        background: dashed ? "transparent" : color,
        borderTop: dashed ? `2px dashed ${color}` : "none",
        verticalAlign: "middle", marginRight: 6
      }} />
      <span style={{ color: "#8aa8c8", fontSize: 12 }}>{label}</span>
    </span>
  );
}

// ─── Chart Component ──────────────────────────────────────────────────────────
function DualChart({ title, dates, leftData, rightData, leftColor, rightColor, rightLabel, leftLabel, rightFormatter }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const leftSeriesRef = useRef(null);
  const rightSeriesRef = useRef(null);

  // Convert dd/mm/yyyy → yyyy-mm-dd for lightweight-charts
  const toISO = (dmy) => {
    const [d, m, y] = dmy.split("/");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1120" },
        textColor: "rgba(200,216,232,0.7)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(90,159,212,0.4)", labelBackgroundColor: "#1a2a40" },
        horzLine: { color: "rgba(90,159,212,0.4)", labelBackgroundColor: "#1a2a40" },
      },
      rightPriceScale: { borderColor: "transparent", visible: false },
      leftPriceScale: { borderColor: "transparent", visible: true, textColor: "rgba(200,216,232,0.7)" },
      timeScale: {
        borderColor: "transparent",
        timeVisible: false,
        tickMarkFormatter: (t) => {
          const d = new Date(t * 1000);
          return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    chart.priceScale("left").applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });
    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    const leftSeries = chart.addSeries(LineSeries, {
      color: leftColor,
      lineWidth: 2,
      priceScaleId: "left",
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const rightSeries = chart.addSeries(LineSeries, {
      color: rightColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
    });

    chart.priceScale("right").applyOptions({
      visible: true,
      textColor: "rgba(200,216,232,0.7)",
      borderColor: "transparent",
    });

    chartRef.current = chart;
    leftSeriesRef.current = leftSeries;
    rightSeriesRef.current = rightSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!leftSeriesRef.current || !rightSeriesRef.current) return;
    if (!dates.length) return;

    const leftD = dates.map((dmy, i) => ({
      time: Math.floor(new Date(toISO(dmy)).getTime() / 1000),
      value: leftData[i],
    })).filter(p => !isNaN(p.time));

    const rightD = dates.map((dmy, i) => ({
      time: Math.floor(new Date(toISO(dmy)).getTime() / 1000),
      value: rightData[i],
    })).filter(p => !isNaN(p.time));

    leftSeriesRef.current.setData(leftD);
    rightSeriesRef.current.setData(rightD);
    chartRef.current?.timeScale().fitContent();
  }, [dates, leftData, rightData]);

  return (
    <div style={styles.chartWrap}>
      <div style={styles.chartTitle}>{title}</div>
      <div ref={containerRef} style={{ width: "100%", height: 240 }} />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Options() {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedMonth, setSelectedMonth] = useState("H");

  const seriesOptions = useMemo(
    () => Object.keys(MONTHS).map((m) => `S50${m}${String(selectedYear).slice(2)}`),
    [selectedYear]
  );
  const selectedSeriesLabel = `S50${selectedMonth}${String(selectedYear).slice(2)}`;

  const data = useMemo(
    () => getSeriesData(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const handleYearChange = (val) => {
    setSelectedYear(Number(val));
    setSelectedMonth("H");
  };

  const handleSeriesChange = (val) => {
    const m = val[3];
    setSelectedMonth(m);
  };

  return (
    <div style={styles.dash}>
      {/* Controls */}
      <div style={styles.controls}>
        <Dropdown
          label="Select Year"
          value={String(selectedYear)}
          options={AVAILABLE_YEARS.map(String)}
          onChange={handleYearChange}
        />
        <Dropdown
          label="Series"
          value={selectedSeriesLabel}
          options={seriesOptions}
          onChange={handleSeriesChange}
        />
      </div>

      {/* Volume Chart */}
      <div style={styles.legendRow}>
        <span style={{ color: "#8aa8c8", fontSize: 12, fontWeight: 500 }}>Volume :</span>
        <LegendDot color="#00cc55" label="Call-Put (Accumulated)" />
        <LegendDot color="#e84040" label="Futures Price" dashed />
      </div>
      <DualChart
        title={selectedSeriesLabel}
        dates={data.dates}
        leftData={data.prices}
        rightData={data.callPut}
        leftColor="#e84040"
        rightColor="#00cc55"
        leftLabel="Futures Price"
        rightLabel="Call-Put Accum"
      />

      {/* OI Chart */}
      <div style={{ ...styles.legendRow, marginTop: 12 }}>
        <span style={{ color: "#8aa8c8", fontSize: 12, fontWeight: 500 }}>OI :</span>
        <LegendDot color="#f5c842" label="Open Interest (Accumulated)" />
        <LegendDot color="#e84040" label="Futures Price" dashed />
      </div>
      <DualChart
        title={selectedSeriesLabel}
        dates={data.dates}
        leftData={data.prices}
        rightData={data.oi}
        leftColor="#e84040"
        rightColor="#f5c842"
        leftLabel="Futures Price"
        rightLabel="OI Accum"
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  dash: {
    background: "#151929",
    padding: 16,
    minHeight: "100vh",
    fontFamily: "'Inter', sans-serif",
  },
  controls: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  dropLabel: {
    position: "absolute",
    top: -9,
    left: 10,
    fontSize: 10,
    color: "#6c8aad",
    background: "#151929",
    padding: "0 4px",
    zIndex: 2,
    pointerEvents: "none",
  },
  dropBtn: {
    position: "relative",
    background: "#1e2640",
    color: "#d0dff0",
    border: "1.5px solid #3a6fa8",
    borderRadius: 6,
    padding: "8px 36px 8px 12px",
    fontSize: 14,
    cursor: "pointer",
    minWidth: 130,
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    background: "#1a2035",
    border: "1px solid #2a4060",
    borderRadius: 6,
    zIndex: 100,
    minWidth: 130,
    overflow: "hidden",
  },
  dropItem: {
    padding: "10px 14px",
    fontSize: 14,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  legendRow: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
  },
  chartWrap: {
    background: "#0d1120",
    borderRadius: 8,
    position: "relative",
    marginBottom: 16,
    padding: "10px 6px 6px",
    overflow: "hidden",
  },
  chartTitle: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 14,
    color: "rgba(255,255,255,0.1)",
    fontWeight: 500,
    letterSpacing: 3,
    pointerEvents: "none",
    zIndex: 1,
  },
};