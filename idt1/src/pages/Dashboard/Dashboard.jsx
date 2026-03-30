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

import logoImage from "@/assets/images/logo.png";

import RealFlow from "@/pages/Hidden/realFlow";

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
import ChartFlipId from "@/pages/Hidden/Chartid";
import HisRealFlow from "@/pages/Hidden/hisrealflow";
import DWViewCharts from "@/pages/Hidden/DW";
import IdeaTradePoint from "@/pages/Hidden/IdeaTradePoint";

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

  // ✅ แก้ key จาก "chartflipid" → "chart-flip-id" ให้ตรงกับ Sidebar และ AppRoutes
  "chart-flip-id": { component: ChartFlipId, id: "chart-flip-id", name: "Chart Flip ID", isPremium: false },

  "real-flow": { component: RealFlow, id: "real-flow", name: "Real Flow", isPremium: false },

  "hisrealflow": { component: HisRealFlow, id: "hisrealflow", name: "Historical Real Flow", isPremium: false },

  "dw":            { component: DWViewCharts,   id: "dw",             name: "DW",             isPremium: false },

  "ideatradepoint":            { component: IdeaTradePoint,   id: "ideatradepoint",             name: "Idea Trade Point",             isPremium: false },
  "hisideatradepoint":         { component: IdeaTradePoint,   id: "hisideatradepoint",             name: "Historical Idea Trade Point",             isPremium: false },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ 1. เพิ่ม State เพื่อเช็กว่าดึงข้อมูลเสร็จสมบูรณ์หรือยัง
  const [isDataReady, setIsDataReady] = useState(false);

  /* --- Effects --- */

  // ✅ 2. รวมการดึงข้อมูลไว้ที่เดียว และเมื่อเสร็จค่อยเปิดธง isDataReady
  useEffect(() => {
    const fetchUserData = async () => {
      setIsDataReady(false);
      try {
        const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
        setUnlockedItems(user.unlockedItems || []);
      } catch (e) {
        console.error("Error loading user profile:", e);
      } finally {
        setIsDataReady(true); // ข้อมูลดึงเสร็จ 100% แล้ว
      }
    };

    fetchUserData();
  }, [location.pathname]);

  // ✅ 3. เช็ก location.state หรือเปลี่ยน Tab "ก็ต่อเมื่อ" isDataReady = true เท่านั้น
  useEffect(() => {
    if (!isDataReady) return; 

    if (location.state?.goTo) {
      setActivePage(location.state.goTo);
    } else {
      const path = location.pathname.split("/").pop(); 
      
      if (path === "mit" || path === "MIT") setActivePage("mit");
      else if (path === "stock-fortune" || path === "fortune") setActivePage("fortune");
      else if (path === "petroleum" || path === "petroleum-preview") setActivePage("petroleum");
      else if (path === "rubber" || path === "RubberThai") setActivePage("rubber");
      else if (path === "flow" || path === "FlowIntraday") setActivePage("flow");
      else if (path === "s50" || path === "S50") setActivePage("s50");
      else if (path === "gold" || path === "Gold") setActivePage("gold");
      else if (path === "bidask" || path === "BidAsk") setActivePage("bidask");
      else if (path === "tickmatch" || path === "TickMatch") setActivePage("tickmatch");
      else if (path === "dr" || path === "DRInsight") setActivePage("dr");
      else if (path === "profile") setActivePage("profile");
      else if (path === "subscription") setActivePage("subscription");
      else if (path === "preview-projects") setActivePage("preview-projects");
      else if (path === "premium-tools" || path === "premiumtools") setActivePage("premiumtools");
      else if (path === "chart-flip-id") setActivePage("chart-flip-id");
      else if (path === "real-flow") setActivePage("real-flow");
      else if (path === "hisrealflow") setActivePage("hisrealflow");
      else if (path === "dw") setActivePage("dw"); 
      else if (path === "ideatradepoint") setActivePage("ideatradepoint");
      else if (path === "hisideatradepoint") setActivePage("hisideatradepoint");

      else setActivePage("preview-projects"); // Fallback ถ้าหาไม่เจอจริงๆ
    }
  }, [location.state, location.pathname, isDataReady]);

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

    if (activePage === "real-flow") return <RealFlow />;

    const normalizedPage = activePage.toLowerCase(); 
    const toolConfig = TOOL_CONFIG[normalizedPage] || TOOL_CONFIG[activePage];
    
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

  // ✅ 4. แสดงหน้าจอ Loading ระหว่างรอข้อมูล ป้องกันไม่ให้ ToolAccessGuard เด้งไล่ผู้ใช้
  if (!isDataReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B0E14]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

/* --- Main Render --- */
  return (
    <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans">

      {/* Mobile Topbar */}
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

        {/* Mobile Silebar logo */}
        <div className="flex items-center select-none cursor-pointer">
          <img 
            src={logoImage} 
            alt="IDEA V TRADE Logo" 
            className="h-12 w-auto object-contain" 
          />
        </div>
      </div>

       {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activePage={activePage}
        setActivePage={(page) => {
          if (page === "home" || page === "preview-projects") {
            navigate("/preview-projects");
          } else if (page === "fortune") {
            navigate("/stock-fortune");
          } else if (page === "premiumtools") { 
            navigate("/premium-tools"); 
          } else {
            navigate(`/${page}`);
          }
        }}
        openProject={(p) => {
          if (p.id === "fortune") navigate("/stock-fortune");
          else navigate(`/${p.id}`);
        }} 
        mobileOpen={mobileOpen}                    
        onMobileClose={() => setMobileOpen(false)} 
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative overflow-y-auto transition-all duration-300">
        {/* Spacer สำหรับ mobile topbar */}
        <div className="md:hidden h-14 shrink-0" />
        <div className={isFullWidthPage() || isNoPaddingPage() ? "p-0" : "p-8 pb-20"}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}