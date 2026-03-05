import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import WarningPopup from './WarningPopup';
import ExpiredPopup from './ExpiredPopup';

const ToolAccessGuard = ({ toolId, toolName, children }) => {
  // 🟢 1. ดึง isFreeAccess เพิ่มเข้ามาจาก Context
  const { accessData, loading, isFreeAccess } = useSubscription();
  const [showWarning, setShowWarning] = useState(true);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-white">Loading data...</div>;
  }

  // 🌟 2. จุดสำคัญ: ถ้าเป็นโหมด Free Access (ยังไม่ได้ล็อกอิน) ปล่อยผ่านให้ดูเนื้อหาได้เลย!
  if (isFreeAccess) {
    return <>{children}</>;
  }

  const expireTimestamp = accessData[toolId];

  // 1. ถ้าไม่มีแพ็กเกจเลย ให้ขึ้นหน้าล็อค
  if (!expireTimestamp) {
    return (
      <div className="relative h-screen overflow-hidden">
        <div className="pointer-events-none select-none blur-sm opacity-50 h-full">
           {children}
        </div>
        <ExpiredPopup toolName={toolName} expireDateStr="No active plan" />
      </div>
    );
  }

  // 2. โค้ดส่วนที่แก้จอขาว: เช็คประเภทของข้อมูลวันที่ให้ปลอดภัย
  let expireDate;
  try {
    if (typeof expireTimestamp.toDate === 'function') {
      // ถ้าเป็น Timestamp จาก Firebase
      expireDate = expireTimestamp.toDate();
    } else {
      // ถ้าเป็น String หรือ Date ปกติ (เช่น จาก LocalStorage)
      expireDate = new Date(expireTimestamp);
    }
  } catch (error) {
    console.error("Error parsing date in Guard:", error);
    expireDate = new Date(0); // ถ้าแปลงวันที่ไม่ได้ ให้มองว่าหมดอายุไปแล้ว
  }

  // 3. คำนวณวันคงเหลือ
  const today = new Date();
  const timeDiff = expireDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const formattedDate = expireDate.toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  // 4. กรณี "หมดอายุแล้ว"
  if (daysLeft <= 0) {
    return (
      <div className="relative h-screen overflow-hidden">
        <div className="pointer-events-none select-none blur-sm opacity-50 h-full">
           {children}
        </div>
        <ExpiredPopup toolName={toolName} expireDateStr={formattedDate} />
      </div>
    );
  }

  // 5. กรณี "ใกล้หมดอายุ"
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;

  return (
    <div className="relative h-full min-h-screen">
      {isExpiringSoon && showWarning && (
        <WarningPopup 
          toolName={toolName} 
          daysLeft={daysLeft} 
          onClose={() => setShowWarning(false)} 
        />
      )}
      
      {children}
    </div>
  );
};

export default ToolAccessGuard;