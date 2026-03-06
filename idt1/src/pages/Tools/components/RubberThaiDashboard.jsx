import React, { useState } from 'react';
import {
  AreaChart, Area, CartesianGrid, Tooltip,
  ResponsiveContainer, XAxis, YAxis
} from 'recharts';
import { ChevronDown } from 'lucide-react';

// --- Mock Data (dense daily-like dates) ---
const dates = [
  '02/06/24','05/06/24','08/06/24','11/06/24','14/06/24','17/06/24','20/06/24',
  '23/06/24','26/06/24','29/06/24','02/07/24','05/07/24','08/07/24','11/07/24',
  '14/07/24','17/07/24','20/07/24','23/07/24','26/07/24','29/07/24','01/08/24',
  '04/08/24','07/08/24','10/08/24','13/08/24','16/08/24','19/08/24','22/08/24','25/08',
];

const closeValues = [
  79.8,79.4,79.0,78.6,77.8,77.2,76.5,75.9,75.2,74.7,74.0,73.5,73.0,72.5,
  72.0,71.8,71.5,72.0,72.8,73.5,74.5,75.5,76.8,77.5,78.2,78.8,79.0,79.1,79.13,
];

const rubberValues = [
  59.5,59.8,60.5,61.2,62.0,63.5,64.8,66.0,67.2,67.8,67.0,66.2,65.0,63.5,
  62.0,61.5,61.0,60.5,60.2,60.0,60.5,61.2,61.8,62.2,62.5,62.8,62.9,63.0,62.97,
];

const dataClose   = dates.map((name, i) => ({ name, value: closeValues[i] ?? null }));
const dataRubber  = dates.map((name, i) => ({ name, value: rubberValues[i] ?? null }));

// Y ticks matching screenshot
const closeYTicks   = [58.92, 65.68, 72.44, 79.20, 85.96];
const rubberYTicks  = [52.13, 56.29, 60.44, 64.60, 68.76];

// Custom tooltip
function CustomTooltip({ active, payload, label, color }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0e1118', border: '1px solid #1e293b',
        borderRadius: 6, padding: '7px 12px', fontSize: 11,
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
      }}>
        <div style={{ color: '#64748b', marginBottom: 4 }}>{label}</div>
        <div style={{ color: color, fontWeight: 700, fontSize: 13 }}>
          {payload[0].value?.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
}

// Chart panel matching screenshot layout
function ChartPanel({ title, data, color, gradId, yTicks, currentValue, change, changePct, isUp }) {
  const lastDot = data[data.length - 1];
  const yMin = Math.min(...yTicks);
  const yMax = Math.max(...yTicks);

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1a2332',
      borderRadius: 14,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px 0 20px', zIndex: 5,
      }}>
        <span style={{
          color: '#fff', fontWeight: 800, fontSize: 13,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color, fontWeight: 800, fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}>
            {currentValue}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isUp ? '#166534' : '#7f1d1d',
            borderRadius: 6, padding: '4px 10px',
          }}>
            <span style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: 700 }}>
              {isUp ? '▲' : '▼'} {change} ({changePct})
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 280, paddingRight: 55, paddingTop: 8, paddingBottom: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#111c2a" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false} tickLine={false}
              tick={{ fill: '#334155', fontSize: 9 }}
              dy={8}
              interval={1}
            />
            <YAxis
              orientation="right"
              domain={[yMin - 0.5, yMax + 0.5]}
              ticks={yTicks}
              axisLine={false} tickLine={false}
              tick={{ fill: '#334155', fontSize: 10 }}
              width={0}
            />
            <Tooltip
              content={<CustomTooltip color={color} />}
              cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 5, fill: '#0d1117', stroke: color, strokeWidth: 2 }}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={2000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Right Y-axis panel */}
      <div style={{
        position: 'absolute', right: 0, top: 42, height: 280,
        width: 58, background: '#0d1117',
        borderLeft: '1px solid #111c2a',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        paddingLeft: 6, paddingRight: 6,
        zIndex: 10, pointerEvents: 'none',
      }}>
        {[...yTicks].reverse().map((t, i) => (
          <span key={i} style={{ color: '#334155', fontSize: 10, textAlign: 'right', display: 'block' }}>
            {t.toFixed(2)}
          </span>
        ))}
      </div>

      {/* Last value dot + badge */}
      <div style={{
        position: 'absolute',
        right: 58,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', gap: 0,
        pointerEvents: 'none', zIndex: 20,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, border: '2px solid #0d1117',
          boxShadow: `0 0 6px ${color}`,
        }} />
        <div style={{
          background: color, color: '#000',
          fontWeight: 800, fontSize: 11,
          borderRadius: 5, padding: '3px 8px',
          marginLeft: 2,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {currentValue}
        </div>
      </div>
    </div>
  );
}

export default function RubberDashboard() {
  const [symbol, setSymbol] = useState('');

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      background: '#080c12',
      padding: '20px 24px',
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>

      {/* TOP BAR - Symbol selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#0d1520', border: '1px solid #1a2a3a',
          borderRadius: 8, padding: '10px 14px', minWidth: 200,
        }}>
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            placeholder="Type a Symbol..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 13, width: '100%',
              fontFamily: 'inherit',
            }}
          />
          <ChevronDown size={14} color="#334155" />
        </div>
      </div>

      {/* CHART 1 — CLOSE (24CS) */}
      <ChartPanel
        title="Close (24CS)"
        data={dataClose}
        color="#22c55e"
        gradId="gradClose"
        yTicks={closeYTicks}
        currentValue="79.13"
        change="10.36"
        changePct="+15.06%"
        isUp={true}
      />

      {/* CHART 2 — RUBBER THAI PRICE */}
      <ChartPanel
        title="Rubber Thai Price"
        data={dataRubber}
        color="#eab308"
        gradId="gradRubber"
        yTicks={rubberYTicks}
        currentValue="62.97"
        change="5.07"
        changePct="+8.76%"
        isUp={true}
      />

    </div>
  );
}