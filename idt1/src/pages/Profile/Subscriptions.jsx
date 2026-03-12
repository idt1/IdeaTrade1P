// src/pages/ManageSubscription.jsx
import React, { useState, useEffect } from 'react';
import './Subscriptions.css';
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 

const ManageSubscription = () => {
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
        const purchaseObj = new Date(sub.purchaseDate || new Date());
        const purchaseStr = purchaseObj.toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false
        });

        let expireDateStr = "Unknown";
        let daysLeft = 0;
        const toolExpireData = expirations[sub.id]; 
        
        if (toolExpireData) {
          const expireObj = typeof toolExpireData.toDate === 'function' 
            ? toolExpireData.toDate() 
            : new Date(toolExpireData);
          
          expireDateStr = expireObj.toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });

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

        if (daysLeft <= 0) {
          ended.push(formattedItem);
        } else if (daysLeft > 0 && daysLeft <= 3) {
          expiring.push(formattedItem);
          if (sub.cycle === 'Monthly') totalM += priceValue;
          if (sub.cycle === 'Yearly') totalY += priceValue;
        } else {
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
            }
          } catch (e) { console.error(e); }
        } else {
          loadDemoSubscriptions();
        }
    });

    return () => unsubscribe();
  }, []);

  // Shared Desktop Grid Structure
  const gridCols = "grid-cols-[2.5fr_1.5fr_2.5fr_1.5fr_1.5fr_2fr]";

  const renderRow = (item, type) => {
    let statusColor, statusIcon, statusText, actionText, cardBorder, bgClass;
    let btnDesktop, btnMobile;

    if (type === 'ended') {
      statusColor = 'text-red-500';
      statusIcon = <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />;
      statusText = 'inactive';
      actionText = 'Renew';
      cardBorder = 'border-[#007bff]'; 
      bgClass = 'bg-[#1a2332]/80';
      
      btnDesktop = <button className="text-[#4db8ff] font-bold text-[14px] hover:underline underline-offset-4 transition-all">{actionText}</button>;
      btnMobile = <button className="w-full py-3 rounded-lg font-bold bg-[#007bff] hover:bg-[#0069d9] text-white transition-all shadow-md">{actionText}</button>;
      
    } else if (type === 'expiring') {
      statusColor = 'text-yellow-500';
      statusIcon = <ClockIcon className="w-4 h-4 text-yellow-500 shrink-0" />;
      statusText = 'expiring';
      actionText = 'Extend';
      cardBorder = 'border-gray-800';
      bgClass = 'bg-[#242b35]/80';

      btnDesktop = <button className="text-[#4db8ff] font-bold text-[14px] hover:underline underline-offset-4 transition-all">{actionText}</button>;
      btnMobile = <button className="w-full py-3 rounded-lg font-bold bg-[#2a323d] border border-gray-600 text-[#4db8ff] transition-all">{actionText}</button>;

    } else {
      statusColor = 'text-green-500';
      statusIcon = <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />;
      statusText = 'active';
      actionText = 'Manage';
      cardBorder = 'border-gray-800';
      bgClass = 'bg-[#242b35]/80';

      btnDesktop = <button className="px-5 py-1.5 rounded-md border border-gray-600 text-gray-400 text-[13px] hover:text-white hover:bg-gray-700 transition-all">{actionText}</button>;
      btnMobile = <button className="w-full py-3 rounded-lg font-bold bg-transparent border border-gray-600 text-gray-400 hover:text-white transition-all">{actionText}</button>;
    }

    return (
      <div key={item.key} className={`${bgClass} border ${cardBorder} rounded-xl mb-4 p-5 md:py-4 md:px-6 hover:border-gray-600 transition-all backdrop-blur-sm`}>
        
        {/* === Mobile Card Layout === */}
        <div className="md:hidden flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#4db8ff] text-xl tracking-tight">{item.name}</h3>
            <span className="text-white text-[13px] font-semibold capitalize">{item.cycle}</span>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-1.5">
              {statusIcon}
              <span className={`font-extrabold text-[13px] uppercase tracking-wide ${statusColor}`}>{statusText}</span>
            </div>
            {/* 🔴 นำ Paid on และ Exp กลับมาแสดงเหมือนเดิม */}
            <div className="flex flex-col pl-5 mt-0.5">
              <span className="text-gray-500 text-[11px]">Paid on {item.purchaseDetail}</span>
              <span className="text-[#FF6200] text-[11px] font-medium">
                {type === 'ended' ? 'Ended:' : 'Exp:'} {item.expireDetail}
              </span>
            </div>
          </div>

          <div className="text-[26px] font-black text-white flex items-baseline gap-1 mt-1">
            {item.priceValue.toLocaleString()} <span className="text-xl font-bold text-gray-300">฿</span>
          </div>

          <div className="mt-1">
            {btnMobile}
          </div>

          <div className="text-gray-400 text-[12px] pt-3 border-t border-gray-700/50 text-left mt-1">
            {item.paymentMethod || 'Bank Transfer'}
          </div>
        </div>

        {/* === Desktop Table Layout === */}
        <div className={`hidden md:grid ${gridCols} gap-4 items-center`}>
           <div className="font-bold text-[#4db8ff] text-[15px] text-left truncate">{item.name}</div>
           
           <div className="text-white text-[14px] text-left capitalize">{item.cycle}</div>
           
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
           
           <div className="text-center">
             {btnDesktop}
           </div>

           <div className="text-gray-400 text-[13px] text-right truncate">{item.paymentMethod || 'Bank Transfer'}</div>
        </div>

      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-transparent p-4 md:p-10 animate-fade-in">
      <div className="max-w-[1000px] mx-auto w-full text-white">
        
        {/* Header */}
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

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-10 gap-4 w-full">
          <div className="relative w-full md:max-w-[450px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Search Something..." 
              className="w-full bg-[#1b2230]/40 border border-gray-700/50 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
            />
          </div>
          <button className="w-full md:w-auto bg-[#007bff] hover:bg-[#0069d9] text-white font-bold py-3 md:py-2.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap">
            <PlusIcon /> Add new tool
          </button>
        </div>

        {/* Desktop Header Row */}
        <div className="hidden md:block mb-4 px-6 border-b border-gray-800/80 pb-3">
          <div className={`grid ${gridCols} gap-4 items-center`}>
            <div className="text-[12px] font-bold text-gray-400 text-left">Tool name</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Cycle</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Status</div>
            <div className="text-[12px] font-bold text-gray-400 text-left">Price</div>
            <div className="text-[12px] font-bold text-gray-400 text-center">Actions</div>
            <div className="text-[12px] font-bold text-gray-400 text-right">Payment Method</div>
          </div>
        </div>

        {/* Sections */}
        {endedSubs.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Recently Ended</h3>
            {endedSubs.map(item => renderRow(item, 'ended'))}
          </div>
        )}

        {expiringSubs.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Ending Soon</h3>
            {expiringSubs.map(item => renderRow(item, 'expiring'))}
          </div>
        )}

        {activeSubs.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 text-left">Active</h3>
            {activeSubs.map(item => renderRow(item, 'active'))}
          </div>
        )}

        {/* No Data State */}
        {endedSubs.length === 0 && expiringSubs.length === 0 && activeSubs.length === 0 && (
          <div className="text-center mt-16 text-gray-600 bg-[#1b2230]/20 py-20 rounded-2xl border border-gray-800/50">
            <p className="text-lg font-medium">No active subscriptions found.</p>
          </div>
        )}

      </div>
    </div>
  );
};

// --- SVG Icons ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ManageSubscription;