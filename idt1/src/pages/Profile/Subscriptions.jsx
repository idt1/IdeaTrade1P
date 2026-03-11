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

  const renderRow = (item, type) => {
    let statusColor, statusIcon, statusText, actionText, actionClass, cardBorder, bgClass;

    if (type === 'ended') {
      statusColor = 'text-red-500';
      statusIcon = <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />;
      statusText = 'inactive';
      actionText = 'Renew';
      actionClass = 'bg-[#007bff] hover:bg-[#0069d9] text-white w-full py-3.5 rounded-lg font-bold transition-all shadow-lg';
      cardBorder = 'border-[#1e3a8a]';
      bgClass = 'bg-[#1a2332]/80';
    } else if (type === 'expiring') {
      statusColor = 'text-yellow-500';
      statusIcon = <ClockIcon className="w-4 h-4 text-yellow-500 shrink-0" />;
      statusText = 'expiring';
      actionText = 'Extend';
      actionClass = 'bg-[#2a323d] hover:bg-[#323b47] border border-gray-600 text-white w-full py-3.5 rounded-lg font-bold transition-all';
      cardBorder = 'border-gray-800';
      bgClass = 'bg-[#242b35]/80';
    } else {
      statusColor = 'text-green-500';
      statusIcon = <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />;
      statusText = 'active';
      actionText = 'Pay';
      actionClass = 'bg-[#2a323d] hover:bg-[#323b47] border border-gray-600 text-yellow-500 w-full py-3.5 rounded-lg font-bold transition-all';
      cardBorder = 'border-gray-800';
      bgClass = 'bg-[#242b35]/80';
    }

    return (
      <div key={item.key} className={`${bgClass} border ${cardBorder} rounded-xl mb-5 p-5 md:p-4 hover:border-gray-600 transition-all backdrop-blur-sm shadow-xl`}>
        
        {/* === Mobile Card Layout === */}
        <div className="md:hidden flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-[#4db8ff] text-xl tracking-tight">{item.name}</h3>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{item.cycle}</span>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className={`font-bold text-sm uppercase ${statusColor}`}>{statusText}</span>
            </div>
            <p className="text-gray-500 text-[11px] pl-6 font-medium">
              {type === 'ended' ? `Ended ${item.expireDetail}` : `Ends in ${item.daysLeft} days`}
            </p>
          </div>

          <div className="text-3xl font-black text-white flex items-baseline gap-1 py-1">
            {item.priceValue.toLocaleString()}<span className="text-lg font-normal text-gray-400">฿</span>
          </div>

          <button className={actionClass}>
            {actionText}
          </button>

          <div className="text-gray-500 text-[10px] pt-2 border-t border-gray-700/30 flex justify-between uppercase tracking-tighter font-bold">
            <span>Payment Method</span>
            <span className="text-gray-400">{item.paymentMethod || 'Bank Transfer'}</span>
          </div>
        </div>

        {/* === Desktop Table Layout === */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_3fr_1.5fr_1.5fr_1.5fr] items-center">
           <div className="font-bold text-[#4db8ff] text-[15px] pl-4">{item.name}</div>
           <div className="text-gray-300 capitalize text-sm text-center">{item.cycle}</div>
           <div className="flex items-start gap-3 pl-12">
             <div className="mt-0.5">{statusIcon}</div>
             <div className="flex flex-col text-sm text-left">
               <div className="flex items-center gap-2">
                 <span className={`font-bold uppercase ${statusColor}`}>{statusText}</span>
                 <span className="text-gray-500 text-[11px]">Paid on {item.purchaseDetail}</span>
               </div>
               <div className="text-gray-400 text-[11px] mt-0.5">
                 {type === 'ended' ? 'Ended:' : 'Exp:'} {item.expireDetail}
               </div>
             </div>
           </div>
           <div className="font-bold text-white text-[15px] text-center">{item.price}</div>
           <div className="text-center">
             <button className="text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-blue-500 underline-offset-4 text-sm">
               {actionText}
             </button>
           </div>
           <div className="text-gray-400 text-sm pr-4 text-center">{item.paymentMethod || 'Bank Transfer'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-transparent p-4 md:p-10 animate-fade-in">
      <div className="max-w-6xl mx-auto w-full text-white">
        
        {/* Header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Manage Subscriptions</h1>
          <div className="flex flex-row gap-8 text-sm">
            <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Monthly</span>
                <span className="text-white text-xl font-black">{summary.monthly.toLocaleString()} ฿</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Yearly</span>
                <span className="text-white text-xl font-black">{summary.yearly.toLocaleString()} ฿</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-12 gap-5 w-full">
          <div className="relative w-full md:max-w-[450px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Search Something..." 
              className="w-full bg-[#1b2230]/40 border border-gray-700/50 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
            />
          </div>
          <button className="w-full md:w-auto bg-[#007bff] hover:bg-[#0069d9] text-white font-bold py-3.5 md:py-3 px-10 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            <PlusIcon /> Add new tool
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 border-b border-gray-800/50 pb-4">
          <div className="grid grid-cols-[2fr_1.5fr_3fr_1.5fr_1.5fr_1.5fr] px-4">
            <div className="pl-4 text-left">Tool Name</div>
            <div className="text-center">Cycle</div>
            <div className="pl-24 text-left">Status / Date</div>
            <div className="text-center">Price</div>
            <div className="text-center">Actions</div>
            <div className="text-center pr-4">Method</div>
          </div>
        </div>

        {/* Sections */}
        {endedSubs.length > 0 && (
          <div className="mb-14">
            <h3 className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.3em] mb-5 text-left md:pl-8">Recently Ended</h3>
            {endedSubs.map(item => renderRow(item, 'ended'))}
          </div>
        )}

        {expiringSubs.length > 0 && (
          <div className="mb-14">
            <h3 className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.3em] mb-5 text-left md:pl-8">Ending Soon</h3>
            {expiringSubs.map(item => renderRow(item, 'expiring'))}
          </div>
        )}

        {activeSubs.length > 0 && (
          <div className="mb-14">
            <h3 className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.3em] mb-5 text-left md:pl-8">Active Tools</h3>
            {activeSubs.map(item => renderRow(item, 'active'))}
          </div>
        )}

        {/* No Data State */}
        {endedSubs.length === 0 && expiringSubs.length === 0 && activeSubs.length === 0 && (
          <div className="text-center mt-20 text-gray-600 bg-[#1b2230]/20 py-20 rounded-2xl border border-gray-800/50">
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
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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