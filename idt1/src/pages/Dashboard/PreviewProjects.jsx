// src/pages/dashboard/previewproject.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mitIcon from "@/assets/icons/amit.svg"; 
import ToolsCard from "@/components/ToolsCard.jsx";

import { auth, db } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/* =======================
   Project Data
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
    name: "Stock Fortune", // หรือ Market Oracle
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

/* =======================
   Component
======================= */
export default function PreviewProjects() {
  const navigate = useNavigate();

  const [isMember, setIsMember] = useState(false);
  const [unlockedList, setUnlockedList] = useState([]);

/* ===== Load user profile ===== */
/* ===== Load user profile ===== */
  useEffect(() => {
    // ฟังก์ชันสำหรับโหลดโหมด Demo จาก LocalStorage
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
        // 🔥 เข้าสู่โหมด DEMO (อ่านจาก LocalStorage) 🔥
        loadDemoProfile();
      }
    });

    // ดักฟังการจำลองจ่ายเงินในโหมด Demo
    window.addEventListener("storage", loadDemoProfile);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", loadDemoProfile);
    };
  }, []);

  /* ===== Permission Logic ===== */
  const canAccess = (project) =>
    !project.premium || isMember || unlockedList.includes(project.id);

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
    <div className="space-y-12">

      {/* ===== MIT SECTION ===== */}
      <section>
        <h1 className="text-3xl font-bold text-white mb-6">
          Accessible Beta Tools
        </h1>

        <div className="bg-[#263C4F] rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex gap-4 w-full">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#1B2E3E] flex items-center justify-center shrink-0">
                <img src={mitIcon} alt="MIT" className="w-7 h-7" />
              </div>

              {/* Content */}
              <div className="flex-1 w-full">
                {/* Title Row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-semibold text-white">
                    MIT : Multi-Agent Intelligent Analyst
                  </h2>

                  <button
                    onClick={handleOpenMIT}
                    className="bg-[#0B78B8] hover:bg-[#0E8ED8]
                             px-5 py-2 rounded-full
                             text-white text-sm font-semibold
                             transition flex items-center gap-2 shrink-0"
                  >
                    <img src={mitIcon} className="w-4 h-4" alt="icon" />
                    Open MIT
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-300 mt-2 leading-relaxed w-full">
                  Experience the next level of trading with our Multi-Agent LLM system
                  that simulates a professional institutional research team. By assigning
                  specific roles to multiple AI agents, the system engages in rigorous
                  data debates to eliminate bias, providing you with the most objective
                  and high-probability trading insights available.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
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
                className="bg-[#1B2E3E] rounded-xl p-5 border border-white/5"
              >
                <h3 className="font-semibold text-sm text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== OTHER PROJECTS ===== */}
      <section>
        <h2 className="text-2xl font-semibold text-white mb-6">
          Other Project
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ToolsCard
            key={project.id}
            project={project}
            // 🔥 แก้ตรงนี้: ให้มันส่งค่า true ไปปลดล็อกการ์ดเฉพาะเครื่องมือที่มี ID ตรงกับที่ซื้อเท่านั้น
            isMember={unlockedList.includes(project.id)} 
            unlockedList={unlockedList}
          />
        ))}
        </div>
      </section>
    </div>
  );
}