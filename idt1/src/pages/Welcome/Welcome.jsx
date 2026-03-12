import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/images/logo.png";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import Rocket from "@/assets/icons/rocket-lunch 1.svg";
import Crown from "@/assets/icons/crown 1.svg";
import OtpModal from "@/components/OtpModal";
import axios from "axios"; // 🔴 อย่าลืมติดตั้ง axios ถ้ายังไม่มี (npm install axios)

export default function Welcome() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  // เพิ่ม state สำหรับ password
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [popupType, setPopupType] = useState("");
  const [openForgot, setOpenForgot] = useState(false);
  const [openOtp, setOpenOtp] = useState(false); // ถ้าไม่ได้ใช้ OTP แล้ว อาจจะเอาออกได้ในอนาคต

  // ดึงอีเมลที่เคยจำไว้มาแสดง
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  /* ======================
      EMAIL VALIDATION
  ====================== */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /* ======================
      LOGIN ACTIONS
  ====================== */
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
        role: "member",
        unlockedItems: [],
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
    // ❌ ยังไม่กรอกอีเมล
    if (!email) {
      setPopupType("emailRequired");
      setOpenForgot(true);
      return;
    }

    // ❌ อีเมลผิดรูปแบบ
    if (!isValidEmail(email)) {
      setPopupType("emailInvalid");
      setOpenForgot(true);
      return;
    }

    // ✅ เริ่มกระบวนการส่ง OTP ผ่าน Firebase
    setIsLoading(true);
    try {
      // 🔴 ลบ http://127.0.0.1:5001 ทิ้งไปได้เลยครับ Proxy จะจัดการให้เอง
      const API_URL = "/ideatrade-9548f/us-central1/requestOTP"; 
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // จัดการเรื่อง Remember Me
        if (remember) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        // ดึง Modal OTP ขึ้นมาแสดง
        setOpenOtp(true); 
      } else {
        alert("ไม่สามารถส่งอีเมลได้: " + (data.error || "ไม่ทราบสาเหตุ"));
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      alert("⚠️ ติดต่อ Server ไม่ได้: กรุณาตรวจสอบว่ารัน Firebase Emulator อยู่หรือไม่");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-700 px-4">
      {/* Card */}
      <div className="
        w-full
        max-w-sm
        sm:max-w-md
        md:max-w-2xl
        lg:max-w-6xl
        mx-auto
        rounded-2xl lg:rounded-[3rem]
        overflow-hidden
        bg-gradient-to-br from-slate-900 to-slate-800
        shadow-2xl
      ">

        {/* Top content */}
        <div className="
          grid
          grid-cols-1
          lg:grid-cols-2
          px-6 sm:px-8 md:px-12 lg:px-16
          py-8 sm:py-10 md:py-12 lg:py-14
          gap-8 md:gap-10 lg:gap-16
        ">

          {/* LEFT */}
          <div className="flex flex-col items-center justify-center text-center h-full">

            {/* Welcome to → แสดงเฉพาะ desktop */}
            <h2 className="hidden lg:block text-4xl font-semibold text-blue-400 mb-6">
              Welcome to
            </h2>

            {/* Logo */}
            <img
              src={logo}
              alt="Idea Trade"
              className="w-40 sm:w-52 md:w-64 lg:w-72 mb-4 md:mb-6"
            />

            {/* Special Features */}
            <p className="
                text-blue-400 font-semibold
                hidden sm:block
                text-lg md:text-2xl
            ">
              Special Features for our customers
            </p>

          </div>

          {/* RIGHT */}
          <div className="flex flex-col justify-center gap-5 text-white">
            {/* Email Input */}
            <div className="relative w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  peer w-full bg-transparent
                  border border-blue-300/40
                  rounded-md px-4 py-3 text-white
                  focus:border-blue-500 outline-none
                "
              />
              <label
                className={`
                  absolute left-4
                  px-2 py-0.5 rounded-full
                  text-sm transition-all duration-200
                  ${
                    email
                      ? "-top-3 text-xs text-sky-400 bg-slate-800"
                      : "top-3 text-sm text-blue-300 bg-transparent"
                  }
                  peer-focus:-top-3
                  peer-focus:text-xs
                  peer-focus:text-sky-400
                  peer-focus:bg-slate-800
                `}
              >
                EMAIL
              </label>
            </div>

            {/* 🔴 ตัวอย่างช่องใส่รหัสผ่าน (ถ้ามี)
            <div className="relative w-full">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  peer w-full bg-transparent
                  border border-blue-300/40
                  rounded-md px-4 py-3 text-white
                  focus:border-blue-500 outline-none
                "
              />
              <label
                className={`
                  absolute left-4
                  px-2 py-0.5 rounded-full
                  text-sm transition-all duration-200
                  ${
                    password
                      ? "-top-3 text-xs text-sky-400 bg-slate-800"
                      : "top-3 text-sm text-blue-300 bg-transparent"
                  }
                  peer-focus:-top-3
                  peer-focus:text-xs
                  peer-focus:text-sky-400
                  peer-focus:bg-slate-800
                `}
              >
                PASSWORD
              </label>
            </div>
             */}

            {/* Options */}
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            {/* Sign in Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className={`mt-2 py-3 rounded-lg text-lg font-semibold transition-all ${
                isLoading ? "bg-slate-600 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-500"
              }`}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-sm text-center text-gray-400">
              Don&apos;t have an account?{" "}
              <span
                onClick={() => navigate("/register")}
                className="text-white cursor-pointer hover:underline"
              >
                Sign up here
              </span>
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="
          bg-slate-700/50
          px-6 md:px-12 lg:px-16
          py-6 md:py-8
          flex flex-col
          md:flex-col
          lg:flex-row
          gap-4 md:gap-6
          justify-between
        ">

          <button
            onClick={() => setFreeAccess()}
            className="
              flex-1
              py-4 md:py-5
              rounded-xl md:rounded-2xl
              bg-emerald-400 hover:bg-emerald-500
              active:scale-95
              transition-all duration-200
              text-lg md:text-xl
              font-semibold
              flex items-center justify-center gap-3
              shadow-lg hover:shadow-emerald-400/40
            "
          >
            <img src={Rocket} alt="rocket" className="w-5 h-5 md:w-6 md:h-6" />
            TRY FREE VERSION
          </button>

          <button
            onClick={setMembership}
            className="
              flex-1
              py-4 md:py-5
              rounded-xl md:rounded-2xl
              bg-sky-600 hover:bg-sky-700
              active:scale-95
              transition-all duration-200
              text-lg md:text-xl
              font-semibold
              flex items-center justify-center gap-3
              shadow-lg hover:shadow-sky-500/40
            "
          >
            <img src={Crown} alt="crown" className="w-5 h-5 md:w-6 md:h-6" />
            JOIN MEMBERSHIP
          </button>

        </div>
      </div>

      {/* OTP Modal */}
      <OtpModal
        open={openOtp}
        email={email}
        onClose={() => setOpenOtp(false)}
        onSuccess={() => {
          setOpenOtp(false);
          setFreeAccess(email); 
        }}
      />

      {/* ================= POPUP ERRORS ================= */}
      {openForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenForgot(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-slate-800 text-white p-6 shadow-xl">
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
            <div className="flex justify-end">
              <button
                onClick={() => setOpenForgot(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}