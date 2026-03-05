import React from 'react';
import './rocket.css';

const Rocket = () => {
  return (
    // เปลี่ยนชื่อ class ตรงนี้เป็น rocket-wrapper
    <div className="rocket-wrapper">
      <div className="scene-container">
        {/* ... (ไส้ในเหมือนเดิม: Star, Rocket Group, Clouds) ... */}
        
        {/* Stars */}
        <div className="star" style={{ top: '20%', left: '15%' }}></div>
        <div className="star" style={{ top: '15%', left: '80%' }}></div>
        <div className="star" style={{ top: '40%', left: '25%' }}></div>
        
        <div className="rocket-group">
          <div className="rocket-body">
            <div className="window"></div>
            <div className="fin fin-left"></div>
            <div className="fin fin-right"></div>
            <div className="nozzle"></div>
          </div>
          <div className="smoke-trail"></div>
        </div>

        <div className="cloud-base">
           <div className="cloud c4"></div>
           <div className="cloud c2"></div>
           <div className="cloud c1"></div>
           <div className="cloud c3"></div>
           <div className="cloud c5"></div>
        </div>

      </div>
    </div>
  );
};

export default Rocket;