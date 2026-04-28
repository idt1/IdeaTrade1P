import { useState, useMemo, useRef, useEffect } from "react";
import ToolHint from "@/components/ToolHint.jsx";

const RAW_RECORDS = [{"date":"2026-04-03","symbol":"A5","name":"โชติกร ปัญจทรัพย์","rel":"ผู้รายงาน","method":"ขาย","amount":1700000,"price":0.05,"value":85000.0},{"date":"2026-04-03","symbol":"BKIH","name":"ชัย โสภณพนิช","rel":"ผู้รายงาน","method":"ซื้อ","amount":18800,"price":323.02,"value":6072776.0},{"date":"2026-04-03","symbol":"WARRIX","name":"วิศัลย์ วนะศักดิ์ศรีสกุล","rel":"ผู้รายงาน","method":"โอน","amount":11000000,"price":0.0,"value":0.0},{"date":"2026-04-03","symbol":"VRANDA","name":"ภวัฒก์ องค์วาสิฏฐ์","rel":"ผู้รายงาน","method":"ซื้อ","amount":3000,"price":4.24,"value":12720.0},{"date":"2026-04-03","symbol":"MASTEC","name":"ดุษฎี มีชัย","rel":"ผู้รายงาน","method":"ซื้อ","amount":300000,"price":1.19,"value":357000.0},{"date":"2026-04-03","symbol":"HTC","name":"อัมริท คุมาร์ เซรสธา","rel":"ผู้รายงาน","method":"ซื้อ","amount":10000,"price":15.4,"value":154000.0},{"date":"2026-04-03","symbol":"IMH","name":"สิทธิวัตน์ กำกัดวงษ์","rel":"ผู้รายงาน","method":"ซื้อ","amount":3700,"price":3.07,"value":11359.0},{"date":"2026-04-03","symbol":"TRT","name":"กานต์ วงษ์ปาน","rel":"ผู้รายงาน","method":"ซื้อ","amount":80000,"price":4.04,"value":323200.0},{"date":"2026-04-03","symbol":"WARRIX","name":"วิศัลย์ วนะศักดิ์ศรีสกุล","rel":"ผู้รายงาน","method":"โอน","amount":11000000,"price":0.0,"value":0.0},{"date":"2026-04-03","symbol":"TRT","name":"กานต์ วงษ์ปาน","rel":"ผู้รายงาน","method":"ซื้อ","amount":13000,"price":4.02,"value":52260.0},{"date":"2026-04-03","symbol":"PLE","name":"พนิต วิกิตเศรษฐ์","rel":"ผู้รายงาน","method":"ขาย","amount":2655600,"price":0.17,"value":451452.0},{"date":"2026-04-03","symbol":"PEACE","name":"โดม ศิริโสภณา","rel":"ผู้รายงาน","method":"ซื้อ","amount":200,"price":1.68,"value":336.0},{"date":"2026-04-02","symbol":"PEACE","name":"โดม ศิริโสภณา","rel":"ผู้รายงาน","method":"ซื้อ","amount":1900,"price":1.73,"value":3287.0},{"date":"2026-04-02","symbol":"FTI","name":"วรญา ภูวพัชร์","rel":"ผู้รายงาน","method":"ซื้อ","amount":96400,"price":1.82,"value":175448.0},{"date":"2026-04-02","symbol":"AIMIRT","name":"อมร จุฬาลักษณานุกูล","rel":"ผู้รายงาน","method":"ขาย","amount":20000,"price":11.0,"value":220000.0},{"date":"2026-04-02","symbol":"JSP","name":"จิรดา แดงประเสริฐ","rel":"ผู้รายงาน","method":"ซื้อ","amount":10000,"price":1.95,"value":19500.0},{"date":"2026-04-02","symbol":"BKIH","name":"ชัย โสภณพนิช","rel":"ผู้รายงาน","method":"ซื้อ","amount":9900,"price":319.0,"value":3158100.0},{"date":"2026-04-02","symbol":"MASTEC","name":"ดุษฎี มีชัย","rel":"ผู้รายงาน","method":"ซื้อ","amount":200000,"price":1.21,"value":242000.0},{"date":"2026-04-02","symbol":"IMH","name":"สิทธิวัตน์ กำกัดวงษ์","rel":"ผู้รายงาน","method":"ซื้อ","amount":1000,"price":3.09,"value":3090.0},{"date":"2026-04-02","symbol":"PLE","name":"พนิต วิกิตเศรษฐ์","rel":"ผู้รายงาน","method":"ขาย","amount":3762300,"price":0.17,"value":639591.0},{"date":"2026-04-02","symbol":"CTW","name":"ชัย โสภณพนิช","rel":"ผู้รายงาน","method":"ซื้อ","amount":2000,"price":4.4,"value":8800.0},{"date":"2026-04-02","symbol":"SORKON","name":"จรัญพจน์ รุจิราโสภณ","rel":"ผู้รายงาน","method":"ขาย","amount":550000,"price":3.9,"value":2145000.0},{"date":"2026-04-02","symbol":"SKY","name":"รัช ตันตนันตา","rel":"ผู้รายงาน","method":"ขาย","amount":10000,"price":12.7,"value":127000.0},{"date":"2026-04-02","symbol":"EP","name":"ยุทธ ชินสุภัคกุล","rel":"ผู้รายงาน","method":"ซื้อ","amount":104000,"price":1.16,"value":120640.0},{"date":"2026-04-01","symbol":"BKIH","name":"ชัย โสภณพนิช","rel":"ผู้รายงาน","method":"ซื้อ","amount":23200,"price":323.59,"value":7507288.0},{"date":"2026-04-01","symbol":"HARN","name":"วิรัฐ สุขชัย","rel":"ผู้รายงาน","method":"ขาย","amount":1395200,"price":2.02,"value":2818304.0},{"date":"2026-04-01","symbol":"EP","name":"ยุทธ ชินสุภัคกุล","rel":"ผู้รายงาน","method":"ซื้อ","amount":28700,"price":1.14,"value":32718.0},{"date":"2026-04-01","symbol":"BDMS","name":"ปรมาภรณ์ ปราสาททองโอสถ","rel":"ผู้รายงาน","method":"ซื้อ","amount":2615300,"price":19.1,"value":49952230.0},{"date":"2026-04-01","symbol":"ACE","name":"ธีรวุฒิ ทรงเมตตา","rel":"ผู้รายงาน","method":"ซื้อ","amount":9820000,"price":1.28,"value":12569600.0},{"date":"2026-04-01","symbol":"IMH","name":"สิทธิวัตน์ กำกัดวงษ์","rel":"ผู้รายงาน","method":"ซื้อ","amount":2000,"price":3.12,"value":6240.0},{"date":"2026-04-01","symbol":"HFT","name":"เจิ้น ยง หลิน","rel":"ผู้รายงาน","method":"ขาย","amount":2279500,"price":4.6,"value":10485700.0},{"date":"2026-03-31","symbol":"SPTX","name":"รัสมิ์ภูมิ สุเมธีวิทย์","rel":"ผู้รายงาน","method":"ขาย","amount":14000000000,"price":0.01,"value":140000000.0},{"date":"2026-03-31","symbol":"EP","name":"ยุทธ ชินสุภัคกุล","rel":"ผู้รายงาน","method":"ซื้อ","amount":32100,"price":1.14,"value":36594.0},{"date":"2026-03-31","symbol":"IMH","name":"สิทธิวัตน์ กำกัดวงษ์","rel":"ผู้รายงาน","method":"ซื้อ","amount":4000,"price":3.11,"value":12440.0},{"date":"2026-03-31","symbol":"MALEE","name":"รุ่งฉัตร บุญรัตน์","rel":"ผู้รายงาน","method":"ซื้อ","amount":122600,"price":4.17,"value":511242.0},{"date":"2026-03-31","symbol":"MBK","name":"สมพล ตรีภพนารถ","rel":"ผู้รายงาน","method":"ขาย","amount":31000,"price":17.3,"value":536300.0},{"date":"2026-03-30","symbol":"WFX","name":"ชวลิต ติยาเดชาชัย","rel":"ผู้รายงาน","method":"ซื้อ","amount":64100,"price":1.19,"value":76279.0},{"date":"2026-03-30","symbol":"PHG","name":"รณชิต แย้มสอาด","rel":"ผู้รายงาน","method":"ซื้อ","amount":40000,"price":12.42,"value":496800.0},{"date":"2026-03-30","symbol":"MALEE","name":"รุ่งฉัตร บุญรัตน์","rel":"ผู้รายงาน","method":"ซื้อ","amount":60000,"price":4.09,"value":245400.0},{"date":"2026-03-27","symbol":"ALPHAX","name":"ธีร ชุติวราภรณ์","rel":"ผู้รายงาน","method":"ขาย","amount":100000000,"price":0.45,"value":45000000.0},{"date":"2026-03-27","symbol":"GUNKUL","name":"ธรากร อังภูเบศวร์","rel":"ผู้รายงาน","method":"ขาย","amount":1409961,"price":4.2,"value":5921836.2},{"date":"2026-03-26","symbol":"TURBO","name":"สุธัช เรืองสุทธิภาพ","rel":"ผู้รายงาน","method":"ซื้อ","amount":1457600,"price":1.45,"value":2113520.0},{"date":"2026-03-25","symbol":"NDR","name":"นิตยา สัมฤทธิวณิชชา","rel":"ผู้รายงาน","method":"ขาย","amount":8239800,"price":1.5,"value":12359700.0},{"date":"2026-03-25","symbol":"NDR","name":"ชัยสิทธิ์ สัมฤทธิวณิชชา","rel":"ผู้รายงาน","method":"ขาย","amount":36255300,"price":1.5,"value":54382950.0},{"date":"2026-03-24","symbol":"OHTL","name":"ยุทธชัย จรณะจิตต์","rel":"ผู้รายงาน","method":"ซื้อ","amount":66900,"price":300.0,"value":20070000.0},{"date":"2026-03-23","symbol":"BCH","name":"กันตพร หาญพาณิชย์","rel":"ผู้รายงาน","method":"ซื้อ","amount":100000,"price":9.35,"value":935000.0},{"date":"2026-03-20","symbol":"DMT","name":"สมบัติ พานิชชีวะ","rel":"ผู้รายงาน","method":"ขาย","amount":21142392,"price":11.5,"value":243137508.0},{"date":"2026-03-19","symbol":"TURBO","name":"สุธัช เรืองสุทธิภาพ","rel":"ผู้รายงาน","method":"ซื้อ","amount":2937000,"price":1.54,"value":4522980.0},{"date":"2026-03-18","symbol":"CBG","name":"เสถียร เสถียรธรรมะ","rel":"ผู้รายงาน","method":"ซื้อ","amount":250000,"price":36.6,"value":9150000.0},{"date":"2026-03-18","symbol":"OHTL","name":"ยุทธชัย จรณะจิตต์","rel":"ผู้รายงาน","method":"ซื้อ","amount":66900,"price":300.0,"value":20070000.0},{"date":"2026-03-16","symbol":"DMT","name":"สมบัติ พานิชชีวะ","rel":"ผู้รายงาน","method":"ขาย","amount":25000000,"price":11.5,"value":287500000.0},{"date":"2026-03-11","symbol":"BDMS","name":"ปรมาภรณ์ ปราสาททองโอสถ","rel":"ผู้รายงาน","method":"ซื้อ","amount":99906620,"price":18.7,"value":1868253794.0},{"date":"2026-03-09","symbol":"TACC","name":"ชัชชวี วัฒนสุข","rel":"ผู้รายงาน","method":"ขาย","amount":400000,"price":5.5,"value":2200000.0},{"date":"2026-03-05","symbol":"DMT","name":"สมบัติ พานิชชีวะ","rel":"ผู้รายงาน","method":"ขาย","amount":25000000,"price":11.5,"value":287500000.0},{"date":"2026-03-04","symbol":"HANA","name":"ริชาร์ด เดวิด ฮัน","rel":"ผู้รายงาน","method":"ซื้อ","amount":2500000,"price":16.8,"value":42000000.0},{"date":"2026-03-04","symbol":"BCH","name":"กันตพร หาญพาณิชย์","rel":"ผู้รายงาน","method":"ซื้อ","amount":600000,"price":9.6,"value":5760000.0},{"date":"2026-03-02","symbol":"TACC","name":"ชัชชวี วัฒนสุข","rel":"ผู้รายงาน","method":"ขาย","amount":1598300,"price":5.69,"value":9094327.0},{"date":"2026-03-02","symbol":"DMT","name":"สมบัติ พานิชชีวะ","rel":"ผู้รายงาน","method":"ขาย","amount":24000000,"price":11.5,"value":276000000.0},{"date":"2026-02-27","symbol":"MALEE","name":"ชัยฉัตร บุญรัตน์","rel":"ผู้รายงาน","method":"ซื้อ","amount":1291200,"price":4.52,"value":5836224.0},{"date":"2026-02-26","symbol":"TITLE","name":"ดรงค์ หุตะจูฑะ","rel":"ผู้รายงาน","method":"ซื้อ","amount":1100000,"price":7.91,"value":8701000.0},{"date":"2026-02-19","symbol":"DELTA","name":"เซิน-ลิน เฉิน","rel":"ผู้รายงาน","method":"ซื้อ","amount":5000,"price":225.0,"value":1125000.0},{"date":"2026-02-18","symbol":"MMM","name":"สุริยา วงศ์สิทธิชัยกุล","rel":"ผู้รายงาน","method":"ซื้อ","amount":400000,"price":3.42,"value":1368000.0},{"date":"2026-01-21","symbol":"NOBLE","name":"แฟรงค์ ฟง คึ่น เหลียง","rel":"นิติบุคคล","method":"ซื้อ","amount":189527791,"price":2.32,"value":439704475.12},{"date":"2026-01-13","symbol":"GULF","name":"สารัชถ์ รัตนาวะดี","rel":"ผู้รายงาน","method":"ซื้อ","amount":2139400,"price":42.75,"value":91459350.0}];

const STATS = {"total":88577,"buy":58402,"sell":26690,"symbols":915,"date_min":"2011-01-28","date_max":"2026-04-03"};

const BUY = "ซื้อ";
const SELL = "ขาย";

const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_LABEL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(str) {
  if (!str) return "";
  const d = parseDate(str);
  if (!d) return str;
  return `${String(d.getDate()).padStart(2,"0")} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`;
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DatePicker({ value, onChange, minDate, maxDate }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const d = parseDate(value); return d ? d.getFullYear() : 2026;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value); return d ? d.getMonth() : 3;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setShowMonthPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }
  }, [value]);

  const minD = parseDate(minDate);
  const maxD = parseDate(maxDate);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  function selectDay(day) {
    const sel = new Date(viewYear, viewMonth, day);
    if (minD && sel < minD) return;
    if (maxD && sel > maxD) return;
    onChange(toYMD(sel));
    setOpen(false);
    setShowMonthPicker(false);
  }

  const todayStr = toYMD(new Date());

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <style>{`
        .dp-cell:hover { background: #1e3a5f !important; }
        .dp-mth:hover { background: #1e2d45 !important; }
        @keyframes dpFade { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div
        onClick={() => { setOpen(o => !o); setShowMonthPicker(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#111d30", border: "1px solid #1e2d45",
          borderRadius: 6, padding: "0 10px", height: 32, minWidth: 160,
          cursor: "pointer", color: value ? "#c9d4e8" : "#3a506a",
          fontSize: 12, userSelect: "none",
        }}
      >
        <span style={{ color: "#2563eb", fontSize: 14 }}>◈</span>
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : "เลือกวันที่"}</span>
        <span style={{ color: "#3a506a", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
          background: "#0f1c2e", border: "1px solid #1e2d45",
          borderRadius: 12, padding: "16px 14px 12px",
          boxShadow: "0 12px 40px rgba(0,0,0,.7)",
          width: 290, animation: "dpFade .15s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 6px" }}>‹</button>
            <div
              onClick={() => setShowMonthPicker(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
            >
              <span style={{ color: "#c9d4e8", fontWeight: 700, fontSize: 15, fontFamily: "inherit" }}>
                {MONTHS_FULL[viewMonth]} {viewYear}
              </span>
              <span style={{ color: "#5a7090", fontSize: 11 }}>▾</span>
            </div>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 6px" }}>›</button>
          </div>

          {showMonthPicker && (
            <div style={{ marginBottom: 14, background: "#0b1422", borderRadius: 8, padding: "10px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 10 }}>
                <button onClick={() => setViewYear(y => y - 1)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>‹</button>
                <span style={{ color: "#c9d4e8", fontWeight: 700, fontSize: 14, minWidth: 48, textAlign: "center", fontFamily: "inherit" }}>{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {MONTHS_TH.map((m, i) => (
                  <div
                    key={i}
                    className="dp-mth"
                    onClick={() => { setViewMonth(i); setShowMonthPicker(false); }}
                    style={{
                      textAlign: "center", padding: "7px 0", borderRadius: 6,
                      fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      background: i === viewMonth ? "#2563eb" : "transparent",
                      color: i === viewMonth ? "#fff" : "#a0b4cc",
                      fontWeight: i === viewMonth ? 700 : 400,
                      transition: "background .1s",
                    }}
                  >{m}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DAYS_LABEL.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#4a6080", fontWeight: 600, padding: "2px 0", fontFamily: "inherit" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const d = new Date(viewYear, viewMonth, day);
              const dStr = toYMD(d);
              const isSelected = dStr === value;
              const isDisabled = (minD && d < minD) || (maxD && d > maxD);
              const isToday = dStr === todayStr;
              return (
                <div
                  key={i}
                  className={isDisabled ? "" : "dp-cell"}
                  onClick={() => !isDisabled && selectDay(day)}
                  style={{
                    textAlign: "center", padding: "5px 0 4px", borderRadius: 8,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    background: isSelected ? "#2563eb" : "transparent",
                    color: isDisabled ? "#253040" : isSelected ? "#fff" : isToday ? "#60a5fa" : "#c9d4e8",
                    fontWeight: isSelected || isToday ? 700 : 400,
                    fontSize: 13, fontFamily: "inherit",
                    transition: "background .1s",
                  }}
                >
                  <div>{day}</div>
                  <div style={{
                    width: 4, height: 4, borderRadius: "50%", margin: "2px auto 0",
                    background: isDisabled ? "transparent" : isSelected ? "rgba(255,255,255,0.6)" : "#2563eb",
                  }} />
                </div>
              );
            })}
          </div>

          {value && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e2d45", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#5a7090" }}>{formatDisplay(value)}</span>
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: "2px 6px", fontFamily: "inherit" }}
              >ล้าง</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtVal(n) {
  if (!n || n === 0) return "–";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}

function processData(records) {
  const groups = {};
  records.forEach((r) => {
    const key = r.date + "|" + r.symbol;
    if (!groups[key]) {
      groups[key] = {
        date: r.date, symbol: r.symbol, name: r.name,
        buy: 0, sell: 0,
        closePrice: r.price, price: r.price,
        methods: new Set()
      };
    }
    if (r.method === BUY) groups[key].buy += r.value;
    else if (r.method === SELL) groups[key].sell += r.value;
    groups[key].methods.add(r.method);
    if (r.price > 0) {
      groups[key].closePrice = r.price;
      groups[key].price = r.price;
    }
  });
  return Object.values(groups).map(g => ({ ...g, methods: [...g.methods].join("/") }));
}

function SymbolSelect({ symbols, value, onChange, onCheckboxClick, isAllChecked, hasData }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // checkbox checked = isAllChecked OR มี symbol เลือกอยู่
  const checked = isAllChecked || !!value;
  // label: ถ้า All → "All", ถ้าเลือก symbol → ชื่อ symbol, ไม่มี → "Type a Symbol"
  const label = isAllChecked ? "All" : (value || "Type a Symbol");
  const labelColor = isAllChecked ? "#c9d4e8" : (value ? "#60a5fa" : "#3a506a");

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div
        onMouseDown={e => {
          e.preventDefault();
          if (e.target.closest("[data-cb]")) {
            onCheckboxClick && onCheckboxClick();
            return;
          }
          // เปิด dropdown ได้ก็ต่อเมื่อมีข้อมูลแล้ว (หลังกด Check)
          if (hasData) setOpen(o => !o);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          background: "#111d30", border: "1px solid #1e2d45",
          borderRadius: 8, padding: "0 32px 0 10px", height: 32, minWidth: 160,
          cursor: hasData ? "pointer" : "default",
          fontSize: 12, userSelect: "none", position: "relative",
        }}
      >
        <div
          data-cb="1"
          style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            border: "1px solid #3a506a",
            background: checked ? "#2563eb" : "#0b1422",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {checked && (
            <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
              <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <span style={{ flex: 1, color: labelColor, fontWeight: value && !isAllChecked ? 700 : 400 }}>
          {label}
        </span>
        {hasData && (
          <span style={{
            position: "absolute", right: 10, top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            color: "#3a506a", fontSize: 10, pointerEvents: "none", transition: "transform .15s",
          }}>▾</span>
        )}
      </div>

      {open && hasData && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#0f1c2e", border: "1px solid #1e2d45", borderRadius: 10,
          zIndex: 999, boxShadow: "0 8px 32px rgba(0,0,0,.5)",
          maxHeight: 220, overflowY: "auto",
        }}>
          {symbols.map(s => (
            <div
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                padding: "8px 14px", fontSize: 12, cursor: "pointer",
                color: value === s ? "#60a5fa" : "#c9d4e8",
                fontWeight: value === s ? 700 : 400,
                background: "transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#1e3a5f"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortArrow({ col, sortCol, sortDir }) {
  const active = sortCol === col;
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10 }}>
      {active ? (sortDir === 1 ? "↑" : "↓") : "⇅"}
    </span>
  );
}

export default function Form59Dashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("2026-04-03");

  const [symbolFilter, setSymbolFilter] = useState("");  // "" = All, "DMT" = filter specific
  const [isAllChecked, setIsAllChecked] = useState(false); // checkbox state
  const [minValue, setMinValue] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // sumValueSymbols: จะมีค่าก็ต่อเมื่อกด Check แล้วเท่านั้น
  const [sumValueSymbols, setSumValueSymbols] = useState([]); // [] = ยังไม่กด Check

  const tableWrapRef = useRef(null);

  useEffect(() => {
    if (!tableWrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const wrapHeight = entry.contentRect.height;
        const headerHeight = 76;
        const rowHeight = 36.5;
        let calculated = Math.floor((wrapHeight - headerHeight) / rowHeight);
        if (calculated < 5) calculated = 5;
        setPageSize(calculated);
      }
    });
    observer.observe(tableWrapRef.current);
    return () => observer.disconnect();
  }, []);

  const allSymbols = useMemo(
    () => [...new Set(RAW_RECORDS.map((r) => r.symbol))].sort(),
    []
  );

  // rangeData: ข้อมูลทั้ง range → ใช้สำหรับ dropdown symbols
  const rangeData = useMemo(() => {
    let d = [...RAW_RECORDS];
    if (startDate) d = d.filter(r => r.date >= startDate);
    if (endDate) d = d.filter(r => r.date <= endDate);
    const processed = processData(d);
    const minV = parseFloat(minValue) || 0;
    return minV > 0 ? processed.filter(r => (r.buy + r.sell) >= minV) : processed;
  }, [startDate, endDate, minValue]);

  // filteredNoSymbol: ข้อมูลตาราง
  // - start+end → ชี้ end date เท่านั้น (sum value ของวันสุดท้าย)
  // - start หรือ end อย่างเดียว → ตามปกติ
  const filteredNoSymbol = useMemo(() => {
    let d = [...RAW_RECORDS];

    if (startDate && endDate) {
      d = d.filter((r) => r.date === endDate);
    } else if (startDate) {
      d = d.filter((r) => r.date >= startDate);
    } else if (endDate) {
      d = d.filter((r) => r.date === endDate);
    }

    const processed = processData(d);
    const minV = parseFloat(minValue) || 0;
    return minV > 0 ? processed.filter(r => (r.buy + r.sell) >= minV) : processed;
  }, [startDate, endDate, minValue]);

  // กด Check → dropdown = top symbol ของแต่ละวันใน range
  function handleCheck() {
    // group by date → หา top symbol ของแต่ละวัน
    const byDate = {};
    rangeData.filter(r => (r.buy + r.sell) > 0).forEach(r => {
      if (!byDate[r.date] || (r.buy + r.sell) > (byDate[r.date].buy + byDate[r.date].sell)) {
        byDate[r.date] = r;
      }
    });
    // เอา symbol ของแต่ละวัน (unique, sort)
    const symbols = [...new Set(Object.values(byDate).map(r => r.symbol))].sort();
    setSumValueSymbols(symbols);

    // auto-select top symbol จากข้อมูล end date
    const source = filteredNoSymbol.filter(r => (r.buy + r.sell) > 0);
    if (source.length > 0) {
      const top = source.reduce((best, r) =>
        (r.buy + r.sell) > (best.buy + best.sell) ? r : best
      , source[0]);
      setSymbolFilter(top.symbol);
      setIsAllChecked(false);
    } else {
      setSymbolFilter("");
      setIsAllChecked(false);
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let result = [...filteredNoSymbol];

    if (isAllChecked) {
      // All → แสดงทั้งหมด
    } else if (symbolFilter) {
      // เลือก symbol เฉพาะ → filter เฉพาะตัวนั้น
      result = result.filter(r => r.symbol === symbolFilter);
    } else if (sumValueSymbols.length > 0) {
      // หลังกด Check แต่ยังไม่ได้ติ๊ก All → แสดงเฉพาะ sumValueSymbols
      result = result.filter(r => sumValueSymbols.includes(r.symbol));
    }

    return result.sort((a, b) => {
      let va, vb;
      if (sortCol === "totalValue") {
        va = a.buy + a.sell;
        vb = b.buy + b.sell;
      } else {
        va = a[sortCol] ?? 0;
        vb = b[sortCol] ?? 0;
      }
      if (typeof va === "string") return va.localeCompare(vb) * sortDir;
      return (va - vb) * sortDir;
    });
  }, [filteredNoSymbol, symbolFilter, isAllChecked, sumValueSymbols, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => d * -1);
    else { setSortCol(col); setSortDir(-1); }
    setPage(1);
  }

  function reset() {
    setStartDate("");
    setEndDate("2026-04-03");
    setSymbolFilter("");
    setIsAllChecked(false);
    setSumValueSymbols([]);
    setMinValue("");
    setSortCol("date");
    setSortDir(-1);
    setPage(1);
  }

  const S = {
    wrap: {
      background: "#0b1120",
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      color: "#c9d4e8",
      overflow: "hidden"
    },
    topBar: {
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px", background: "#0d1526",
      borderBottom: "1px solid #1e2d45", flexWrap: "wrap",
      flexShrink: 0
    },
    divider: { width: 1, height: 24, background: "#1e2d45", flexShrink: 0 },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
    label: { fontSize: 10, color: "#5a7090", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 },
    select: {
      background: "#111d30", border: "1px solid #1e2d45",
      borderRadius: 6, padding: "0 8px", height: 32,
      color: "#c9d4e8", fontSize: 12, outline: "none",
      cursor: "pointer", minWidth: 140, fontFamily: "inherit"
    },
    resetBtn: {
      background: "transparent", border: "1px solid #1e2d45",
      borderRadius: 6, height: 32, padding: "0 14px",
      color: "#7a90b0", fontSize: 18, cursor: "pointer",
      lineHeight: 1, flexShrink: 0
    },
    checkBtn: {
      height: 32, padding: "0 16px",
      background: "#2563eb", border: "none",
      borderRadius: 6, color: "#fff",
      fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
      flexShrink: 0, transition: "background .15s",
    },
    tableWrap: {
      flex: 1, minHeight: 0,
      overflowX: "auto", overflowY: "auto",
      background: "#0b1120"
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: (align = "left") => ({
      padding: "10px 14px", textAlign: align, color: "#5a7090", fontWeight: 600,
      fontSize: 11, borderBottom: "1px solid #1e2d45", borderRight: "1px solid #1e2d45",
      background: "#0d1526", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
      verticalAlign: "middle", position: "sticky", top: 0, zIndex: 10
    }),
    td: (align = "left") => ({
      padding: "9px 14px", borderBottom: "1px solid #1e2d45", borderRight: "1px solid #1e2d45",
      whiteSpace: "nowrap", color: "#c9d4e8", textAlign: align
    }),
    pagination: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", background: "#0d1526", borderTop: "1px solid #1e2d45",
      fontSize: 11, color: "#5a7090", flexWrap: "wrap", gap: 8, flexShrink: 0
    },
    pageBtn: (active, disabled) => ({
      background: active ? "rgba(37,99,235,0.15)" : "transparent",
      border: `1px solid ${active ? "#2563eb" : "#1e2d45"}`,
      borderRadius: 5, padding: "3px 9px",
      color: disabled ? "#253040" : active ? "#60a5fa" : "#7a90b0",
      fontSize: 11, cursor: disabled ? "default" : "pointer", fontFamily: "inherit"
    }),
  };

  const pageStart = Math.max(1, Math.min(totalPages - 4, safePage - 2));
  const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => pageStart + i);

  return (
    <div style={S.wrap}>
      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <ToolHint onViewDetails={() => window.scrollTo({ top: 0 })}>
          Stockdatatable - Sum Value จะแสดงเฉพาะ symbol ที่มีมูลค่าซื้อ+ขายสูงสุดของแต่ละวันในช่วงที่เลือก (ถ้าเลือกทั้ง start+end จะดูแค่วันที่ end) และสามารถเลือกดูเฉพาะ symbol นั้นๆ หรือทั้งหมดได้ด้วย checkbox
        </ToolHint>

        <button style={S.resetBtn} onClick={reset} title="Reset filters">↺</button>
        <div style={S.divider} />

        {/* Start Date */}
        <div style={S.fieldGroup}>
          <span style={S.label}>Start Date</span>
          <DatePicker
            value={startDate}
            onChange={v => { setStartDate(v); setPage(1); }}
            maxDate={endDate || STATS.date_max}
          />
        </div>

        {/* End Date */}
        <div style={S.fieldGroup}>
          <span style={S.label}>End Date</span>
          <DatePicker
            value={endDate}
            onChange={v => { setEndDate(v); setPage(1); }}
            minDate={startDate || STATS.date_min}
            maxDate={STATS.date_max}
          />
        </div>

        <div style={S.divider} />

        {/* Sum Value */}
        <div style={S.fieldGroup}>
          <span style={S.label}>Sum Value</span>
          <SymbolSelect
            symbols={sumValueSymbols}
            value={isAllChecked ? "" : symbolFilter}
            onChange={(v) => {
              setSymbolFilter(v);
              setIsAllChecked(false);
              setPage(1);
            }}
            onCheckboxClick={() => {
              // กดติ๊ก checkbox → toggle All
              if (!isAllChecked) {
                setIsAllChecked(true);
                setSymbolFilter("");
              } else {
                setIsAllChecked(false);
              }
              setPage(1);
            }}
            isAllChecked={isAllChecked}
            hasData={sumValueSymbols.length > 0}
          />
        </div>

        <div style={S.divider} />

        {/* Min Value + Check button */}
        <div style={S.fieldGroup}>
          <span style={S.label}>&nbsp;</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              style={S.select}
              value={minValue}
              onChange={e => { setMinValue(e.target.value); setPage(1); }}
            >
              <option value="">Min Value</option>
              <option value="100">100 THB</option>
              <option value="1000">1,000 THB</option>
              <option value="10000">10,000 THB</option>
              <option value="100000">100,000 THB</option>
              <option value="500000">500,000 THB</option>
              <option value="1000000">1,000,000 THB</option>
              <option value="5000000">5,000,000 THB</option>
              <option value="10000000">10,000,000 THB</option>
              <option value="50000000">50,000,000 THB</option>
              <option value="100000000">100,000,000 THB</option>
            </select>

            <button
              style={S.checkBtn}
              onClick={handleCheck}
              onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
              onMouseLeave={e => e.currentTarget.style.background = "#2563eb"}
            >
              Check
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={S.tableWrap} ref={tableWrapRef}>
        <table style={S.table}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...S.th("center"), verticalAlign: "middle" }} onClick={() => handleSort("date")}>
                Date <SortArrow col="date" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th rowSpan={2} style={{ ...S.th("center"), verticalAlign: "middle" }} onClick={() => handleSort("symbol")}>
                Symbol <SortArrow col="symbol" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th rowSpan={2} style={{ ...S.th("center"), verticalAlign: "middle" }} onClick={() => handleSort("name")}>
                Name <SortArrow col="name" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th colSpan={2} style={{ ...S.th("center"), borderBottom: "none", verticalAlign: "middle" }}>
                Value
              </th>
              <th rowSpan={2} style={{ ...S.th("center"), verticalAlign: "middle" }} onClick={() => handleSort("closePrice")}>
                Close Price <SortArrow col="closePrice" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th rowSpan={2} style={{ ...S.th("center"), verticalAlign: "middle" }} onClick={() => handleSort("price")}>
                Last Price <SortArrow col="price" sortCol={sortCol} sortDir={sortDir} />
              </th>
            </tr>
            <tr>
              <th style={{ ...S.th("center"), borderTop: "1px solid #1e2d45" }} onClick={() => handleSort("buy")}>
                Buy <SortArrow col="buy" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th style={{ ...S.th("center"), borderTop: "1px solid #1e2d45" }} onClick={() => handleSort("sell")}>
                Sell <SortArrow col="sell" sortCol={sortCol} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "60px", textAlign: "center", color: "#3a506a", fontSize: 14 }}>
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : pageData.map((r, i) => {
              const isSelected = r.symbol === symbolFilter;
              return (
                <tr
                  key={i}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(30,100,200,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? "rgba(37,99,235,0.06)" : "transparent"}
                  style={{ background: isSelected ? "rgba(37,99,235,0.06)" : "transparent" }}
                >
                  <td style={{ ...S.td("center"), color: "#5a7090", fontFamily: "monospace" }}>{r.date}</td>
                  <td style={{ ...S.td("center"), color: "#60a5fa", fontWeight: 700, letterSpacing: "0.05em", fontFamily: "monospace" }}>{r.symbol}</td>
                  <td style={{ ...S.td("center"), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</td>
                  <td style={{ ...S.td("center"), color: "#22c55e", fontWeight: 600, fontFamily: "monospace" }}>{r.buy ? fmtVal(r.buy) : "–"}</td>
                  <td style={{ ...S.td("center"), color: "#ef4444", fontWeight: 600, fontFamily: "monospace" }}>{r.sell ? fmtVal(r.sell) : "–"}</td>
                  <td style={{ ...S.td("center"), fontFamily: "monospace" }}>{r.closePrice > 0 ? r.closePrice.toFixed(2) : "–"}</td>
                  <td style={{ ...S.td("center"), fontFamily: "monospace" }}>{r.price > 0 ? r.price.toFixed(2) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div style={S.pagination}>
          <span>
            แสดง {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} จาก {filtered.length.toLocaleString()} รายการ
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={S.pageBtn(false, safePage === 1)} disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>←</button>
            {pageNums.map(p => (
              <button key={p} style={S.pageBtn(p === safePage, false)} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={S.pageBtn(false, safePage === totalPages)} disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}