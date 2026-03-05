import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import WarningPopup from './WarningPopup';
import ExpiredPopup from './ExpiredPopup';

const ToolAccessGuard = ({ toolId, toolName, children }) => {
  const { accessData, loading } = useSubscription();
  
  // State สำหรับควบคุมการปิดหน้า Warning
  const [showWarning, setShowWarning] = useState(true);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-white">Loading data...</div>;
  }

  // ดึงวันหมดอายุของ Tool นี้มาจาก Firebase
  const expireTimestamp = accessData[toolId];

  // 1. กรณีไม่เคยซื้อ หรือไม่มีข้อมูลวันหมดอายุ -> ตีว่าหมดอายุ
  if (!expireTimestamp) {
    return (
      <div className="relative h-full min-h-screen overflow-hidden">
        {/* เรนเดอร์เนื้อหาหลักไว้ข้างหลัง แต่ถูกล็อคด้วย Popup */}
        <div className="pointer-events-none select-none blur-sm opacity-50">
           {children}
        </div>
        <ExpiredPopup toolName={toolName} expireDateStr="No active plan" />
      </div>
    );
  }

  // คำนวณวันที่เหลือ
  const expireDate = expireTimestamp.toDate();
  const today = new Date();
  
  // แปลงมิลลิวินาทีเป็น "วัน"
  const timeDiff = expireDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // จัดรูปแบบวันที่ (เช่น 11 Feb 2026)
  const formattedDate = expireDate.toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  // 2. กรณี "หมดอายุแล้ว" (เวลาเหลือน้อยกว่าหรือเท่ากับ 0 วัน)
  if (daysLeft <= 0) {
    return (
      <div className="relative h-full min-h-screen overflow-hidden">
        {/* เบลอเนื้อหาข้างหลัง */}
        <div className="pointer-events-none select-none blur-sm opacity-50">
           {children}
        </div>
        <ExpiredPopup toolName={toolName} expireDateStr={formattedDate} />
      </div>
    );
  }

  // 3. กรณี "ใกล้หมดอายุ" (สมมติว่าเตือนล่วงหน้า 3 วัน)
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;

  return (
    <div className="relative h-full min-h-screen">
      {/* ถ้าใกล้หมดอายุ และ User ยังไม่กดปิด -> โชว์ Warning */}
      {isExpiringSoon && showWarning && (
        <WarningPopup 
          toolName={toolName} 
          daysLeft={daysLeft} 
          onClose={() => setShowWarning(false)} 
        />
      )}
      
      {/* ให้แสดงเนื้อหา Tools (กราฟ, ตาราง ฯลฯ) ตามปกติ */}
      {children}
    </div>
  );
};

export default ToolAccessGuard;