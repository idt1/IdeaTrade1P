import React, { useState, useEffect } from 'react';
import './Subscriptions.css';
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "/src/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 

const ManageSubscription = () => {
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [summary, setSummary] = useState({ monthly: 0, yearly: 0 });

  useEffect(() => {
    // ✅ รับพารามิเตอร์ 2 ตัว: ประวัติการซื้อ(savedSubs) และ วันหมดอายุ(expirations)
    const processAndSetSubscriptions = (savedSubs, expirations = {}) => {
      const activeSubs = savedSubs.map((sub, index) => {
        
        // 1. วันที่ซื้อ (Purchase Date) + แสดงเวลา
        const dateObj = new Date(sub.purchaseDate || new Date());
        const dateStr = dateObj.toLocaleString('en-GB', {
          day: 'numeric', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        // 2. 🟢 วันหมดอายุ (Expire Date) + แสดงเวลา
        let expireDateStr = "Unknown";
        const toolExpireData = expirations[sub.id]; // ดึงข้อมูลวันหมดอายุตาม id ของ tool
        
        if (toolExpireData) {
          // เช็คว่าเป็น Timestamp ของ Firebase หรือเป็น Date String ของ LocalStorage
          const expireObj = toolExpireData.toDate ? toolExpireData.toDate() : new Date(toolExpireData);
          
          expireDateStr = expireObj.toLocaleString('en-GB', {
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }

        // คำนวณราคาเป็นตัวเลขเพื่อเอาไปรวมยอด
        const priceValue = parseInt(String(sub.price).replace(/,/g, '').replace(' THB', '')) || 0;

        return {
          ...sub, 
          key: `sub-${index}`, 
          statusDetail: `Paid on ${dateStr}`,
          expireDetail: `Exp: ${expireDateStr}`, // 🟢 ข้อความวันและเวลาหมดอายุ
          priceValue: priceValue 
        };
      });

      setMySubscriptions(activeSubs);

      // --- 🧮 คำนวณยอดรวมจากข้อมูล ---
      const totalM = activeSubs
        .filter(s => s.cycle === 'Monthly')
        .reduce((sum, item) => sum + item.priceValue, 0);

      const totalY = activeSubs
        .filter(s => s.cycle === 'Yearly')
        .reduce((sum, item) => sum + item.priceValue, 0);

      setSummary({ monthly: totalM, yearly: totalY });
    };

    const loadDemoSubscriptions = () => {
      try {
        const saved = localStorage.getItem('userProfile');
        const parsed = saved ? JSON.parse(saved) : {};
        const savedSubs = parsed.mySubscriptions || [];
        const expirations = parsed.subscriptions || {}; // ดึงข้อมูลหมดอายุจาก LocalStorage
        processAndSetSubscriptions(savedSubs, expirations);
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
              // ส่งข้อมูล subscriptions (ที่เป็น Map) เข้าไปด้วย
              processAndSetSubscriptions(
                userData.mySubscriptions || [], 
                userData.subscriptions || {}
              );
            } else {
              processAndSetSubscriptions([], {});
            }
          } catch (e) {
            console.error("Error loading subscriptions from Firebase:", e);
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

  return (
    <div className="sub-page-container">
      
      {/* Header & Summary */}
      <div className="sub-header">
        <h1>Your subscriptions</h1>
        <div className="sub-summary">
          <span>Monthly <span className="bold">{summary.monthly.toLocaleString()} THB</span></span>
          <span className="ml-4">Yearly <span className="bold">{summary.yearly.toLocaleString()} THB</span></span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sub-toolbar">
        <div className="search-wrapper">
          <SearchIcon />
          <input type="text" placeholder="Search tool..." className="search-input" />
        </div>
        <button className="btn-add-tool">
          <PlusIcon /> Add new Tools
        </button>
      </div>

      {/* Table Header */}
      <div className="sub-table-header">
        <div className="col-name">Tool name</div>
        <div className="col-cycle">Cycle</div>
        <div className="col-status">Status / Date</div>
        <div className="col-price">Price</div>
        <div className="col-actions">Actions</div>
        <div className="col-payment">Payment Method</div>
      </div>

      {/* Content Section */}
      {mySubscriptions.length > 0 ? (
        <div className="sub-section">
          <h3 className="section-title">ACTIVE TOOLS</h3>
          
          {mySubscriptions.map((item) => (
            <div key={item.key} className="sub-card-row">
              <div className="col-name font-bold">{item.name}</div>
              
              <div className="col-cycle" style={{ textTransform: 'capitalize' }}>
                {item.cycle}
              </div>
              
              <div className="col-status status-wrapper">
                <div className="status-indicator active">
                  <CheckCircleIcon />
                  <div className="flex flex-col">
                    <div>
                      <span className="status-text">Active </span>
                      <span className="status-date text-gray-400">{item.statusDetail}</span>
                    </div>
                    {/* 🟢 แสดงวันหมดอายุด้านล่าง หรือด้านข้าง */}
                    <span className="text-xs text-orange-400 mt-1 font-medium tracking-wide">
                      {item.expireDetail}
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-price font-bold">{item.price}</div>
              
              <div className="col-actions">
                <button className="btn-action pay text-yellow-500 font-bold hover:text-yellow-400 transition">
                  Pay
                </button>
              </div>
              
              <div className="col-payment text-gray-400 text-sm">{item.paymentMethod}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data-state" style={{ textAlign: 'center', marginTop: '40px', color: '#6b7280' }}>
          <p>You don't have any active subscriptions yet.</p>
        </div>
      )}

    </div>
  );
};

// --- Icons ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default ManageSubscription;