// src/pages/ManageSubscription.jsx
import React, { useState, useEffect } from 'react';
import './Subscriptions.css'; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/firebase"; 
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext'; 

const ManageSubscription = () => {
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiringSubs, setExpiringSubs] = useState([]);
  const [endedSubs, setEndedSubs] = useState([]);
  const [summary, setSummary] = useState({ monthly: 0, yearly: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const authContext = useAuth();
  const userData = authContext?.userData || null;
  const loading = authContext?.loading || false;

  useEffect(() => {
    const processAndSetSubscriptions = (savedSubs = []) => {
      let active = [];
      let expiring = [];
      let ended = [];
      let totalM = 0;
      let totalY = 0;

      if (!Array.isArray(savedSubs)) {
        savedSubs = [];
      }

      savedSubs.forEach((sub, index) => {
        try {
          const purchaseObj = new Date(sub.purchaseDate || Date.now());
          const purchaseStr = purchaseObj.toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
          });

          let expireObj = new Date(purchaseObj);
          
          if (sub.cycle?.toLowerCase() === 'monthly') {
            expireObj.setDate(expireObj.getDate() + 30);
          } else if (sub.cycle?.toLowerCase() === 'yearly') {
            expireObj.setFullYear(expireObj.getFullYear() + 1);
          }

          const expireDateStr = expireObj.toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });

          const today = new Date();
          const timeDiff = expireObj.getTime() - today.getTime();
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

          const priceValue = parseInt(String(sub.price || '0').replace(/,/g, '').replace(' THB', '')) || 0;
          
          const formattedItem = {
            ...sub, 
            key: `sub-${index}`, 
            purchaseDetail: purchaseStr,
            expireDetail: expireDateStr,
            daysLeft: daysLeft,
            priceValue: priceValue 
          };

          if (daysLeft <= 0 || sub.status === 'inactive') {
            ended.push(formattedItem);
          } else if (daysLeft > 0 && daysLeft <= 3) {
            expiring.push(formattedItem);
            if (sub.cycle?.toLowerCase() === 'monthly') totalM += priceValue;
            if (sub.cycle?.toLowerCase() === 'yearly') totalY += priceValue;
          } else {
            active.push(formattedItem);
            if (sub.cycle?.toLowerCase() === 'monthly') totalM += priceValue;
            if (sub.cycle?.toLowerCase() === 'yearly') totalY += priceValue;
          }
        } catch (err) {
          console.error("⚠️ พบปัญหาในการประมวลผลข้อมูลบางตัว:", err, sub);
        }
      });

      setEndedSubs(ended);
      setExpiringSubs(expiring);
      setActiveSubs(active);
      setSummary({ monthly: totalM, yearly: totalY });
    };

    if (!loading) {
      if (userData && userData.mySubscriptions) {
        processAndSetSubscriptions(userData.mySubscriptions);
      } else {
        processAndSetSubscriptions([]); 
      }
    }
  }, [userData, loading]); 

  const gridCols = "grid-cols-[2.5fr_1.5fr_2.5fr_1.5fr_1.5fr_2fr]";

  const handleActionClick = (item) => {
    navigate('/member-register', {
      state: { preselectedTool: item.name, preselectedCycle: item.cycle } 
    });
  };

  /* ======================= TEST BLOCK: จำลองวันหมดอายุ ======================= */
  const handleTestStatus = async (item, mode) => {
    const user = auth.currentUser;
    if (!user) return alert("ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่");

    // กำหนดวันหมดอายุเป้าหมาย
    const targetExpireDate = new Date();
    if (mode === 'expiring') {
      targetExpireDate.setDate(targetExpireDate.getDate() + 2); // สมมติให้เหลือ 2 วัน
    } else {
      targetExpireDate.setDate(targetExpireDate.getDate() - 1); // สมมติให้หมดอายุไปแล้ว 1 วัน
    }

    // คำนวณหาวันที่ซื้อ (purchaseDate) ย้อนหลัง เพื่อให้ตรงกับวันหมดอายุที่เราต้องการทดสอบ
    const mockPurchaseDate = new Date(targetExpireDate);
    if (item.cycle?.toLowerCase() === 'monthly') {
      mockPurchaseDate.setDate(mockPurchaseDate.getDate() - 30);
    } else if (item.cycle?.toLowerCase() === 'yearly') {
      mockPurchaseDate.setFullYear(mockPurchaseDate.getFullYear() - 1);
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const mySubs = data.mySubscriptions || [];
        
        // หาแพ็กเกจที่ตรงกันเพื่ออัปเดต
        const subIndex = mySubs.findIndex(s => s.name === item.name && s.cycle === item.cycle);
        
        if (subIndex > -1) {
          mySubs[subIndex].purchaseDate = mockPurchaseDate.toISOString(); // อัปเดตวันที่ซื้อจำลองกลับไปที่ Firestore
          
          await updateDoc(userRef, {
            mySubscriptions: mySubs
          });
          
          window.location.reload(); // รีเฟรชหน้าจอเพื่อดึงข้อมูลใหม่
        }
      }
    } catch (error) {
      console.error("Error updating test status:", error);
    }
  };
  /* ============================================================================ */

  const renderRow = (item, type) => {
    let statusColor, statusIcon, statusText, actionText, cardBorder, bgClass;
    let btnDesktop, btnMobile;

    if (type === 'ended') {
      statusColor = 'text-red-500';
      statusIcon = <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />;
      statusText = 'inactive';
      actionText = 'Renew';
      cardBorder = 'border-red-500/30'; 
      bgClass = 'bg-[#1a2332]/80';
      btnDesktop = <button onClick={() => handleActionClick(item)} className="px-5 py-1.5 rounded-md border border-red-500/50 text-red-400 text-[13px] hover:text-white hover:bg-red-900/40 hover:border-red-500 transition-all">{actionText}</button>;
      btnMobile = <button onClick={() => handleActionClick(item)} className="w-full py-3 rounded-lg font-bold bg-transparent border border-red-500/50 text-red-400 hover:text-white hover:bg-red-900/40 transition-all">{actionText}</button>;
    } else if (type === 'expiring') {
      statusColor = 'text-yellow-500';
      statusIcon = <ClockIcon className="w-4 h-4 text-yellow-500 shrink-0" />;
      statusText = 'expiring';
      actionText = 'Extend';
      cardBorder = 'border-yellow-500/30';
      bgClass = 'bg-[#242b35]/80';
      btnDesktop = <button onClick={() => handleActionClick(item)} className="px-5 py-1.5 rounded-md border border-yellow-500/50 text-yellow-500 text-[13px] hover:text-white hover:bg-yellow-900/40 hover:border-yellow-500 transition-all">{actionText}</button>;
      btnMobile = <button onClick={() => handleActionClick(item)} className="w-full py-3 rounded-lg font-bold bg-transparent border border-yellow-500/50 text-yellow-500 hover:text-white hover:bg-yellow-900/40 transition-all">{actionText}</button>;
    } else {
      statusColor = 'text-green-500';
      statusIcon = <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />;
      statusText = 'active';
      actionText = 'Extend';
      cardBorder = 'border-gray-800';
      bgClass = 'bg-[#242b35]/80';
      btnDesktop = <button onClick={() => handleActionClick(item)} className="px-5 py-1.5 rounded-md border border-gray-600 text-gray-400 text-[13px] hover:text-white hover:bg-gray-700 transition-all">{actionText}</button>;
      btnMobile = <button onClick={() => handleActionClick(item)} className="w-full py-3 rounded-lg font-bold bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 transition-all">{actionText}</button>;
    }

    const safeName = item.name || "Unknown Tool";
    const safeCycle = item.cycle || "-";

    return (
      <div key={item.key} className={`${bgClass} border ${cardBorder} rounded-xl mb-4 p-5 md:py-4 md:px-6 hover:border-gray-600 transition-all backdrop-blur-sm`}>
        
        {/* === Mobile View === */}
        <div className="lg:hidden flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#4db8ff] text-xl tracking-tight">{safeName}</h3>
            <span className="text-white text-[13px] font-semibold capitalize">{safeCycle}</span>
          </div>
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-1.5">
              {statusIcon}
              <span className={`font-extrabold text-[13px] uppercase tracking-wide ${statusColor}`}>{statusText}</span>
            </div>
            <div className="flex flex-col pl-5 mt-0.5">
              <span className="text-gray-500 text-[11px]">Paid on {item.purchaseDetail}</span>
              <span className="text-[#FF6200] text-[11px] font-medium">
                {type === 'ended' ? 'Ended:' : 'Exp:'} {item.expireDetail}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-end mt-1">
            <div className="text-[26px] font-black text-white flex items-baseline gap-1">
              {item.priceValue.toLocaleString()} <span className="text-xl font-bold text-gray-300">฿</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-gray-400 text-[12px] pb-1.5">
                {item.paymentMethod || 'Bank Transfer'}
              </div>
              
              {/* 🟢 ปุ่มทดสอบสำหรับ Mobile */}
              <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                <button onClick={() => handleTestStatus(item, 'expiring')} className="text-[9px] bg-yellow-600/80 text-white px-1.5 py-0.5 rounded">T: 2 Days</button>
                <button onClick={() => handleTestStatus(item, 'expired')} className="text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded">T: Expired</button>
              </div>

            </div>
          </div>
          <div className="mt-1">{btnMobile}</div>
        </div>

        {/* === Desktop View === */}
        <div className={`hidden lg:grid ${gridCols} gap-4 items-center`}>
            <div className="font-bold text-[#4db8ff] text-[15px] text-left truncate">{safeName}</div>
            <div className="text-white text-[14px] text-left capitalize">{safeCycle}</div>
          <div className="flex items-start gap-3 text-left">
             <div className="mt-0.5">{statusIcon}</div>
             <div className="flex flex-col">
               <span className={`font-extrabold text-[13px] uppercase tracking-wide ${statusColor}`}>{statusText}</span>
               <span className="text-gray-500 text-[11px] mt-1">Paid on {item.purchaseDetail}</span>
               <span className="text-[#FF6200] text-[11px] font-medium mt-0.5">
                 {type === 'ended' ? 'Ended:' : 'Exp:'} {item.expireDetail}
               </span>
             </div>
           </div>
            <div className="font-bold text-white text-[15px] text-left">
              {item.priceValue.toLocaleString()} <span className="font-normal text-gray-400">฿</span>
            </div>
            <div className="text-center">{btnDesktop}</div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="text-gray-400 text-[13px] text-right truncate">{item.paymentMethod || 'Bank Transfer'}</div>
              
              {/* 🟢 ปุ่มทดสอบสำหรับ Desktop */}
              <div className="flex gap-1 opacity-20 hover:opacity-100 transition-opacity">
                <button onClick={() => handleTestStatus(item, 'expiring')} className="text-[9px] bg-yellow-600/80 text-white px-1.5 py-0.5 rounded">T: 2 Days</button>
                <button onClick={() => handleTestStatus(item, 'expired')} className="text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded">T: Expired</button>
              </div>

            </div>
        </div>
      </div>
    );
  };

  const filterBySearch = (list) => {
    if (!searchTerm) return list;
    return list.filter(item => (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const filteredActive = filterBySearch(activeSubs);
  const filteredExpiring = filterBySearch(expiringSubs);
  const filteredEnded = filterBySearch(endedSubs);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white font-bold text-xl">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-transparent p-4 lg:p-10 animate-fade-in relative z-0">
      <div className="max-w-[1000px] mx-auto w-full text-white">
        
        <div className="mb-8 text-left">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight">Manage Subscriptions</h1>
          <div className="flex flex-row gap-6 text-sm items-center">
            <div className="flex items-center gap-2">
                <span className="text-[#4db8ff] text-[15px] font-bold">Monthly</span>
                <span className="text-white text-[15px] font-bold">{summary.monthly.toLocaleString()} ฿</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[#4db8ff] text-[15px] font-bold">Yearly</span>
                <span className="text-white text-[15px] font-bold">{summary.yearly.toLocaleString()} ฿</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between md:items-center mb-10 gap-4 w-full">
          <div className="relative w-full md:max-w-[450px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Search tools..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b2230]/40 border border-gray-700/50 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
            />
          </div>
          <button onClick={() => navigate('/member-register')} className="w-full md:w-auto bg-[#007bff] hover:bg-[#0069d9] text-white font-bold py-3 md:py-2.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap">
            <PlusIcon /> Add new tool
          </button>
        </div>

        <div className="hidden lg:block mb-4 px-6 border-b border-gray-800/80 pb-3">
          <div className={`grid ${gridCols} gap-4 items-center`}>
            <div className="text-[12px] font-bold text-gray-400 text-left">Tool name</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Cycle</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Status</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Price</div>
            <div className="text-[12px] font-bold text-gray-400 text-center">Actions</div>
            <div className="text-[12px] font-bold text-gray-400 text-right">Payment Method</div>
          </div>
        </div>

        {filteredEnded.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Recently Ended</h3>
            {filteredEnded.map(item => renderRow(item, 'ended'))}
          </div>
        )}

        {filteredExpiring.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Ending Soon</h3>
            {filteredExpiring.map(item => renderRow(item, 'expiring'))}
          </div>
        )}

        {filteredActive.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Active</h3>
            {filteredActive.map(item => renderRow(item, 'active'))}
          </div>
        )}

        {filteredEnded.length === 0 && filteredExpiring.length === 0 && filteredActive.length === 0 && (
          <div className="text-center mt-16 text-gray-600 bg-[#1b2230]/20 py-20 rounded-2xl border border-gray-800/50">
            <p className="text-lg font-medium">
              {searchTerm ? `No tools found matching "${searchTerm}"` : "No active subscriptions found."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// --- SVG Icons ---
const SearchIcon = () => ( <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> );
const PlusIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> );
const CheckCircleIcon = ({ className }) => ( <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const ClockIcon = ({ className }) => ( <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const XCircleIcon = ({ className }) => ( <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );

export default ManageSubscription;