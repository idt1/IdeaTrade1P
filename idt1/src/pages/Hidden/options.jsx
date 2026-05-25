import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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

// ─── useBreakpoint hook ───────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return {
    isMobile: width < 480,
    isTablet: width >= 480 && width < 768,
    isDesktop: width >= 768,
    width,
  };
}

// ─── Dropdown (Search-style + Portal) ────────────────────────────────────────
function Dropdown({ label, value, options, onChange, fullWidth }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      const inWrap = wrapRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inWrap && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMenu = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setQuery("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          background: "#151e30",
          border: "1px solid #2a4060",
          borderRadius: 8,
          zIndex: 99999,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}
      >
        {filtered.length === 0 && (
          <div style={{ padding: "10px 14px", fontSize: 13, color: "#5a7a9a" }}>
            ไม่พบ
          </div>
        )}
        {filtered.map((opt) => (
          <div
            key={opt}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(opt);
              setOpen(false);
            }}
            style={{
              padding: "9px 14px",
              fontSize: 14,
              cursor: "pointer",
              color: opt === value ? "#5a9fd4" : "#c8d8e8",
              fontWeight: opt === value ? 500 : 400,
              background: opt === value ? "rgba(90,159,212,0.08)" : "transparent",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(90,159,212,0.12)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                opt === value ? "rgba(90,159,212,0.08)" : "transparent")
            }
          >
            {opt}
          </div>
        ))}
      </div>,
      document.body
    );

  return (
    <div ref={wrapRef} style={{ position: "relative", width: fullWidth ? "100%" : undefined }}>
      <div
        onClick={openMenu}
        style={{
          display: "flex",
          alignItems: "center",
          background: "#1a2236",
          border: `1px solid ${open ? "#5a9fd4" : "#2a4060"}`,
          borderRadius: 8,
          padding: "0 10px",
          height: 36,
          cursor: "text",
          transition: "border-color 0.15s",
          gap: 6,
          width: fullWidth ? "100%" : 160,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#5a7a9a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>

        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={label}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#d0dff0",
              fontSize: 13,
              fontFamily: "inherit",
              caretColor: "#5a9fd4",
            }}
          />
        ) : (
          <span
            style={{ flex: 1, fontSize: 13, color: value ? "#d0dff0" : "#5a7a9a" }}
          >
            {value || label}
          </span>
        )}

        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="#5a7a9a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: open
              ? "translateY(-50%) rotate(180deg)"
              : "translateY(-50%) rotate(0deg)",
            transition: "transform 0.15s",
            pointerEvents: "none",
          }}
        >
          <path d="M1 3l4 4 4-4" />
        </svg>
      </div>
      {menu}
    </div>
  );
}

// ─── Legend Dot ───────────────────────────────────────────────────────────────
function LegendDot({ color, label, dashed }) {
  return (
    <span style={styles.legendItem}>
      <span
        style={{
          display: "inline-block",
          width: 28,
          height: 2.5,
          background: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : "none",
          verticalAlign: "middle",
          marginRight: 6,
        }}
      />
      <span style={{ color: "#8aa8c8", fontSize: 12 }}>{label}</span>
    </span>
  );
}

// ─── Dual Chart ───────────────────────────────────────────────────────────────
function DualChart({
  title,
  dates,
  leftData,
  rightData,
  leftColor,
  rightColor,
  legendLeft,
  legendRight,
  cardLabel,
  currentYear,
  currentMonth,
  dataKey,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const leftSeriesRef = useRef(null);
  const rightSeriesRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isMobile, isTablet, width } = useBreakpoint();

  const [fsYear, setFsYear] = useState(currentYear);
  const [fsMonth, setFsMonth] = useState(currentMonth);

  // Chart height: responsive
  const chartHeight = isMobile ? 180 : isTablet ? 210 : 240;

  useEffect(() => {
    if (!isFullscreen) {
      setFsYear(currentYear);
      setFsMonth(currentMonth);
    }
  }, [currentYear, currentMonth, isFullscreen]);

  const fsSeriesOptions = useMemo(
    () => Object.keys(MONTHS).map((m) => `S50${m}${String(fsYear).slice(2)}`),
    [fsYear]
  );
  const fsSeriesLabel = `S50${fsMonth}${String(fsYear).slice(2)}`;

  const fsData = useMemo(() => getSeriesData(fsYear, fsMonth), [fsYear, fsMonth]);

  const handleFsYearChange = (val) => {
    setFsYear(Number(val));
    setFsMonth("H");
  };
  const handleFsSeriesChange = (val) => {
    setFsMonth(val[3]);
  };

  const activeDates = isFullscreen ? fsData.dates : dates;
  const activeLeftData = isFullscreen ? fsData.prices : leftData;
  const activeRightData = isFullscreen
    ? dataKey === "oi"
      ? fsData.oi
      : fsData.callPut
    : rightData;

  const toISO = (dmy) => {
    const [d, m, y] = dmy.split("/");
    return `${y}-${m}-${d}`;
  };

  const handleReset = () => {
    chartRef.current?.timeScale().fitContent();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || chartHeight,
        });
        chartRef.current.timeScale().fitContent();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen, chartHeight]);

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
        vertLine: {
          color: "rgba(90,159,212,0.4)",
          labelBackgroundColor: "#1a2a40",
        },
        horzLine: {
          color: "rgba(90,159,212,0.4)",
          labelBackgroundColor: "#1a2a40",
        },
      },
      rightPriceScale: { borderColor: "transparent", visible: false },
      leftPriceScale: {
        borderColor: "transparent",
        visible: true,
        textColor: "rgba(200,216,232,0.7)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: false,
        tickMarkFormatter: (t) => {
          const d = new Date(t * 1000);
          return `${String(d.getDate()).padStart(2, "0")}/${String(
            d.getMonth() + 1
          ).padStart(2, "0")}`;
        },
      },
      watermark: { visible: false },
      handleScroll: true,
      handleScale: true,
    });

    chart.priceScale("left").applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

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
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!leftSeriesRef.current || !rightSeriesRef.current) return;
    if (!activeDates.length) return;

    const leftD = activeDates
      .map((dmy, i) => ({
        time: Math.floor(new Date(toISO(dmy)).getTime() / 1000),
        value: activeLeftData[i],
      }))
      .filter((p) => !isNaN(p.time));

    const rightD = activeDates
      .map((dmy, i) => ({
        time: Math.floor(new Date(toISO(dmy)).getTime() / 1000),
        value: activeRightData[i],
      }))
      .filter((p) => !isNaN(p.time));

    leftSeriesRef.current.setData(leftD);
    rightSeriesRef.current.setData(rightD);
    chartRef.current?.timeScale().fitContent();
  }, [activeDates, activeLeftData, activeRightData]);

  // ── FULLSCREEN BRANCH ──────────────────────────────────────────────────────
  if (isFullscreen) {
    // On mobile: stack controls vertically
    const fsMobile = width < 600;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "#060e1a",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            background: "#07111c",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: fsMobile ? "column" : "row",
            alignItems: fsMobile ? "stretch" : "center",
            padding: fsMobile ? "8px 12px" : "8px 16px",
            gap: fsMobile ? 8 : 0,
            flexShrink: 0,
          }}
        >
          {/* Back + reset row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "5px 12px",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#64748b";
                e.currentTarget.style.color = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 3L5 8l5 5" />
              </svg>
              back
            </button>

            <button
              onClick={handleReset}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: 16,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#64748b";
                e.currentTarget.style.color = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "#64748b";
              }}
              title="Reset"
            >
              <span
                style={{
                  display: "inline-block",
                  transition: "transform 0.6s ease",
                  transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
                }}
              >
                ⟳
              </span>
            </button>

            {/* Badge — show inline on mobile too */}
            {fsMobile && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 12px",
                  borderRadius: 99,
                  background: "rgba(90,159,212,0.12)",
                  color: "#5a9fd4",
                  border: "1px solid rgba(90,159,212,0.3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {cardLabel}
              </span>
            )}
          </div>

          {/* Controls row (dropdowns + legend) */}
          {fsMobile ? (
            // Mobile: dropdowns full-width, legend below
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Dropdown
                    label="Select Year"
                    value={String(fsYear)}
                    options={AVAILABLE_YEARS.map(String)}
                    onChange={handleFsYearChange}
                    fullWidth
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Dropdown
                    label="Series"
                    value={fsSeriesLabel}
                    options={fsSeriesOptions}
                    onChange={handleFsSeriesChange}
                    fullWidth
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <LegendDot color={rightColor} label={legendRight} />
                <LegendDot color={leftColor} label={legendLeft} dashed />
              </div>
            </div>
          ) : (
            // Desktop: centered absolute layout (unchanged)
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 12px",
                  borderRadius: 99,
                  background: "rgba(90,159,212,0.12)",
                  color: "#5a9fd4",
                  border: "1px solid rgba(90,159,212,0.3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  pointerEvents: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {cardLabel}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  pointerEvents: "auto",
                  position: "relative",
                }}
              >
                <Dropdown
                  label="Select Year"
                  value={String(fsYear)}
                  options={AVAILABLE_YEARS.map(String)}
                  onChange={handleFsYearChange}
                />
                <Dropdown
                  label="Series"
                  value={fsSeriesLabel}
                  options={fsSeriesOptions}
                  onChange={handleFsSeriesChange}
                />
              </div>

              <div
                style={{
                  width: 1,
                  height: 20,
                  background: "rgba(255,255,255,0.08)",
                  flexShrink: 0,
                }}
              />

              <LegendDot color={rightColor} label={legendRight} />
              <LegendDot color={leftColor} label={legendLeft} dashed />
            </div>
          )}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <div style={styles.chartTitle}>{fsSeriesLabel}</div>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    );
  }

  // ── NORMAL CARD BRANCH ─────────────────────────────────────────────────────
  return (
    <div style={styles.cardWrap}>
      {/* Card header — two rows on mobile */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 6 : 14,
          padding: isMobile ? "8px 10px" : "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {/* Row 1: label + buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <span style={styles.cardLabel}>{cardLabel}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <button onClick={handleReset} style={styles.resetBtn}>
              <span
                style={{
                  display: "inline-block",
                  transition: "transform 0.6s ease",
                  transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
                }}
              >
                ⟳
              </span>{" "}
              Reset
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              style={styles.iconBtn}
              title="Fullscreen"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2 (always visible): legend */}
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <LegendDot color={rightColor} label={legendRight} />
          <LegendDot color={leftColor} label={legendLeft} dashed />
        </div>
      </div>

      <div style={{ position: "relative", flex: 1 }}>
        <div style={styles.chartTitle}>{title}</div>
        <div ref={containerRef} style={{ width: "100%", height: chartHeight }} />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Options() {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedMonth, setSelectedMonth] = useState("H");
  const { isMobile } = useBreakpoint();

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
    setSelectedMonth(val[3]);
  };

  return (
    <div style={styles.pageWrap}>
      <style>{`
        .tv-lightweight-charts a,
        .tv-lightweight-charts a * { display: none !important; }
      `}</style>

      {/* Top Controls — stack vertically on mobile */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <Dropdown
          label="Select Year"
          value={String(selectedYear)}
          options={AVAILABLE_YEARS.map(String)}
          onChange={handleYearChange}
          fullWidth={isMobile}
        />
        <Dropdown
          label="Series"
          value={selectedSeriesLabel}
          options={seriesOptions}
          onChange={handleSeriesChange}
          fullWidth={isMobile}
        />
      </div>

      {/* Chart 1 — Volume */}
      <DualChart
        cardLabel="Volume"
        title={selectedSeriesLabel}
        dates={data.dates}
        leftData={data.prices}
        rightData={data.callPut}
        leftColor="#e84040"
        rightColor="#00cc55"
        legendLeft="Futures Price"
        legendRight="Call-Put (Accumulated)"
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        dataKey="callPut"
      />

      {/* Chart 2 — OI */}
      <DualChart
        cardLabel="OI"
        title={selectedSeriesLabel}
        dates={data.dates}
        leftData={data.prices}
        rightData={data.oi}
        leftColor="#e84040"
        rightColor="#f5c842"
        legendLeft="Futures Price"
        legendRight="Open Interest (Accumulated)"
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        dataKey="oi"
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  pageWrap: {
    background: "#0d0f1a",
    minHeight: "100vh",
    padding: 16,
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardWrap: {
    background: "#151c2c",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
  },
  cardLabel: {
    color: "#8aa8c8",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginRight: 4,
    flexShrink: 0,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
  },
  resetBtn: {
    background: "#1e2a40",
    color: "#8aa8c8",
    border: "1px solid #2a4060",
    borderRadius: 5,
    padding: "3px 10px",
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    background: "#1e2a40",
    color: "#8aa8c8",
    border: "1px solid #2a4060",
    borderRadius: 5,
    padding: "4px 7px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chartTitle: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 14,
    color: "rgba(255,255,255,0.06)",
    fontWeight: 500,
    letterSpacing: 3,
    pointerEvents: "none",
    zIndex: 1,
    whiteSpace: "nowrap",
  },
};