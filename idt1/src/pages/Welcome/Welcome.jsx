import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logo from "@/assets/images/logo.png";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

import Rocket from "@/assets/icons/rocket-lunch 1.svg";
import Crown from "@/assets/icons/crown 1.svg";
import OtpModal from "@/components/OtpModal";
import axios from "axios"; 

// 🟢 แก้ไขจุดที่ 1: ดึง URL จาก Environment Variable มาเตรียมไว้
const BASE_API_URL = import.meta.env.VITE_API_URL || "https://ideatrade1p.onrender.com/";

export default function Welcome() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [popupType, setPopupType] = useState("");
  const [openForgot, setOpenForgot] = useState(false);
  const [openOtp, setOpenOtp] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const setFreeAccess = (userEmail) => {
    localStorage.setItem(
      "userProfile",
      JSON.stringify({
        email: userEmail || email,
        role: "free",
        unlockedItems: [],
        lastLogin: new Date().toISOString()
      })
    );
    navigate("/dashboard");
  };

  const setMembership = () => {
    localStorage.setItem(
      "userProfile",
      JSON.stringify({
        email: email || "guest@example.com",
        role: "free",
        unlockedItems: [],
        lastLogin: new Date().toISOString()
      })
    );
    navigate("/dashboard", {
      state: { goTo: "premiumtools" },
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google User:", result.user);
      navigate("/dashboard");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Google Sign-In failed");
    }
  };

  const handleSignIn = async () => {
    if (!email) {
      setPopupType("emailRequired");
      setOpenForgot(true);
      return;
    }

    if (!isValidEmail(email)) {
      setPopupType("emailInvalid");
      setOpenForgot(true);
      return;
    }

    setIsLoading(true);
    try {
      const formattedEmail = email.trim().toLowerCase();
      const usersRef = collection(db, "users"); 
      const q = query(usersRef, where("email", "==", formattedEmail));
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setPopupType("emailNotFound"); 
        setOpenForgot(true);
        setIsLoading(false);
        return;
      }

      // 🟢 แก้ไขจุดที่ 2: ใช้ BASE_API_URL ต่อกับ Path ของ Function
      // วิธีนี้จะทำให้ยิงไปหา Render (https://ideatrade1p.onrender.com) ได้ถูกต้อง
      const response = await fetch(`${BASE_API_URL}/api/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formattedEmail })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (remember) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        setOpenOtp(true); 
      } else {
        alert("ไม่สามารถส่งอีเมลได้: " + (data.error || "ไม่ทราบสาเหตุ"));
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      alert("⚠️ เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ส่วน JSX ด้านล่างคงเดิมทั้งหมดตามที่คุณเขียนมา ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-700 px-4">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-6xl mx-auto rounded-2xl lg:rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 px-6 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-10 md:py-12 lg:py-14 gap-8 md:gap-10 lg:gap-16">
          <div className="flex flex-col items-center justify-center text-center h-full">
            <h2 className="hidden lg:block text-4xl font-semibold text-blue-400 mb-6">Welcome to</h2>
            <img src={logo} alt="Idea Trade" className="w-40 sm:w-52 md:w-64 lg:w-72 mb-4 md:mb-6" />
            <p className="text-blue-400 font-semibold hidden sm:block text-lg md:text-2xl">Special Features for our customers</p>
          </div>

          <div className="flex flex-col justify-center gap-5 text-white">
            <div className="relative w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full bg-transparent border border-blue-300/40 rounded-md px-4 py-3 text-white focus:border-blue-500 outline-none"
              />
              <label className={`absolute left-4 px-2 py-0.5 rounded-full text-sm transition-all duration-200 ${email ? "-top-3 text-xs text-sky-400 bg-slate-800" : "top-3 text-sm text-blue-300 bg-transparent"} peer-focus:-top-3 peer-focus:text-xs peer-focus:text-sky-400 peer-focus:bg-slate-800`}>
                EMAIL
              </label>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
            </div>

            <button onClick={handleSignIn} disabled={isLoading} className={`mt-2 py-3 rounded-lg text-lg font-semibold transition-all ${isLoading ? "bg-slate-600 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-500"}`}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-sm text-center text-gray-400">
              Don&apos;t have an account?{" "}
              <span onClick={() => navigate("/register")} className="text-white cursor-pointer hover:underline">Sign up here</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-700/50 px-6 md:px-12 lg:px-16 py-6 md:py-8 flex flex-col lg:flex-row gap-4 md:gap-6 justify-between">
          <button onClick={() => setFreeAccess()} className="flex-1 py-4 md:py-5 rounded-xl md:rounded-2xl bg-emerald-400 hover:bg-emerald-500 active:scale-95 transition-all duration-200 text-lg md:text-xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-400/40">
            <img src={Rocket} alt="rocket" className="w-5 h-5 md:w-6 md:h-6" />
            TRY FREE VERSION
          </button>
          <button onClick={setMembership} className="flex-1 py-4 md:py-5 rounded-xl md:rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 transition-all duration-200 text-lg md:text-xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-sky-500/40">
            <img src={Crown} alt="crown" className="w-5 h-5 md:w-6 md:h-6" />
            JOIN MEMBERSHIP
          </button>
        </div>
      </div>

      <OtpModal
        open={openOtp}
        email={email}
        onClose={() => setOpenOtp(false)}
        onSuccess={() => {
          setOpenOtp(false);
          setFreeAccess(email); 
        }}
      />

      {openForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenForgot(false)} />
          <div className="relative z-10 w-[90%] max-w-md mx-auto rounded-2xl bg-slate-800 text-white p-6 shadow-xl">
            {popupType === "emailRequired" && (
              <>
                <h3 className="text-xl font-semibold mb-2 text-red-400">Please enter your email</h3>
                <p className="text-sm text-gray-300 mb-5">You need to provide an email before signing in.</p>
              </>
            )}
            {popupType === "emailInvalid" && (
              <>
                <h3 className="text-xl font-semibold mb-2 text-red-400">Invalid email address</h3>
                <p className="text-sm text-gray-300 mb-5">Please check your email format and try again.</p>
              </>
            )}
            {popupType === "emailNotFound" && (
              <>
                <h3 className="text-xl font-semibold mb-2 text-yellow-400">Email Not Found</h3>
                <p className="text-sm text-gray-300 mb-5">ไม่พบอีเมลนี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน</p>
              </>
            )}
            <div className="flex justify-end">
              <button onClick={() => setOpenForgot(false)} className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}