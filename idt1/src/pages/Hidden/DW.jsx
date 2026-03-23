import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         "#0f172a",
  surface:    "#0f1e2e",
  panel:      "#1e293b",
  header:     "#07111c",
  border:     "rgba(255,255,255,0.07)",
  mutedText:  "#475569",
  dimText:    "#334155",
  white:      "#e2e8f0",
  blue:       "#3b82f6",
  blueDim:    "rgba(59,130,246,0.18)",
  blueBorder: "rgba(59,130,246,0.5)",
};

const TIMEFRAMES = ["INTRADAY", "30 MIN", "60 MIN", "DAY"];
const MONTHS_TH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const PANEL_CFG = {
  main: { label: null,   subtitle: "ราคาหุ้นแม่",            color: "#e2e8f0", zeroline: false },
  net:  { label: "NET",  subtitle: "Net Flow ของ DW ทั้งหมด",  color: "#34d399", zeroline: true  },
  call: { label: "CALL", subtitle: "Volume/Flow ฝั่ง Call",    color: "#fbbf24", zeroline: true  },
  put:  { label: "PUT",  subtitle: "Volume/Flow ฝั่ง Put",     color: "#f472b6", zeroline: true  },
};

const PT_GAP = 6, PAD_T = 12, PAD_B = 22, PAD_L = 4, Y_AXIS_W = 56;

// ─── Real BLS DW Data (ณ วันที่ 08 ม.ค. 2568, ครบกำหนด 13 ม.ค. 2568) ──────────
const BLS_DW_DATA = [
  { dw:"AAV01C2501A",      ratio:1.25194, refPrice:2.58,    strike:2.98,    netCash:0.0000, type:"C", underlying:"AAV"     },
  { dw:"ADVANC01C2501A",   ratio:0.03175, refPrice:284.00,  strike:299.00,  netCash:0.0000, type:"C", underlying:"ADVANC"  },
  { dw:"AWC01C2501A",      ratio:1.37297, refPrice:3.44,    strike:3.82,    netCash:0.0000, type:"C", underlying:"AWC"     },
  { dw:"AWC01C2501B",      ratio:1.35533, refPrice:3.44,    strike:4.42,    netCash:0.0000, type:"C", underlying:"AWC"     },
  { dw:"BAM01C2501A",      ratio:0.51269, refPrice:5.95,    strike:9.95,    netCash:0.0000, type:"C", underlying:"BAM"     },
  { dw:"BANPU01C2501A",    ratio:0.61602, refPrice:5.40,    strike:6.70,    netCash:0.0000, type:"C", underlying:"BANPU"   },
  { dw:"BANPU01C2501B",    ratio:1.55892, refPrice:5.40,    strike:5.777,   netCash:0.0000, type:"C", underlying:"BANPU"   },
  { dw:"BANPU01P2501W",    ratio:1.03091, refPrice:5.40,    strike:4.117,   netCash:0.0000, type:"P", underlying:"BANPU"   },
  { dw:"BCP01C2501A",      ratio:0.10176, refPrice:34.00,   strike:41.565,  netCash:0.0000, type:"C", underlying:"BCP"     },
  { dw:"BGRIM01C2501A",    ratio:0.33247, refPrice:17.90,   strike:27.262,  netCash:0.0000, type:"C", underlying:"BGRIM"   },
  { dw:"BTS01C2501A",      ratio:1.36718, refPrice:5.90,    strike:6.05,    netCash:0.0000, type:"C", underlying:"BTS"     },
  { dw:"CBG01C2501W",      ratio:0.12551, refPrice:78.00,   strike:84.503,  netCash:0.0000, type:"C", underlying:"CBG"     },
  { dw:"CENTEL01C2501A",   ratio:0.09918, refPrice:32.50,   strike:43.25,   netCash:0.0000, type:"C", underlying:"CENTEL"  },
  { dw:"CHG01C2501A",      ratio:1.40229, refPrice:2.38,    strike:3.176,   netCash:0.0000, type:"C", underlying:"CHG"     },
  { dw:"COM701C2501A",     ratio:0.11739, refPrice:25.25,   strike:33.75,   netCash:0.0000, type:"C", underlying:"COM7"    },
  { dw:"COM701P2501A",     ratio:0.21973, refPrice:25.25,   strike:19.10,   netCash:0.0000, type:"P", underlying:"COM7"    },
  { dw:"CPALL01C2501A",    ratio:0.11902, refPrice:56.00,   strike:67.50,   netCash:0.0000, type:"C", underlying:"CPALL"   },
  { dw:"CPALL01P2501X",    ratio:0.23255, refPrice:56.00,   strike:42.00,   netCash:0.0000, type:"P", underlying:"CPALL"   },
  { dw:"CPF01C2501A",      ratio:0.12512, refPrice:22.30,   strike:33.50,   netCash:0.0000, type:"C", underlying:"CPF"     },
  { dw:"CRC01C2501A",      ratio:0.12517, refPrice:34.75,   strike:35.25,   netCash:0.0000, type:"C", underlying:"CRC"     },
  { dw:"DELTA01C2501A",    ratio:0.05550, refPrice:154.50,  strike:143.00,  netCash:0.6383, type:"C", underlying:"DELTA"   },
  { dw:"DOHOME01C2501A",   ratio:0.28076, refPrice:9.05,    strike:15.10,   netCash:0.0000, type:"C", underlying:"DOHOME"  },
  { dw:"ERW01C2501A",      ratio:1.36718, refPrice:3.58,    strike:5.15,    netCash:0.0000, type:"C", underlying:"ERW"     },
  { dw:"GPSC01C2501A",     ratio:0.12022, refPrice:35.00,   strike:47.275,  netCash:0.0000, type:"C", underlying:"GPSC"    },
  { dw:"GULF01P2501A",     ratio:0.20454, refPrice:58.00,   strike:41.00,   netCash:0.0000, type:"P", underlying:"GULF"    },
  { dw:"HANA01C2501W",     ratio:0.11701, refPrice:24.80,   strike:55.252,  netCash:0.0000, type:"C", underlying:"HANA"    },
  { dw:"HANA01P2501W",     ratio:0.22171, refPrice:24.80,   strike:26.511,  netCash:0.3793, type:"P", underlying:"HANA"    },
  { dw:"HMPRO01C2501A",    ratio:0.64563, refPrice:9.50,    strike:11.896,  netCash:0.0000, type:"C", underlying:"HMPRO"   },
  { dw:"ITC01C2501A",      ratio:0.27876, refPrice:20.10,   strike:26.50,   netCash:0.0000, type:"C", underlying:"ITC"     },
  { dw:"IVL01C2501W",      ratio:0.29770, refPrice:24.20,   strike:21.749,  netCash:0.7297, type:"C", underlying:"IVL"     },
  { dw:"IVL01P2501W",      ratio:0.59541, refPrice:24.20,   strike:12.006,  netCash:0.0000, type:"P", underlying:"IVL"     },
  { dw:"JMART01C2501A",    ratio:0.20449, refPrice:12.70,   strike:21.473,  netCash:0.0000, type:"C", underlying:"JMART"   },
  { dw:"JMT01C2501A",      ratio:0.20752, refPrice:17.70,   strike:22.80,   netCash:0.0000, type:"C", underlying:"JMT"     },
  { dw:"KBANK01C2501A",    ratio:0.04881, refPrice:159.00,  strike:159.447, netCash:0.0000, type:"C", underlying:"KBANK"   },
  { dw:"KCE01C2501W",      ratio:0.11781, refPrice:23.80,   strike:51.928,  netCash:0.0000, type:"C", underlying:"KCE"     },
  { dw:"KCE01P2501W",      ratio:0.18921, refPrice:23.80,   strike:27.50,   netCash:0.7001, type:"P", underlying:"KCE"     },
  { dw:"KTB01C2501A",      ratio:0.28461, refPrice:21.80,   strike:22.50,   netCash:0.0000, type:"C", underlying:"KTB"     },
  { dw:"MINT01C2501A",     ratio:0.13246, refPrice:25.50,   strike:34.181,  netCash:0.0000, type:"C", underlying:"MINT"    },
  { dw:"PTTGC01C2501A",    ratio:0.11291, refPrice:24.80,   strike:36.25,   netCash:0.0000, type:"C", underlying:"PTTGC"   },
  { dw:"PTTGC01C2501B",    ratio:0.27056, refPrice:24.80,   strike:30.00,   netCash:0.0000, type:"C", underlying:"PTTGC"   },
  { dw:"PTTGC01P2501A",    ratio:0.18478, refPrice:24.80,   strike:20.40,   netCash:0.0000, type:"P", underlying:"PTTGC"   },
  { dw:"RBF01C2501W",      ratio:0.43756, refPrice:7.05,    strike:7.85,    netCash:0.0000, type:"C", underlying:"RBF"     },
  { dw:"SAWAD01C2501A",    ratio:0.10505, refPrice:38.75,   strike:36.25,   netCash:0.2626, type:"C", underlying:"SAWAD"   },
  { dw:"SAWAD01C2501W",    ratio:0.11224, refPrice:38.75,   strike:44.25,   netCash:0.0000, type:"C", underlying:"SAWAD"   },
  { dw:"SAWAD01P2501W",    ratio:0.21973, refPrice:38.75,   strike:23.30,   netCash:0.0000, type:"P", underlying:"SAWAD"   },
  { dw:"SCB01P2501A",      ratio:0.15726, refPrice:119.00,  strike:74.579,  netCash:0.0000, type:"P", underlying:"SCB"     },
  { dw:"SET01C2501A",      ratio:0.03586, refPrice:1387.72, strike:1550.00, netCash:0.0000, type:"C", underlying:"SET"     },
  { dw:"SET01C2501B",      ratio:0.02594, refPrice:1387.72, strike:1575.00, netCash:0.0000, type:"C", underlying:"SET"     },
  { dw:"SET01P2501A",      ratio:0.06104, refPrice:1387.72, strike:1175.00, netCash:0.0000, type:"P", underlying:"SET"     },
  { dw:"SET01P2501B",      ratio:0.05188, refPrice:1387.72, strike:1250.00, netCash:0.0000, type:"P", underlying:"SET"     },
  { dw:"SET5001C2501A",    ratio:0.02289, refPrice:902.20,  strike:975.00,  netCash:0.0000, type:"C", underlying:"SET50"   },
  { dw:"SET5001P2501A",    ratio:0.04425, refPrice:902.20,  strike:775.00,  netCash:0.0000, type:"P", underlying:"SET50"   },
  { dw:"SET5001P2501B",    ratio:0.05341, refPrice:902.20,  strike:800.00,  netCash:0.0000, type:"P", underlying:"SET50"   },
  { dw:"STA01C2501A",      ratio:0.27635, refPrice:17.50,   strike:28.25,   netCash:0.0000, type:"C", underlying:"STA"     },
  { dw:"STGT01C2501A",     ratio:0.27125, refPrice:10.40,   strike:13.90,   netCash:0.0000, type:"C", underlying:"STGT"    },
  { dw:"TASCO01C2501A",    ratio:0.28249, refPrice:18.80,   strike:23.00,   netCash:0.0000, type:"C", underlying:"TASCO"   },
  { dw:"TKN01C2501A",      ratio:0.27416, refPrice:8.40,    strike:14.139,  netCash:0.0000, type:"C", underlying:"TKN"     },
  { dw:"TRUE01C2501A",     ratio:0.29907, refPrice:11.10,   strike:13.80,   netCash:0.0000, type:"C", underlying:"TRUE"    },
  { dw:"TU01C2501A",       ratio:0.26784, refPrice:12.60,   strike:17.54,   netCash:0.0000, type:"C", underlying:"TU"      },
  { dw:"VGI01C2501A",      ratio:2.39894, refPrice:3.50,    strike:2.26,    netCash:2.9747, type:"C", underlying:"VGI"     },
  { dw:"VGI01C2501B",      ratio:1.12305, refPrice:3.50,    strike:2.88,    netCash:0.6963, type:"C", underlying:"VGI"     },
  { dw:"VGI01P2501X",      ratio:2.44141, refPrice:3.50,    strike:1.51,    netCash:0.0000, type:"P", underlying:"VGI"     },
  { dw:"WHA01C2501A",      ratio:0.66796, refPrice:5.45,    strike:6.472,   netCash:0.0000, type:"C", underlying:"WHA"     },
];

const UNDERLYING_LIST = [...new Set(BLS_DW_DATA.map(d => d.underlying))].sort();

// Full symbol list — includes all tradeable underlyings (some may not have BLS DW data)
const ALL_SYMBOLS = [
  "AAV","ACE","ADVANC","AMATA","AOT","AWC","BANPU","BAM","BBL","BCP",
  "BDMS","BEM","BH","BGRIM","BTS","CBG","CENTEL","CHG","COM7","CPALL",
  "CPF","CPN","CRC","DELTA","DOHOME","ERW","GPSC","GULF","HANA","HMPRO",
  "ITC","IVL","JMART","JMT","KBANK","KCE","KTB","MINT","PTTGC","RBF",
  "SAWAD","SCB","SCC","SET","SET50","STA","STGT","TASCO","TKN","TRUE",
  "TU","VGI","WHA",
];

function getDWByUnderlying(underlying, type) {
  return BLS_DW_DATA.filter(d => d.underlying === underlying && d.type === type);
}

// ─── Mock data generators anchored to real prices ─────────────────────────────
function rng(seed) {
  let x = seed >>> 0;
  return () => { x ^= x<<13; x ^= x>>7; x ^= x<<17; return (x>>>0)/0xFFFFFFFF; };
}
function genPricePts(refPrice, n=300, seed=1) {
  const r = rng(seed); let v = refPrice; const vol = refPrice*0.003;
  return Array.from({length:n}, () => { v += (r()-0.5)*vol*2; v = Math.max(refPrice*0.85, Math.min(refPrice*1.15, v)); return +v.toFixed(2); });
}
function genFlowPts(n=300, seed=1, bias=0.5) {
  const r = rng(seed); let v=0;
  return Array.from({length:n}, () => { v += (r()-(1-bias))*200000; v = Math.max(-5e6, Math.min(5e6, v)); return +v.toFixed(0); });
}
function genAllPts(underlying) {
  if (!underlying) return {};
  const seed = underlying.split("").reduce((a,c) => a+c.charCodeAt(0), 0);
  const first = BLS_DW_DATA.find(d => d.underlying === underlying);
  const ref = first ? first.refPrice : 100;
  return { main: genPricePts(ref,300,seed), net: genFlowPts(300,seed+1,0.50), call: genFlowPts(300,seed+2,0.55), put: genFlowPts(300,seed+3,0.45) };
}

const TF_MINUTES = { "INTRADAY":1, "30 MIN":30, "60 MIN":60, "DAY":1440 };
function generateLabels(startDate, timeframe, n) {
  const base = startDate ? new Date(startDate) : new Date();
  const stepMin = TF_MINUTES[timeframe] ?? 1, p = v => String(v).padStart(2,"0");
  return Array.from({length:n}, (_,i) => {
    const d = new Date(base.getTime()+i*stepMin*60000);
    return stepMin < 1440
      ? { time:`${p(d.getHours())}:${p(d.getMinutes())}`, date:`${p(d.getDate())}/${p(d.getMonth()+1)}` }
      : { time:`${p(d.getDate())}/${p(d.getMonth()+1)}`, date:String(d.getFullYear()) };
  });
}

function yNorm(v,min,max,h) { const r=max-min||1; return PAD_T+(1-(v-min)/r)*(h-PAD_T-PAD_B); }
function yScale(pts) { const mn=Math.min(...pts),mx=Math.max(...pts),p=(mx-mn)*0.12||Math.abs(mn)*0.05||0.05; return {min:mn-p,max:mx+p}; }
function curvePath(pts,min,max,h) {
  if(!pts||pts.length<2) return "";
  const xs=pts.map((_,i)=>PAD_L+i*PT_GAP), ys=pts.map(v=>yNorm(v,min,max,h)), t=0.4;
  let d=`M${xs[0]},${ys[0]}`;
  for(let i=0;i<pts.length-1;i++) {
    const x0=xs[i-1]??xs[0],y0=ys[i-1]??ys[0],x1=xs[i],y1=ys[i],x2=xs[i+1],y2=ys[i+1],x3=xs[i+2]??xs[pts.length-1],y3=ys[i+2]??ys[pts.length-1];
    d+=` C${x1+(x2-x0)*t},${y1+(y2-y0)*t} ${x2-(x3-x1)*t},${y2-(y3-y1)*t} ${x2},${y2}`;
  }
  return d;
}
function fmtVal(v,key) {
  if(key==="main") return v.toFixed(2);
  const a=Math.abs(v);
  return a>=1e6?(v/1e6).toFixed(2)+"M":a>=1e3?(v/1e3).toFixed(1)+"K":v.toFixed(0);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcoCal  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoEnter = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>;
const IcoSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoChev = ({dir="left"}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{dir==="left"?<polyline points="15 18 9 12 15 6"/>:<polyline points="9 18 15 12 9 6"/>}</svg>;

// ─── CalendarPopup ────────────────────────────────────────────────────────────
function CalendarPopup({ value, onChange, onClose }) {
  const now = value ? new Date(value) : new Date();
  const [vy,setVy]=useState(now.getFullYear()); const [vm,setVm]=useState(now.getMonth());
  const [sel,setSel]=useState(value?new Date(value):null);
  const [h,setH]=useState(value?new Date(value).getHours():now.getHours());
  const [mi,setMi]=useState(value?new Date(value).getMinutes():now.getMinutes());
  const fd=new Date(vy,vm,1).getDay(), dim=new Date(vy,vm+1,0).getDate();
  const cells=[...Array(fd).fill(null),...Array(dim).fill(0).map((_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const emit=(y,mo,d,hh,mm)=>{const p=n=>String(n).padStart(2,"0");onChange(`${y}-${p(mo+1)}-${p(d)}T${p(hh)}:${p(mm)}`);};
  const pick=day=>{if(!day)return;setSel(new Date(vy,vm,day,h,mi));emit(vy,vm,day,h,mi);onClose();};
  const isSel=day=>sel&&sel.getDate()===day&&sel.getMonth()===vm&&sel.getFullYear()===vy;
  const isToday=day=>{const t=new Date();return t.getDate()===day&&t.getMonth()===vm&&t.getFullYear()===vy;};
  return (
    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,background:"#0f1e2e",border:`1px solid ${C.blueBorder}`,borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.7)",padding:16,width:280,userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={()=>{if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1);}} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:C.white,cursor:"pointer",padding:"5px 8px",display:"flex"}}><IcoChev dir="left"/></button>
        <span style={{fontSize:13,fontWeight:800,fontFamily:"monospace",color:C.white}}>{MONTHS_TH[vm]} {vy}</span>
        <button onClick={()=>{if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1);}} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:C.white,cursor:"pointer",padding:"5px 8px",display:"flex"}}><IcoChev dir="right"/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,fontFamily:"monospace",color:C.mutedText}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:14}}>
        {cells.map((day,i)=>(
          <div key={i} onClick={()=>pick(day)} style={{textAlign:"center",fontSize:11,fontFamily:"monospace",fontWeight:isSel(day)?800:500,padding:"6px 0",borderRadius:7,cursor:day?"pointer":"default",background:isSel(day)?C.blue:isToday(day)?"rgba(59,130,246,0.15)":"transparent",color:isSel(day)?"#fff":isToday(day)?C.blue:day?C.white:"transparent",border:isToday(day)&&!isSel(day)?`1px solid rgba(59,130,246,0.4)`:"1px solid transparent"}}
            onMouseEnter={e=>{if(day&&!isSel(day))e.currentTarget.style.background="rgba(59,130,246,0.2)";}}
            onMouseLeave={e=>{if(day&&!isSel(day))e.currentTarget.style.background=isToday(day)?"rgba(59,130,246,0.15)":"transparent";}}
          >{day||""}</div>
        ))}
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
        <div style={{fontSize:9,fontWeight:700,fontFamily:"monospace",color:C.mutedText,letterSpacing:"0.1em",marginBottom:8}}>TIME</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {[["Hour",h,23,setH],["Minute",mi,59,setMi]].map(([lbl,val,max,setter],ii)=>(
            <React.Fragment key={lbl}>
              {ii===1&&<div style={{fontSize:20,fontWeight:800,color:C.mutedText,marginBottom:16}}>:</div>}
              <div style={{flex:1}}>
                <input type="number" min={0} max={max} value={String(val).padStart(2,"0")}
                  onChange={e=>{const n=Math.max(0,Math.min(max,Number(e.target.value)));setter(n);if(sel)emit(sel.getFullYear(),sel.getMonth(),sel.getDate(),ii===0?n:h,ii===1?n:mi);}}
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,color:C.white,fontFamily:"monospace",fontSize:16,fontWeight:800,textAlign:"center",padding:"8px 4px",outline:"none"}}/>
                <div style={{fontSize:9,color:C.mutedText,fontFamily:"monospace",textAlign:"center",marginTop:2}}>{lbl}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DateTimeInput ────────────────────────────────────────────────────────────
function DateTimeInput({ label, onChange, defaultNow=false, error=false }) {
  const [iso,setIso]=useState(()=>{if(!defaultNow)return "";const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;});
  const [open,setOpen]=useState(false); const wr=useRef(null);
  useEffect(()=>{if(defaultNow)onChange?.(iso);},[]);// eslint-disable-line
  useEffect(()=>{const fn=e=>{if(wr.current&&!wr.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[]);
  const disp=v=>{if(!v)return null;const d=new Date(v);if(isNaN(d))return null;const p=n=>String(n).padStart(2,"0");let hh=d.getHours(),ap=hh>=12?"PM":"AM";hh=hh%12||12;return `${p(d.getDate())} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}  ${p(hh)}:${p(d.getMinutes())} ${ap}`;};
  const bc=error?"#f87171":open?C.blueBorder:C.border, lc=error?"#f87171":open?C.blue:C.mutedText;
  return (
    <div ref={wr} style={{position:"relative",flex:1,minWidth:200}}>
      <span style={{position:"absolute",top:-9,left:12,zIndex:2,pointerEvents:"none",fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:lc,background:C.panel,padding:"0 4px",fontFamily:"monospace"}}>{label}</span>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",height:44,gap:8,cursor:"pointer",background:C.surface,border:`1px solid ${bc}`,borderRadius:error?"10px 10px 0 0":10,transition:"border-color .15s"}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:iso?C.white:error?"#f87171":C.mutedText,letterSpacing:"0.04em",userSelect:"none"}}>{disp(iso)||(error?"Please set Start Datetime":"Click to select date & time")}</span>
        <span style={{color:error?"#f87171":open?C.blue:C.mutedText,flexShrink:0}}><IcoCal/></span>
      </div>
      {error&&<div style={{background:"rgba(248,113,113,0.08)",border:"1px solid #f87171",borderTop:"none",borderRadius:"0 0 10px 10px",padding:"5px 12px",display:"flex",alignItems:"center",gap:6}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span style={{fontSize:10,color:"#f87171",fontFamily:"monospace",fontWeight:700}}>Please set Start Datetime before pressing ENTER</span></div>}
      {open&&<CalendarPopup value={iso} onChange={v=>{setIso(v);onChange?.(v);}} onClose={()=>setOpen(false)}/>}
    </div>
  );
}

// ─── SymbolInput ──────────────────────────────────────────────────────────────
function SymbolInput({ value, onChange, onEnter }) {
  const [q,setQ]=useState(value||""); const [open,setOpen]=useState(false); const [foc,setFoc]=useState(false); const wr=useRef(null);
  useEffect(()=>{if(!value)setQ("");},[value]);
  const filtered=UNDERLYING_LIST.filter(s=>s.startsWith(q.toUpperCase()));
  useEffect(()=>{const fn=e=>{if(wr.current&&!wr.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[]);
  return (
    <div ref={wr} style={{position:"relative",width:240,flexShrink:0}}>
      <div onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",height:40,padding:"0 14px",gap:8,background:"#0b1929",border:`1px solid ${open||foc?C.blueBorder:"rgba(255,255,255,0.12)"}`,borderRadius:open?"20px 20px 10px 10px":20,cursor:"text",transition:"border-color .15s, box-shadow .15s",boxShadow:open||foc?`0 0 0 3px rgba(59,130,246,0.12)`:"none"}}>
        <span style={{color:foc||open?C.blue:"#6b7f96",flexShrink:0,display:"flex"}}><IcoSearch/></span>
        <input type="text" value={q} onChange={e=>{setQ(e.target.value.toUpperCase());setOpen(true);onChange?.(e.target.value.toUpperCase());}} onFocus={()=>{setFoc(true);setOpen(true);}} onBlur={()=>setFoc(false)} onKeyDown={e=>{if(e.key==="Enter"){setOpen(false);onEnter?.();}}} placeholder="Type a Symbol..." style={{background:"transparent",border:"none",outline:"none",color:C.white,width:"100%",fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:600,letterSpacing:"0.04em"}}/>
        {q&&<button onMouseDown={e=>{e.preventDefault();setQ("");onChange?.("");setOpen(false);}} style={{background:"none",border:"none",color:"#6b7f96",cursor:"pointer",padding:0,flexShrink:0,fontSize:14,lineHeight:1}}>✕</button>}
      </div>
      {open&&(
        <div style={{position:"absolute",top:40,left:0,right:0,zIndex:100,background:"#0b1929",border:`1px solid ${C.blueBorder}`,borderTop:"none",borderRadius:"0 0 14px 14px",maxHeight:220,overflowY:"auto",boxShadow:"0 16px 40px rgba(0,0,0,0.6)"}}>
          {filtered.length>0 ? filtered.map(sym=>(
            <div key={sym} onMouseDown={e=>{e.preventDefault();setQ(sym);onChange?.(sym);setOpen(false);}} style={{padding:"8px 16px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,background:sym===value?"rgba(59,130,246,0.1)":"transparent",display:"flex",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.12)"} onMouseLeave={e=>e.currentTarget.style.background=sym===value?"rgba(59,130,246,0.1)":"transparent"}>
              <span style={{fontFamily:"monospace",fontSize:12,fontWeight:800,color:sym===value?"#93c5fd":C.white,letterSpacing:"0.08em"}}>{sym}</span>
            </div>
          )) : q.length>0&&(
            <div style={{padding:"12px 16px"}}><span style={{fontFamily:"monospace",fontSize:11,color:C.mutedText}}>ไม่พบ "{q}"</span></div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DW Pill ──────────────────────────────────────────────────────────────────
function DWPill({ dw, active, type, onClick }) {
  const col  = type==="C"?"#fbbf24":"#f472b6";
  const colA = type==="C"?"rgba(251,191,36,":"rgba(244,114,182,";
  const [itmHov, setItmHov] = useState(false);
  const [tipPos, setTipPos] = useState({x:0,y:0});
  const badgeRef = useRef(null);

  const onEnterBadge = e => {
    e.stopPropagation();
    const r = badgeRef.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.left + r.width/2, y: r.top });
    setItmHov(true);
  };

  return (
    <div
      onClick={onClick}
      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${active?colA+"0.55)":"rgba(255,255,255,0.09)"}`,background:active?colA+"0.14)":"rgba(255,255,255,0.03)",color:active?col:"#94a3b8",fontFamily:"monospace",fontSize:10,fontWeight:active?800:600,letterSpacing:"0.06em",cursor:"pointer",transition:"all .12s",userSelect:"none",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}
      onMouseEnter={e=>{if(!active){e.currentTarget.style.background=colA+"0.07)";e.currentTarget.style.color=col;e.currentTarget.style.borderColor=colA+"0.4)";}}}
      onMouseLeave={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.color="#94a3b8";e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";}}}
    >
      {dw.dw}
      {dw.netCash>0&&(
        <span ref={badgeRef}
          style={{background:colA+"0.22)",color:col,fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:4,cursor:"default"}}
          onMouseEnter={onEnterBadge}
          onMouseLeave={e=>{e.stopPropagation();setItmHov(false);}}
          onClick={e=>e.stopPropagation()}
        >ITM</span>
      )}
      {itmHov&&dw.netCash>0&&(
        <div style={{position:"fixed",left:tipPos.x,top:tipPos.y-8,transform:"translate(-50%,-100%)",pointerEvents:"none",background:"#0c1a2a",border:`1px solid ${colA+"0.5)"}`,borderRadius:7,padding:"6px 10px",whiteSpace:"nowrap",zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.8)"}}>
          <span style={{display:"block",fontSize:9,fontWeight:800,color:col,fontFamily:"monospace",marginBottom:3}}>In-The-Money</span>
          <span style={{display:"block",fontSize:9,color:C.white,fontFamily:"monospace"}}>the warrant holder earns capital gains from the price <span style={{color:"#4ade80",fontWeight:800}}>+{dw.netCash.toFixed(4)} ฿</span></span>
        </div>
      )}
    </div>
  );
}

// ─── DW Panel ────────────────────────────────────────────────────────────────
function DWSymbolPanel({ underlying, selectedCall, selectedPut, onSelectCall, onSelectPut }) {
  const callDWs=useMemo(()=>getDWByUnderlying(underlying,"C"),[underlying]);
  const putDWs =useMemo(()=>getDWByUnderlying(underlying,"P"),[underlying]);
  const [cf,setCf]=useState(""); const [pf,setPf]=useState("");
  const fc=callDWs;
  const fp=putDWs;
  if(!underlying) return null;

  const Hdr=()=>null;

  const Empty=({type})=>(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4,gap:6}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.mutedText} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <span style={{fontSize:10,color:C.mutedText,fontFamily:"monospace"}}>No {type} DW</span>
    </div>
  );

  return (
    <div style={{background:C.panel,borderTop:`1px solid ${C.border}`,padding:"10px 12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxHeight:230,flexShrink:0}}>
      <div style={{display:"flex",flexDirection:"column",minHeight:0}}>
        {callDWs.length===0?<Empty type="CALL"/>:
          <div className="dw-scroll" style={{overflowY:"auto",flex:1,display:"flex",flexWrap:"wrap",gap:5,alignContent:"flex-start",paddingRight:4}}>
            {fc.length===0?<span style={{fontSize:10,color:C.dimText,fontFamily:"monospace"}}>No matches</span>:fc.map(d=><DWPill key={d.dw} dw={d} active={selectedCall===d.dw} type="C" onClick={()=>onSelectCall(selectedCall===d.dw?null:d.dw)}/>)}
          </div>
        }
      </div>
      <div style={{display:"flex",flexDirection:"column",minHeight:0,borderLeft:`1px solid ${C.border}`,paddingLeft:10}}>
        {putDWs.length===0?<Empty type="PUT"/>:
          <div className="dw-scroll" style={{overflowY:"auto",flex:1,display:"flex",flexWrap:"wrap",gap:5,alignContent:"flex-start",paddingRight:4}}>
            {fp.length===0?<span style={{fontSize:10,color:C.dimText,fontFamily:"monospace"}}>No matches</span>:fp.map(d=><DWPill key={d.dw} dw={d} active={selectedPut===d.dw} type="P" onClick={()=>onSelectPut(selectedPut===d.dw?null:d.dw)}/>)}
          </div>
        }
      </div>
    </div>
  );
}

// ─── ChartPanel ───────────────────────────────────────────────────────────────
function ChartPanel({ panelKey, hasData, symbol, pts, labels, globalHover, setGlobalHover, scrollRefs, loading }) {
  const cfg=PANEL_CFG[panelKey];
  const scrollRef=useRef(null),bodyRef=useRef(null),drag=useRef({active:false,startX:0,origScroll:0});
  const [zoom,setZoom]=useState(1),[scrollPct,setScrollPct]=useState(1),[chartH,setChartH]=useState(160);
  const [vr,setVr]=useState({start:0,end:300});
  const zoomR=useRef(zoom),spcR=useRef(scrollPct); zoomR.current=zoom; spcR.current=scrollPct;

  const updVR=useCallback(()=>{const el=scrollRef.current;if(!el||!pts)return;const s=Math.max(0,Math.floor((el.scrollLeft/zoomR.current-PAD_L)/PT_GAP)),e=Math.min(pts.length-1,Math.ceil(((el.scrollLeft+el.clientWidth)/zoomR.current-PAD_L)/PT_GAP));setVr({start:s,end:e});},[pts]);

  useEffect(()=>{const el=bodyRef.current;if(!el)return;const ro=new ResizeObserver(([e])=>setChartH(e.contentRect.height||160));ro.observe(el);return()=>ro.disconnect();},[]);
  useEffect(()=>{scrollRefs.current[panelKey]=scrollRef.current;return()=>{delete scrollRefs.current[panelKey];};});

  const scale=useMemo(()=>{if(!pts||!pts.length)return{min:0,max:1};const sl=pts.slice(vr.start,vr.end+1);return sl.length>=2?yScale(sl):yScale(pts);},[pts,vr]);
  const svgW=pts?PAD_L+(pts.length-1)*PT_GAP+4:600;

  const ticks=useMemo(()=>{const{min,max}=scale,range=max-min;if(range<=0)return[];const rs=range/4,sp=Math.pow(10,Math.floor(Math.log10(Math.abs(rs)||1))),ns=rs/sp;let niceStep=ns<1.5?1:ns<3?2:ns<7?5:10;const step=niceStep*sp,ft=Math.ceil(min/step)*step,res=[];for(let v=ft;v<=max+step*0.01;v+=step)res.push({y:yNorm(v,min,max,chartH),label:fmtVal(v,panelKey)});return res;},[scale,chartH,panelKey]);

  const lastVal=pts?pts[Math.min(vr.end,pts.length-1)]:null;
  const lastTagY=lastVal!=null?yNorm(lastVal,scale.min,scale.max,chartH):0;

  useEffect(()=>{const el=scrollRef.current;if(el&&pts){el.scrollLeft=el.scrollWidth;const mx=el.scrollWidth-el.clientWidth;setScrollPct(mx>0?el.scrollLeft/mx:1);setTimeout(()=>updVR(),0);}},[pts]);// eslint-disable-line

  const updZB=useCallback(()=>{const el=scrollRef.current;if(!el)return;const mx=el.scrollWidth-el.clientWidth;setScrollPct(mx>0?el.scrollLeft/mx:1);updVR();},[updVR]);
  const sync=useCallback(src=>{Object.values(scrollRefs.current).forEach(el=>{if(el&&el!==src&&Math.abs(el.scrollLeft-src.scrollLeft)>1)el.scrollLeft=src.scrollLeft;});},[scrollRefs]);

  const onMD=e=>{if(!hasData||!pts)return;drag.current={active:true,startX:e.pageX-scrollRef.current.offsetLeft,origScroll:scrollRef.current.scrollLeft};e.preventDefault();};
  const onMM=useCallback(e=>{const ds=drag.current,el=scrollRef.current;if(!el)return;if(ds.active){const w=(e.pageX-el.offsetLeft-ds.startX)*1.4;el.scrollLeft=ds.origScroll-w;sync(el);updVR();setGlobalHover(null);return;}if(!pts)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left+el.scrollLeft)/zoom-PAD_L;setGlobalHover(Math.max(0,Math.min(pts.length-1,Math.round(x/PT_GAP))));},[pts,zoom,setGlobalHover,sync,updVR]);
  const onMU=()=>{drag.current.active=false;};
  const onML=()=>{drag.current.active=false;setGlobalHover(null);};

  const onWheel=useCallback(e=>{if(!pts)return;e.preventDefault();const nz=Math.max(1,Math.min(30,zoomR.current*(e.deltaY<0?1.2:1/1.2)));setZoom(nz);requestAnimationFrame(()=>{const el=scrollRef.current;if(!el)return;el.scrollLeft=(el.scrollWidth-el.clientWidth)*spcR.current;sync(el);updZB();});},[pts,sync,updZB]);
  useEffect(()=>{const el=scrollRef.current;if(!el)return;el.addEventListener("wheel",onWheel,{passive:false});return()=>el.removeEventListener("wheel",onWheel);},[onWheel]);

  const isH=globalHover!==null&&hasData&&pts&&!drag.current.active;
  const hX=isH?PAD_L+globalHover*PT_GAP:null,hV=isH?pts[globalHover]:null,hY=isH?yNorm(hV,scale.min,scale.max,chartH):null;

  return (
    <div style={{display:"flex",flexDirection:"column",background:C.panel,border:"1px solid rgba(71,85,105,0.4)",borderRadius:10,overflow:"hidden",minHeight:0}}>
      <div style={{background:C.header,height:34,padding:"0 14px",flexShrink:0,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:7}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:cfg.color}}/>
        {(cfg.label||symbol)&&<span style={{color:cfg.color,fontSize:11,fontWeight:800,letterSpacing:"0.14em",fontFamily:"monospace"}}>{cfg.label||symbol}</span>}
      </div>
      <div ref={bodyRef} style={{flex:1,minHeight:0,display:"flex",position:"relative",background:C.surface}}>
        {loading&&(
          <div style={{position:"absolute",inset:0,zIndex:30,background:C.surface,display:"flex",flexDirection:"column",padding:"12px 10px",gap:8}}>
            <style>{`@keyframes sks{0%{background-position:-600px 0}100%{background-position:600px 0}}.sk{border-radius:6px;background:linear-gradient(90deg,#1e293b 25%,#273449 50%,#1e293b 75%);background-size:600px 100%;animation:sks 1.4s infinite linear}`}</style>
            <div className="sk" style={{height:3,width:"100%"}}/>
            {[0.6,0.4,0.75,0.5].map((w,i)=><div key={i} className="sk" style={{height:2,width:`${w*100}%`,opacity:0.6,animationDelay:`${i*0.1}s`}}/>)}
          </div>
        )}
        <div ref={scrollRef} onScroll={e=>{sync(e.target);updZB();}} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onML}
          style={{flex:1,overflowX:"auto",overflowY:"hidden",cursor:hasData?"crosshair":"default",scrollbarWidth:"none",position:"relative",height:"100%"}}>
          <style>{`.noscr::-webkit-scrollbar{display:none}`}</style>
          <div className="noscr" style={{width:pts?svgW*zoom:"100%",minWidth:"100%",height:"100%"}}>
            <svg width={pts?svgW*zoom:"100%"} height="100%" viewBox={`0 0 ${pts?svgW:600} ${chartH}`} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>
              {ticks.map(t=><line key={t.label} x1={0} y1={t.y} x2={pts?svgW:600} y2={t.y} stroke="#1e293b" strokeWidth="1"/>)}
              <line x1={0} y1={chartH-PAD_B} x2={pts?svgW:600} y2={chartH-PAD_B} stroke="#334155" strokeWidth="1.5"/>
              {cfg.zeroline&&pts&&<line x1={0} y1={yNorm(0,scale.min,scale.max,chartH)} x2={svgW} y2={yNorm(0,scale.min,scale.max,chartH)} stroke="rgba(99,102,241,0.4)" strokeWidth="1" strokeDasharray="4 6"/>}
              {hasData&&pts&&pts.length>1&&<path d={curvePath(pts,scale.min,scale.max,chartH)} fill="none" stroke={cfg.color} strokeWidth="2.5"/>}
              {pts&&labels&&labels.length>0&&(()=>{const step=Math.max(1,Math.floor(48/PT_GAP));return pts.map((_,i)=>{if(i%step!==0)return null;const l=labels[i];if(!l)return null;return <text key={i} x={PAD_L+i*PT_GAP} y={chartH-PAD_B+8} fill="#475569" fontSize="8" textAnchor="middle" fontFamily="monospace">{l.time}</text>;});})()}
              {isH&&(<g><line x1={hX} y1={PAD_T} x2={hX} y2={chartH-PAD_B} stroke="#475569" strokeWidth="1" strokeDasharray="4 4"/><circle cx={hX} cy={hY} r="4" fill={cfg.color} stroke={C.surface} strokeWidth="2"/>{labels&&labels[globalHover]&&(<g><text x={hX} y={chartH-PAD_B+8} fill="#e2e8f0" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">{labels[globalHover].time}</text><text x={hX} y={chartH-PAD_B+17} fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">{labels[globalHover].date}</text></g>)}</g>)}
              {!hasData&&<text x="50%" y="50%" fill={C.dimText} fontSize="18" textAnchor="middle" dominantBaseline="central" fontFamily="monospace" fontWeight="700" style={{letterSpacing:"0.12em"}}>Please select symbol</text>}
            </svg>
          </div>
        </div>
        <div style={{width:Y_AXIS_W,flexShrink:0,background:C.surface,borderLeft:"1px solid rgba(30,41,59,0.8)",position:"relative",height:"100%"}}>
          <svg width={Y_AXIS_W} height="100%" style={{display:"block",overflow:"visible",position:"absolute",inset:0}}>
            {ticks.map(t=>{if(lastVal!=null&&Math.abs(t.y-lastTagY)<13)return null;return <text key={t.label} x={Y_AXIS_W-5} y={t.y} fill="#475569" fontSize="9" textAnchor="end" dominantBaseline="central" fontFamily="monospace">{t.label}</text>;})}
            {hasData&&lastVal!=null&&(()=>{const ns=fmtVal(lastVal,panelKey),tw=ns.length*6.5+10,th=18,tx=Y_AXIS_W-tw-3;return(<g style={{transition:"transform 0.1s ease-out",transform:`translateY(${lastTagY}px)`}}><rect x={tx} y={-th/2} width={tw} height={th} fill={cfg.color} rx="3"/><text x={tx+tw/2} y={0} fill={C.bg} fontSize="10" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="monospace">{ns}</text></g>);})()}
          </svg>
        </div>
        {isH&&(()=>{const el=scrollRef.current,off=el?el.scrollLeft:0,rl=(PAD_L+globalHover*PT_GAP)*zoom-off+12,ml=(el?.clientWidth??200)-80;return(<div style={{position:"absolute",left:Math.min(rl,ml),top:4,background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",pointerEvents:"none",zIndex:20}}><div style={{fontSize:9,color:C.mutedText,fontFamily:"monospace",marginBottom:1}}>#{globalHover+1}</div><div style={{fontSize:12,fontWeight:800,color:cfg.color,fontFamily:"monospace"}}>{fmtVal(hV,panelKey)}</div></div>);})()}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DWViewCharts() {
  const [symbol,setSymbol]=useState(""); const [tf,setTf]=useState("INTRADAY");
  const [submitted,setSubmitted]=useState(false); const [ldEnter,setLdEnter]=useState(false); const [ldReset,setLdReset]=useState(false);
  const loading=ldEnter||ldReset;
  const [allPts,setAllPts]=useState({}); const [labels,setLabels]=useState([]);
  const [startDate,setStartDate]=useState(""); const [sdErr,setSdErr]=useState(false);
  const [gHover,setGHover]=useState(null);
  const [selCall,setSelCall]=useState(null); const [selPut,setSelPut]=useState(null);
  const scrollRefs=useRef({}); const hasData=submitted&&!!symbol.trim();
  const setHover=useCallback(idx=>setGHover(idx),[]);
  useEffect(()=>{setSelCall(null);setSelPut(null);},[symbol]);

  const doEnter=()=>{
    if(!symbol.trim())return;
    if(!startDate){setSdErr(true);setTimeout(()=>setSdErr(false),3000);return;}
    setSdErr(false);setLdEnter(true);
    setTimeout(()=>{const pts=genAllPts(symbol);const n=pts[Object.keys(pts)[0]].length;setLabels(generateLabels(startDate,tf,n));setAllPts(pts);setLdEnter(false);setSubmitted(true);},800);
  };
  const doReset=()=>{
    if(!hasData||loading)return; setLdReset(true);
    setTimeout(()=>{const pts=genAllPts(symbol);const n=pts[Object.keys(pts)[0]].length;setLabels(generateLabels(startDate,tf,n));setAllPts(pts);setLdReset(false);},400);
  };



  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{opacity:1}
        input::placeholder{color:#475569!important}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .dw-scroll::-webkit-scrollbar{width:4px}.dw-scroll::-webkit-scrollbar-track{background:transparent}.dw-scroll::-webkit-scrollbar-thumb{background:#1e3a5a;border-radius:4px}
      `}</style>
      <div style={{width:"100%",height:"100vh",background:C.bg,color:"#fff",display:"flex",flexDirection:"column",fontFamily:"'JetBrains Mono','Fira Code',monospace",overflow:"hidden"}}>

        {/* Toolbar */}
        <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"12px 18px",flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <SymbolInput value={symbol} onChange={v=>{setSymbol(v);setSubmitted(false);}} onEnter={doEnter}/>
            <DateTimeInput label="Start Datetime" onChange={v=>{setStartDate(v);if(v)setSdErr(false);}} error={sdErr}/>
            <DateTimeInput label="End Datetime" defaultNow/>
            <button onClick={doEnter} disabled={!symbol.trim()||loading} style={{display:"flex",alignItems:"center",gap:7,height:44,padding:"0 20px",borderRadius:10,flexShrink:0,background:symbol.trim()?"linear-gradient(135deg,#3b82f6,#6366f1)":"rgba(255,255,255,0.06)",border:`1px solid ${symbol.trim()?"rgba(99,102,241,0.5)":C.border}`,color:symbol.trim()?"#fff":C.mutedText,cursor:symbol.trim()?"pointer":"not-allowed",fontSize:12,fontWeight:800,letterSpacing:"0.1em",fontFamily:"monospace",transition:"all .2s",boxShadow:symbol.trim()?"0 4px 16px rgba(99,102,241,0.3)":"none"}}>
              {ldEnter?<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.7s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>:<IcoEnter/>}
              ENTER
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:C.mutedText,letterSpacing:"0.08em"}}>Timeframe:</span>
            <div style={{display:"flex",gap:6}}>
              {TIMEFRAMES.map(t=>{const act=tf===t;return <button key={t} onClick={()=>setTf(t)} style={{padding:"5px 14px",borderRadius:8,cursor:"pointer",border:`1px solid ${act?C.blueBorder:C.border}`,background:act?C.blueDim:"transparent",color:act?"#93c5fd":C.mutedText,fontSize:11,fontWeight:700,fontFamily:"monospace",letterSpacing:"0.06em",transition:"all .15s"}}>{t}</button>;})}
            </div>


            <div style={{marginLeft:"auto"}}>
              <button onMouseDown={e=>{e.preventDefault();doReset();}} disabled={!hasData||loading} style={{display:"flex",alignItems:"center",gap:7,height:32,padding:"0 14px",borderRadius:8,background:hasData?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${hasData?"rgba(52,211,153,0.35)":C.border}`,color:hasData?"#34d399":C.dimText,cursor:hasData?"pointer":"not-allowed",fontSize:11,fontWeight:800,letterSpacing:"0.1em",fontFamily:"monospace",transition:"all .2s"}}>
                {ldReset?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.7s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>}
                RESET
              </button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{flex:1,minHeight:0,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:8,padding:8}}>
          {Object.keys(PANEL_CFG).map(key=>(
            <ChartPanel key={key} panelKey={key} hasData={hasData} symbol={symbol} pts={allPts[key]??null} labels={labels} globalHover={gHover} setGlobalHover={setHover} scrollRefs={scrollRefs} loading={loading}/>
          ))}
        </div>

        {/* DW Selector */}
        {hasData&&<DWSymbolPanel underlying={symbol} selectedCall={selCall} selectedPut={selPut} onSelectCall={setSelCall} onSelectPut={setSelPut}/>}
      </div>
    </>
  );
}