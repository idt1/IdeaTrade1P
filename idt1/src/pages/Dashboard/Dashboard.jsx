import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ================= COMPONENT IMPORTS ================= */
import Navbar from "@/layouts/Navbar.jsx";
import Sidebar from "@/layouts/Sidebar.jsx";
import MITLanding from "@/pages/Tools/MIT.jsx"; 
import PreviewProjects from "@/pages/Dashboard/PreviewProjects.jsx";
import PremiumTools from "@/pages/Dashboard/PremiumTools.jsx";
import Profile from "@/pages/Profile/Profile.jsx";
import ManageSubscription from "@/pages/Profile/Subscriptions";

import ToolAccessGuard from "@/components/ToolAccessGuard"; 

// --- Tools Components ---
import StockFortuneTeller from "@/pages/Tools/StockFortuneTeller";
import PetroleumInsights from "@/pages/Tools/PetroleumInsights";
import RubberThai from "@/pages/Tools/RubberThai";
import FlowIntraday from "@/pages/Tools/FlowIntraday";
import S50 from "@/pages/Tools/S50";
import Gold from "@/pages/Tools/Gold";
import BidAsk from "@/pages/Tools/BidAsk";
import TickMatch from "@/pages/Tools/TickMatch";
import DRInsight from "@/pages/Tools/DRInsight";

/* ================= CONSTANTS ================= */
const CHART_IMAGE_URL = "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1964&auto=format&fit=crop";

const TOOL_CONFIG = {
  mit: { component: MITLanding, id: "mit", name: "MIT Tool", isPremium: false },
  "MIT": { component: MITLanding, id: "mit", name: "MIT Tool", isPremium: false },

  fortune: { component: StockFortuneTeller, id: "fortune", name: "Stock Fortune Teller", isPremium: true },
  "stock-fortune": { component: StockFortuneTeller, id: "fortune", name: "Stock Fortune Teller", isPremium: true },

  petroleum: { component: PetroleumInsights, id: "petroleum", name: "Petroleum", isPremium: true },
  "petroleum-preview": { component: PetroleumInsights, id: "petroleum", name: "Petroleum", isPremium: true },

  rubber: { component: RubberThai, id: "rubber", name: "Rubber Thai Tool", isPremium: true },
  "RubberThai": { component: RubberThai, id: "rubber", name: "Rubber Thai Tool", isPremium: true },

  flow: { component: FlowIntraday, id: "flow", name: "Flow Intraday", isPremium: true },
  "FlowIntraday": { component: FlowIntraday, id: "flow", name: "Flow Intraday", isPremium: true },

  s50: { component: S50, id: "s50", name: "S50 Analysis", isPremium: true },
  "S50": { component: S50, id: "s50", name: "S50 Analysis", isPremium: true },

  gold: { component: Gold, id: "gold", name: "Gold Trading Tool", isPremium: true },
  "Gold": { component: Gold, id: "gold", name: "Gold Trading Tool", isPremium: true },

  bidask: { component: BidAsk, id: "bidask", name: "BidAsk Analysis", isPremium: true },
  "BidAsk": { component: BidAsk, id: "bidask", name: "BidAsk Analysis", isPremium: true },

  tickmatch: { component: TickMatch, id: "tickmatch", name: "TickMatch", isPremium: true },
  "TickMatch": { component: TickMatch, id: "tickmatch", name: "TickMatch", isPremium: true },

  dr: { component: DRInsight, id: "dr", name: "DR Insight", isPremium: true },
  "DRInsight": { component: DRInsight, id: "dr", name: "DR Insight", isPremium: true },
};

const FULL_WIDTH_PAGES = []; 
const FULL_WIDTH_PATHS = [];

const NO_PADDING_PAGES = [
  "profile", 
  "subscription", 
  "mit", 
  ...Object.keys(TOOL_CONFIG) 
]; 

/* ================= MAIN COMPONENT: DASHBOARD ================= */
export default function Dashboard({ initialPage }) {
  const navigate = useNavigate();
  const location = useLocation();

  /* --- State --- */
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState(initialPage || "preview-projects");
  const [unlockedItems, setUnlockedItems] = useState([]);

  // ✅ Mobile sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);

  /* --- Effects --- */
  useEffect(() => {
    if (location.state?.goTo) {
      setActivePage(location.state.goTo);
    } else {
      const path = location.pathname;
      
      if (path === "/mit" || path === "/MIT") setActivePage("mit");
      else if (path === "/stock-fortune" || path === "/fortune") setActivePage("fortune");
      else if (path.includes("/petroleum")) setActivePage("petroleum");
      else if (path.includes("/rubber") || path.includes("/RubberThai")) setActivePage("rubber");
      else if (path.includes("/flow") || path.includes("/FlowIntraday")) setActivePage("flow");
      else if (path.includes("/s50") || path.includes("/S50")) setActivePage("s50");
      else if (path.includes("/gold") || path.includes("/Gold")) setActivePage("gold");
      else if (path.includes("/bidask") || path.includes("/BidAsk")) setActivePage("bidask");
      else if (path.includes("/tickmatch") || path.includes("/TickMatch")) setActivePage("tickmatch");
      else if (path.includes("/dr") || path.includes("/DRInsight")) setActivePage("dr");
      else if (path.includes("/profile")) setActivePage("profile");
      else if (path.includes("/subscription")) setActivePage("subscription");
    }
  }, [location.state, location.pathname]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
      setUnlockedItems(user.unlockedItems || []);
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
  }, []);

  useEffect(() => {
    if (initialPage) setActivePage(initialPage);
  }, [initialPage]);

  // ✅ ปิด mobile sidebar เมื่อ page เปลี่ยน
  useEffect(() => {
    setMobileOpen(false);
  }, [activePage]);

  /* --- Helpers --- */
  const isFullWidthPage = () => {
    return FULL_WIDTH_PAGES.includes(activePage) || FULL_WIDTH_PATHS.includes(location.pathname);
  };

  const isNoPaddingPage = () => {
    if (NO_PADDING_PAGES.includes(activePage)) return true;
    if (location.pathname.includes("/profile")) return true;
    return false;
  };

  /* --- Render Content Logic --- */
  const renderContent = () => {
    if (activePage === "profile") return <div className="w-full min-h-full bg-[#0D131A] p-8"><Profile /></div>;
    if (activePage === "subscription") return <div className="w-full min-h-full bg-[#0D131A] p-8"><ManageSubscription /></div>;
    
    if (activePage === "preview-projects" || activePage === "whatsnew") return <PreviewProjects />;
    if (activePage === "premiumtools") return <PremiumTools />;

    const toolConfig = TOOL_CONFIG[activePage];
    
    if (toolConfig) {
      const ToolComponent = toolConfig.component;
      
      if (toolConfig.isPremium) {
        return (
          <ToolAccessGuard toolId={toolConfig.id} toolName={toolConfig.name}>
            <ToolComponent />
          </ToolAccessGuard>
        );
      }
      
      return <ToolComponent />;
    }

    return <PreviewProjects />;
  };

/* --- Main Render --- */
  return (
    <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans">

      {/* ✅ Mobile Topbar — โชว์เฉพาะ mobile (md:hidden) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 h-14 bg-[#0f1520] border-b border-white/10 shadow-lg">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-1.5 rounded-md text-white/70 hover:text-white active:scale-95 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Logo text: IDEA V TRADE */}
        <div className="flex items-center gap-1.5 font-bold text-[15px] tracking-widest select-none">
          <span className="text-white">IDEA</span>
          <span className="text-red-500 font-black">V</span>
          <span className="text-white">TRADE</span>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activePage={activePage}
        setActivePage={(page) => {
          if (page === "home") setActivePage("preview-projects");
          else setActivePage(page);
        }}
        openProject={(p) => setActivePage(p.id)} 
        mobileOpen={mobileOpen}                    // ✅
        onMobileClose={() => setMobileOpen(false)} // ✅
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative overflow-y-auto transition-all duration-300">
        {/* ✅ Spacer สำหรับ mobile topbar (h-14) */}
        <div className="md:hidden h-14 shrink-0" />
        <div className={isFullWidthPage() || isNoPaddingPage() ? "p-0" : "p-8 pb-20"}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}