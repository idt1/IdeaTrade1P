// src/pages/dashboard/premiuntools.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ToolsCard from "@/components/ToolsCard";

// 🟢 1. อิมพอร์ต useAuth เข้ามาใช้เป็นศูนย์กลางเหมือนหน้าอื่นๆ
import { useAuth } from "@/context/AuthContext"; // ⚠️ เช็ค Path ให้ตรงกับ AuthContext ของคุณ

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
   Data Configuration
======================= */
const projects = [
  {
    id: "stock-mover",
    name: "Stock Mover",
    desc: "Real-time screener for stocks with high volatility and momentum.",
    external: true,
    url: "https://stockmover.com",
  },
  {
    id: "Project-Name",
    name: "Stock Screener", 
    desc: "Filter stocks utilizing advanced technical and fundamental indicators.",
    premium: false,
  },
  {
    id: "Project-Name-2",
    name: "Trend Hunter", 
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

export default function PremiumTools() {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);
  
  // 🟢 2. ดึง userData จาก Context มาตรวจสอบวันหมดอายุ
  const authContext = useAuth();
  const userData = authContext?.userData || null;
  
  // กรองเฉพาะ Tools ที่เป็น Premium
  const premiumTools = projects.filter((tool) => tool.premium);

  // 🟢 3. ฟังก์ชันเช็กสถานะปลดล็อก (อ้างอิงจากช่อง subscriptions ตรงๆ)
  const isToolUnlocked = (id) => {
    if (!userData || !userData.subscriptions) return false;
    
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

  /* 🟢 4. เช็กสถานะทั่วไป (Fallback กรณีไม่ได้ล็อกอิน) */
  useEffect(() => {
    if (userData) {
      setIsMember(userData.role === "member" || userData.role === "membership" || Object.keys(userData.subscriptions || {}).length > 0);
    } else {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const parsedData = JSON.parse(saved);
        setIsMember(parsedData.role === "member" || parsedData.role === "membership");
      } else {
        setIsMember(false);
      }
    }
  }, [userData]);

  return (
    <div className="w-full">
      {/* ===== Header Section ===== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-5">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 md:mb-3">
            Membership Tools
          </h1>
          <p className="text-gray-400 text-sm max-w-4xl leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>

        <button
          onClick={() => navigate("/member-register")}
          className="w-full md:w-auto bg-[#0099ff] hover:bg-[#007acc] text-white px-6 py-3 md:py-2.5 rounded-full font-medium transition shadow-lg whitespace-nowrap text-sm md:text-base"
        >
          Upgrade subscription
        </button>
      </div>

      {/* ===== Grid Section ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {premiumTools.map((tool) => {
          // 🟢 5. เช็กว่า Tool นี้ถูกปลดล็อกหรือไม่
          const unlocked = isToolUnlocked(tool.id);
          
          return (
            <ToolsCard
              key={tool.id}
              project={tool}
              isMember={unlocked} 
              unlockedList={unlocked ? [tool.id] : []} 
            />
          );
        })}
      </div>
    </div>
  );
}