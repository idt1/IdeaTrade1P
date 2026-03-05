import React from 'react';

const ExpiredPopup = ({ toolName, expireDateStr }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md">
      {/* กรอบสีแดงตามดีไซน์ */}
      <div className="bg-[#121212] border border-red-900/50 rounded-2xl shadow-2xl p-8 w-full max-w-lg text-center relative overflow-hidden">
        {/* เอฟเฟกต์แสงสีแดงจางๆ ด้านบน */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-24 bg-red-600 opacity-20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center mb-6">
            <span className="text-red-500 text-4xl">🔒</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Subscription Expired</h2>
          <p className="text-gray-400 text-lg mb-8">
            Your access to <span className="font-bold text-yellow-500">{toolName}</span> has ended.<br/>
            Renew now to continue viewing real-time data.
          </p>
          <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-xl transition shadow-[0_0_15px_rgba(250,204,21,0.3)] mb-4">
            Renew Subscription
          </button>
          <p className="text-gray-500 text-sm">
            Expired on: {expireDateStr}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpiredPopup;