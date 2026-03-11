import { useState } from "react";

// ─── exact data from screenshot (left panel) ──────────────────────────────
const LEFT_TICKS = [
  { time:"10:00:15", last:"72.23", vol:"12,987", type:"S", sum:"938,089,179" },
  { time:"10:02:15", last:"72.12", vol:"5,796",  type:"S", sum:"417,991,665" },
  { time:"10:04:15", last:"72.98", vol:"14,844", type:"B", sum:"1,083,277,256" },
  { time:"10:06:15", last:"72.13", vol:"17,249", type:"S", sum:"1,244,200,647" },
  { time:"10:08:15", last:"72.87", vol:"145",    type:"B", sum:"10,566,171" },
  { time:"10:10:15", last:"72.67", vol:"11,026", type:"S", sum:"801,276,964" },
  { time:"10:12:15", last:"72.54", vol:"16,405", type:"S", sum:"1,190,007,093" },
  { time:"10:14:15", last:"72.33", vol:"10,811", type:"B", sum:"781,984,248" },
  { time:"10:16:15", last:"72.27", vol:"1,372",  type:"B", sum:"99,758,565" },
  { time:"10:18:15", last:"72.63", vol:"2,273",  type:"B", sum:"165,083,674" },
  { time:"11:20:15", last:"72.67", vol:"11,282", type:"B", sum:"819,814,095" },
  { time:"11:22:15", last:"72.53", vol:"18,905", type:"S", sum:"1,371,227,134" },
  { time:"11:24:15", last:"72.82", vol:"11,063", type:"B", sum:"805,599,905" },
  { time:"11:26:15", last:"72.34", vol:"1,231",  type:"S", sum:"89,050,335" },
  { time:"11:28:15", last:"72.27", vol:"4,636",  type:"B", sum:"335,059,463" },
  { time:"11:30:15", last:"72.28", vol:"8,191",  type:"B", sum:"592,009,967" },
  { time:"11:32:15", last:"72.46", vol:"6,275",  type:"S", sum:"454,684,314" },
  { time:"11:34:15", last:"72.71", vol:"5,787",  type:"B", sum:"420,771,842" },
  { time:"11:36:15", last:"72.19", vol:"16,354", type:"B", sum:"1,180,661,827" },
  { time:"11:38:15", last:"72.56", vol:"1,425",  type:"B", sum:"103,398,437" },
];

const RIGHT_TICKS = [
  { time:"10:00:15", last:"70.57", vol:"16,125", type:"B", sum:"1,137,908,283" },
  { time:"10:02:15", last:"71.14", vol:"16,746", type:"B", sum:"1,191,232,309" },
  { time:"10:04:15", last:"70.62", vol:"3,010",  type:"B", sum:"212,554,283" },
  { time:"10:06:15", last:"71.26", vol:"6,055",  type:"S", sum:"431,452,581" },
  { time:"10:08:15", last:"70.87", vol:"8,692",  type:"B", sum:"616,040,729" },
  { time:"10:10:15", last:"71.27", vol:"14,964", type:"S", sum:"1,066,452,79" },
  { time:"10:12:15", last:"70.75", vol:"9,488",  type:"S", sum:"671,293,226" },
  { time:"10:14:15", last:"71.05", vol:"5,496",  type:"B", sum:"390,490,332" },
  { time:"10:16:15", last:"71.18", vol:"11,662", type:"S", sum:"830,147,228" },
  { time:"10:18:15", last:"70.63", vol:"12,415", type:"S", sum:"876,871,749" },
  { time:"11:20:15", last:"70.58", vol:"11,584", type:"B", sum:"817,633,933" },
  { time:"11:22:15", last:"71.04", vol:"19,295", type:"S", sum:"1,370,654,852" },
  { time:"11:24:15", last:"70.98", vol:"9,870",  type:"B", sum:"686,369,41" },
  { time:"11:26:15", last:"70.78", vol:"12,055", type:"B", sum:"909,832,789" },
  { time:"11:28:15", last:"70.94", vol:"11,744", type:"S", sum:"833,175,823" },
  { time:"11:30:15", last:"71.36", vol:"14,380", type:"B", sum:"1,026,154,976" },
  { time:"11:32:15", last:"71.16", vol:"19,016", type:"S", sum:"1,353,222,079" },
  { time:"11:34:15", last:"70.57", vol:"2,879",  type:"S", sum:"203,174,842" },
  { time:"11:36:15", last:"71.26", vol:"15,846", type:"S", sum:"1,129,133,563" },
  { time:"11:38:15", last:"70.64", vol:"4,629",  type:"B", sum:"327,011,97" },
];

function Panel({ ticks, sumBuy, sumSell, netVol, netPos, date, filter, setFilter }) {
  const filtered = ticks.filter(t => {
    if (filter === "buy")  return t.type === "B";
    if (filter === "sell") return t.type === "S";
    if (filter === "big")  return parseInt(t.vol.replace(/,/g,"")) > 10000;
    return true;
  });

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#181c27",
      border: "1px solid #23293a",
      minWidth: 0,
      overflow: "hidden",
    }}>

      {/* ── Top input row ── */}
      <div style={{
        background: "#10131c",
        padding: "8px 10px",
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        borderBottom: "1px solid #23293a",
        flexWrap: "wrap",
      }}>
        <div style={{
          background: "#6d28d9",
          borderRadius: 4,
          padding: "3px 8px",
          fontSize: 10,
          fontWeight: 800,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
          alignSelf: "flex-end",
          marginBottom: 2,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#c4b5fd", display: "inline-block",
            boxShadow: "0 0 4px #c4b5fd",
          }}/>
          SYNC
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:2, flex:"1 1 80px", minWidth: 60 }}>
          <label style={{ fontSize:10, color:"#4b5675", letterSpacing:"0.5px", textTransform:"uppercase" }}>Symbol *</label>
          <input defaultValue="DELTA" style={{
            background: "#0a0d16",
            border: "1px solid #2d3548",
            borderRadius: 3,
            color: "#d1d9e6",
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            padding: "5px 6px",
            outline: "none",
            width: "100%",
          }}/>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:2, flex:"1 1 80px", minWidth: 60 }}>
          <label style={{ fontSize:10, color:"#4b5675", letterSpacing:"0.5px", textTransform:"uppercase" }}>Date</label>
          <input defaultValue={date} style={{
            background: "#0a0d16",
            border: "1px solid #2d3548",
            borderRadius: 3,
            color: "#d1d9e6",
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            padding: "5px 6px",
            outline: "none",
            width: "100%",
          }}/>
        </div>

        <button style={{
          background: "#1d4ed8",
          border: "none",
          borderRadius: 3,
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 700,
          padding: "6px 14px",
          cursor: "pointer",
          letterSpacing: 1.5,
          alignSelf: "flex-end",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}>SEARCH</button>
      </div>

      {/* ── Stats boxes ── */}
      <div style={{ display:"flex" }}>
        <div style={{
          flex:1, padding:"5px 8px 7px",
          borderRight:"1px solid #23293a",
          borderBottom:"3px solid #16a34a",
          background:"#111a15",
          minWidth: 0,
        }}>
          <div style={{ fontSize:9, color:"#5a6a82", marginBottom:2 }}>Sum Buy</div>
          <div style={{ fontFamily:"'Courier New', monospace", fontSize:13, fontWeight:700, color:"#4ade80", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {sumBuy}
          </div>
        </div>
        <div style={{
          flex:1, padding:"5px 8px 7px",
          borderRight:"1px solid #23293a",
          borderBottom:"3px solid #dc2626",
          background:"#18100f",
          minWidth: 0,
        }}>
          <div style={{ fontSize:9, color:"#5a6a82", marginBottom:2 }}>Sum Sell</div>
          <div style={{ fontFamily:"'Courier New', monospace", fontSize:13, fontWeight:700, color:"#f87171", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {sumSell}
          </div>
        </div>
        <div style={{
          flex:1, padding:"5px 8px 7px",
          borderBottom:"3px solid #b45309",
          background:"#16140f",
          minWidth: 0,
        }}>
          <div style={{ fontSize:9, color:"#5a6a82", marginBottom:2 }}>Net Acc. Vol</div>
          <div style={{
            fontFamily:"'Courier New', monospace", fontSize:13, fontWeight:700,
            color: netPos ? "#4ade80" : "#f87171",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {netVol}
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{
        background:"#0d1018",
        padding:"5px 6px",
        display:"flex",
        gap:4,
        borderBottom:"1px solid #23293a",
        borderTop:"1px solid #23293a",
        flexWrap:"wrap",
      }}>
        {[["all","All"],["buy","Buy"],["sell","Sell"],["big",">100K"]].map(([k,label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding:"2px 8px",
            fontSize:10,
            fontWeight:600,
            fontFamily:"inherit",
            background: filter===k ? "#172554" : "transparent",
            border: `1px solid ${filter===k ? "#2563eb" : "#2d3548"}`,
            borderRadius:3,
            color: filter===k ? "#60a5fa" : "#4b5675",
            cursor:"pointer",
            transition:"all 0.1s",
            whiteSpace:"nowrap",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Table header ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"80px 60px 70px 44px 1fr",
        padding:"5px 6px",
        background:"#0d1018",
        borderBottom:"1px solid #23293a",
      }}>
        {[["Time","left"],["Last","right"],["Vol","right"],["Type","center"],["Sum","right"]].map(([h,align]) => (
          <div key={h} style={{ fontSize:10, color:"#4b5675", fontWeight:600, textAlign:align, letterSpacing:"0.4px" }}>
            {h}
          </div>
        ))}
      </div>

      {/* ── Table rows ── */}
      <div style={{ overflowY:"auto", flex:1 }}>
        {filtered.map((t, i) => {
          const isBuy = t.type === "B";
          const bg = i % 2 === 0 ? "#111620" : "#0e1219";
          return (
            <div key={i} style={{
              display:"grid",
              gridTemplateColumns:"80px 60px 70px 44px 1fr",
              padding:"3px 6px",
              background: bg,
              borderBottom:"1px solid #181d2a",
              alignItems:"center",
            }}>
              <span style={{ fontFamily:"'Courier New',monospace", fontSize:10, color:"#d4a84b" }}>
                {t.time}
              </span>
              <span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:"#d1d9e6", textAlign:"right" }}>
                {t.last}
              </span>
              <span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:"#d1d9e6", textAlign:"right" }}>
                {t.vol}
              </span>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  width:16, height:16, borderRadius:3,
                  fontSize:10, fontWeight:700,
                  background: isBuy ? "#14532d" : "#7f1d1d",
                  color: isBuy ? "#4ade80" : "#f87171",
                }}>{t.type}</span>
              </div>
              <span style={{ fontFamily:"'Courier New',monospace", fontSize:10, color:"#8899aa", textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {t.sum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TickMatchAnalysis() {
  const [filter1, setFilter1] = useState("all");
  const [filter2, setFilter2] = useState("all");
  // Mobile tab: show panel 1 or panel 2
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        body { background:#0a0c14; }
        input:focus { border-color:#3b5bdb !important; outline:none; }
        button:active { opacity:0.75; }
        div[style*="overflowY"]::-webkit-scrollbar { width:3px; }
        div[style*="overflowY"]::-webkit-scrollbar-track { background:#0a0d16; }
        div[style*="overflowY"]::-webkit-scrollbar-thumb { background:#2a3347; border-radius:2px; }

        /* Desktop: show both panels side by side */
        .panels-wrapper {
          display: flex;
          gap: 12px;
          flex: 1;
          min-height: 0;
        }
        .panel-desktop { display: flex; flex: 1; min-width: 0; }
        .mobile-tabs   { display: none; }

        /* Mobile: tab switcher, show one panel at a time */
        @media (max-width: 767px) {
          .panels-wrapper {
            flex-direction: column;
            gap: 0;
            overflow: hidden;
          }
          .panel-desktop {
            display: none;
          }
          .panel-desktop.active {
            display: flex;
            flex: 1;
            min-height: 0;
          }
          .mobile-tabs {
            display: flex;
            flex-shrink: 0;
            background: #10131c;
            border-bottom: 1px solid #23293a;
          }
          .mobile-tab-btn {
            flex: 1;
            padding: 8px 4px;
            font-size: 12px;
            font-weight: 700;
            font-family: 'Barlow Condensed', sans-serif;
            letter-spacing: 0.5px;
            background: transparent;
            border: none;
            color: #4b5675;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.15s;
          }
          .mobile-tab-btn.active {
            color: #60a5fa;
            border-bottom-color: #2563eb;
            background: #0d1018;
          }
        }
      `}</style>

      <div style={{
        height: "100%",
        background: "#0a0c14",
        fontFamily: "'Barlow Condensed', sans-serif",
        color: "#c8d6e5",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflow: "hidden",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 1300,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 24px)",
          flex: 1,
          minHeight: 0,
        }}>

          {/* Title */}
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 8,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}>
            TickMatch Analysis
          </div>

          {/* Mobile tab switcher */}
          <div className="mobile-tabs">
            <button
              className={`mobile-tab-btn ${activeTab === 0 ? "active" : ""}`}
              onClick={() => setActiveTab(0)}
            >
              Panel 1 — DELTA
            </button>
            <button
              className={`mobile-tab-btn ${activeTab === 1 ? "active" : ""}`}
              onClick={() => setActiveTab(1)}
            >
              Panel 2 — DELTA
            </button>
          </div>

          {/* Two panels */}
          <div className="panels-wrapper">
            <div className={`panel-desktop ${activeTab === 0 ? "active" : ""}`}>
              <Panel
                ticks={LEFT_TICKS}
                sumBuy="12,500,400"
                sumSell="8,200,100"
                netVol="+4,300,300"
                netPos={true}
                date="20/01/2026"
                filter={filter1}
                setFilter={setFilter1}
              />
            </div>
            <div className={`panel-desktop ${activeTab === 1 ? "active" : ""}`}>
              <Panel
                ticks={RIGHT_TICKS}
                sumBuy="5,100,000"
                sumSell="6,200,000"
                netVol="-1,100,000"
                netPos={false}
                date="19/01/2026"
                filter={filter2}
                setFilter={setFilter2}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}