import React, { useState, useEffect } from "react"; 
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import Sidebar from "@/layouts/Sidebar";

function MainLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("preview-projects");

  useEffect(() => {
    const path = location.pathname;
    if (path === "/profile") setActivePage("profile");
    else if (path === "/subscription") setActivePage("subscription");
    // ถ้าอยากให้ sidebar highlight เครื่องมือเมื่อเข้าผ่าน url โดยตรง ก็เพิ่มเงื่อนไขตรงนี้ได้
  }, [location.pathname]);

  // เราต้องซ่อน Sidebar ของ App.js เพื่อไม่ให้มันขึ้นซ้อนกัน 2 อัน
  const hideSidebarPaths = [
    "/", 
    "/register", 
    "/member-register", 
    "/welcome", 
    "/dashboard",
    // เพิ่ม Tools ทั้งหมดลงในนี้ เพื่อให้ Dashboard เป็นคนแสดง Sidebar แทน App.js
    "/mit", "/MIT",
    "/stock-fortune", "/fortune",
    "/petroleum", "/petroleum-preview",
    "/rubber", "/RubberThai",
    "/flow", "/FlowIntraday",
    "/s50", "/S50",
    "/gold", "/Gold",
    "/bidask", "/BidAsk",
    "/tickmatch", "/TickMatch",
    "/dr", "/DRInsight",
    "/real-flow",      
    "/chart-flip-id", 
    "/hisrealflow",
    "/dw",
    "/ideatradepoint",       
    "/hisideatradepoint",
    "/sectorrotation"
  ];
  
  // เช็คว่า path ปัจจุบันอยู่ในรายการที่ต้องซ่อน Sidebar หรือไม่
  const shouldHideSidebar = hideSidebarPaths.some(path => location.pathname.includes(path));

return (
    // สีพื้นหลังหลักของทั้งเว็บเป็นสีดำ (#0c0f14) เพื่อให้กลืนกับกล่องด้านขวา
    <div className="flex h-[100dvh] w-full text-white overflow-hidden bg-[#0c0f14]">
      
      {/* Sidebar - สาดสีเทาเข้ม (#151921) แล้วดันเนื้อหาหลบขอบจอด้านซ้าย */}
      {!shouldHideSidebar && (
        <div className="h-full bg-[#151921] pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)]">
          <Sidebar 
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            activePage={activePage}
            setActivePage={setActivePage}
          />
        </div>
      )}

      {/* Main Content - ดันเนื้อหาหลบขอบจอด้านขวา */}
      <main className="flex-1 h-full overflow-y-auto relative transition-all duration-300 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full h-full">
           <AppRoutes />
        </div>
      </main>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
       <MainLayout />
    </BrowserRouter>
  );
}

export default App;