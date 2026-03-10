// src/pages/dashboard/PremiumTools.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ⚠️ ตรวจสอบชื่อไฟล์ component ของคุณอีกครั้ง (ToolsCard หรือ ToolCard)
import ToolsCard from "@/components/ToolsCard.jsx"; 

import { auth, db } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/* =======================
    Data Configuration
======================= */
const projects = [
  { id: "stock-mover", name: "Stock Mover", desc: "Real-time screener for stocks with high volatility and momentum.", external: true, url: "https://stockmover.com" },
  { id: "Project-Name", name: "Stock Screener", desc: "Filter stocks utilizing advanced technical and fundamental indicators.", premium: false },
  { id: "Project-Name-2", name: "Trend Hunter", desc: "Identify emerging market trends before they become obvious to the crowd.", premium: false },
  { id: "fortune", name: "Stock Fortune", desc: "Probabilistic market forecasting based on sentiment and historical data.", premium: true },
  { id: "petroleum", name: "Petroleum", desc: "Global crude oil insights, supply chain analysis, and energy sector trends.", premium: true },
  { id: "rubber", name: "Rubber Thai", desc: "Comprehensive data on Thai rubber exports, futures, and agricultural indices.", premium: true },
  { id: "flow", name: "Flow Intraday", desc: "Monitor real-time institutional fund flow and sector rotation throughout the day.", premium: true },
  { id: "s50", name: "S50", desc: "In-depth analytics for SET50 Index Futures, basis, and volatility monitoring.", premium: true },
  { id: "gold", name: "Gold", desc: "Live spot gold tracking correlated with currency exchange rates and macro data.", premium: true },
  { id: "bidask", name: "BidAsk Analysis", desc: "Visualize buy/sell pressure and detect hidden liquidity walls in the order book.", premium: true },
  { id: "tickmatch", name: "TickMatch", desc: "Analyze trade-by-trade execution to spot aggressive large-volume transactions.", premium: true },
  { id: "dr", name: "DR (Global)", desc: "Track Depositary Receipts movements to access global markets via local exchange.", premium: true },
];

export default function PremiumTools() {
  const navigate = useNavigate();
  const [unlockedList, setUnlockedList] = useState([]);
  const [isGlobalMember, setIsGlobalMember] = useState(false); // เพิ่ม State สำหรับเช็ค Role โดยตรง
  
  const premiumTools = projects.filter((tool) => tool.premium);

  /* ===== Load user profile & Check Subscriptions ===== */
  useEffect(() => {
    const getActiveToolIds = (userData) => {
      const now = new Date();
      const activeIds = [];

      // 1. ตรวจสอบ Role (เหมือน Sidebar)
      const hasGlobalRole = userData.role === "member" || userData.role === "membership";
      setIsGlobalMember(hasGlobalRole);

      // ถ้าเป็น Global Member ให้ถือว่าปลดล็อค Premium ทุกตัว
      if (hasGlobalRole) {
        return premiumTools.map(t => t.id);
      }

      // 2. ตรวจสอบจาก Object "subscriptions" (เช็ควันหมดอายุรายตัว)
      if (userData.subscriptions) {
        Object.entries(userData.subscriptions).forEach(([toolId, expTimestamp]) => {
          const expDate = expTimestamp?.toDate ? expTimestamp.toDate() : new Date(expTimestamp);
          if (expDate > now) {
            activeIds.push(toolId);
          }
        });
      }

      // 3. ตรวจสอบจาก "unlockedItems" (กรณีแอดมินปลดล็อคให้ถาวร)
      if (Array.isArray(userData.unlockedItems)) {
        userData.unlockedItems.forEach(id => {
          if (!activeIds.includes(id)) activeIds.push(id);
        });
      }
      
      return activeIds;
    };

    const processUserData = (userData) => {
      const validUnlocked = getActiveToolIds(userData);
      setUnlockedList(validUnlocked);
    };

    const loadDemoProfile = () => {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        processUserData(JSON.parse(saved));
      } else {
        setUnlockedList([]);
        setIsGlobalMember(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            processUserData(data);
            localStorage.setItem("userProfile", JSON.stringify(data));
          }
        } catch (err) {
          console.error("Error fetching Firestore:", err);
          loadDemoProfile();
        }
      } else {
        loadDemoProfile();
      }
    });

    window.addEventListener("storage", loadDemoProfile);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", loadDemoProfile);
    };
  }, []);

  return (
    <div className="w-full">
      {/* ===== Header Section ===== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Membership Tools
          </h1>
          <p className="text-gray-400 text-sm max-w-3xl">
            Exclusive premium analytics tools for professional traders. Access real-time data, 
            institutional flows, and advanced market insights tailored to your subscription.
          </p>
        </div>

        <button
          onClick={() => navigate("/member-register")}
          className="bg-[#0099ff] hover:bg-[#007acc] text-white px-6 py-2.5 rounded-full font-medium transition shadow-lg whitespace-nowrap"
        >
          Upgrade subscription
        </button>
      </div>

      {/* ===== Grid Section ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {premiumTools.map((tool) => {
          // เช็คสิทธิ์: เป็น Global Member หรือ มี ID อยู่ใน List ที่ยังไม่หมดอายุ
          const hasAccess = isGlobalMember || unlockedList.includes(tool.id);

          return (
            <ToolsCard
              key={tool.id}
              project={tool}
              // ส่ง hasAccess ไปเป็น isMember เพื่อให้การ์ดเปลี่ยนสี (ทอง/เทา)
              isMember={hasAccess} 
              unlockedList={unlockedList}
            />
          );
        })}
      </div>
    </div>
  );
}