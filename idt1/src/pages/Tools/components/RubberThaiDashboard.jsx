import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AreaLWC } from '../../../components/LWChart';

const dates = [
  '02/06/24','05/06/24','08/06/24','11/06/24','14/06/24','17/06/24','20/06/24',
  '23/06/24','26/06/24','29/06/24','02/07/24','05/07/24','08/07/24','11/07/24',
  '14/07/24','17/07/24','20/07/24','23/07/24','26/07/24','29/07/24','01/08/24',
  '04/08/24','07/08/24','10/08/24','13/08/24','16/08/24','19/08/24','22/08/24','25/08/24',
];
const closeValues = [79.8,79.4,79.0,78.6,77.8,77.2,76.5,75.9,75.2,74.7,74.0,73.5,73.0,72.5,72.0,71.8,71.5,72.0,72.8,73.5,74.5,75.5,76.8,77.5,78.2,78.8,79.0,79.1,79.13];
const rubberValues = [59.5,59.8,60.5,61.2,62.0,63.5,64.8,66.0,67.2,67.8,67.0,66.2,65.0,63.5,62.0,61.5,61.0,60.5,60.2,60.0,60.5,61.2,61.8,62.2,62.5,62.8,62.9,63.0,62.97];

function toISO(str) { const [dd,mm,yy] = str.split('/'); return `20${yy}-${mm}-${dd}`; }
const dataClose  = dates.map((d,i) => ({ time: toISO(d), value: closeValues[i] }));
const dataRubber = dates.map((d,i) => ({ time: toISO(d), value: rubberValues[i] }));

function ChartPanel({ title, data, color, currentValue, change, changePct, isUp }) {
  return (
    <div style={{ background:'#0d1117', border:'1px solid #1a2332', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 8px 20px' }}>
        <span style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:"'JetBrains Mono', monospace" }}>{title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color, fontWeight:800, fontSize:20, fontFamily:"'JetBrains Mono', monospace" }}>{currentValue}</span>
          <div style={{ display:'flex', alignItems:'center', gap:5, background: isUp ? '#166534' : '#7f1d1d', borderRadius:6, padding:'4px 10px' }}>
            <span style={{ color: isUp ? '#4ade80' : '#f87171', fontSize:11, fontWeight:700 }}>{isUp ? '▲' : '▼'} {change} ({changePct})</span>
          </div>
        </div>
      </div>
      <div style={{ padding:'0 4px 8px 4px' }}>
        <AreaLWC data={data} color={color} height={260} />
      </div>
    </div>
  );
}

export default function RubberDashboard() {
  const [symbol, setSymbol] = useState('');
  return (
    <div style={{ width:'100%', minHeight:'100vh', background:'#080c12', padding:'20px 24px', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:16, fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#0d1520', border:'1px solid #1a2a3a', borderRadius:8, padding:'10px 14px', minWidth:200 }}>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Type a Symbol..." style={{ background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:13, width:'100%', fontFamily:'inherit' }} />
          <ChevronDown size={14} color="#334155" />
        </div>
      </div>
      <ChartPanel title="Close (24CS)" data={dataClose} color="#22c55e" currentValue="79.13" change="10.36" changePct="+15.06%" isUp={true} />
      <ChartPanel title="Rubber Thai Price" data={dataRubber} color="#eab308" currentValue="62.97" change="5.07" changePct="+8.76%" isUp={true} />
    </div>
  );
}