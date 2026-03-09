import React from 'react';

const WarningPopup = ({ toolName, daysLeft, onClose }) => {
  return (
    // 1. ชั้นนอกสุด: absolute inset-0 ให้พื้นหลังสีดำคลุมเนื้อหาทั้งหมด (ไม่ว่าจะยาวแค่ไหน)
    <div className="absolute inset-0 z-50 bg-black bg-opacity-70 backdrop-blur-md">
      
      {/* 2. ชั้นล็อคหน้าจอ: ใช้ sticky top-0 และ h-screen เพื่อล็อคกล่องให้อยู่กลางจอที่มองเห็นเสมอ */}
      <div className="sticky top-0 w-full h-screen flex items-center justify-center p-4">
        
        {/* ตัวกล่อง Popup สไตล์เดียวกับหน้า Expired */}
        <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl p-7 w-full max-w-md text-center relative overflow-hidden">
          
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors duration-200 z-20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative z-10 flex flex-col items-center">
            
            <div className="relative flex items-center justify-center mb-6 mt-2">
              <div className="absolute inset-0 rounded-full border border-[#ff9900]/40 w-20 h-20 -ml-2 -mt-2"></div>
              <div className="w-16 h-16 rounded-full bg-[#2a1d10] flex items-center justify-center z-10 shadow-[0_0_15px_rgba(255,153,0,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#ff9900]">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Subscription Expiring Soon!</h2>
            <p className="text-gray-300 mb-8 leading-relaxed text-sm">
              Your <span className="font-bold text-white">{toolName}</span> subscription will end in <span className="font-bold text-[#ff9900]">{daysLeft} days</span>.<br/>
              Please renew your plan to avoid service interruption.
            </p>

            <button className="bg-[#ff9900] hover:bg-[#e68a00] text-black font-bold py-3 px-6 rounded-lg w-full transition flex items-center justify-center gap-2 mb-4 shadow-[0_0_15px_rgba(255,153,0,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
              </svg>
              Manage Subscription
            </button>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default WarningPopup;