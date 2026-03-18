import { Routes, Route, Navigate } from "react-router-dom";

import Welcome from "@/pages/Welcome/Welcome";
import Register from "@/pages/Register/Register"; 
import MemberRegister from "@/pages/MemberRegister/MemberRegister";
import Dashboard from "@/pages/Dashboard/Dashboard";

// ✅ ไม่ต้อง import PremiumTools ตรงนี้แล้ว เพราะ Dashboard จะเป็นคนเรียกใช้เอง

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

      <Route path="/chartflipid" element={<Dashboard initialPage="chartflipid" />} />
      {/* 2. MIT */}
      <Route path="/mit" element={<Dashboard initialPage="mit" />} />
      
      {/* 3. ✅ Stock Fortune Teller (หมอดูหุ้น) */}
      <Route path="/stock-fortune" element={<Dashboard initialPage="fortune" />} />
      <Route path="/fortune" element={<Dashboard initialPage="fortune" />} />

      {/* 4. ✅ เพิ่ม Route สำหรับ Tools อื่นๆ ให้ครบ */}
      {/* (ชื่อ path ควรตรงกับที่ Sidebar ส่งมา หรือที่เราตั้งไว้ใน PROJECT_PREVIEWS) */}
      
      <Route path="/petroleum" element={<Dashboard initialPage="petroleum" />} />
      <Route path="/petroleum-preview" element={<Dashboard initialPage="petroleum" />} />

      <Route path="/rubber" element={<Dashboard initialPage="rubber" />} />
      <Route path="/RubberThai" element={<Dashboard initialPage="rubber" />} />

      <Route path="/flow" element={<Dashboard initialPage="flow" />} />
      <Route path="/FlowIntraday" element={<Dashboard initialPage="flow" />} />

      <Route path="/s50" element={<Dashboard initialPage="s50" />} />
      <Route path="/S50" element={<Dashboard initialPage="s50" />} />

      <Route path="/gold" element={<Dashboard initialPage="gold" />} />
      <Route path="/Gold" element={<Dashboard initialPage="gold" />} />

      <Route path="/bidask" element={<Dashboard initialPage="bidask" />} />
      <Route path="/BidAsk" element={<Dashboard initialPage="bidask" />} />

      <Route path="/tickmatch" element={<Dashboard initialPage="tickmatch" />} />
      <Route path="/TickMatch" element={<Dashboard initialPage="tickmatch" />} />

      <Route path="/dr" element={<Dashboard initialPage="dr" />} />
      <Route path="/DRInsight" element={<Dashboard initialPage="dr" />} />

      {/* 5. Profile & Subscription */}
      <Route path="/profile" element={<Dashboard initialPage="profile" />} />
      <Route path="/subscription" element={<Dashboard initialPage="subscription" />} />

      {/* === Shortcuts / Redirects === */}
      <Route path="/shortcuts" element={<Navigate to="/preview-projects" replace />} />

      <Route path="/chartid" element={<Navigate to="/chartflipid" replace />} />
      
      {/* === Fallback (กันหลง) === */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}