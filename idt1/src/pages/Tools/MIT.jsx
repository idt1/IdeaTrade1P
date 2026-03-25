import React from "react";
import { useNavigate } from "react-router-dom";
import mit from "@/assets/images/MIT.png";

export default function MITLanding() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden animate-fade-in pb-20">
      
      {/* Background Blur Effect (เหมือนหน้า Gold) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Main Content Wrapper */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="text-center mb-10 w-full">
          {/* ลบ whitespace-nowrap ออก เพื่อให้ข้อความปัดบรรทัดได้ในมือถือ */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight leading-tight md:leading-tight">
            MIT : <br className="block md:hidden" /> {/* ใส่ br ให้ปัดบรรทัดเฉพาะมือถือ */}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
              Multi-Agent Intelligent Analyst
            </span>
          </h1>
          
          {/* ลบ whitespace-nowrap ออกเช่นกัน */}
          <p className="text-slate-400 text-base md:text-xl font-light mb-12 max-w-2xl mx-auto px-2">
            Multi-agent AI system that debates, validates risk, and delivers objective trading insights.
          </p>
        </div>
        
        {/* Mockup Window (เหมือนหน้า Gold) */}
        <div className="relative group w-full max-w-5xl mb-16">
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
          
          <div className="relative bg-[#0B1221] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window Bar */}
            <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
            </div>
            
            {/* Image Container */}
            <div className="aspect-[4/3] md:aspect-video w-full bg-[#0B1221] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition duration-500 ease-out">
                <img 
                  src={mit} 
                  alt="MIT Preview" 
                  className="w-full h-full object-cover object-top" 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Button Section (เหมือนหน้า Gold) */}
        <div className="text-center w-full max-w-md mx-auto mt-4 px-4">
          <button 
            onClick={() => window.open('https://ideatrade1.com/mit', '_blank')}
            className="group relative inline-flex items-center justify-center w-full md:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300"
          >
            <span className="mr-2">Start Using Tool</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        
      </div>
    </div>
  );
}