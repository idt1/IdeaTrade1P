// src/pages/dashboard/premiuntools.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ToolsCard from "@/components/ToolsCard";

// Import Firebase ให้เหมือนหน้า PreviewProject
import { auth, db } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
    name: "Stock Fortune",
    desc: "Probabilistic market forecasting based on sentiment and historical data.",
    premium: true,
  },
  {
    id: "petroleum",
    name: "Petroleum",
    desc: "Global crude oil insights, supply chain analysis, and energy sector trends.",
    premium: true,
  },
  {
    id: "rubber",
    name: "Rubber Thai",
    desc: "Comprehensive data on Thai rubber exports, futures, and agricultural indices.",
    premium: true,
  },
  {
    id: "flow",
    name: "Flow Intraday",
    desc: "Monitor real-time institutional fund flow and sector rotation throughout the day.",
    premium: true,
  },
  {
    id: "s50",
    name: "S50",
    desc: "In-depth analytics for SET50 Index Futures, basis, and volatility monitoring.",
    premium: true,
  },
  {
    id: "gold",
    name: "Gold",
    desc: "Live spot gold tracking correlated with currency exchange rates and macro data.",
    premium: true,
  },
  {
    id: "bidask",
    name: "BidAsk Analysis",
    desc: "Visualize buy/sell pressure and detect hidden liquidity walls in the order book.",
    premium: true,
  },
  {
    id: "tickmatch",
    name: "TickMatch",
    desc: "Analyze trade-by-trade execution to spot aggressive large-volume transactions.",
    premium: true,
  },
  {
    id: "dr",
    name: "DR (Global)",
    desc: "Track Depositary Receipts movements to access global markets via local exchange.",
    premium: true,
  },
];

export default function PremiumTools() {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);
  const [unlockedList, setUnlockedList] = useState([]);
  
  // กรองเฉพาะ Tools ที่เป็น Premium
  const premiumTools = projects.filter((tool) => tool.premium);

  /* อัปเดต Load user profile ให้เช็คแบบเดียวกับหน้า Preview ===== */
  useEffect(() => {
    const loadDemoProfile = () => {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const userData = JSON.parse(saved);
        const subscriptions = userData.mySubscriptions || [];
        const unlockedFromSubs = subscriptions.map(sub => sub.id); 
        const explicitUnlocked = userData.unlockedItems || [];
        const combinedUnlocked = [...new Set([...explicitUnlocked, ...unlockedFromSubs])];
        
        const hasAccess = userData.role === "member" || userData.role === "membership" || combinedUnlocked.length > 0;
        setIsMember(hasAccess);
        setUnlockedList(combinedUnlocked);
      } else {
        setIsMember(false);
        setUnlockedList([]);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const subscriptions = userData.mySubscriptions || [];
            const unlockedFromSubs = subscriptions.map(sub => sub.id); 
            const explicitUnlocked = userData.unlockedItems || [];
            const combinedUnlocked = [...new Set([...explicitUnlocked, ...unlockedFromSubs])];
            const hasAccess = userData.role === "member" || userData.role === "membership" || combinedUnlocked.length > 0;

            setIsMember(hasAccess);
            setUnlockedList(combinedUnlocked);
          }
        } catch (err) {
          console.error("Error fetching Firestore:", err);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-5">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 md:mb-3">
            Membership Tools
          </h1>
          <p className="text-gray-400 text-sm max-w-3xl leading-relaxed">
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
        {premiumTools.map((tool) => (
          <ToolsCard
            key={tool.id}
            project={tool}
            // ปรับตรงนี้ให้เหมือนหน้า PreviewProject เลยครับ
            isMember={unlockedList.includes(tool.id)}
            unlockedList={unlockedList}
          />
        ))}
      </div>
    </div>
  );
}