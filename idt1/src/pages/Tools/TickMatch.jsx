// src/pages/tools/TickMatch.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import TickMatchDashboard from "./components/TickMatchDashboard.jsx";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ToolHint from "@/components/ToolHint.jsx";

const scrollbarHideStyle = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const GH_BG       = "#0B1221";
const GH_BUY      = "#22c55e";
const GH_SELL     = "#ef4444";
const GH_BUY_DIM  = "#14532d";
const GH_SELL_DIM = "#7f1d1d";
const GH_GRID     = "rgba(255,255,255,0.04)";
const GH_AXIS     = "rgba(148,163,184,0.55)";
const GH_AXIS_HOV = "#93c5fd";
const GH_HOV_BG   = "rgba(59,130,246,0.06)";
const GH_BASELINE = "rgba(148,163,184,0.18)";
const GH_TIP_BG   = "#0d1a2e";
const GH_TIP_BRD  = "#1e3a5f";
const GH_PAD      = { l: 6, r: 6, t: 12, b: 28 };

function ghRoundRect(ctx, x, y, w, h, radii) {
  if (h <= 0 || w <= 0) return;
  const r = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
  const [tl, tr, br, bl] = r.map(v => Math.min(v, h / 2, w / 2));
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x,     y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x,     y,     x + tl, y);
  ctx.closePath();
}

function GroupedHistogram({ data = [], height: fixedHeight }) {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const layoutRef  = useRef([]);
  const hovIdxRef  = useRef(-1);
  const dprRef     = useRef(1);
  const sizeRef    = useRef({ W: 0, H: fixedHeight || 200 });
  const [tip, setTip] = useState(null);
  const [height, setHeight] = useState(fixedHeight || 200);

  const buildLayout = useCallback((W) => {
    const H  = sizeRef.current.H;
    const pw = W - GH_PAD.l - GH_PAD.r;
    const ph = H - GH_PAD.t - GH_PAD.b;
    const n  = data.length;
    if (n === 0) { layoutRef.current = []; return; }
    const maxVal = Math.max(...data.map(d => Math.max(d.buy || 0, d.sell || 0))) || 1;
    const gw  = pw / n;
    const GAP = Math.max(2, gw * 0.16);
    const bw  = Math.max(3, (gw - GAP * 3) / 2);
    layoutRef.current = data.map((d, i) => {
      const gx    = GH_PAD.l + i * gw + GAP;
      const buyH  = ((d.buy  || 0) / maxVal) * ph;
      const sellH = ((d.sell || 0) / maxVal) * ph;
      return {
        d, i, gw, bw, GAP,
        buyX:  gx,
        buyY:  GH_PAD.t + ph - buyH,
        buyH,
        sellX: gx + bw + GAP,
        sellY: GH_PAD.t + ph - sellH,
        sellH,
        cx:    GH_PAD.l + i * gw + gw / 2,
        baseY: GH_PAD.t + ph,
      };
    });
  }, [data]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr    = dprRef.current;
    const W      = sizeRef.current.W;
    const H      = sizeRef.current.H;
    const ctx    = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const layout = layoutRef.current;
    const hovIdx = hovIdxRef.current;
    if (layout.length === 0) return;
    const ph    = H - GH_PAD.t - GH_PAD.b;
    const baseY = GH_PAD.t + ph;

    ctx.strokeStyle = GH_GRID;
    ctx.lineWidth   = 1;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const y = GH_PAD.t + ph * (1 - f);
      ctx.beginPath(); ctx.moveTo(GH_PAD.l, y); ctx.lineTo(W - GH_PAD.r, y); ctx.stroke();
    });

    if (hovIdx >= 0) {
      const sl = layout[hovIdx];
      ctx.fillStyle = GH_HOV_BG;
      ctx.beginPath();
      ghRoundRect(ctx, sl.cx - sl.gw / 2 + 1, GH_PAD.t, sl.gw - 2, ph, 4);
      ctx.fill();
    }

    layout.forEach((sl, i) => {
      const isHov  = i === hovIdx;
      const dimmed = hovIdx >= 0 && !isHov;

      if (sl.buyH > 0) {
        ctx.globalAlpha = dimmed ? 0.28 : 0.88;
        ctx.fillStyle   = isHov ? GH_BUY : (dimmed ? GH_BUY_DIM : GH_BUY);
        ctx.beginPath();
        ghRoundRect(ctx, sl.buyX, sl.buyY, sl.bw, sl.buyH, [3, 3, 0, 0]);
        ctx.fill();
        if (isHov) {
          ctx.globalAlpha = 1;
          ctx.fillStyle   = "#86efac";
          ctx.fillRect(sl.buyX, sl.buyY, sl.bw, 2);
        }
      }

      if (sl.sellH > 0) {
        ctx.globalAlpha = dimmed ? 0.28 : 0.88;
        ctx.fillStyle   = isHov ? GH_SELL : (dimmed ? GH_SELL_DIM : GH_SELL);
        ctx.beginPath();
        ghRoundRect(ctx, sl.sellX, sl.sellY, sl.bw, sl.sellH, [3, 3, 0, 0]);
        ctx.fill();
        if (isHov) {
          ctx.globalAlpha = 1;
          ctx.fillStyle   = "#fca5a5";
          ctx.fillRect(sl.sellX, sl.sellY, sl.bw, 2);
        }
      }
      ctx.globalAlpha = 1;
    });

    ctx.strokeStyle = GH_BASELINE;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(GH_PAD.l, baseY); ctx.lineTo(W - GH_PAD.r, baseY); ctx.stroke();

    const step = Math.max(1, Math.ceil(layout.length / 8));
    ctx.font         = "10px monospace";
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    layout.forEach((sl, i) => {
      if (i % step !== 0 && i !== layout.length - 1) return;
      ctx.fillStyle = i === hovIdx ? GH_AXIS_HOV : GH_AXIS;
      ctx.fillText(sl.d.price ?? sl.d.time ?? "", sl.cx, baseY + 5);
    });
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = wrap.offsetWidth;
    const H   = fixedHeight || wrap.offsetHeight || 200;
    dprRef.current     = dpr;
    sizeRef.current    = { W, H };
    setHeight(H);
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    buildLayout(W);
    draw();
  }, [buildLayout, draw, fixedHeight]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resize]);

  const handleMouseMove = useCallback((e) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect  = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) {
      if (hovIdxRef.current !== -1) {
        hovIdxRef.current = -1;
        setTip(null);
        draw();
      }
      return;
    }
    let found  = -1;
    layoutRef.current.forEach((sl, i) => {
      if (mx >= sl.cx - sl.gw / 2 && mx < sl.cx + sl.gw / 2) found = i;
    });
    if (found === hovIdxRef.current) return;
    hovIdxRef.current = found;
    if (found >= 0) {
      const sl  = layoutRef.current[found];
      const net = (sl.d.buy || 0) - (sl.d.sell || 0);
      const W   = sizeRef.current.W;
      setTip({ x: Math.min(Math.max(sl.cx - 60, 4), W - 148), d: { price: sl.d.price, buy: sl.d.buy, sell: sl.d.sell, net } });
    } else {
      setTip(null);
    }
    draw();
  }, [draw]);

  const handleMouseLeave = useCallback(() => {
    hovIdxRef.current = -1;
    setTip(null);
    draw();
  }, [draw]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%", height: fixedHeight ? `${fixedHeight}px` : "100%", background: GH_BG }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      />
      {tip && (
        <div style={{
          position: "absolute", top: 4, left: tip.x, pointerEvents: "none",
          background: GH_TIP_BG, border: `1px solid ${GH_TIP_BRD}`,
          borderRadius: 6, padding: "7px 11px", fontFamily: "monospace",
          fontSize: 11, lineHeight: 1.75, color: "#e2e8f0", whiteSpace: "nowrap", zIndex: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 3 }}>{tip.d.price}</div>
          <div style={{ color: "#4ade80" }}>▲ Buy &nbsp; {(tip.d.buy  || 0).toLocaleString()}</div>
          <div style={{ color: "#f87171" }}>▼ Sell &nbsp;{(tip.d.sell || 0).toLocaleString()}</div>
          <div style={{ color: "#94a3b8", borderTop: `1px solid ${GH_TIP_BRD}`, marginTop: 4, paddingTop: 4 }}>
            Net &nbsp;{tip.d.net >= 0 ? "+" : ""}{tip.d.net.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

const features = [
  { title: "Net Accumulated Volume", desc: "Track global gold prices with an intelligent filtering system designed to eliminate market noise." },
  { title: "Flip Signal", desc: "Instantly detect the moment capital flow reverses direction from bullish to bearish." },
  { title: "Granular Tick Data", desc: "Audit every single transaction to scan for whale orders hidden within the noise." },
  { title: "Price-Based Distribution", desc: "Identifies price levels where the heaviest trading volume has occurred." },
];

const mockDatabase = {
  "": {
    sumBuy: "0", sumSell: "0", netVol: "0",
    ticks: [], flips: [], charts: []
  },
  "DELTA": {
    sumBuy: "2,871,341,000", sumSell: "2,799,804,200", netVol: "71,536,800",
    ticks: [
      { time: "09:55.101", last: "223.50", vol: "2,000",  type: "B", sum: "35,100,000" },
      { time: "09:56.210", last: "223.50", vol: "5,000",  type: "B", sum: "38,750,000" },
      { time: "09:57.330", last: "224.00", vol: "1,500",  type: "S", sum: "37,412,000" },
      { time: "09:58.472", last: "224.00", vol: "500",    type: "S", sum: "43,321,300" },
      { time: "09:58.472", last: "224.00", vol: "10,000", type: "S", sum: "41,081,300" },
      { time: "09:58.472", last: "224.00", vol: "100",    type: "S", sum: "41,058,900" },
      { time: "09:58.472", last: "224.00", vol: "2,000",  type: "B", sum: "40,610,900" },
      { time: "09:58.472", last: "224.00", vol: "1,000",  type: "S", sum: "40,386,900" },
      { time: "09:58.472", last: "224.00", vol: "100",    type: "S", sum: "40,364,500" },
      { time: "09:58.472", last: "224.00", vol: "1,000",  type: "B", sum: "40,140,500" },
      { time: "10:02.115", last: "224.50", vol: "3,000",  type: "B", sum: "41,815,500" },
      { time: "10:05.330", last: "224.50", vol: "800",    type: "S", sum: "41,456,300" },
      { time: "10:10.441", last: "225.00", vol: "5,000",  type: "B", sum: "43,581,300" },
      { time: "10:15.552", last: "225.00", vol: "2,500",  type: "S", sum: "42,456,800" },
    ],
    flips: [
      { id: 1, time: "10:22.787", from: "-51,044",  to: "58,160"   },
      { id: 2, time: "10:35.724", from: "4,819",    to: "-18,382"  },
      { id: 3, time: "10:55.770", from: "17,307",   to: "-99,893"  },
      { id: 4, time: "11:02.759", from: "-97,549",  to: "58,061"   },
      { id: 5, time: "12:30.100", from: "58,061",   to: "-42,300"  },
      { id: 6, time: "13:15.450", from: "-42,300",  to: "91,200"   },
      { id: 7, time: "14:05.012", from: "-1,998",   to: "3,777"    },
    ],
    charts: [
      { price: "221.50", buy: 8,  sell: 12 }, { price: "222.00", buy: 15, sell: 20 },
      { price: "222.50", buy: 12, sell: 18 }, { price: "223.00", buy: 22, sell: 15 },
      { price: "223.50", buy: 18, sell: 25 }, { price: "224.00", buy: 50, sell: 15 },
      { price: "224.50", buy: 35, sell: 28 }, { price: "225.00", buy: 35, sell: 55 },
      { price: "225.50", buy: 28, sell: 32 }, { price: "226.00", buy: 55, sell: 20 },
      { price: "226.50", buy: 42, sell: 38 }, { price: "227.00", buy: 15, sell: 10 },
      { price: "227.50", buy: 20, sell: 22 }, { price: "228.00", buy: 40, sell: 40 },
      { price: "228.50", buy: 18, sell: 15 }, { price: "229.00", buy: 5,  sell: 2  },
    ]
  },
  "NVDA": {
    sumBuy: "14,520,100,000", sumSell: "11,200,450,000", netVol: "3,319,650,000",
    ticks: [
      { time: "21:30.112", last: "138.50", vol: "4,500",  type: "B", sum: "8,321,300"  },
      { time: "21:30.114", last: "138.55", vol: "1,200",  type: "B", sum: "8,581,300"  },
      { time: "21:30.200", last: "138.50", vol: "500",    type: "S", sum: "8,511,300"  },
      { time: "21:30.450", last: "138.60", vol: "10,000", type: "B", sum: "9,911,300"  },
      { time: "21:31.001", last: "138.70", vol: "3,000",  type: "B", sum: "10,327,300" },
      { time: "21:31.220", last: "138.65", vol: "2,000",  type: "S", sum: "10,050,300" },
      { time: "21:32.005", last: "138.80", vol: "8,000",  type: "B", sum: "11,160,300" },
      { time: "21:33.110", last: "138.75", vol: "1,500",  type: "S", sum: "10,952,175" },
      { time: "21:34.300", last: "139.00", vol: "5,000",  type: "B", sum: "11,647,175" },
      { time: "21:35.450", last: "138.90", vol: "2,200",  type: "S", sum: "11,341,595" },
    ],
    flips: [
      { id: 1, time: "21:45.000", from: "-2,100,500", to: "5,400,200"   },
      { id: 2, time: "22:15.000", from: "5,400,200",  to: "-1,800,300"  },
      { id: 3, time: "22:50.300", from: "-1,800,300", to: "3,319,650"   },
    ],
    charts: [
      { price: "137.50", buy: 80, sell: 20 }, { price: "138.00", buy: 60, sell: 15 },
      { price: "138.50", buy: 45, sell: 30 }, { price: "138.80", buy: 70, sell: 25 },
      { price: "139.00", buy: 20, sell: 50 }, { price: "139.20", buy: 35, sell: 60 },
      { price: "139.50", buy: 10, sell: 70 }, { price: "139.80", buy: 15, sell: 45 },
      { price: "140.00", buy: 55, sell: 30 }, { price: "140.50", buy: 25, sell: 55 },
    ]
  },
  "TSLA": {
    sumBuy: "5,110,000,000", sumSell: "8,900,200,000", netVol: "-3,790,200,000",
    ticks: [
      { time: "21:40.001", last: "199.00", vol: "2,000",  type: "S", sum: "-800,100"   },
      { time: "21:42.003", last: "198.80", vol: "3,500",  type: "S", sum: "-1,493,900" },
      { time: "21:44.005", last: "198.50", vol: "1,000",  type: "B", sum: "-1,295,400" },
      { time: "21:45.001", last: "198.20", vol: "1,000",  type: "S", sum: "-1,500,200" },
      { time: "21:45.005", last: "198.15", vol: "5,000",  type: "S", sum: "-2,490,200" },
      { time: "21:45.010", last: "198.10", vol: "10,000", type: "S", sum: "-4,470,200" },
      { time: "21:46.200", last: "197.90", vol: "4,000",  type: "S", sum: "-5,262,200" },
      { time: "21:47.310", last: "197.80", vol: "2,500",  type: "B", sum: "-4,767,700" },
      { time: "21:48.440", last: "197.50", vol: "6,000",  type: "S", sum: "-5,952,700" },
      { time: "21:50.001", last: "197.20", vol: "3,000",  type: "S", sum: "-6,544,300" },
    ],
    flips: [
      { id: 1, time: "21:38.100", from: "500,000",    to: "-1,500,000" },
      { id: 2, time: "22:05.200", from: "-1,500,000", to: "800,000"    },
      { id: 3, time: "22:45.400", from: "800,000",    to: "-2,000,000" },
      { id: 4, time: "23:15.400", from: "-2,000,000", to: "-3,790,200" },
    ],
    charts: [
      { price: "200.00", buy: 10, sell: 45 }, { price: "199.50", buy: 18, sell: 60 },
      { price: "199.00", buy: 15, sell: 65 }, { price: "198.50", buy: 25, sell: 50 },
      { price: "198.00", buy: 10, sell: 80 }, { price: "197.80", buy: 30, sell: 55 },
      { price: "197.50", buy: 40, sell: 40 }, { price: "197.00", buy: 35, sell: 30 },
      { price: "196.50", buy: 50, sell: 20 }, { price: "196.00", buy: 45, sell: 15 },
    ]
  },
  "1DIV": {
    sumBuy: "1,354,802", sumSell: "1,111,900", netVol: "243,002",
    ticks: [
      { time: "09:57.002", last: "12.15", vol: "1,000", type: "B", sum: "12,150"  },
      { time: "10:01.004", last: "12.15", vol: "400",   type: "S", sum: "7,290"   },
      { time: "10:01.004", last: "12.15", vol: "200",   type: "S", sum: "4,860"   },
      { time: "09:57.002", last: "12.15", vol: "1,000", type: "B", sum: "17,010"  },
      { time: "10:01.004", last: "12.15", vol: "400",   type: "S", sum: "12,150"  },
      { time: "10:01.004", last: "12.15", vol: "200",   type: "S", sum: "9,720"   },
      { time: "10:08.238", last: "12.15", vol: "800",   type: "S", sum: "0"       },
      { time: "10:07.917", last: "12.10", vol: "100",   type: "S", sum: "-1,210"  },
      { time: "10:07.917", last: "12.10", vol: "100",   type: "S", sum: "-3,420"  },
      { time: "10:07.917", last: "12.10", vol: "400",   type: "S", sum: "-7,260"  },
      { time: "10:14.151", last: "12.00", vol: "1,000", type: "S", sum: "-19,260" },
      { time: "10:14.151", last: "12.00", vol: "400",   type: "S", sum: "-24,060" },
      { time: "10:14.151", last: "12.00", vol: "100",   type: "S", sum: "-25,260" },
      { time: "10:20.300", last: "12.05", vol: "2,000", type: "B", sum: "-1,160"  },
      { time: "10:25.410", last: "12.10", vol: "1,500", type: "B", sum: "14,990"  },
    ],
    flips: [
      { id: 1, time: "10:22.787", from: "-51,045", to: "58,180"  },
      { id: 2, time: "10:35.724", from: "4,818",   to: "-18,382" },
      { id: 3, time: "10:55.770", from: "17,307",  to: "-99,893" },
      { id: 4, time: "11:02.759", from: "-97,549", to: "58,061"  },
      { id: 5, time: "13:00.100", from: "58,061",  to: "-30,200" },
      { id: 6, time: "14:05.012", from: "-1,998",  to: "3,777"   },
    ],
    charts: [
      { price: "12.10", buy: 5200,  sell: 6800  }, { price: "12.00", buy: 4100,  sell: 5900  },
      { price: "11.90", buy: 3800,  sell: 4200  }, { price: "11.88", buy: 9200,  sell: 12800 },
      { price: "11.80", buy: 28000, sell: 7200  }, { price: "11.79", buy: 14200, sell: 22800 },
      { price: "11.78", buy: 14200, sell: 4800  }, { price: "11.77", buy: 13800, sell: 3200  },
      { price: "11.72", buy: 8200,  sell: 30200 }, { price: "11.70", buy: 4600,  sell: 19500 },
      { price: "11.68", buy: 19600, sell: 4200  }, { price: "11.63", buy: 3200,  sell: 16200 },
      { price: "11.62", buy: 18200, sell: 20100 }, { price: "11.61", buy: 18400, sell: 6200  },
      { price: "11.59", buy: 7200,  sell: 19800 }, { price: "11.58", buy: 16800, sell: 8200  },
      { price: "11.57", buy: 17500, sell: 23500 }, { price: "11.56", buy: 19800, sell: 12800 },
      { price: "11.55", buy: 9800,  sell: 27800 }, { price: "11.54", buy: 28200, sell: 18200 },
      { price: "11.52", buy: 18200, sell: 4200  },
    ]
  },
  "PTT": {
    sumBuy: "3,412,550,000", sumSell: "2,988,320,000", netVol: "424,230,000",
    ticks: [
      { time: "09:30.001", last: "34.50", vol: "5,000",  type: "B", sum: "172,500"   },
      { time: "09:31.110", last: "34.50", vol: "2,000",  type: "S", sum: "103,500"   },
      { time: "09:32.220", last: "34.75", vol: "8,000",  type: "B", sum: "381,500"   },
      { time: "09:33.330", last: "34.75", vol: "3,000",  type: "S", sum: "277,250"   },
      { time: "09:34.440", last: "35.00", vol: "10,000", type: "B", sum: "627,250"   },
      { time: "09:35.550", last: "35.00", vol: "4,000",  type: "S", sum: "487,250"   },
      { time: "09:40.001", last: "35.25", vol: "6,000",  type: "B", sum: "698,750"   },
      { time: "09:45.110", last: "35.25", vol: "1,000",  type: "S", sum: "663,500"   },
      { time: "09:50.220", last: "35.50", vol: "7,000",  type: "B", sum: "911,500"   },
      { time: "09:55.330", last: "35.25", vol: "2,500",  type: "S", sum: "823,375"   },
      { time: "10:00.440", last: "35.50", vol: "5,000",  type: "B", sum: "1,001,375" },
    ],
    flips: [
      { id: 1, time: "09:45.100", from: "-120,000", to: "280,500"  },
      { id: 2, time: "10:30.200", from: "280,500",  to: "-95,000"  },
      { id: 3, time: "11:15.300", from: "-95,000",  to: "424,230"  },
    ],
    charts: [
      { price: "34.25", buy: 12000, sell: 8000  }, { price: "34.50", buy: 18000, sell: 12000 },
      { price: "34.75", buy: 25000, sell: 15000 }, { price: "35.00", buy: 35000, sell: 20000 },
      { price: "35.25", buy: 28000, sell: 22000 }, { price: "35.50", buy: 42000, sell: 18000 },
      { price: "35.75", buy: 20000, sell: 30000 }, { price: "36.00", buy: 15000, sell: 38000 },
    ]
  },
  "KBANK": {
    sumBuy: "8,221,430,000", sumSell: "9,102,880,000", netVol: "-881,450,000",
    ticks: [
      { time: "09:30.005", last: "142.00", vol: "3,000",  type: "S", sum: "-426,000"   },
      { time: "09:31.115", last: "142.00", vol: "1,500",  type: "S", sum: "-639,000"   },
      { time: "09:32.225", last: "141.50", vol: "5,000",  type: "S", sum: "-1,346,500" },
      { time: "09:33.335", last: "141.50", vol: "2,000",  type: "B", sum: "-1,063,500" },
      { time: "09:34.445", last: "141.00", vol: "4,000",  type: "S", sum: "-1,627,500" },
      { time: "09:40.001", last: "141.00", vol: "8,000",  type: "S", sum: "-2,755,500" },
      { time: "09:45.110", last: "141.50", vol: "3,000",  type: "B", sum: "-2,330,500" },
      { time: "09:50.220", last: "141.00", vol: "6,000",  type: "S", sum: "-3,176,500" },
      { time: "09:55.330", last: "140.50", vol: "10,000", type: "S", sum: "-4,581,500" },
      { time: "10:00.440", last: "141.00", vol: "4,000",  type: "B", sum: "-4,017,500" },
    ],
    flips: [
      { id: 1, time: "09:38.200", from: "320,000",    to: "-1,200,000" },
      { id: 2, time: "10:12.400", from: "-1,200,000", to: "450,000"    },
      { id: 3, time: "11:00.100", from: "450,000",    to: "-881,450"   },
    ],
    charts: [
      { price: "143.00", buy: 5000,  sell: 18000 }, { price: "142.50", buy: 8000,  sell: 22000 },
      { price: "142.00", buy: 12000, sell: 30000 }, { price: "141.50", buy: 15000, sell: 25000 },
      { price: "141.00", buy: 20000, sell: 35000 }, { price: "140.50", buy: 10000, sell: 28000 },
      { price: "140.00", buy: 25000, sell: 15000 }, { price: "139.50", buy: 30000, sell: 10000 },
    ]
  },
  "AOT": {
    sumBuy: "5,678,900,000", sumSell: "4,321,100,000", netVol: "1,357,800,000",
    ticks: [
      { time: "09:30.010", last: "62.50", vol: "10,000", type: "B", sum: "625,000"   },
      { time: "09:31.120", last: "62.75", vol: "5,000",  type: "B", sum: "938,750"   },
      { time: "09:32.230", last: "62.75", vol: "2,000",  type: "S", sum: "813,750"   },
      { time: "09:33.340", last: "63.00", vol: "8,000",  type: "B", sum: "1,317,750" },
      { time: "09:34.450", last: "63.00", vol: "3,000",  type: "S", sum: "1,128,750" },
      { time: "09:40.010", last: "63.25", vol: "15,000", type: "B", sum: "2,077,500" },
      { time: "09:45.120", last: "63.25", vol: "4,000",  type: "S", sum: "1,824,500" },
      { time: "09:50.230", last: "63.50", vol: "12,000", type: "B", sum: "2,586,500" },
      { time: "09:55.340", last: "63.75", vol: "6,000",  type: "B", sum: "2,968,000" },
      { time: "10:00.450", last: "63.50", vol: "3,000",  type: "S", sum: "2,778,500" },
    ],
    flips: [
      { id: 1, time: "09:35.100", from: "-500,000",  to: "1,200,000"  },
      { id: 2, time: "10:20.300", from: "1,200,000", to: "-300,000"   },
      { id: 3, time: "11:05.200", from: "-300,000",  to: "1,357,800"  },
    ],
    charts: [
      { price: "62.00", buy: 20000, sell: 8000  }, { price: "62.25", buy: 25000, sell: 10000 },
      { price: "62.50", buy: 35000, sell: 12000 }, { price: "62.75", buy: 28000, sell: 15000 },
      { price: "63.00", buy: 40000, sell: 18000 }, { price: "63.25", buy: 32000, sell: 20000 },
      { price: "63.50", buy: 22000, sell: 25000 }, { price: "63.75", buy: 15000, sell: 30000 },
    ]
  },
  "CPALL": {
    sumBuy: "4,112,300,000", sumSell: "3,890,100,000", netVol: "222,200,000",
    ticks: [
      { time: "09:30.020", last: "58.00", vol: "5,000",  type: "B", sum: "290,000"   },
      { time: "09:32.130", last: "58.25", vol: "3,000",  type: "B", sum: "464,750"   },
      { time: "09:34.240", last: "58.25", vol: "1,500",  type: "S", sum: "377,375"   },
      { time: "09:36.350", last: "58.50", vol: "8,000",  type: "B", sum: "845,375"   },
      { time: "09:40.460", last: "58.50", vol: "2,000",  type: "S", sum: "728,375"   },
      { time: "09:45.001", last: "58.75", vol: "10,000", type: "B", sum: "1,315,875" },
      { time: "09:50.110", last: "58.75", vol: "4,000",  type: "S", sum: "1,080,875" },
      { time: "09:55.220", last: "59.00", vol: "6,000",  type: "B", sum: "1,434,875" },
      { time: "10:00.330", last: "58.75", vol: "3,500",  type: "S", sum: "1,228,500" },
      { time: "10:05.440", last: "59.00", vol: "7,000",  type: "B", sum: "1,641,500" },
    ],
    flips: [
      { id: 1, time: "09:42.100", from: "-180,000", to: "520,000"  },
      { id: 2, time: "10:15.200", from: "520,000",  to: "-90,000"  },
      { id: 3, time: "11:20.300", from: "-90,000",  to: "222,200"  },
    ],
    charts: [
      { price: "57.75", buy: 15000, sell: 8000  }, { price: "58.00", buy: 22000, sell: 12000 },
      { price: "58.25", buy: 18000, sell: 14000 }, { price: "58.50", buy: 30000, sell: 16000 },
      { price: "58.75", buy: 25000, sell: 20000 }, { price: "59.00", buy: 35000, sell: 22000 },
      { price: "59.25", buy: 18000, sell: 28000 }, { price: "59.50", buy: 10000, sell: 32000 },
    ]
  },
  "SCB": {
    sumBuy: "6,540,200,000", sumSell: "7,210,800,000", netVol: "-670,600,000",
    ticks: [
      { time: "09:30.015", last: "108.00", vol: "4,000",  type: "S", sum: "-432,000"   },
      { time: "09:31.125", last: "108.00", vol: "2,000",  type: "S", sum: "-648,000"   },
      { time: "09:33.235", last: "107.50", vol: "6,000",  type: "S", sum: "-1,293,000" },
      { time: "09:35.345", last: "107.50", vol: "3,000",  type: "B", sum: "-970,500"   },
      { time: "09:38.455", last: "107.00", vol: "5,000",  type: "S", sum: "-1,505,500" },
      { time: "09:42.001", last: "107.00", vol: "8,000",  type: "S", sum: "-2,361,500" },
      { time: "09:47.110", last: "107.50", vol: "4,000",  type: "B", sum: "-1,931,500" },
      { time: "09:52.220", last: "107.00", vol: "7,000",  type: "S", sum: "-2,681,500" },
      { time: "09:57.330", last: "106.50", vol: "10,000", type: "S", sum: "-3,746,500" },
      { time: "10:02.440", last: "107.00", vol: "5,000",  type: "B", sum: "-3,211,500" },
    ],
    flips: [
      { id: 1, time: "09:40.100", from: "410,000",    to: "-1,100,000" },
      { id: 2, time: "10:05.200", from: "-1,100,000", to: "380,000"    },
      { id: 3, time: "10:50.300", from: "380,000",    to: "-670,600"   },
    ],
    charts: [
      { price: "108.50", buy: 4000,  sell: 20000 }, { price: "108.00", buy: 8000,  sell: 25000 },
      { price: "107.50", buy: 14000, sell: 28000 }, { price: "107.00", buy: 18000, sell: 32000 },
      { price: "106.50", buy: 10000, sell: 22000 }, { price: "106.00", buy: 28000, sell: 12000 },
      { price: "105.50", buy: 35000, sell: 8000  }, { price: "105.00", buy: 40000, sell: 5000  },
    ]
  },
};

// ─── FULLSCREEN SYMBOL INPUT ─────────────────────────────────
function FullscreenSymbolInput({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const committed = useRef(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (value === "" && committed.current !== "") {
      setQuery("");
      committed.current = "";
    }
  }, [value]);

  const STOCK_LIST = [
    "PTT","TOP","DELTA","AOT","ADVANC","SCB","KBANK","BBL","KTB","BAY",
    "CPALL","CPN","CRC","HMPRO","BJC","IVL","SCC","SCCC","TISCO","KKP",
    "1DIV","NVDA","TSLA"
  ];

  const filtered = useMemo(() => {
    if (!query) return STOCK_LIST.slice(0, 10);
    const q = query.toUpperCase();
    const starts   = STOCK_LIST.filter((s) => s.startsWith(q));
    const contains = STOCK_LIST.filter((s) => !s.startsWith(q) && s.includes(q));
    return [...starts, ...contains].slice(0, 9);
  }, [query]);

  const commit = useCallback((sym) => {
    const v = sym.toUpperCase();
    setQuery(v);
    committed.current = v;
    onChange(v);
    setOpen(false);
    setHiIdx(-1);
  }, [onChange]);

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHiIdx((h) => Math.min(h + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx((h) => Math.max(h - 1, -1)); return; }
    if (e.key === "Tab")       { if (filtered.length > 0) { e.preventDefault(); commit(filtered[0]); } return; }
    if (e.key === "Enter")     { if (hiIdx >= 0 && filtered[hiIdx]) commit(filtered[hiIdx]); else if (query.trim()) commit(query.trim()); }
  };

  useEffect(() => {
    const fn = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setQuery(committed.current); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      <div className="relative w-56">
        <div className={`flex items-center gap-2 bg-[#1a2235] border rounded-lg px-3 py-1.5 transition-all ${open ? "border-cyan-500/60" : "border-slate-700 hover:border-slate-500"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" className="flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value.toUpperCase()); setOpen(true); setHiIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder="พิมพ์ชื่อหุ้น..."
            className={`flex-1 bg-transparent text-sm outline-none placeholder-slate-600 pr-6 ${value && !open ? "font-bold text-white" : "text-white"}`}
          />
          {query && (
            <button onMouseDown={() => commit("")} className="absolute right-3 text-slate-600 hover:text-slate-300 text-sm transition-colors flex-shrink-0">✕</button>
          )}
        </div>
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-[#0d1526] border border-slate-600/60 rounded-xl shadow-2xl z-[200] overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-slate-600 text-[11px] text-center">ไม่พบ — กด Enter เพื่อใช้ "{query}"</div>
            ) : filtered.map((sym, idx) => {
              const isHi = idx === hiIdx;
              return (
                <div key={sym} onMouseDown={() => commit(sym)} onMouseEnter={() => setHiIdx(idx)}
                  className={`px-4 py-2.5 cursor-pointer text-sm font-bold tracking-wider transition-all ${isHi ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-white" : "border-l-2 border-transparent text-slate-300 hover:bg-slate-800/40"}`}>
                  {sym}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TickMatch() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [isMember, setIsMember]       = useState(false);
  const [enteredTool, setEnteredTool] = useState(false);
  const [showLeft, setShowLeft]       = useState(false);
  const [showRight, setShowRight]     = useState(true);

  const scrollDirection = useRef(1);
  const isPaused        = useRef(false);

  const { accessData, isFreeAccess, currentUser } = useSubscription();

  useEffect(() => {
    if (isFreeAccess) { setIsMember(true); return; }
    const toolId = 'tickmatch';
    if (accessData && accessData[toolId]) {
      const expireTimestamp = accessData[toolId];
      let expireDate;
      try {
        expireDate = typeof expireTimestamp.toDate === 'function' ? expireTimestamp.toDate() : new Date(expireTimestamp);
      } catch (e) { expireDate = new Date(0); }
      setIsMember(expireDate.getTime() > new Date().getTime());
    } else {
      setIsMember(false);
    }
  }, [accessData, isFreeAccess]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeft(scrollLeft > 1);
      setShowRight(!(Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 2));
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      isPaused.current = true;
      const scrollAmount = 350;
      if (direction === "left") { scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" }); scrollDirection.current = -1; }
      else                      { scrollContainerRef.current.scrollBy({ left:  scrollAmount, behavior: "smooth" }); scrollDirection.current =  1; }
      setTimeout(checkScroll, 300);
      setTimeout(() => { isPaused.current = false; }, 500);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const id = setInterval(() => {
      if (isPaused.current || !container) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      if (scrollDirection.current === 1  && Math.ceil(scrollLeft) >= maxScroll - 2) scrollDirection.current = -1;
      if (scrollDirection.current === -1 && scrollLeft <= 2)                        scrollDirection.current =  1;
      container.scrollLeft += scrollDirection.current;
      checkScroll();
    }, 15);
    return () => clearInterval(id);
  }, [isMember, enteredTool]);

  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  function FitText({ value, className }) {
    const spanRef = useRef(null);
    useEffect(() => {
      const el = spanRef.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      let size = 13;
      el.style.fontSize = size + "px";
      while (el.scrollWidth > parent.clientWidth && size > 8) { size -= 0.5; el.style.fontSize = size + "px"; }
    }, [value]);
    return <span ref={spanRef} className={className} style={{ whiteSpace: 'nowrap', display: 'block' }}>{value}</span>;
  }

  const AnalysisPanel = ({ defaultSymbol = "", defaultDate = "", toolHint }) => {
    const [hasSearched,        setHasSearched]        = useState(false);
    const [isSynced,           setIsSynced]            = useState(true);
    const [symbol,             setSymbol]              = useState(defaultSymbol);
    const [showSymbolDropdown, setShowSymbolDropdown]  = useState(false);
    const [symbolHistory,      setSymbolHistory]       = useState([]);
    const [filteredSymbols,    setFilteredSymbols]     = useState([]);
    const [date,               setDate]                = useState(defaultDate);
    const [activeSymbol,       setActiveSymbol]        = useState(defaultSymbol);
    const [isSyncing,          setIsSyncing]           = useState(false);
    const [isFlipOpen,         setIsFlipOpen]          = useState(true);
    const [isChartModalOpen,   setIsChartModalOpen]    = useState(false);
    const [activeFilter,       setActiveFilter]        = useState("all");

    const todayMax = new Date().toISOString().split("T")[0];

    useEffect(() => {
      const saved = localStorage.getItem("tickmatch_symbol_history");
      if (saved) setSymbolHistory(JSON.parse(saved));
    }, []);

    useEffect(() => {
      if (!symbol.trim()) { setFilteredSymbols(symbolHistory); return; }
      setFilteredSymbols(symbolHistory.filter(item => item.toLowerCase().includes(symbol.toLowerCase())));
    }, [symbol, symbolHistory]);

    useEffect(() => {
      const handleEsc = (e) => { if (e.key === "Escape" && isChartModalOpen) setIsChartModalOpen(false); };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }, [isChartModalOpen]);

    const handleSearch = () => {
      if (!symbol.trim()) return;
      setIsSyncing(true);
      setTimeout(() => {
        setHasSearched(true);
        setActiveSymbol(symbol.toUpperCase());
        const updated = [symbol.toUpperCase(), ...symbolHistory.filter(s => s !== symbol.toUpperCase())].slice(0, 10);
        setSymbolHistory(updated);
        localStorage.setItem("tickmatch_symbol_history", JSON.stringify(updated));
        setIsSyncing(false);
      }, 800);
    };

    const data = mockDatabase[activeSymbol?.toUpperCase()] || mockDatabase[""];

    const filteredTicks = data.ticks.filter(tick => {
      const vol = parseInt(tick.vol.replace(/,/g, "")) || 0;
      if (activeFilter === "buy")   return tick.type === "B";
      if (activeFilter === "sell")  return tick.type === "S";
      if (activeFilter === ">100k") return vol > 100000;
      return true;
    });

    const totalBuy   = parseInt(data.sumBuy.replace(/,/g, ""))  || 0;
    const totalSell  = parseInt(data.sumSell.replace(/,/g, "")) || 0;
    const total      = totalBuy + totalSell;
    const buyPercent = total === 0 ? 50 : (totalBuy / total) * 100;

    // ─── Chart Modal rendered via Portal to document.body ───────────────
    const chartModal = isChartModalOpen && createPortal(
      <div className="fixed inset-0 bg-[#0d1117] z-[9999] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-slate-800 flex-shrink-0">
          <button onClick={() => setIsChartModalOpen(false)}
            className="flex items-center gap-1.5 bg-[#1f2937] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-all flex-shrink-0">
            ← Back
          </button>
          <button onClick={() => { setIsSyncing(true); setTimeout(() => setIsSyncing(false), 500); }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-all flex-shrink-0" title="รีเฟรชข้อมูล">
            🔄
          </button>
          <FullscreenSymbolInput value={activeSymbol} onChange={(v) => {
            setSymbol(v);
            if (v.trim()) {
              setActiveSymbol(v.toUpperCase());
              setHasSearched(true);
              const updated = [v.toUpperCase(), ...symbolHistory.filter(s => s !== v.toUpperCase())].slice(0, 10);
              setSymbolHistory(updated);
              localStorage.setItem("tickmatch_symbol_history", JSON.stringify(updated));
            }
          }} />
          <h2 className="flex-1 text-center text-lg font-bold text-white tracking-widest uppercase">
            {activeSymbol || "PRICE DISTRIBUTION"}
          </h2>
        </div>
        <div className="flex-1 min-h-0 bg-[#0d1117] p-6">
          <div className="w-full h-full bg-[#111827] border border-slate-700 rounded-xl p-4">
            <GroupedHistogram data={data.charts || []} />
          </div>
        </div>
      </div>,
      document.body
    );

    return (
      <>
        <div className="relative flex flex-col h-full bg-[#111827] border border-slate-700 rounded-lg shadow-lg z-10" style={scrollbarHideStyle}>

          {isSyncing && (
            <div className="absolute inset-0 bg-[#111827]/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {toolHint && (
            <div className="absolute -top-3 -left-3 z-50 shadow-lg rounded-full">{toolHint}</div>
          )}

          {/* Header */}
          <div className="shrink-0 rounded-t-lg">
            <div className="flex items-end gap-1.5 px-2 pt-4 pb-2 bg-[#111827] rounded-t-lg">

              {/* SYNC */}
              <div className="shrink-0 w-[18%] max-w-[65px]">
                <button onClick={() => setIsSynced(!isSynced)}
                  className={`w-full h-[34px] px-1 flex items-center justify-center gap-1 text-[8px] md:text-[10px] font-bold rounded transition-all duration-200 ${isSynced ? "bg-[#0E3A6D] hover:bg-[#124a8a] text-white" : "bg-[#8FA3B5] hover:bg-[#7f95a8] text-white"}`}>
                  {isSynced ? <><LinkOutlinedIcon sx={{ fontSize: 12, opacity: 0.95 }} /><span>SYNC</span></> : <><LinkOffOutlinedIcon sx={{ fontSize: 12, opacity: 0.9 }} /><span>UNSYNC</span></>}
                </button>
              </div>

              {/* SYMBOL */}
              <div className="flex-[1.2] min-w-0 flex flex-col pl-1">
                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1 ml-0.5">Symbol *</label>
                <div className="relative w-full">
                  <input value={symbol} placeholder=" "
                    onChange={(e) => { setSymbol(e.target.value); setShowSymbolDropdown(true); }}
                    onFocus={() => setShowSymbolDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 150)}
                    className="w-full h-[34px] bg-[#0B1221] border border-slate-700 rounded px-1.5 text-white text-[10px] md:text-xs uppercase outline-none focus:border-blue-500 pr-5 transition-colors"
                  />
                  {symbol && (
                    <button onMouseDown={() => { setSymbol(""); setShowSymbolDropdown(false); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1">✕</button>
                  )}
                  {showSymbolDropdown && filteredSymbols.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {filteredSymbols.map((item, index) => (
                        <div key={index} onClick={() => { setSymbol(item); setShowSymbolDropdown(false); }}
                          className="px-3 py-2 text-xs text-white hover:bg-indigo-600 cursor-pointer transition">{item}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DATE */}
              <div className="flex-[1.2] min-w-0 flex flex-col">
                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1 ml-0.5">Date</label>
                <input type="date" value={date} max={todayMax} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-[34px] bg-[#0B1221] border border-slate-700 rounded px-1 text-white text-[9px] sm:text-[11px] outline-none focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>

              {/* SEARCH */}
              <div className="shrink-0 w-[20%] max-w-[75px]">
                <button onClick={handleSearch} disabled={isSyncing}
                  className="w-full h-[34px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] md:text-xs rounded transition active:scale-95 disabled:opacity-50">
                  SEARCH
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="px-3 pb-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1e1e1e] border border-green-900/50 rounded p-2 flex flex-col relative overflow-hidden min-w-0">
                  <span className="text-[10px] text-slate-400">Sum Buy</span>
                  <FitText value={data.sumBuy} className={`font-bold ${activeSymbol ? 'text-green-500' : 'text-white'}`} />
                  <div className="absolute bottom-0 left-0 h-[2px] bg-green-500 w-full"></div>
                </div>
                <div className="bg-[#1e1e1e] border border-green-900/50 rounded p-2 flex flex-col relative overflow-hidden min-w-0">
                  <span className="text-[10px] text-slate-400">Sum Sell</span>
                  <FitText value={data.sumSell} className={`font-bold ${activeSymbol ? 'text-red-500' : 'text-white'}`} />
                  <div className="absolute bottom-0 left-0 h-[2px] bg-red-500 w-full"></div>
                </div>
                <div className="bg-[#1e1e1e] border border-green-900/50 rounded p-2 flex flex-col relative overflow-hidden min-w-0">
                  <span className="text-[10px] text-slate-400">Net Acc. Vol</span>
                  <FitText value={data.netVol} className={`font-bold ${data.netVol === "0" ? 'text-white' : data.netVol.includes('-') ? 'text-red-500' : 'text-green-500'}`} />
                  <div className={`absolute bottom-0 left-0 h-[2px] w-full ${data.netVol === "0" ? 'bg-slate-500' : data.netVol.includes('-') ? 'bg-red-500' : 'bg-green-500'}`}></div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-3 pb-2">
              <div className="w-full h-1 bg-red-600 rounded-full flex overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${buyPercent}%` }}></div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-3 pb-2">
              <div className="flex gap-2">
                {[["all","All","bg-slate-700"],["buy","Buy Only","bg-green-700"],["sell","Sell Only","bg-red-700"],[">100k","> 100K","bg-blue-700"]].map(([val, label, activeClass]) => (
                  <button key={val} onClick={() => setActiveFilter(val)}
                    className={`text-[10px] px-3 py-1 rounded transition ${activeFilter === val ? `${activeClass} text-white` : "bg-[#1f2937] text-slate-400 border border-slate-600 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 touch-pan-y overscroll-none rounded-b-lg" style={scrollbarHideStyle}>

            {/* Tick Table */}
            <div className="rounded overflow-hidden border border-slate-800/50 bg-[#0B1221]">
              <div className="bg-[#1f2937] grid grid-cols-5 text-slate-400 text-[10px] font-medium border-b border-slate-800 sticky top-0 z-10">
                <div className="p-2 text-center">Time</div>
                <div className="p-2 text-right">Last</div>
                <div className="p-2 text-right">Vol</div>
                <div className="p-2 text-center">Type</div>
                <div className="p-2 text-right">Sum</div>
              </div>
              <div className="overflow-y-auto max-h-[200px] touch-pan-y overscroll-none" style={scrollbarHideStyle}>
                {filteredTicks.length > 0 ? filteredTicks.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-5 text-xs font-mono text-slate-300 border-b border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <div className="p-2 text-center text-slate-400">{row.time}</div>
                    <div className="p-2 text-right text-yellow-500">{row.last}</div>
                    <div className="p-2 text-right font-bold text-slate-200">{row.vol}</div>
                    <div className="p-2 flex justify-center items-center">
                      <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-black ${row.type === 'B' ? 'bg-green-500' : 'bg-red-500'}`}>{row.type}</span>
                    </div>
                    <div className="p-2 text-right truncate min-w-0 max-w-[60px]">{row.sum}</div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-slate-500 text-xs">No tick data available</div>
                )}
              </div>
            </div>

            {/* Flip Section */}
            {hasSearched && (
              <div className="bg-[#0B1221] border border-slate-800/50 rounded overflow-hidden">
                <div onClick={() => setIsFlipOpen(!isFlipOpen)} className="bg-[#374151] p-3 flex justify-between items-center cursor-pointer hover:bg-[#414b5c] transition">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">Total Flip Count: {data.flips.length}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-red-500 rounded-sm"></div><span className="text-slate-300">Net Vol {'<'} 0</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-green-500 rounded-sm"></div><span className="text-slate-300">Net Vol {'>'} 0</span></div>
                    </div>
                  </div>
                  <ExpandMoreIcon sx={{ fontSize: 20, transition: 'transform 0.3s ease', transform: isFlipOpen ? 'rotate(0deg)' : 'rotate(-90deg)', color: '#e2e8f0' }} />
                </div>

                {isFlipOpen && (
                  <>
                    <div className="p-3 border-b border-slate-700/50 bg-[#111827]">
                      <div className="relative w-full h-2 bg-slate-700 rounded-full mb-6">
                        {data.flips.map((flip, idx) => {
                          const position   = data.flips.length > 1 ? (idx / (data.flips.length - 1)) * 100 : 50;
                          const isNegative = flip.to.includes('-');
                          return (
                            <div key={idx} className="absolute top-0 group/marker" style={{ left: `${position}%` }}>
                              <div className={`w-1 h-2 transition-all hover:h-3 hover:-translate-y-0.5 cursor-pointer ${isNegative ? 'bg-red-500' : 'bg-green-500'}`} />
                              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                <div className="bg-slate-900 border border-slate-700 text-white text-[10px] px-3 py-2 rounded shadow-xl">
                                  <div className="font-bold mb-1">ครั้งที่ {flip.id}</div>
                                  <div className="text-slate-400">Time: {flip.time}</div>
                                  <div className="mt-1 pt-1 border-t border-slate-700">
                                    <div>From: <span className={flip.from.includes('-') ? 'text-red-400' : 'text-green-400'}>{flip.from}</span></div>
                                    <div>To: <span className={flip.to.includes('-') ? 'text-red-400' : 'text-green-400'}>{flip.to}</span></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 -mt-2">
                        <span>10:12</span><span>10:42</span><span>12:20</span><span>14:00</span><span>14:30</span><span>15:01</span>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[180px] touch-pan-y overscroll-none" style={scrollbarHideStyle}>
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-[#1f2937] text-slate-400 text-[10px] font-medium sticky top-0 z-10">
                          <tr><th className="p-1.5">ครั้งที่</th><th className="p-1.5">Time</th><th className="p-1.5">From Acc. Vol</th><th className="p-1.5">To Acc. Vol</th></tr>
                        </thead>
                        <tbody className="text-xs">
                          {data.flips.length > 0 ? data.flips.map((flip) => (
                            <tr key={flip.id} className="border-b border-slate-800/30 hover:bg-slate-800/50 transition-colors">
                              <td className="p-1.5 text-slate-400">{flip.id}</td>
                              <td className="p-1.5 text-yellow-500">{flip.time}</td>
                              <td className={`p-1.5 ${flip.from.includes('-') ? 'text-red-400' : 'text-green-400'}`}>{flip.from}</td>
                              <td className={`p-1.5 ${flip.to.includes('-') ? 'text-red-400' : 'text-green-400'}`}>{flip.to}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan="4" className="p-6 text-slate-500 text-xs">No Flip Data</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Chart Section */}
            {hasSearched && (
              <div className="bg-[#0B1221] border border-slate-800/50 rounded overflow-hidden">
                <div className="bg-[#1f2937] p-2 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-semibold">Buy Volume</span>
                    <div className="w-3 h-3 rounded-full bg-red-500 ml-2"></div>
                    <span className="text-[10px] font-semibold">Sell Volume</span>
                  </div>
                  <button onClick={() => setIsChartModalOpen(true)} className="p-1.5 hover:bg-slate-700 rounded transition" title="ซูม Chart">
                    <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                  </button>
                </div>
                <div className="h-[200px]">
                  <GroupedHistogram data={data.charts || []} height={200} />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ✅ Chart Modal — rendered via Portal to document.body (fixes overlap) */}
        {chartModal}
      </>
    );
  };

  /* ── Preview / Start screen shared markup ── */
  const PreviewLayout = ({ showStartButton }) => (
    <div className="relative w-full min-h-screen text-white overflow-x-hidden animate-fade-in pb-20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">

        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">TickMatch</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-light">Tracking "Big Money" Footprints</p>
        </div>

        <div className="relative group w-full max-w-5xl mb-16">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
          <div className="relative h-[450px] md:h-[650px] flex flex-col bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex-none bg-[#0f172a] px-4 py-3 border-b border-slate-700/50 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <div className="flex-1 overflow-hidden bg-[#0B1221] pointer-events-none">
              <div className="w-full h-[900px] opacity-90 group-hover:opacity-100 transition duration-500">
                <TickMatchDashboard />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-left border-l-4 border-cyan-500 pl-4">4 Main Features</h2>
          <div className="relative group w-full" onMouseEnter={() => isPaused.current = true} onMouseLeave={() => isPaused.current = false}>
            <button onClick={() => scroll("left")} aria-label="Scroll Left"
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showLeft ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div ref={scrollContainerRef} onScroll={checkScroll} className="flex overflow-x-auto gap-6 py-4 px-1 hide-scrollbar" style={scrollbarHideStyle}>
              {features.map((item, index) => (
                <div key={index} className="w-[350px] md:w-[400px] flex-shrink-0 group/card bg-[#0f172a]/60 border border-slate-700/50 p-8 rounded-xl hover:bg-[#1e293b]/60 hover:border-cyan-500/30 transition duration-300">
                  <h3 className="text-xl font-bold text-white mb-3 group-hover/card:text-cyan-400 transition-colors">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => scroll("right")} aria-label="Scroll Right"
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-20 z-20 w-12 h-12 rounded-2xl bg-[#0f172a]/90 border border-slate-600 text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 backdrop-blur-sm active:scale-95 ${showRight ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {showStartButton ? (
          <div className="flex gap-4 justify-center w-full">
            <button onClick={() => { setEnteredTool(true); localStorage.setItem("tickToolEntered", "true"); }}
              className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300">
              <span className="mr-2">Start Using Tool</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        ) : (
          <div className="text-center w-full max-w-md mx-auto mt-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!currentUser && (
                <button onClick={() => navigate("/login")}
                  className="w-full md:w-auto px-8 py-3 rounded-full bg-slate-800 text-white font-semibold border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">
                  Sign In
                </button>
              )}
              <button onClick={() => navigate("/member-register")}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:brightness-110 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300">
                Join Membership
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isMember)               return <PreviewLayout showStartButton={false} />;
  if (isMember && !enteredTool) return <PreviewLayout showStartButton={true}  />;

  /* ── CASE 3: Full Dashboard ── */
  const todayStr = new Date().toISOString().split('T')[0];
  return (
    <div className="w-full min-h-screen bg-[#0b111a] text-white p-3 sm:p-6 flex flex-col pb-24">
      <div className="max-w-[1600px] w-full mx-auto flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <AnalysisPanel defaultSymbol="" defaultDate={todayStr}
            toolHint={
              <ToolHint onViewDetails={() => { setEnteredTool(false); window.scrollTo({ top: 0 }); }}>
                Match tick-by-tick data patterns, recognize trading flow correlations, detect relationships between assets, and analyze pattern-based insights
              </ToolHint>
            }
          />
          <AnalysisPanel defaultSymbol="" defaultDate={todayStr} />
        </div>
      </div>
    </div>
  );
}