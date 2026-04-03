// src/pages/dashboard/previewproject.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mitIcon from "@/assets/icons/amit.svg"; 
import ToolsCard from "@/components/ToolsCard.jsx";

// 🟢 1. เปลี่ยนมาใช้ useAuth เพื่อดึงข้อมูลจากศูนย์กลางเดียวกับหน้า ManageSubscription
import { useAuth } from "@/context/AuthContext"; 

import fortuneIcon from "@/assets/icons/fortune.svg";
import petroleumIcon from "@/assets/icons/petroleum.svg";
import rubberIcon from "@/assets/icons/rubber.svg";
import flowIcon from "@/assets/icons/flow.svg";
import s50Icon from "@/assets/icons/s50.svg";
import goldIcon from "@/assets/icons/gold.svg";
import bidaskIcon from "@/assets/icons/bidask.svg";
import tickmatchIcon from "@/assets/icons/tickmatch.svg";
import drIcon from "@/assets/icons/dr.svg";

/* =======================
   Project Data
======================= */
const projects = [
  {
    id: "stock-mover",
    name: "Stock Mover",
    desc: "Real-time screener for stocks with high volatility and momentum.",
    external: true,
    url: "https://ideatrade1.com/stockmover",
  },
  {
    id: "cal-dr",
    name: "Cal DR", 
    desc: "Cal DR is an all-in-one web platform that simplifies investing in foreign stocks through DRs.",
    external: true,
    url: "https://ideatrade1.com/caldr",
    premium: false,
  },
  {
    id: "Project-Name",
    name: "Project Name", 
    desc: "Identify emerging market trends before they become obvious to the crowd.",
    premium: false,
  },
  {
    id: "fortune",
    name: "Stock Fortune Teller",
    desc: "Probabilistic market forecasting based on sentiment and historical data.",
    premium: true,
    icon: <img src={fortuneIcon} alt="fortune" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "petroleum",
    name: "Petroleum",
    desc: "Global crude oil insights, supply chain analysis, and energy sector trends.",
    premium: true,
    icon: <img src={petroleumIcon} alt="petroleum" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "rubber",
    name: "Rubber Thai",
    desc: "Comprehensive data on Thai rubber exports, futures, and agricultural indices.",
    premium: true,
    icon: <img src={rubberIcon} alt="rubber" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "flow",
    name: "Flow Intraday",
    desc: "Monitor real-time institutional fund flow and sector rotation throughout the day.",
    premium: true,
    icon: <img src={flowIcon} alt="flow" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "s50",
    name: "S50",
    desc: "In-depth analytics for SET50 Index Futures, basis, and volatility monitoring.",
    premium: true,
    icon: <img src={s50Icon} alt="s50" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "gold",
    name: "Gold",
    desc: "Live spot gold tracking correlated with currency exchange rates and macro data.",
    premium: true,
    icon: <img src={goldIcon} alt="gold" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "bidask",
    name: "BidAsk",
    desc: "Visualize buy/sell pressure and detect hidden liquidity walls in the order book.",
    premium: true,
    icon: <img src={bidaskIcon} alt="bidask" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "tickmatch",
    name: "TickMatch",
    desc: "Analyze trade-by-trade execution to spot aggressive large-volume transactions.",
    premium: true,
    icon: <img src={tickmatchIcon} alt="tickmatch" className="w-5 h-5 brightness-0 invert" />
  },
  {
    id: "dr",
    name: "DR",
    desc: "Track Depositary Receipts movements to access global markets via local exchange.",
    premium: true,
    icon: <img src={drIcon} alt="dr" className="w-5 h-5 brightness-0 invert" />
  },
];

/* =======================
   Component
======================= */
export default function PreviewProjects() {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

  // 🟢 2. ดึง userData จาก AuthContext มาใช้งาน
  const authContext = useAuth();
  const userData = authContext?.userData || null;

  // 🟢 3. อัปเกรดฟังก์ชันเช็กสถานะ ให้ดูจาก Map: subscriptions ตรงๆ เหมือนหน้า ManageSubscription
  const isToolUnlocked = (id) => {
    if (!userData || !userData.subscriptions) return false;
    
    // ดึง Timestamp ของเครื่องมือที่ระบุ
    const expireTimestamp = userData.subscriptions[id.toLowerCase()];
    if (!expireTimestamp) return false;
    
    let expireDate;
    try {
      expireDate = typeof expireTimestamp.toDate === 'function' 
        ? expireTimestamp.toDate() 
        : new Date(expireTimestamp);
    } catch (error) {
      expireDate = new Date(0); 
    }
    
    return expireDate > new Date(); // ตรวจสอบว่าเลยวันปัจจุบันหรือยัง
  };

  /* 🟢 4. เช็กสถานะ isMember ทั่วไป (ใช้เป็น Fallback สำหรับ UI บางส่วน) */
  useEffect(() => {
    if (userData) {
      setIsMember(userData.role === "member" || userData.role === "membership" || Object.keys(userData.subscriptions || {}).length > 0);
    } else {
      // Fallback: ดึงจาก LocalStorage กรณีไม่ได้ล็อกอิน (หรือโหลดไม่ทัน)
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const parsedData = JSON.parse(saved);
        setIsMember(parsedData.role === "member" || parsedData.role === "membership");
      } else {
        setIsMember(false);
      }
    }
  }, [userData]);

  /* ===== Permission Logic ===== */
  const canAccess = (project) => !project.premium || isToolUnlocked(project.id);

  const handleOpenTool = (project) => {
    if (canAccess(project)) {
      alert(`Opening ${project.name}...`);
      // navigate(`/tools/${project.id}`);
    } else {
      navigate("/member-register");
    }
  };

  const handleOpenMIT = () => {
    navigate("/dashboard", {
      state: { goTo: "mit" },
    });
  };

  return (
    <div className="space-y-10 md:space-y-12">

      {/* ===== MIT SECTION ===== */}
      <section>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-5 md:mb-6">
          Accessible Beta Tools
        </h1>

        <div className="bg-[#263C4F] rounded-2xl p-5 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 md:gap-6">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-[#1B2E3E] flex items-center justify-center shrink-0">
              <img src={mitIcon} alt="MIT" className="w-7 h-7" />
            </div>

            {/* Content */}
            <div className="flex-1 w-full">
              {/* Title & Button Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-semibold text-white">
                  MIT : Multi-Agent Intelligent Analyst
                </h2>

                <button
                  onClick={handleOpenMIT}
                  className="bg-[#0B78B8] hover:bg-[#0E8ED8]
                             px-5 py-2.5 sm:py-2 rounded-lg sm:rounded-full
                             text-white text-sm font-semibold
                             transition flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
                >
                  <img src={mitIcon} className="w-4 h-4" alt="icon" />
                  Open MIT
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 mt-3 md:mt-2 leading-relaxed w-full">
                Experience the next level of trading with our Multi-Agent LLM system
                that simulates a professional institutional research team. By assigning
                specific roles to multiple AI agents, the system engages in rigorous
                data debates to eliminate bias, providing you with the most objective
                and high-probability trading insights available.
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 md:mt-8">
            {[
              {
                title: "Role-Based AI Analysis",
                desc: "Strategic collaboration between 4 specialized AI teams: Analyst, Research, Risk Management, and Trader.",
              },
              {
                title: "Bull vs. Bear Debate",
                desc: "Our proprietary debate engine pits 'Bullish' vs. 'Bearish' AI agents against each other to challenge assumptions.",
              },
              {
                title: "Smart Execution & Risk Guard",
                desc: "Receive clear Buy/Sell/Hold signals with logical justification including an automated 'Risk Vet'.",
              },
              {
                title: "Real-time Intel & Backtesting",
                desc: "Access live market reports and verify strategies with our integrated backtesting engine.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-[#1B2E3E] rounded-xl p-4 md:p-5 border border-white/5 flex flex-col h-full"
              >
                <h3 className="font-semibold text-sm text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed flex-grow">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== OTHER PROJECTS ===== */}
      <section>
        <h2 className="text-xl md:text-2xl font-semibold text-white mb-5 md:mb-6">
          Other Project
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {projects.map((project) => {
          // 🟢 5. เรียกใช้ isToolUnlocked ได้เลย มันจะไปอ่านวันหมดอายุที่แม่นยำจาก Context ให้อัตโนมัติ
          const unlocked = isToolUnlocked(project.id);
          
          return (
            <ToolsCard
              key={project.id}
              project={project}
              isMember={unlocked} 
              unlockedList={unlocked ? [project.id] : []}
            />
          );
        })}
        </div>
      </section>
    </div>
  );
}