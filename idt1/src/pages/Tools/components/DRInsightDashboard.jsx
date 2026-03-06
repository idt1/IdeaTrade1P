import { useState, useEffect, useRef } from "react";

/* ── DATA ──────────────────────────────────────────────────────────────────── */
const usaStocks = [
  { dr:"AAPL80X",  real:"NASDAQ:AAPL", name:"Apple" },
  { dr:"AMZN80X",  real:"NASDAQ:AMZN", name:"Amazon" },
  { dr:"BKNG80X",  real:"NASDAQ:BKNG", name:"Booking" },
  { dr:"BRKB80X",  real:"NYSE:BRK.B",  name:"Berkshire Hathaway" },
  { dr:"GOOG80X",  real:"NASDAQ:GOOG", name:"Alphabet (Google)" },
  { dr:"KO80X",    real:"NYSE:KO",     name:"Coca-Cola" },
  { dr:"META80X",  real:"NASDAQ:META", name:"Meta Platforms" },
  { dr:"MSFT80X",  real:"NASDAQ:MSFT", name:"Microsoft" },
  { dr:"NFLX80X",  real:"NASDAQ:NFLX", name:"Netflix" },
  { dr:"NVDA80X",  real:"NASDAQ:NVDA", name:"NVIDIA" },
  { dr:"PEP80X",   real:"NASDAQ:PEP",  name:"PepsiCo" },
  { dr:"SBUX80X",  real:"NASDAQ:SBUX", name:"Starbucks" },
  { dr:"TSLA80X",  real:"NASDAQ:TSLA", name:"Tesla" },
  { dr:"AMD80X",   real:"NASDAQ:AMD",  name:"AMD" },
  { dr:"AVGO80X",  real:"NASDAQ:AVGO", name:"Broadcom" },
  { dr:"ESTEE80X", real:"NYSE:EL",     name:"Estee Lauder" },
  { dr:"MA80X",    real:"NYSE:MA",     name:"Mastercard" },
  { dr:"NIKE80X",  real:"NYSE:NKE",    name:"Nike" },
  { dr:"VISA80X",  real:"NYSE:V",      name:"Visa" },
  { dr:"LLY80X",   real:"NYSE:LLY",   name:"Eli Lilly" },
  { dr:"LLY80",    real:"NYSE:LLY",   name:"Eli Lilly" },
];
const europeStocks = [
  { dr:"ASML01",    real:"EURONEXT:ASML",  name:"ASML Holding" },
  { dr:"FERRARI80", real:"MIL:RACE",        name:"Ferrari" },
  { dr:"HERMES80",  real:"EURONEXT:RMS",    name:"Hermes" },
  { dr:"LOREAL80",  real:"EURONEXT:OR",     name:"L'Oreal" },
  { dr:"LVMH01",    real:"EURONEXT:MC",     name:"LVMH" },
  { dr:"NOVOB80",   real:"OMXCOP:NOVO_B",   name:"Novo Nordisk" },
  { dr:"SANOFI80",  real:"EURONEXT:SAN",    name:"Sanofi" },
];
const etcStocks = [
  { dr:"GOLD19", real:"SGX:GSD",   name:"Gold" },
  { dr:"GOLD03", real:"HKEX:2840", name:"Gold" },
  { dr:"OIL03",  real:"HKEX:3097", name:"Oil" },
];
const japanStocks = [
  { dr:"HONDA19",    real:"TSE:7267", name:"Honda" },
  { dr:"MITSU19",    real:"TSE:7011", name:"Mitsubishi" },
  { dr:"MUFG19",     real:"TSE:8306", name:"MUFG" },
  { dr:"NINTENDO19", real:"TSE:7974", name:"Nintendo" },
  { dr:"SMFG19",     real:"TSE:8316", name:"SMFG" },
  { dr:"SONY80",     real:"TSE:6758", name:"Sony" },
  { dr:"TOYOTA80",   real:"TSE:7203", name:"Toyota" },
  { dr:"UNIQLO80",   real:"TSE:9983", name:"Fast Retailing" },
];
const singaporeStocks = [
  { dr:"DBS19",      real:"SGX:D05", name:"DBS Group" },
  { dr:"INDIAESG19", real:"SGX:QK9", name:"India ESG" },
  { dr:"SIA19",      real:"SGX:C6L", name:"Singapore Airlines" },
  { dr:"SINGTEL80",  real:"SGX:Z74", name:"Singtel" },
  { dr:"STEG19",     real:"SGX:S63", name:"ST Engineering" },
  { dr:"THAIBEV19",  real:"SGX:Y92", name:"ThaiBev" },
  { dr:"UOB19",      real:"SGX:U11", name:"UOB" },
  { dr:"VENTURE19",  real:"SGX:V03", name:"Venture Corp" },
];
const vietnamStocks = [
  { dr:"E1VFVN3001", real:"HOSE:E1VFVN30",  name:"Vietnam ETF" },
  { dr:"FUEVFVND01", real:"HOSE:FUEVFVND",   name:"Vietnam Diamond ETF" },
  { dr:"VNM19",      real:"HOSE:VNM",         name:"Vinamilk" },
  { dr:"FPTVN19",    real:"HOSE:FPT",         name:"FPT Corp" },
  { dr:"MWG19",      real:"HOSE:MWG",         name:"Mobile World" },
  { dr:"VCB19",      real:"HOSE:VCB",         name:"Vietcombank" },
];
const chinaStocks = [
  { dr:"BABA80",     real:"HKEX:9988", name:"Alibaba" },
  { dr:"BIDU80",     real:"HKEX:9888", name:"Baidu" },
  { dr:"BYDCOM80",   real:"HKEX:1211", name:"BYD" },
  { dr:"CN01",       real:"HKEX:3188", name:"China ETF" },
  { dr:"CNTECH01",   real:"HKEX:3088", name:"China Tech" },
  { dr:"HK01",       real:"HKEX:2800", name:"Tracker Fund of HK" },
  { dr:"HK13",       real:"HKEX:2800", name:"Tracker Fund of HK" },
  { dr:"HKCE01",     real:"HKEX:2828", name:"Hang Seng China ETF" },
  { dr:"HKTECH13",   real:"HKEX:3032", name:"Hang Seng Tech ETF" },
  { dr:"JAPAN13",    real:"HKEX:3160", name:"Japan ETF" },
  { dr:"NDX01",      real:"HKEX:3086", name:"Nasdaq ETF" },
  { dr:"NETEASE80",  real:"HKEX:9999", name:"NetEase" },
  { dr:"PINGAN80",   real:"HKEX:2318", name:"Ping An" },
  { dr:"SP50001",    real:"HKEX:3195", name:"S&P 500 ETF" },
  { dr:"STAR5001",   real:"HKEX:3151", name:"STAR 50 ETF" },
  { dr:"TENCENT80",  real:"HKEX:700",  name:"Tencent" },
  { dr:"XIAOMI80",   real:"HKEX:1810", name:"Xiaomi" },
  { dr:"INDIA01",    real:"HKEX:3404", name:"India ETF" },
  { dr:"JAPAN10001", real:"HKEX:3410", name:"Japan ETF" },
  { dr:"JAP03",      real:"HKEX:3150", name:"Japan ETF" },
  { dr:"WORLD03",    real:"HKEX:3422", name:"World ETF" },
  { dr:"JD80",       real:"HKEX:9618", name:"JD.com" },
  { dr:"MEITUAN80",  real:"HKEX:3690", name:"Meituan" },
  { dr:"NONGFU80",   real:"HKEX:9633", name:"Nongfu Spring" },
  { dr:"POPMART80",  real:"HKEX:9992", name:"Pop Mart" },
  { dr:"TRIPCOM80",  real:"HKEX:9961", name:"Trip.com" },
  { dr:"BABA13",     real:"HKEX:9988", name:"Alibaba" },
  { dr:"TENCENT13",  real:"HKEX:700",  name:"Tencent" },
  { dr:"XIAOMI13",   real:"HKEX:1810", name:"Xiaomi" },
  { dr:"BABA01",     real:"HKEX:9988", name:"Alibaba" },
  { dr:"BIDU01",     real:"HKEX:9888", name:"Baidu" },
  { dr:"BYDCOM01",   real:"HKEX:1211", name:"BYD" },
  { dr:"CHMOBILE19", real:"HKEX:941",  name:"China Mobile" },
  { dr:"HAIERS19",   real:"HKEX:6690", name:"Haier" },
  { dr:"MEITUAN19",  real:"HKEX:3690", name:"Meituan" },
  { dr:"PINGAN01",   real:"HKEX:2318", name:"Ping An" },
  { dr:"TENCENT01",  real:"HKEX:700",  name:"Tencent" },
  { dr:"TENCENT19",  real:"HKEX:700",  name:"Tencent" },
  { dr:"XIAOMI01",   real:"HKEX:1810", name:"Xiaomi" },
  { dr:"XIAOMI19",   real:"HKEX:1810", name:"Xiaomi" },
  { dr:"CATL01",     real:"HKEX:3750", name:"CATL" },
  { dr:"BABA23",     real:"HKEX:9988", name:"Alibaba" },
  { dr:"CATL23",     real:"HKEX:3750", name:"CATL" },
  { dr:"HSHD23",     real:"HKEX:3110", name:"HSHD" },
  { dr:"HKEX23",     real:"HKEX",      name:"HKEX" },
];
const taiwanStocks = [
  { dr:"TAIWAN19",   real:"TWSE:0050",  name:"Taiwan 50" },
  { dr:"TAIWANAI13", real:"TWSE:00952", name:"Taiwan AI" },
  { dr:"TAIWANHD13", real:"TWSE:00915", name:"Taiwan HD" },
];
const allStockOptions = [
  ...usaStocks,...europeStocks,...etcStocks,
  ...japanStocks,...chinaStocks,...singaporeStocks,...vietnamStocks,...taiwanStocks,
];
const features = [
  { title:"Global Symbol Mapping", desc:"Instantly connects every DR on the Thai board to its underlying international parent stock." },
  { title:"Arbitrage Tracking",    desc:"Compare the parent stock's price against the Thai DR on a dual-pane screen." },
  { title:"Real-Time Valuation",   desc:"Monitor live P/E ratios and key metrics of global underlying stocks." },
  { title:"Multi-Market Heatmap",  desc:"Visualize global market trends (US, China, Vietnam) in one dashboard." },
];

const DOT  = ["#3b82f6","#fb923c","#22c55e","#f87171","#a78bfa","#06b6d4","#fbbf24","#ec4899"];
const CLRS = ["#3b82f6","#ef4444","#22c55e"];
const hide = { msOverflowStyle:"none", scrollbarWidth:"none" };

/* ── helpers ────────────────────────────────────────────────────────────────── */
function genData(sym, n=80){
  let p=(sym.length*15)+50, d=[];
  for(let i=0;i<n;i++){ p+=(Math.random()-0.48)*p*0.02; d.push(p); }
  return d;
}
function buildPath(d,mn,mx){
  if(!d||!d.length) return "M0,50 L300,50";
  const r=mx-mn||1;
  const pts=d.map((v,i)=>`${((i/(d.length-1))*300).toFixed(1)},${(100-((v-mn)/r)*100).toFixed(1)}`);
  return `M ${pts[0]} `+pts.slice(1).map(p=>`L ${p}`).join(" ");
}
function useWidth(){ 
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{ const h=()=>setW(window.innerWidth); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]);
  return w;
}

/* ── Sparkline ──────────────────────────────────────────────────────────────── */
function Spark({color,data,fill}){
  if(!data||!data.length) return null;
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;
  const p=buildPath(data,mn,mx);
  return(
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
      <defs><linearGradient id={`s${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={fill?.3:0}/>
        <stop offset="100%" stopColor={color} stopOpacity=".02"/>
      </linearGradient></defs>
      {fill&&<path d={p+" V 100 H 0 Z"} fill={`url(#s${color.replace("#","")})`}/>}
      <path d={p} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
      <circle cx={(300).toString()} cy={(100-((data[data.length-1]-mn)/r)*100).toFixed(1)} r="4" fill={color}/>
    </svg>
  );
}

/* ── Mini preview dashboard ─────────────────────────────────────────────────── */
function MiniDashboard({fill, isMem, onEnter}){
  const w=useWidth();
  const mob=w<600;
  const charts=CLRS.map((c,i)=>{ const d=genData("KO80X"+i,60); return{c,d,mn:Math.min(...d),mx:Math.max(...d)}; });

  const topBar=(
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,flexWrap:"wrap",padding:mob?"8px 8px 6px":"10px 16px 8px",flexShrink:0,position:"relative"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:9999,padding:"4px 12px",display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#64748b"}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#475569" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#475569" strokeWidth="2" strokeLinecap="round"/></svg>
        Filter symbol...
      </div>
      {[{l:"ราคาน้ำมัน",c:"#3b82f6"},{l:"PE Ratio",c:"#ef4444"},{l:"Last",c:"#22c55e"}].map((x,i)=>(
        <div key={i} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:9999,padding:"4px 12px",fontSize:10,color:"#94a3b8",display:"flex",alignItems:"center",gap:7}}>
          {x.l}<div style={{width:20,height:2,background:x.c,borderRadius:2}}/>
        </div>
      ))}

    </div>
  );

  if(mob){
    return(
      <div style={{background:"#0B1221",display:"flex",flexDirection:"column",height:"100%"}}>
        {topBar}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,padding:"0 8px 8px",minHeight:0}}>
          {charts.map((c,i)=>(
            <div key={i} style={{flex:1,background:"#111827",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{padding:"6px 10px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <div style={{background:"#1a2235",border:"1px solid #2d3f55",borderRadius:5,padding:"2px 8px",fontSize:11,color:"#cbd5e1",fontWeight:600}}>KO80X - Coca-Cola</div>
                <div style={{width:6,height:6,borderRadius:"50%",background:c.c,boxShadow:`0 0 4px ${c.c}`}}/>
              </div>
              <div style={{flex:1,background:"#0B1221",margin:"5px 6px 5px",borderRadius:6,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,opacity:.08,backgroundImage:"linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",backgroundSize:"18px 18px"}}/>
                <div style={{position:"absolute",inset:0}}><Spark color={c.c} data={c.d} fill={i<2}/></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return(
    <div style={{background:"#0B1221",display:"flex",flexDirection:"column",height:"100%"}}>
      {topBar}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:8,padding:"0 10px 10px",minHeight:0}}>
        {/* left */}
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {[["USA","🌎",usaStocks],["Europe","🌍",europeStocks],["ETC","🌎",etcStocks]].map(([t,code,stocks],gi)=>(
            <div key={gi} style={{borderBottom:"1px solid #1e293b",flex:gi===0?3:gi===1?2:1,display:"flex",flexDirection:"column",minHeight:0}}>
              <div style={{background:"#141b2a",padding:"4px 8px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{t}</span>
                <span style={{fontSize:9,color:"#06b6d4",fontWeight:700}}>{code}</span>
              </div>
              <div style={{overflowY:"auto",flex:1,...hide}}>
                {stocks.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 7px",fontSize:9}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:DOT[i%8]}}/><span style={{color:"#e2e8f0",fontWeight:600}}>{s.dr}</span></div>
                    <span style={{color:"#475569",fontSize:8}}>{s.real}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* center charts */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {charts.map((c,i)=>(
            <div key={i} style={{flex:1,background:"#111827",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{padding:"6px 10px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <div style={{background:"#1a2235",border:"1px solid #2d3f55",borderRadius:5,padding:"2px 8px",fontSize:11,color:"#cbd5e1",fontWeight:600}}>KO80X - Coca-Cola</div>
                <div style={{width:6,height:6,borderRadius:"50%",background:c.c,boxShadow:`0 0 4px ${c.c}`}}/>
              </div>
              <div style={{flex:1,background:"#0B1221",margin:"5px 6px 5px",borderRadius:6,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,opacity:.08,backgroundImage:"linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",backgroundSize:"18px 18px"}}/>
                <div style={{position:"absolute",inset:0}}><Spark color={c.c} data={c.d} fill={i<2}/></div>
              </div>
            </div>
          ))}
        </div>
        {/* right asia */}
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{textAlign:"center",padding:"5px",borderBottom:"1px solid #1e293b",fontWeight:700,fontSize:12,color:"#fff",flexShrink:0}}>Asia</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,flex:1,overflow:"hidden"}}>
            {[
              [japanStocks,"Japan","JP","#f87171"],
              [chinaStocks,"China","CN","#f87171"],
            ].map(([items,t,code,cc],ci)=>(
              <div key={ci} style={{borderRight:ci===0?"1px solid #1e293b":"none",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 6px 2px",flexShrink:0}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{t}</span>
                  <span style={{fontSize:8,fontWeight:700,color:cc,background:cc+"22",borderRadius:3,padding:"0 3px"}}>{code}</span>
                </div>
                <div style={{overflowY:"auto",flex:1,...hide}}>
                  {items.map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 6px",fontSize:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:4,height:4,borderRadius:"50%",background:cc}}/><span style={{color:"#94a3b8",fontWeight:600}}>{s.dr}</span></div>
                      <span style={{color:"#334155"}}>{s.real}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Symbol Panel ───────────────────────────────────────────────────────────── */
function SymbolPanel({title,code,stocks,sel,onSelect,filter,flex}){
  const f=stocks.filter(s=>s.dr.toLowerCase().includes(filter.toLowerCase()));
  return(
    <div style={{display:"flex",flexDirection:"column",overflow:"hidden",background:"#111827",border:"1px solid rgba(30,41,59,.8)",borderRadius:12,flex,minHeight:0}}>
      <div style={{padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(30,41,59,.6)",background:"#141b2a",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:13,color:"#fff"}}>{title}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#06b6d4"}}>{code}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",fontSize:9,color:"#64748b",fontWeight:600,letterSpacing:".7px",textTransform:"uppercase",borderBottom:"1px solid rgba(30,41,59,.6)",background:"#111827",flexShrink:0}}>
        <span>DR/DRx</span><span>TradingView</span>
      </div>
      <div style={{overflowY:"auto",flex:1,background:"#0B1221",padding:5,...hide}}>
        {f.map((s,i)=>{
          const act=sel===s.dr;
          return(
            <div key={i} onClick={()=>onSelect(s.dr)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,padding:"4px 6px",borderRadius:5,cursor:"pointer",background:act?"rgba(6,182,212,.15)":"transparent",border:act?"1px solid rgba(6,182,212,.4)":"1px solid transparent",marginBottom:1,transition:"background .1s"}}
              onMouseEnter={e=>{if(!act)e.currentTarget.style.background="rgba(30,41,59,.6)";}}
              onMouseLeave={e=>{if(!act)e.currentTarget.style.background="transparent";}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:DOT[i%DOT.length],flexShrink:0}}/>
                <span style={{color:"#e2e8f0",fontWeight:700}}>{s.dr}</span>
              </div>
              <span style={{color:"#64748b",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{s.real}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Chart Panel ─────────────────────────────────────────────────────────────── */
function ChartPanel({idx,sym,data,mm,onSym,onFS}){
  const [hp,setHp]=useState(null);
  const color=CLRS[idx];
  const {mn,mx}=mm; const range=mx-mn||1;
  const pd=buildPath(data,mn,mx);
  let hv=null,yp=null,xp=null;
  if(hp!==null&&data.length){
    const di=Math.min(data.length-1,Math.max(0,Math.round((hp/100)*(data.length-1))));
    hv=data[di]; yp=100-((hv-mn)/range)*100; xp=(di/(data.length-1))*100;
  }
  return(
    <div style={{background:"#111827",border:"1px solid #334155",borderRadius:12,display:"flex",flexDirection:"column",flex:1,overflow:"hidden",minHeight:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderBottom:"1px solid #1e293b",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          <select value={sym} onChange={e=>onSym(e.target.value)} style={{background:"#1a2235",border:"1px solid rgba(51,65,85,.5)",borderRadius:5,color:"#cbd5e1",fontSize:12,fontWeight:600,padding:"4px 24px 4px 8px",fontFamily:"inherit",cursor:"pointer",outline:"none",maxWidth:"90%",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 6px center",appearance:"none"}}>
            <option value="">Select a symbol...</option>
            {allStockOptions.map(s=><option key={s.dr} value={s.dr}>{s.dr} – {s.name}</option>)}
          </select>
          {sym&&<div style={{width:7,height:7,borderRadius:"50%",background:color,boxShadow:`0 0 5px ${color}`,flexShrink:0}}/>}
        </div>
        <div style={{display:"flex",gap:10,marginLeft:8}}>
          <button onClick={()=>onFS(idx)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color="#06b6d4"} onMouseLeave={e=>e.currentTarget.style.color="#475569"}>⛶</button>
          <button style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#475569"}>⚙</button>
        </div>
      </div>
      <div style={{flex:1,background:"#0B1221",border:"1px solid rgba(30,41,59,.4)",margin:"0 8px 8px",borderRadius:8,position:"relative",overflow:"hidden",cursor:"crosshair"}}
        onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHp(Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)));}}
        onMouseLeave={()=>setHp(null)}>
        <div style={{position:"absolute",inset:0,opacity:.1,backgroundImage:"linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",backgroundSize:"28px 28px"}}/>
        {!sym&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#475569",fontSize:12,textAlign:"center",padding:"0 16px"}}>Select a symbol to display chart</span></div>}
        {sym&&<>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs><linearGradient id={`g${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
            <path d={pd} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
            <path d={pd+" V 100 H 0 Z"} fill={`url(#g${idx})`} stroke="none"/>
          </svg>
          <div style={{position:"absolute",right:5,top:6,bottom:6,display:"flex",flexDirection:"column",justifyContent:"space-between",fontSize:7,color:"#475569",textAlign:"right",pointerEvents:"none",zIndex:10}}>
            {[mx,mn+range*.75,mn+range*.5,mn+range*.25,mn].map((v,i)=><span key={i}>{v.toFixed(2)}</span>)}
          </div>
          {hp!==null&&yp!==null&&<>
            <div style={{position:"absolute",top:0,bottom:0,left:`${xp}%`,borderLeft:"1px dashed rgba(148,163,184,.7)",zIndex:20,pointerEvents:"none"}}/>
            <div style={{position:"absolute",left:0,right:0,top:`${yp}%`,borderTop:"1px dashed rgba(148,163,184,.7)",zIndex:20,pointerEvents:"none"}}/>
            <div style={{position:"absolute",left:`${xp}%`,top:`${yp}%`,width:10,height:10,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`,transform:"translate(-50%,-50%)",zIndex:30,pointerEvents:"none"}}/>
            <div style={{position:"absolute",right:5,top:`${yp}%`,transform:"translateY(-50%)",padding:"1px 5px",background:"#1e293b",color:"#fff",fontSize:9,borderRadius:3,border:"1px solid #334155",zIndex:30,pointerEvents:"none",fontWeight:600}}>{hv?.toFixed(2)}</div>
          </>}
        </>}
      </div>
    </div>
  );
}

/* ── Mobile bottom tab bar ───────────────────────────────────────────────────── */
function MobileTabBar({tab,setTab}){
  const tabs=[{id:"left",icon:"🌎",label:"Market"},{id:"charts",icon:"📈",label:"Charts"},{id:"right",icon:"🌏",label:"Asia"}];
  return(
    <div style={{display:"flex",borderTop:"1px solid #1e293b",background:"#060d1f",flexShrink:0}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px 6px",background:tab===t.id?"#111827":"transparent",border:"none",borderTop:tab===t.id?"2px solid #06b6d4":"2px solid transparent",color:tab===t.id?"#06b6d4":"#475569",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit",transition:"all .15s"}}>
          <span style={{fontSize:18}}>{t.icon}</span>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:".5px"}}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── MAIN ─────────────────────────────────────────────────────────────────────── */
export default function DRInsight(){
  const w=useWidth();
  const isMob=w<768;
  const [view,setView]=useState("guest"); // guest | member | tool
  const [mobTab,setMobTab]=useState("charts");
  const [filter,setFilter]=useState("");
  const [sel,setSel]=useState("");
  const [cs,setCs]=useState({c0:"",c1:"",c2:""});
  const [data,setData]=useState({c0:[],c1:[],c2:[]});
  const [mm,setMm]=useState({c0:{mn:0,mx:100},c1:{mn:0,mx:100},c2:{mn:0,mx:100}});
  const [fsChart,setFsChart]=useState(null);
  const scrollRef=useRef(null);
  const pause=useRef(false);

  useEffect(()=>{
    if(view==="tool") return;
    const el=scrollRef.current; if(!el) return;
    let dir=1;
    const iv=setInterval(()=>{
      if(pause.current) return;
      const{scrollLeft,scrollWidth,clientWidth}=el;
      const max=scrollWidth-clientWidth;
      if(dir===1&&scrollLeft>=max-2) dir=-1;
      else if(dir===-1&&scrollLeft<=2) dir=1;
      el.scrollLeft+=dir;
    },16);
    return()=>clearInterval(iv);
  },[view]);

  useEffect(()=>{
    const nd={},nm={};
    Object.keys(cs).forEach(k=>{
      const sym=cs[k];
      if(sym){const d=genData(sym,80);nd[k]=d;nm[k]={mn:Math.min(...d),mx:Math.max(...d)};}
      else{nd[k]=[];nm[k]={mn:0,mx:100};}
    });
    setData(nd);setMm(nm);
  },[cs]);

  const pickStock=sym=>{setSel(sym);setCs({c0:sym,c1:sym,c2:sym});};
  const pickChart=(k,sym)=>{setCs(p=>({...p,[k]:sym}));if(sym)setSel(sym);};

  const renderLeft=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:isMob?8:12,height:"100%",overflow:"hidden",padding:isMob?"8px":"0"}}>
      {[["USA","🌎",usaStocks,"4"],["Europe","🌍",europeStocks,"3"],["ETC","🌎",etcStocks,"2"]].map(([t,c,s,f])=>(
        <SymbolPanel key={t} title={t} code={c} stocks={s} sel={sel} onSelect={pickStock} filter={filter} flex={f}/>
      ))}
    </div>
  );
  const renderCharts=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:isMob?8:12,height:"100%",overflow:"hidden",padding:isMob?"8px":"0"}}>
      {[0,1,2].map(i=>(
        <ChartPanel key={i} idx={i} sym={cs[`c${i}`]} data={data[`c${i}`]} mm={mm[`c${i}`]} onSym={sym=>pickChart(`c${i}`,sym)} onFS={setFsChart}/>
      ))}
    </div>
  );
  const renderRight=()=>(
    <div style={{background:"#111827",border:"1px solid rgba(30,41,59,.8)",borderRadius:12,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",padding:isMob?"0":"12px"}}>
      {!isMob&&<div style={{textAlign:"center",paddingBottom:10,marginBottom:10,borderBottom:"1px solid rgba(30,41,59,.6)",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>Asia</div>}
      {isMob&&<div style={{textAlign:"center",padding:"8px",borderBottom:"1px solid rgba(30,41,59,.6)",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>Asia</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMob?6:10,flex:1,minHeight:0,overflow:"hidden",padding:isMob?"8px":"0"}}>
        <div style={{display:"flex",flexDirection:"column",gap:isMob?6:10,overflow:"hidden"}}>
          {[["Japan","JP",japanStocks],["Singapore","SG",singaporeStocks],["Vietnam","VN",vietnamStocks]].map(([t,c,s])=>(
            <SymbolPanel key={t} title={t} code={c} stocks={s} sel={sel} onSelect={pickStock} filter={filter} flex="1"/>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:isMob?6:10,overflow:"hidden"}}>
          {[["China","CN",chinaStocks,"3"],["Taiwan","TW",taiwanStocks,"1"]].map(([t,c,s,f])=>(
            <SymbolPanel key={t} title={t} code={c} stocks={s} sel={sel} onSelect={pickStock} filter={filter} flex={f}/>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── PREVIEW ────────────────────────────────────────────────────────────── */
  if(view!=="tool"){
    const isMem=view==="member";
    return(
      <div style={{height:"100vh",background:"#0B1221",color:"#fff",fontFamily:"'Inter',sans-serif",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{display:none;}`}</style>

        <div style={{flex:1,minHeight:0,overflow:"hidden"}}>
          <MiniDashboard fill isMem={isMem} onEnter={()=>setView("tool")}/>
        </div>
      </div>
    );
  }

  /* ── FULL DASHBOARD ─────────────────────────────────────────────────────── */
  return(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{display:none;} select option{background:#1f2937;}`}</style>
      <div style={{width:"100%",height:"100vh",background:"#0B1221",color:"#fff",display:"flex",flexDirection:"column",fontFamily:"'Inter',sans-serif",overflow:"hidden"}}>

        {/* top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:isMob?6:14,padding:isMob?"7px 8px":"8px 16px",borderBottom:"1px solid #1e293b",background:"#060d1f",flexShrink:0,flexWrap:"wrap",position:"relative"}}>

          {/* search */}
          <div style={{display:"flex",alignItems:"center",gap:7,background:"#111827",border:"1px solid #1e293b",borderRadius:9999,padding:isMob?"5px 12px":"6px 16px"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#475569" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#475569" strokeWidth="2" strokeLinecap="round"/></svg>
            <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter symbol..." style={{background:"none",border:"none",outline:"none",color:"#cbd5e1",fontSize:11,fontFamily:"inherit",width:isMob?90:130}}/>
          </div>
          {/* legend pills */}
          {[{l:"ราคาน้ำมัน",c:"#3b82f6"},{l:"PE Ratio",c:"#ef4444"},{l:"Last",c:"#22c55e"}].map((x,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#111827",border:"1px solid #1e293b",borderRadius:9999,padding:isMob?"4px 10px":"5px 14px",fontSize:isMob?9:11,color:"#94a3b8",whiteSpace:"nowrap"}}>
              {x.l}<div style={{width:22,height:2,background:x.c,borderRadius:2}}/>
            </div>
          ))}
        </div>

        {/* DESKTOP layout */}
        {!isMob&&(
          <div style={{display:"grid",gridTemplateColumns:"3fr 6fr 3fr",gap:12,flex:1,minHeight:0,padding:12}}>
            {renderLeft()}
            {renderCharts()}
            {renderRight()}
          </div>
        )}

        {/* MOBILE layout */}
        {isMob&&(
          <>
            <div style={{flex:1,overflow:"hidden"}}>
              {mobTab==="left"   && <div style={{height:"100%",overflowY:"auto",...hide}}>{renderLeft()}</div>}
              {mobTab==="charts" && <div style={{height:"100%",overflowY:"auto",...hide}}>{renderCharts()}</div>}
              {mobTab==="right"  && <div style={{height:"100%",overflowY:"auto",...hide}}>{renderRight()}</div>}
            </div>
            <MobileTabBar tab={mobTab} setTab={setMobTab}/>
          </>
        )}
      </div>

      {/* fullscreen */}
      {fsChart!==null&&cs[`c${fsChart}`]&&(()=>{
        const c=CLRS[fsChart],sym=cs[`c${fsChart}`],d=data[`c${fsChart}`],{mn,mx}=mm[`c${fsChart}`],r=mx-mn||1,pd=buildPath(d,mn,mx);
        return(
          <div style={{position:"fixed",inset:0,background:"#0B1221",zIndex:50,display:"flex",flexDirection:"column",padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexShrink:0}}>
              <span style={{fontSize:20,fontWeight:700}}>{sym} – {allStockOptions.find(s=>s.dr===sym)?.name||""}</span>
              <button onClick={()=>setFsChart(null)} style={{background:"none",border:"none",color:"#64748b",fontSize:26,cursor:"pointer",lineHeight:1}}>✕</button>
            </div>
            <div style={{flex:1,background:"#111827",border:"1px solid #334155",borderRadius:12,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,opacity:.1,backgroundImage:"linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",backgroundSize:"30px 30px"}}/>
              <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs><linearGradient id="gfs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".25"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs>
                <path d={pd} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                <path d={pd+" V 100 H 0 Z"} fill="url(#gfs)" stroke="none"/>
              </svg>
              <div style={{position:"absolute",right:8,top:10,bottom:10,display:"flex",flexDirection:"column",justifyContent:"space-between",fontSize:10,color:"#475569",textAlign:"right",pointerEvents:"none"}}>
                {[mx,mn+r*.75,mn+r*.5,mn+r*.25,mn].map((v,i)=><span key={i}>{v.toFixed(2)}</span>)}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}