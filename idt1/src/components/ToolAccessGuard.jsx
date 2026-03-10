import React, { useState, useEffect } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import WarningPopup from './WarningPopup';
import ExpiredPopup from './ExpiredPopup';

const ToolAccessGuard = ({ toolId, toolName, children }) => {
  const { accessData, loading, isFreeAccess } = useSubscription();
  const [showWarning, setShowWarning] = useState(true);
  const [showExpired, setShowExpired] = useState(true);

  useEffect(() => {
    setShowWarning(true);
    setShowExpired(true);
  }, [toolId]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-white">Loading data...</div>;
  }

  if (isFreeAccess) {
    return <>{children}</>;
  }

  const expireTimestamp = accessData[toolId];
  
  let daysLeft = 0;
  let formattedDate = "No active plan";

  if (expireTimestamp) {
    let expireDate;
    try {
      expireDate = typeof expireTimestamp.toDate === 'function' ? expireTimestamp.toDate() : new Date(expireTimestamp);
    } catch (error) {
      expireDate = new Date(0); 
    }
    const today = new Date();
    const timeDiff = expireDate.getTime() - today.getTime();
    daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    formattedDate = expireDate.toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  }

  // ⚪ 1. กรณี "ไม่เคยมีแพ็กเกจนี้เลย"
  // ปล่อยให้แสดงเนื้อหาไปเลย (เพราะหน้าหลักอย่าง DRInsight.jsx จะเป็นคนเอาหน้าจอ Preview มาครอบทับบล็อกไว้อยู่แล้ว)
  if (!expireTimestamp) {
    return <>{children}</>;
  }

  // 🔴 2. กรณี "เคยซื้อแพ็กเกจ แต่หมดอายุแล้ว"
  if (daysLeft <= 0) {
    // ถ้ายูสเซอร์กดปิด Popup (showExpired = false) ให้แสดงเนื้อหาปกติ (ไม่เบลอ)
    if (!showExpired) {
      return <>{children}</>;
    }

    // ถ้ายังไม่กดปิด ให้โชว์หน้าจอเบลอ + Popup หมดอายุ
    return (
      <div className="relative h-screen overflow-hidden">
        <div className="pointer-events-none select-none blur-sm opacity-50 h-full">
           {children}
        </div>
        <ExpiredPopup 
          toolName={toolName} 
          expireDateStr={formattedDate} 
          onClose={() => setShowExpired(false)} 
        />
      </div>
    );
  }

  // 🟡 3. กรณี "ใกล้หมดอายุ" (1-3 วัน)
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