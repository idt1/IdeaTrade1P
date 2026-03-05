import { Routes, Route, Navigate } from "react-router-dom";

import Welcome from "@/pages/Welcome/Welcome";
import Register from "@/pages/Register/Register"; 
import MemberRegister from "@/pages/MemberRegister/MemberRegister";
import Dashboard from "@/pages/Dashboard/Dashboard";

// ✅ นำเข้า ToolAccessGuard ที่เราสร้างไว้
import ToolAccessGuard from "@/components/ToolAccessGuard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* === Public Pages (หน้าทั่วไป) === */}
      <Route path="/" element={<Welcome />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/member-register" element={<MemberRegister />} />

      {/* === Dashboard & Tools (หน้าสมาชิก) === */}
      
      {/* 1. หน้าหลัก Dashboard (หน้ารวมโปรเจกต์) */}
      <Route path="/dashboard" element={<Dashboard initialPage="preview-projects" />} />
      <Route path="/preview-projects" element={<Dashboard initialPage="preview-projects" />} />
      {/* ถ้าอยากให้มีหน้า Premium Tools แยก */}
      <Route path="/premium-tools" element={<Dashboard initialPage="premiumtools" />} />

      {/* === 🔒 Premium Tools (ครอบ Guard ไว้ทั้งหมด) === */}

      {/* 2. MIT */}
      <Route path="/mit" element={
        <ToolAccessGuard toolId="mit" toolName="MIT Tool">
          <Dashboard initialPage="mit" />
        </ToolAccessGuard>
      } />
      
      {/* 3. Stock Fortune Teller (หมอดูหุ้น) */}
      <Route path="/stock-fortune" element={
        <ToolAccessGuard toolId="fortune" toolName="Stock Fortune Teller">
          <Dashboard initialPage="fortune" />
        </ToolAccessGuard>
      } />
      <Route path="/fortune" element={
        <ToolAccessGuard toolId="fortune" toolName="Stock Fortune Teller">
          <Dashboard initialPage="fortune" />
        </ToolAccessGuard>
      } />

      {/* 4. Petroleum */}
      <Route path="/petroleum" element={
        <ToolAccessGuard toolId="petroleum" toolName="Petroleum Insights">
          <Dashboard initialPage="petroleum" />
        </ToolAccessGuard>
      } />
      <Route path="/petroleum-preview" element={
        <ToolAccessGuard toolId="petroleum" toolName="Petroleum Insights">
          <Dashboard initialPage="petroleum" />
        </ToolAccessGuard>
      } />

      {/* 5. Rubber Thai */}
      <Route path="/rubber" element={
        <ToolAccessGuard toolId="rubber" toolName="Rubber Thai Tool">
          <Dashboard initialPage="rubber" />
        </ToolAccessGuard>
      } />
      <Route path="/RubberThai" element={
        <ToolAccessGuard toolId="rubber" toolName="Rubber Thai Tool">
          <Dashboard initialPage="rubber" />
        </ToolAccessGuard>
      } />

      {/* 6. Flow Intraday */}
      <Route path="/flow" element={
        <ToolAccessGuard toolId="flow" toolName="Flow Intraday">
          <Dashboard initialPage="flow" />
        </ToolAccessGuard>
      } />
      <Route path="/FlowIntraday" element={
        <ToolAccessGuard toolId="flow" toolName="Flow Intraday">
          <Dashboard initialPage="flow" />
        </ToolAccessGuard>
      } />

      {/* 7. S50 */}
      <Route path="/s50" element={
        <ToolAccessGuard toolId="s50" toolName="S50 Analysis">
          <Dashboard initialPage="s50" />
        </ToolAccessGuard>
      } />
      <Route path="/S50" element={
        <ToolAccessGuard toolId="s50" toolName="S50 Analysis">
          <Dashboard initialPage="s50" />
        </ToolAccessGuard>
      } />

      {/* 8. Gold */}
      <Route path="/gold" element={
        <ToolAccessGuard toolId="gold" toolName="Gold Trading Tool">
          <Dashboard initialPage="gold" />
        </ToolAccessGuard>
      } />
      <Route path="/Gold" element={
        <ToolAccessGuard toolId="gold" toolName="Gold Trading Tool">
          <Dashboard initialPage="gold" />
        </ToolAccessGuard>
      } />

      {/* 9. Bid Ask */}
      <Route path="/bidask" element={
        <ToolAccessGuard toolId="bidask" toolName="Bid/Ask Analysis">
          <Dashboard initialPage="bidask" />
        </ToolAccessGuard>
      } />
      <Route path="/BidAsk" element={
        <ToolAccessGuard toolId="bidask" toolName="Bid/Ask Analysis">
          <Dashboard initialPage="bidask" />
        </ToolAccessGuard>
      } />

      {/* 10. Tick Match */}
      <Route path="/tickmatch" element={
        <ToolAccessGuard toolId="tickmatch" toolName="Tick Match">
          <Dashboard initialPage="tickmatch" />
        </ToolAccessGuard>
      } />
      <Route path="/TickMatch" element={
        <ToolAccessGuard toolId="tickmatch" toolName="Tick Match">
          <Dashboard initialPage="tickmatch" />
        </ToolAccessGuard>
      } />

      {/* 11. DR Insight */}
      <Route path="/dr" element={
        <ToolAccessGuard toolId="dr" toolName="DR Insight">
          <Dashboard initialPage="dr" />
        </ToolAccessGuard>
      } />
      <Route path="/DRInsight" element={
        <ToolAccessGuard toolId="dr" toolName="DR Insight">
          <Dashboard initialPage="dr" />
        </ToolAccessGuard>
      } />

      {/* === 🔓 Profile & Subscription (ไม่ต้องครอบ Guard) === */}
      <Route path="/profile" element={<Dashboard initialPage="profile" />} />
      <Route path="/subscription" element={<Dashboard initialPage="subscription" />} />

      {/* === Shortcuts / Redirects === */}
      <Route path="/shortcuts" element={<Navigate to="/preview-projects" replace />} />
      
      {/* === Fallback (กันหลง) === */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}