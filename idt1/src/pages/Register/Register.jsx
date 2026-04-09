import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Rocket from "./rocket"; 

// ✅ Import getDoc เพิ่มเข้ามา เพื่อใช้เช็คข้อมูลซ้ำ
import { db } from "@/firebase"; 
import { doc, setDoc, getDoc } from "firebase/firestore"; 

const ErrorPopup = () => (
  <div className="absolute left-0 -bottom-9 z-20 w-full flex items-center gap-2 bg-white text-gray-800 text-sm px-3 py-2 border border-orange-400 shadow-sm">
    <span className="bg-orange-500 text-white w-4 h-4 flex items-center justify-center text-xs font-bold">!</span>
    Please fill out this field.
  </div>
);

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agree: false,
  });

  const [errorField, setErrorField] = useState("");
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorField("");
    if (name === "agree") setShowPrivacyPopup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim()) return setErrorField("firstName");
    if (!formData.lastName.trim()) return setErrorField("lastName");
    if (!formData.email.trim()) return setErrorField("email");
    if (!formData.phone.trim()) return setErrorField("phone");

    if (!formData.agree) {
      setShowPrivacyPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const emailKey = formData.email.trim().toLowerCase();
      const docRef = doc(db, "users", emailKey);
      
      // 🟢 1. เช็คก่อนว่าอีเมลนี้ เคยลงทะเบียนไว้ใน Database หรือยัง?
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        alert("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือไปที่หน้าล็อกอินครับ");
        setIsSubmitting(false);
        return; // หยุดการทำงาน ไม่บันทึกทับของเดิม
      }

      // 🟢 2. ถ้ายืนยันว่าเป็นอีเมลใหม่ ให้บันทึกข้อมูล พร้อมโครงสร้างเริ่มต้น
      await setDoc(docRef, {
        email: emailKey,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        registeredAt: new Date(),
        role: "member",
        mySubscriptions: [],        
        subscriptions: {},          
        unlockedItems: []           
      });

      // 🟢 3. ยิง API ไปที่ Backend 
      try {
        const response = await fetch('/api/register', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const textData = await response.text(); 
        if (textData) {
          const data = JSON.parse(textData);
          if(!response.ok) console.warn("Backend แจ้งเตือน:", data.message);
        }
      } catch (apiErr) {
        console.log("บันทึกข้อมูลลง Firebase สำเร็จ");
      }

      // 🟢 4. เสร็จสิ้น เด้งไปหน้า Welcome
      alert("บันทึกข้อมูลเรียบร้อย! กรุณายืนยันตัวตนด้วย OTP"); 
      localStorage.setItem("rememberedEmail", emailKey); 
      navigate("/"); 

    } catch (error) {
      console.error("Error Registration:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firebase");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="w-full max-w-5xl bg-slate-800 rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 md:p-10 lg:p-12">
          <h2 className="text-3xl font-bold text-blue-500 mb-8 text-center">Registration</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full">
                <input 
                  type="text" 
                  name="firstName" 
                  placeholder="Enter your first name" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg outline-none focus:border-blue-400 transition-colors ${errorField === "firstName" ? "border-orange-400" : "border-slate-600"}`} 
                />
                {errorField === "firstName" && <ErrorPopup />}
              </div>
              <div className="relative w-full">
                <input 
                  type="text" 
                  name="lastName" 
                  placeholder="Enter your last name" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg outline-none focus:border-blue-400 transition-colors ${errorField === "lastName" ? "border-orange-400" : "border-slate-600"}`} 
                />
                {errorField === "lastName" && <ErrorPopup />}
              </div>
            </div>

            <div className="relative">
              <input 
                type="email" 
                name="email" 
                placeholder="Enter your email" 
                value={formData.email} 
                onChange={handleChange} 
                className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg outline-none focus:border-blue-400 transition-colors ${errorField === "email" ? "border-orange-400" : "border-slate-600"}`} 
              />
              {errorField === "email" && <ErrorPopup />}
            </div>

            <div className="relative">
              <input 
                type="tel" 
                name="phone" 
                placeholder="Enter your phone number" 
                value={formData.phone} 
                onChange={handleChange} 
                className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg outline-none focus:border-blue-400 transition-colors ${errorField === "phone" ? "border-orange-400" : "border-slate-600"}`} 
              />
              {errorField === "phone" && <ErrorPopup />}
            </div>

            <div className="relative flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                name="agree" 
                checked={formData.agree} 
                onChange={handleChange} 
                className="w-4 h-4 cursor-pointer accent-blue-500" 
              />
              <span className="text-sm text-gray-400">
                I accept all <span className="underline hover:text-white cursor-pointer transition-colors">Terms Service and Privacy Policy</span> <span className="text-red-500">*</span>
              </span>
              {showPrivacyPopup && (
                <div className="absolute left-0 -bottom-10 w-full bg-white border border-orange-400 text-gray-800 text-sm px-3 py-2 shadow-sm z-20">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500 text-white w-4 h-4 flex items-center justify-center text-xs font-bold">!</span> 
                    Please accept the Terms of Service.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 mt-2">
              <button 
                type="button" 
                onClick={() => navigate("/")} 
                className="py-3 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 font-semibold transition-colors shadow-md"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`py-3 rounded-lg text-white font-semibold transition-all shadow-md ${isSubmitting ? 'bg-sky-400/70 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 hover:shadow-sky-500/30'}`}
              >
                {isSubmitting ? 'Creating...' : 'Create an account'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full min-h-[300px] h-80 sm:h-96 lg:w-1/2 lg:h-auto relative flex items-end justify-center pt-0 scale-100 bg-[#0d1624]">
           <Rocket />
        </div>
        
      </div>
    </div>
  );
}