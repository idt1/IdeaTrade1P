import { useEffect, useRef, useState } from "react";
import { auth } from "@/firebase"; 
import { signInWithCustomToken } from "firebase/auth";

export default function OtpModal({ open, onClose, onSuccess, email }) { 
  const OTP_LENGTH = 6;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [status, setStatus] = useState("idle"); // idle | error | success | loading
  const [timeLeft, setTimeLeft] = useState(300);
  const [resent, setResent] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // ใช้ ref ตัวเดียวสำหรับ input ที่ซ่อนอยู่
  const hiddenInputRef = useRef(null);

  /* ⏱ Timer Logic */
  useEffect(() => {
    if (!open) return;

    setTimeLeft(300);
    setResent(false);
    setOtp(Array(OTP_LENGTH).fill(""));
    setStatus("idle");

    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /* ✅ Verify OTP Logic */
  const verifyOtp = async (code) => {
    setStatus("loading");
    try {
      const response = await fetch("/ideatrade-9548f/us-central1/verifyOTP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          otp: code 
        })
      });

      const data = await response.json(); 
      
      if (!response.ok || !data.success) {
         throw new Error(data.error || "Verification failed"); 
      }

      await signInWithCustomToken(auth, data.token);
      setStatus("success");
      setTimeout(() => onSuccess(), 800);
      
    } catch (error) {
      console.error("🔥 Verify Error:", error.message); 
      setStatus("error");
      alert("เกิดข้อผิดพลาด: " + error.message); 
    }
  };

  /* 📩 Resend OTP Logic */
  const resendOtp = async () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setStatus("idle");
    setTimeLeft(300);
    setResent(true);
    
    // โฟกัสกลับไปที่ input ที่ซ่อนอยู่เพื่อให้แป้นพิมพ์เด้งขึ้นมา
    hiddenInputRef.current?.focus();

    try {
      await fetch("/ideatrade-9548f/us-central1/requestOTP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
    } catch (err) {
      console.error("Resend error:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-xl font-bold">Fill your OTP</h3>
          <div
            className="relative"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <span className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center text-xs cursor-pointer opacity-60 hover:opacity-100">?</span>
            {showTip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 rounded-lg text-xs text-gray-200 bg-slate-700 shadow-xl z-50">
                OTP (One-Time Password) is a secure 6-digit key delivered to your email.
              </div>
            )}
          </div>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white transition-colors">✕</button>
        </div>

        {/* OTP Input Group (รองรับ iOS AutoFill) */}
        <div className="relative flex justify-center gap-2 sm:gap-3 mb-6">
          
          {/* Input ลับซ่อนไว้ด้านบนสุด เพื่อรับ iOS AutoFill */}
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp.join("")}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ""); // รับเฉพาะตัวเลข
              if (value.length <= OTP_LENGTH) {
                const newOtp = value.split("").concat(Array(OTP_LENGTH - value.length).fill(""));
                setOtp(newOtp);
                
                // ถ้ารหัสครบ 6 ตัวให้เรียก verify
                if (value.length === OTP_LENGTH) {
                  verifyOtp(value);
                }
              }
            }}
            maxLength={OTP_LENGTH}
            disabled={status === "loading" || status === "success"}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
          />

          {/* UI กล่อง 6 ช่องของคุณ */}
          {otp.map((digit, i) => (
            <div
              key={i}
              className={`
                flex items-center justify-center
                w-10 h-12 sm:w-12 sm:h-14 
                text-xl font-bold 
                rounded-xl transition-all duration-200
                ${status === "error" ? "bg-red-900/50 border-2 border-red-500 text-red-200" : 
                  status === "success" ? "bg-green-600 border-2 border-green-400" : 
                  status === "loading" ? "bg-slate-700 animate-pulse" : 
                  "bg-slate-700 border-2 border-slate-600 shadow-inner"}
                ${/* ไฮไลท์กรอบช่องต่อไปที่กำลังจะพิมพ์ */
                  otp.join("").length === i && status === "idle" ? "border-sky-400 bg-slate-600" : ""
                }
              `}
            >
              {digit}
            </div>
          ))}
        </div>

        {/* Info & Timer Section */}
        <div className="space-y-2 mb-6 text-center">
          <p className={`text-sm font-medium ${status === "error" ? "text-red-400 animate-bounce" : "text-slate-300"}`}>
            {status === "error" ? "Invalid OTP, please try again." : 
             status === "loading" ? "Checking code..." : `Expires in: ${formatTime(timeLeft)}`}
          </p>

          <p className={`text-xs ${resent ? "text-sky-400 font-bold" : "text-slate-400"}`}>
            {resent ? "✨ OTP has been resent!" : `Sent to: ${email}`}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Don't get the code?{" "}
            <button 
              onClick={resendOtp} 
              disabled={status === "loading" || timeLeft > 270}
              className={`underline transition-colors ${timeLeft > 270 ? "text-slate-600 cursor-not-allowed" : "text-sky-400 hover:text-sky-300"}`}
            >
              Send again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}