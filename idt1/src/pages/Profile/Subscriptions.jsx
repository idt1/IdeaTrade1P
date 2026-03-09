import React, { useState, useEffect } from 'react';
import './Subscriptions.css';
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "/src/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 

const ManageSubscription = () => {
  // สร้าง State แยกเป็น 3 กลุ่มตามรูป
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiringSubs, setExpiringSubs] = useState([]);
  const [endedSubs, setEndedSubs] = useState([]);
  const [summary, setSummary] = useState({ monthly: 0, yearly: 0 });

  useEffect(() => {
    const processAndSetSubscriptions = (savedSubs, expirations = {}) => {
      let active = [];
      let expiring = [];
      let ended = [];
      let totalM = 0;
      let totalY = 0;

      savedSubs.forEach((sub, index) => {
        // 1. วันที่ซื้อ (Purchase Date) - ปรับให้แสดงเวลาด้วย
        const purchaseObj = new Date(sub.purchaseDate || new Date());
        const purchaseStr = purchaseObj.toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false
        });

        // 2. วันหมดอายุ (Expire Date) - ปรับให้แสดงเวลาด้วย
        let expireDateStr = "Unknown";
        let daysLeft = 0;
        const toolExpireData = expirations[sub.id]; 
        
        if (toolExpireData) {
          const expireObj = typeof toolExpireData.toDate === 'function' 
            ? toolExpireData.toDate() 
            : new Date(toolExpireData);
          
          expireDateStr = expireObj.toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
          });

          // คำนวณวันคงเหลือ
          const today = new Date();
          const timeDiff = expireObj.getTime() - today.getTime();
          daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        const priceValue = parseInt(String(sub.price).replace(/,/g, '').replace(' THB', '')) || 0;
        const formattedItem = {
          ...sub, 
          key: `sub-${index}`, 
          purchaseDetail: purchaseStr,
          expireDetail: expireDateStr,
          daysLeft: daysLeft,
          priceValue: priceValue 
        };

        // จัดกลุ่มตามวันหมดอายุ
        if (daysLeft <= 0) {
          ended.push(formattedItem);
        } else if (daysLeft > 0 && daysLeft <= 3) {
          // ใกล้หมดอายุ (ภายใน 3 วัน)
          expiring.push(formattedItem);
          if (sub.cycle === 'Monthly') totalM += priceValue;
          if (sub.cycle === 'Yearly') totalY += priceValue;
        } else {
          // ใช้งานปกติ (มากกว่า 3 วัน)
          active.push(formattedItem);
          if (sub.cycle === 'Monthly') totalM += priceValue;
          if (sub.cycle === 'Yearly') totalY += priceValue;
        }
      });

      setEndedSubs(ended);
      setExpiringSubs(expiring);
      setActiveSubs(active);
      setSummary({ monthly: totalM, yearly: totalY });
    };

    const loadDemoSubscriptions = () => {
      try {
        const saved = localStorage.getItem('userProfile');
        const parsed = saved ? JSON.parse(saved) : {};
        processAndSetSubscriptions(parsed.mySubscriptions || [], parsed.subscriptions || {});
      } catch (e) {
        console.error("Error loading demo subscriptions:", e);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              processAndSetSubscriptions(userData.mySubscriptions || [], userData.subscriptions || {});
            } else {
              processAndSetSubscriptions([], {});
            }
          } catch (e) {
            console.error("Error loading subscriptions:", e);
          }
        } else {
          loadDemoSubscriptions();
        }
    });

    window.addEventListener("storage", loadDemoSubscriptions);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", loadDemoSubscriptions);
    };
  }, []);

  // ฟังก์ชันช่วยสร้างตารางแถวแต่ละประเภท 
  const renderRow = (item, type) => {
    let statusColor, statusIcon, statusText, actionText, actionClass, expireTextPrefix, expireTextColor;

    // ตั้งค่าตามประเภท (Ended, Expiring, Active)
    if (type === 'ended') {
      statusColor = 'text-red-500';
      statusIcon = <XCircleIcon className="w-[18px] h-[18px] text-red-500 mt-0.5 shrink-0" />;
      statusText = 'inactive';
      expireTextPrefix = 'Ended:';
      expireTextColor = 'text-gray-500'; 
      actionText = 'Renew';
      actionClass = 'text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-blue-500 underline-offset-4';
    } else if (type === 'expiring') {
      statusColor = 'text-yellow-500';
      statusIcon = <ClockIcon className="w-[18px] h-[18px] text-yellow-500 mt-0.5 shrink-0" />;
      statusText = 'expiring';
      expireTextPrefix = 'Exp:';
      expireTextColor = 'text-orange-400'; 
      actionText = 'Extend';
      actionClass = 'text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-blue-500 underline-offset-4';
    } else {
      statusColor = 'text-green-500';
      statusIcon = <CheckCircleIcon className="w-[18px] h-[18px] text-green-500 mt-0.5 shrink-0" />;
      statusText = 'active';
      expireTextPrefix = 'Exp:';
      expireTextColor = 'text-orange-400'; 
      actionText = 'Pay';
      actionClass = 'text-yellow-500 font-bold hover:text-yellow-400 transition-colors text-sm';
    }

    // 🌟 ปรับ Grid Layout: ให้คอลัมน์ Status/Date กว้างขึ้นเพื่อรองรับข้อความ
    const gridLayout = "grid grid-cols-[2fr_1.5fr_3fr_1.5fr_1.5fr_1.5fr] items-center p-4 rounded-xl mb-3";
    const rowClass = `${gridLayout} ${type === 'ended' ? 'border border-[#1e3a8a] bg-[#1a2332]' : 'bg-[#242b35] hover:bg-[#2a323d] border border-gray-800 transition-colors'}`;

    return (
      <div key={item.key} className={rowClass}>
        {/* คอลัมน์ที่ 1: Tool name */}
        <div className="font-bold text-white text-[15px] pl-4">{item.name}</div>
        
        {/* คอลัมน์ที่ 2: Cycle */}
        <div className="text-gray-300 capitalize text-sm text-center">{item.cycle}</div>
        
        {/* 🌟 คอลัมน์ที่ 3: Status / Date (พร้อมเวลา) */}
        <div className="flex items-start gap-2 pl-12">
          {statusIcon}
          <div className="flex flex-col text-sm">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold uppercase ${statusColor}`}>{statusText}</span>
              <span className="text-gray-400 text-xs">Paid on {item.purchaseDetail}</span>
            </div>
            <div className={`${expireTextColor} text-xs mt-0.5`}>
              {expireTextPrefix} {item.expireDetail}
            </div>
          </div>
        </div>

        {/* คอลัมน์ที่ 4: Price */}
        <div className="font-bold text-white text-[15px] text-center">{item.price}</div>
        
        {/* คอลัมน์ที่ 5: Actions */}
        <div className="text-center">
          <button className={actionClass}>
            {actionText}
          </button>
        </div>
        
        {/* คอลัมน์ที่ 6: Payment Method */}
        <div className="text-gray-400 text-sm pr-4 text-center">{item.paymentMethod || 'Bank Transfer'}</div>
      </div>
    );
  };

  return (
    <div className="p-8 w-full max-w-[1500px] ml-8 text-white">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-3 tracking-wide">Your subscriptions</h1>
        <div className="flex gap-4 text-sm font-semibold">
          <span className="text-gray-400 font-normal">Monthly <span className="text-white ml-1 font-bold">{summary.monthly.toLocaleString()} THB</span></span>
          <span className="text-gray-400 font-normal">Yearly <span className="text-white ml-1 font-bold">{summary.yearly.toLocaleString()} THB</span></span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-10 gap-4">
        <div className="relative flex-1 max-w-[600px]">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="Search tool..." 
            className="w-full bg-[#242b35] border border-gray-700/50 rounded-lg py-[10px] pl-[38px] pr-4 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="bg-[#4b8df8] hover:bg-[#3b7de8] text-white font-bold py-[10px] px-5 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20">
          <PlusIcon /> Add new Tools
        </button>
      </div>

      {/* Table Headers */}
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 mt-10">
        <div className="grid grid-cols-[2fr_1.5fr_3fr_1.5fr_1.5fr_1.5fr] mb-2 px-4 pb-2">
          <div className="pl-4 text-left">Tool Name</div>
          <div className="text-center">Cycle</div>
          <div className="pl-24 text-left">Status / Date</div>
          <div className="text-center">Price</div>
          <div className="text-center">Actions</div>
          <div className="text-center pr-4">Payment Method</div>
        </div>
      </div>

      {/* Sections */}
      {endedSubs.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-8">Recently Ended</h3>
          {endedSubs.map(item => renderRow(item, 'ended'))}
        </div>
      )}

      {expiringSubs.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-8">Ending Soon</h3>
          {expiringSubs.map(item => renderRow(item, 'expiring'))}
        </div>
      )}

      {activeSubs.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-8">Active Tools</h3>
          {activeSubs.map(item => renderRow(item, 'active'))}
        </div>
      )}

      {/* No Data State */}
      {endedSubs.length === 0 && expiringSubs.length === 0 && activeSubs.length === 0 && (
        <div className="text-center mt-20 text-gray-500 bg-[#242b35] py-10 rounded-xl border border-gray-800">
          <p className="text-lg">No subscriptions found.</p>
        </div>
      )}

    </div>
  );
};

// --- SVG Icons (Tailwind classes applied) ---
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ManageSubscription;