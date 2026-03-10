import React from 'react';

// ✅ เพิ่ม hasPurchased เข้ามาเช็ค ถ้าไม่ส่งมาจะให้ค่าเริ่มต้นเป็น true ไว้ก่อน
const ExpiredPopup = ({ toolName, expireDateStr, hasPurchased = true, onClose }) => {
  
  // 🔥 ถ้าไม่เคยซื้อเลย ให้ return null (Popup จะไม่แสดงขึ้นมาเลย)
  if (!hasPurchased) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md">
      
      <div className="bg-[#1e1e1e] border border-red-900/50 rounded-xl shadow-2xl p-7 w-full max-w-md text-center relative overflow-hidden">
        
        {/* เอฟเฟกต์แสงสีแดงจางๆ ด้านบน */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-16 bg-red-600 opacity-10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          
          <div className="relative flex items-center justify-center mb-6 mt-2">
            <div className="absolute inset-0 rounded-full border border-red-600/30 w-20 h-20 -ml-2 -mt-2"></div>
            <div className="w-16 h-16 rounded-full bg-[#2a1515] flex items-center justify-center z-10 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Subscription Expired</h2>
          <p className="text-gray-300 mb-8 leading-relaxed text-sm">
            Your access to <span className="font-bold text-white">{toolName}</span> has ended.<br/>
            Renew now to continue viewing real-time data.
          </p>
          
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg w-full transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" clipRule="evenodd" />
            </svg>
            Renew Subscription
          </button>
          
          <p className="text-gray-500 text-xs">
            Expired on: {expireDateStr}
          </p>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors duration-200 z-50 p-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default ExpiredPopup;