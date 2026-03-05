import React from 'react';

const WarningPopup = ({ toolName, daysLeft, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        {/* ปุ่มปิด */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          ✕
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-2 border-orange-500 flex items-center justify-center mb-4">
            <span className="text-orange-500 text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Subscription Expiring Soon!</h2>
          <p className="text-gray-300 mb-6">
            Your <span className="font-bold text-white">{toolName}</span> subscription will end in <span className="font-bold text-orange-500">{daysLeft} days</span>.<br/>
            Please renew your plan to avoid service interruption.
          </p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg w-full transition flex items-center justify-center gap-2">
            <span>⚙️</span> Manage Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningPopup;