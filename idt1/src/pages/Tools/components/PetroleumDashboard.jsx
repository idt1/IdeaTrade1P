import React, { useState } from 'react';
import { ChevronDown, X, TrendingUp } from 'lucide-react';

import { AreaLWC, LineLWC } from '../../../components/LWChart';
// --- Mock Data (matching screenshot shape) ---

const dataRefin = [
  { time: '2024-08-01',  value: 15.2 },
  { time: '2024-08-26', value: 14.9 },
  { time: '2024-09-02', value: 15.0 },
  { time: '2024-09-09', value: 14.7 },
  { time: '2024-09-16', value: 15.3 },
  { time: '2024-09-23', value: 15.8 },
  { time: '2024-09-30', value: 16.2 },
  { time: '2024-10-07', value: 15.9 },
  { time: '2024-10-14', value: 15.7 },
  { time: '2024-10-21', value: 16.0 },
  { time: '2024-10-28', value: 16.4 },
  { time: '2024-11-04', value: 16.6 },
  { time: '2024-11-11', value: 16.83 },
];

const dataMargin = [
  { time: '2024-08-01',  value: 0.55 },
  { time: '2024-08-26', value: 0.58 },
  { time: '2024-09-02', value: 0.62 },
  { time: '2024-09-09', value: 0.65 },
  { time: '2024-09-16', value: 0.68 },
  { time: '2024-09-23', value: 0.67 },
  { time: '2024-09-30', value: 0.64 },
  { time: '2024-10-07', value: 0.61 },
  { time: '2024-10-14', value: 0.58 },
  { time: '2024-10-21', value: 0.56 },
  { time: '2024-10-28', value: 0.57 },
  { time: '2024-11-04', value: 0.60 },
  { time: '2024-11-11', value: 0.62 },
];

const dataFund = [
  { time: '2024-08-01',  value: 11.10 },
  { time: '2024-08-26', value: 11.10 },
  { time: '2024-09-02', value: 11.10 },
  { time: '2024-09-09', value: 11.10 },
  { time: '2024-09-16', value: 15.00 },
  { time: '2024-09-23', value: 15.00 },
  { time: '2024-09-30', value: 15.00 },
  { time: '2024-10-07', value: 15.00 },
  { time: '2024-10-14', value: 15.00 },
  { time: '2024-10-21', value: 11.10 },
  { time: '2024-10-28', value: 11.10 },
  { time: '2024-11-04', value: 11.10 },
  { time: '2024-11-11', value: 18.00 },
];

const ACCENT = '#00e676';
const ACCENT_DIM = 'rgba(0,230,118,0.15)';
const BG_CARD = '#0d1117';
const BG_DARK = '#080c10';
const BORDER = '#1e2d3d';
const TEXT_DIM = '#4a6080';

// Custom Y-axis tick (right side)
function RightTick({ x, y, payload }) {
  return (
    <text x={x + 4} y={y} fill={TEXT_DIM} fontSize={10} textAnchor="start" dominantBaseline="middle">
      {payload.value.toFixed(2)}
    </text>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0d1117',
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 11,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
      }}>
        <div style={{ color: TEXT_DIM, marginBottom: 2 }}>{label}</div>
        <div style={{ color: ACCENT, fontWeight: 700, fontSize: 13 }}>
          {payload[0].value.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
}

// Last-value badge on the right edge of chart
function LastValueBadge({ value }) {
  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      background: ACCENT,
      color: '#000',
      fontWeight: 800,
      fontSize: 11,
      borderRadius: 4,
      padding: '2px 6px',
      pointerEvents: 'none',
      zIndex: 20,
      letterSpacing: '0.02em',
    }}>
      {value}
    </div>
  );
}

// Chart panel component
function ChartPanel({ title, data, isStep = false }) {
  const gradId = `grad_${title.replace(/\s+/g, '_')}`;
  const lastVal = data[data.length - 1]?.value ?? 0;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const pad = (maxV - minV) * 0.15 || 0.5;

  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 280,
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute', top: 14, left: 16, zIndex: 10,
        color: TEXT_DIM, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        {title}
      </div>

      {/* Watermark */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', opacity: 0.025, zIndex: 1,
      }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 4 }}>
          {title}
        </span>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, paddingTop: 36, paddingBottom: 8, paddingRight: 52, position: 'relative', zIndex: 5 }}>
        {isStep
          ? <LineLWC series={[{ data, color: ACCENT, lineWidth: 2 }]} height={220} />
          : <AreaLWC data={data} color={ACCENT} height={220} />
        }
      </div>

      {/* Right side Y-axis labels + badge */}
      <div style={{
        position: 'absolute', right: 0, top: 36, bottom: 28,
        width: 52, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', paddingRight: 6,
        alignItems: 'flex-end', zIndex: 15, pointerEvents: 'none',
      }}>
        {/* Top value */}
        <span style={{ color: TEXT_DIM, fontSize: 10 }}>{(maxV + pad * 0.5).toFixed(2)}</span>
        {/* Badge at ~middle */}
        <div style={{
          background: ACCENT, color: '#000', fontWeight: 800,
          fontSize: 11, borderRadius: 4, padding: '2px 7px',
          letterSpacing: '0.01em', marginRight: -6,
        }}>
          {lastVal.toFixed(2)}
        </div>
        {/* Bottom value */}
        <span style={{ color: TEXT_DIM, fontSize: 10 }}>{(minV - pad * 0.5).toFixed(2)}</span>
      </div>
    </div>
  );
}

// Main Dashboard
export default function PetroleumDashboard() {
  const [activePeriod, setActivePeriod] = useState('MAX');
  const [symbol, setSymbol] = useState('EA');

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      background: BG_DARK, color: '#fff',
      padding: '16px 20px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      boxSizing: 'border-box',
    }}>

      {/* TOP BAR */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, marginBottom: 14, flexWrap: 'wrap',
      }}>
        {/* Left: Symbol input + Oil type selector */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Symbol Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '6px 10px', minWidth: 160,
          }}>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="Type a Symbol..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 13, fontWeight: 700, width: 80,
                fontFamily: 'inherit',
              }}
            />
            <X size={12} style={{ color: TEXT_DIM, cursor: 'pointer' }} />
            <div style={{ width: 1, height: 14, background: BORDER }} />
            <ChevronDown size={12} style={{ color: TEXT_DIM }} />
          </div>

          {/* Oil Type selector */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '6px 10px', minWidth: 260,
          }}>
            {/* Selected tag */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#111b27', border: `1px solid ${BORDER}`,
              borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700,
              color: '#fff',
            }}>
              1 Selected (GASOHOL95 E20)
              <X size={10} style={{ color: TEXT_DIM, cursor: 'pointer', marginLeft: 2 }} />
            </div>
            <ChevronDown size={12} style={{ color: TEXT_DIM, marginLeft: 'auto' }} />
          </div>
        </div>

        {/* Right: Time period buttons */}
        <div style={{
          display: 'flex', background: '#0b0f16',
          border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: 3, gap: 2,
        }}>
          {['3M', '6M', '1Y', 'YTD', 'MAX'].map(t => (
            <button
              key={t}
              onClick={() => setActivePeriod(t)}
              style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.05em',
                transition: 'all 0.15s',
                background: activePeriod === t ? ACCENT : 'transparent',
                color: activePeriod === t ? '#000' : TEXT_DIM,
                outline: activePeriod === t ? `1px solid ${ACCENT}` : 'none',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN 2x2 GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'repeat(2, minmax(280px, 1fr))',
        gap: 12,
      }}>

        {/* TOP-LEFT: Big Price */}
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '20px 24px', textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle radial glow */}
          <div style={{
            position: 'absolute', bottom: '50%', left: '50%', transform: 'translate(-50%, 50%)',
            width: 300, height: 300,
            background: `radial-gradient(circle, rgba(0,230,118,0.07) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>
            GASOHOL95 E20
          </div>

          <div style={{
            fontSize: 64, fontWeight: 900, color: ACCENT,
            lineHeight: 1, letterSpacing: '-0.02em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            138.35
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} color={ACCENT} />
              <span style={{ color: ACCENT, fontWeight: 700, fontSize: 14 }}>
                ▲ 2.32 (+1.71%)
              </span>
            </div>
            <span style={{ color: TEXT_DIM, fontSize: 11 }}>11/11/24</span>
          </div>
        </div>

        {/* TOP-RIGHT: EX-REFIN */}
        <ChartPanel title="EX-REFIN" data={dataRefin} isStep={false} />

        {/* BOTTOM-LEFT: Marketing Margin */}
        <ChartPanel title="Marketing Margin" data={dataMargin} isStep={false} />

        {/* BOTTOM-RIGHT: Oil Fund (step chart) */}
        <ChartPanel title="Oil Fund" data={dataFund} isStep={true} />

      </div>
    </div>
  );
}