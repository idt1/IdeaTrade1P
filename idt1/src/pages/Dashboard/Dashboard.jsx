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

// ✅ 1. Import ตัว Guard เข้ามา
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

// ✅ 2. เพิ่ม isPremium เพื่อแยกระหว่างของฟรีกับของเสียเงิน
const TOOL_CONFIG = {
  // 🔓 MIT (ไม่ครอบ Guard)
  mit: { component: MITLanding, id: "mit", name: "MIT Tool", isPremium: false },
  "MIT": { component: MITLanding, id: "mit", name: "MIT Tool", isPremium: false },

  // 🔒 Premium Tools (ครอบ Guard ทั้งหมด 9 ตัว)
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

// ดึงเฉพาะ Key มาเพื่อบอกว่าหน้าไหนห้ามมี Padding
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

  /* --- Effects --- */
  useEffect(() => {
    if (location.state?.goTo) {
      setActivePage(location.state.goTo);
    } else {
      const path = location.pathname;
      
      // Check path mapping
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
    // 1. Profile & Subscriptions
    if (activePage === "profile") return <div className="w-full min-h-full bg-[#0f172a] p-8"><Profile /></div>;
    if (activePage === "subscription") return <div className="w-full min-h-full bg-[#0f172a] p-8"><ManageSubscription /></div>;
    
    // 2. Dashboard Home
    if (activePage === "preview-projects" || activePage === "whatsnew") return <PreviewProjects />;
    if (activePage === "premiumtools") return <PremiumTools />;

    // 3. ✅ Tools Rendering (แยกเรนเดอร์ระหว่างของฟรีกับเสียเงิน)
    const toolConfig = TOOL_CONFIG[activePage];
    
    if (toolConfig) {
      const ToolComponent = toolConfig.component;
      
      // ถ้าเป็น Premium Tool ให้เอา Guard มาครอบก่อน
      if (toolConfig.isPremium) {
        return (
          <ToolAccessGuard toolId={toolConfig.id} toolName={toolConfig.name}>
            <ToolComponent />
          </ToolAccessGuard>
        );
      }
      
      // ถ้าไม่ใช่ Premium (เช่น MIT) ให้โชว์เนื้อหาปกติได้เลย
      return <ToolComponent />;
    }

    // Default Fallback
    return <PreviewProjects />;
  };

/* --- Main Render --- */
  return (
    <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans">
      
      {/* Sidebar: ต้องแน่ใจว่าในไฟล์ Sidebar.jsx คุณลบ 'fixed' ออกแล้วตามที่คุยกัน */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activePage={activePage}
        setActivePage={(page) => {
          if (page === "home") setActivePage("preview-projects");
          else setActivePage(page);
        }}
        openProject={(p) => setActivePage(p.id)} 
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative overflow-y-auto transition-all duration-300">
        
        <div className={isFullWidthPage() || isNoPaddingPage() ? "p-0" : "p-8 pb-20"}>
          {renderContent()}
        </div>

      </main>
    </div>
  );
}