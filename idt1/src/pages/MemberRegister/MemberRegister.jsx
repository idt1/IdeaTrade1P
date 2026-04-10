// src/pages/MemberRegister/MemberRegister.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ✅ นำเข้า doc, getDoc, setDoc, Timestamp
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "/src/firebase";

import KbankIcon from "@/assets/icons/Kbank.png";
import CloseIcon from "@/assets/icons/Close_Circle.png";
import CopyIcon from "@/assets/icons/copy.png";
import PromptPayQR from "@/assets/icons/Promptpay.png";
import TickIcon from "@/assets/icons/tick-01.png";
import CancelIcon from "@/assets/icons/cancel-01.png";
import VisaIcon from "@/assets/icons/Visa.png";
import MastercardIcon from "@/assets/icons/Mastercard.png";
import BankGray from "@/assets/icons/blbanktrasfer.png";
import BankBlue from "@/assets/icons/bbanktransfer.png";
import CardGray from "@/assets/icons/blcredit-card.png";
import CardBlue from "@/assets/icons/bcredit-card.png";
import QrGray from "@/assets/icons/blqr.png";
import QrBlue from "@/assets/icons/bqr.png";
import EditIcon from "@/assets/icons/edit.svg";
import CancleEdit from "@/assets/icons/cancleedit.svg";

// รายละเอียดเครื่องมือและราคา
const TOOLS = [
  { id: "fortune", name: "หมอดูหุ้น", monthly: 2500, yearly: 25000 },
  { id: "petroleum", name: "Petroleum", monthly: 2500, yearly: 25000 },
  { id: "rubber", name: "Rubber Thai", monthly: 2500, yearly: 25000 },
  { id: "flow", name: "Flow Intraday", monthly: 2500, yearly: 25000 },
  { id: "s50", name: "S50", monthly: 2500, yearly: 25000 },
  { id: "gold", name: "Gold", monthly: 2500, yearly: 25000 },
  { id: "bidask", name: "BidAsk", monthly: 2500, yearly: 25000 },
  { id: "tickmatch", name: "TickMatch", monthly: 2500, yearly: 25000 },
  { id: "dr", name: "DR", monthly: 2500, yearly: 25000 },
];

const paymentMethods = [
  { id: "bank", label: "Bank Transfer", icon: BankBlue, activeIcon: BankGray },
  { id: "promptpay", label: "PromptPay", icon: QrBlue, activeIcon: QrGray },
];

export default function MemberRegister() {
  const navigate = useNavigate();
  const location = useLocation();

  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("idle");

  const [cardType, setCardType] = useState("visa");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");

  const [slipImage, setSlipImage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditSummary, setIsEditSummary] = useState(false);

  // ✅ 2. State สำหรับเก็บข้อมูล Subscription แบบละเอียด (วันหมดอายุ + รอบบิล)
  const [activeSubs, setActiveSubs] = useState({});

  // ✅ 3. ฟังก์ชันจัดรูปแบบข้อมูลให้อ่านง่าย
  const processSubs = (mySubs = [], expirations = {}) => {
    const result = {};
    mySubs.forEach((sub) => {
      const exp = expirations[sub.id];
      if (exp) {
        result[sub.id] = {
          cycle: sub.cycle ? sub.cycle.toLowerCase() : "monthly",
          // รองรับทั้ง Firestore Timestamp และ ISO String จาก LocalStorage
          expireDate: exp.toDate ? exp.toDate() : new Date(exp),
        };
      }
    });
    return result;
  };

  // ✅ 4. ดึงข้อมูล User ตอนเปิดหน้า (อัปเดตให้ดึงจากไฟล์ชื่อ อีเมล)
  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      setTimeout(async () => {
        const currentUser = auth.currentUser;
        const storedEmail = localStorage.getItem("rememberedEmail");
        const emailKey = (currentUser?.email || storedEmail)?.toLowerCase();

        let parsedSubs = {};

        if (emailKey) {
          try {
            // 🟢 ดึงข้อมูลจากไฟล์อีเมล แทน UID
            const userRef = doc(db, "users", emailKey);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              parsedSubs = processSubs(userData.mySubscriptions, userData.subscriptions);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        } else {
          // Fallback สำหรับ LocalStorage
          const storedProfile = localStorage.getItem("userProfile");
          if (storedProfile) {
            const userData = JSON.parse(storedProfile);
            parsedSubs = processSubs(userData.mySubscriptions, userData.subscriptions);
          }
        }
        
        setActiveSubs(parsedSubs);
      }, 500);
    };

    fetchUserSubscriptions();
  }, []);

  // ✅ 5. ฟังก์ชันเช็คสถานะ ให้กดซื้อเพิ่มได้ตลอด (ปลดล็อค)
  const getToolStatus = (toolId, currentBillingCycle) => {
    const sub = activeSubs[toolId];
    if (!sub) return { isLocked: false, text: null };

    const { cycle, expireDate } = sub;
    const now = new Date();
    const daysRemaining = (expireDate - now) / (1000 * 60 * 60 * 24);

    // 5.1 ถ้าหมดอายุแล้ว
    if (daysRemaining < 0) {
      return { isLocked: false, text: "Expired" };
    }

    // 5.2 ถ้าใกล้หมดอายุ (<= 7 วัน)
    if (daysRemaining <= 7) {
      return { isLocked: false, text: "Renew" };
    }

    // 5.3 ถ้ายังมีอายุเหลือเยอะ
    if (cycle === "monthly" && currentBillingCycle === "yearly") {
      // เดิมเป็นรายเดือน ตอนนี้อยู่หน้าแท็บรายปี -> ให้อัปเกรด
      return { isLocked: false, text: "Upgrade" }; 
    }

    // กรณีอื่นๆ (รายปีซื้อเดือนเพิ่ม, รายเดือนซื้อเดือนเพิ่ม, รายปีซื้อปีเพิ่ม) -> ปลดล็อคให้ซื้อทบเวลาได้
    return { isLocked: false, text: "Extend" };
  };

  useEffect(() => {
    if (location.state && location.state.preselectedTool) {
      const toolNameFromPopup = location.state.preselectedTool;
      
      const matchedTool = TOOLS.find(
        (t) => t.name.toLowerCase() === toolNameFromPopup.toLowerCase() || 
               t.id.toLowerCase() === toolNameFromPopup.toLowerCase()
      );

      // ✅ 6. เช็คก่อน preselect ว่าล็อคอยู่หรือไม่ (ตอนนี้ปลดล็อคหมดแล้ว ก็จะเข้าเงื่อนไขตลอด)
      if (matchedTool) {
        const { isLocked } = getToolStatus(matchedTool.id, "monthly");
        if (!isLocked) {
          setSelectedTools([{ id: matchedTool.id, billing: "monthly" }]);
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location.state, activeSubs]);

  const closeModal = () => {
    setShowModal(false);
    setStatus("idle");
    setSlipImage(null);
  };

  const toggleTool = (id) => {
    setSelectedTools((prev) => {
      const exists = prev.find(
        (t) => t.id === id && t.billing === billingCycle
      );

      if (exists) {
        return prev.filter(
          (t) => !(t.id === id && t.billing === billingCycle)
        );
      }
      return [...prev, { id, billing: billingCycle }];
    });
  };

  const removeTool = (id, billing) => {
    setSelectedTools(prev =>
      prev.filter(t => !(t.id === id && t.billing === billing))
    );
  };

  const handleCopyAccount = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleUploadSlip = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSlipImage(URL.createObjectURL(file));
  };

  const totalPrice = selectedTools.reduce((sum, t) => {
    const tool = TOOLS.find(x => x.id === t.id);
    if (!tool) return sum;
    return sum + (t.billing === "monthly" ? tool.monthly : tool.yearly);
  }, 0);

  useEffect(() => {
    if (selectedPayment === "promptpay" && status === "success") {
      const timer = setTimeout(() => {
        handleConfirmPayment();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, selectedPayment]);

  /* ================= 🔥 HANDLE PAYMENT 🔥 ================= */
  const handleConfirmPayment = async () => {
    try {
      const currentUser = auth.currentUser;
      const storedEmail = localStorage.getItem("rememberedEmail");
      const emailKey = (currentUser?.email || storedEmail)?.toLowerCase();

      const newSubscriptions = selectedTools.map((t) => {
        const toolInfo = TOOLS.find((x) => x.id === t.id);
        const isYearly = t.billing === "yearly";
        const price = isYearly ? toolInfo.yearly : toolInfo.monthly;
        
        let methodLabel = "Credit Card";
        if (selectedPayment === "bank") methodLabel = "Bank Transfer";
        if (selectedPayment === "promptpay") methodLabel = "PromptPay";

        return {
          id: t.id,
          name: toolInfo.name,
          cycle: isYearly ? "Yearly" : "Monthly",
          price: `${price.toLocaleString()} THB`,
          purchaseDate: new Date().toISOString(),
          status: "active",
          paymentMethod: methodLabel
        };
      });

      const newToolIds = selectedTools.map((t) => t.id);

      if (emailKey) {
        // 🟢 บันทึกข้อมูลแพ็กเกจลงในไฟล์ชื่อ "อีเมล" ด้วยคำสั่ง merge: true
        const userRef = doc(db, "users", emailKey);
        const userSnap = await getDoc(userRef);
        
        let oldUnlockedItems = [];
        let oldSubscriptions = [];
        let currentSubExpirations = {};

        if (userSnap.exists()) {
          const userData = userSnap.data();
          oldUnlockedItems = userData.unlockedItems || [];
          oldSubscriptions = userData.mySubscriptions || [];
          currentSubExpirations = userData.subscriptions || {};
        }

        const updatedSubscriptions = [
          ...oldSubscriptions.filter(old => !newSubscriptions.find(newSub => newSub.id === old.id)),
          ...newSubscriptions
        ];
        const mergedUnlockedItems = [...new Set([...oldUnlockedItems, ...newToolIds])];

        const newExpirations = { ...currentSubExpirations };
        
        selectedTools.forEach((t) => {
          const isYearly = t.billing === "yearly";
          let expireDate = new Date();
          
          const existingTimestamp = currentSubExpirations[t.id];
          if (existingTimestamp && typeof existingTimestamp.toDate === "function" && existingTimestamp.toDate() > new Date()) {
            expireDate = existingTimestamp.toDate();
          }

          if (isYearly) {
            expireDate.setFullYear(expireDate.getFullYear() + 1);
          } else {
            expireDate.setMonth(expireDate.getMonth() + 1);
          }

          newExpirations[t.id] = Timestamp.fromDate(expireDate);
        });

        // 🟢 merge: true จะช่วยรักษาข้อมูลชื่อ เบอร์โทร ให้คงอยู่ ไม่หายแน่นอน
        await setDoc(userRef, {
          role: "membership",
          unlockedItems: mergedUnlockedItems,
          mySubscriptions: updatedSubscriptions,
          subscriptions: newExpirations 
        }, { merge: true });

      } else {
        // Fallback กรณีไม่มีอีเมล (LocalStorage)
        const storedProfile = localStorage.getItem("userProfile");
        let parsedProfile = storedProfile ? JSON.parse(storedProfile) : { role: "free", unlockedItems: [], mySubscriptions: [], subscriptions: {} };
        
        const oldSubscriptions = parsedProfile.mySubscriptions || [];
        const oldUnlockedItems = parsedProfile.unlockedItems || [];
        const currentSubExpirations = parsedProfile.subscriptions || {};

        const updatedSubscriptions = [
          ...oldSubscriptions.filter(old => !newSubscriptions.find(newSub => newSub.id === old.id)),
          ...newSubscriptions
        ];
        const mergedUnlockedItems = [...new Set([...oldUnlockedItems, ...newToolIds])];

        const updatedExpirations = { ...currentSubExpirations };
        selectedTools.forEach((t) => {
          const isYearly = t.billing === "yearly";
          let expireDate = new Date();
          
          if (currentSubExpirations[t.id] && new Date(currentSubExpirations[t.id]) > new Date()) {
            expireDate = new Date(currentSubExpirations[t.id]);
          }

          if (isYearly) {
            expireDate.setFullYear(expireDate.getFullYear() + 1);
          } else {
            expireDate.setMonth(expireDate.getMonth() + 1);
          }

          updatedExpirations[t.id] = expireDate.toISOString(); 
        });

        const updatedProfile = {
          ...parsedProfile, 
          role: "membership", 
          unlockedItems: mergedUnlockedItems, 
          mySubscriptions: updatedSubscriptions,
          subscriptions: updatedExpirations
        };

        localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        window.dispatchEvent(new Event("storage"));
      }

      alert("Payment Successful 🎉");
      setShowModal(false);
      navigate("/dashboard", { state: { goTo: "subscription" } });

    } catch (error) {
      console.error("Payment Error:", error);
      alert("เกิดข้อผิดพลาดในการทำรายการ: " + error.message);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const years = Array.from({ length: 10 }, (_, i) =>
    new Date().getFullYear() + i
  );

  const hasMonthly = selectedTools.some(t => t.billing === "monthly");
  const hasYearly = selectedTools.some(t => t.billing === "yearly");
  const monthlyCount = selectedTools.filter(t => t.billing === "monthly").length;
  const yearlyCount = selectedTools.filter(t => t.billing === "yearly").length;
  const isSingleBilling = hasMonthly ^ hasYearly; 

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1224] to-[#060B18] text-white flex items-center justify-center">
      <div className="w-full max-w-[1200px] px-4 sm:px-6 md:px-8 mx-auto py-6 md:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-x-10">

        {/* LEFT */}
        <div className="xl:col-span-7 space-y-5 md:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-4xl font-bold text-center xl:text-left">Subscription & Checkout</h1>
          <p className="text-sm sm:text-base text-[#9FB3C8] text-center xl:text-left">Charged annually, Cancel anytime</p> 

          {/* Billing */}
          <div>
            {/* Billing Cycle */}
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Billing Cycle</h2>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 whitespace-nowrap">
              Only 2,083฿/m (Billed Yearly)
            </span>
          </div>
            <div className="flex bg-[#0F1B2D] rounded-xl p-1 w-full">
              {["monthly", "yearly"].map((t) => (
                <button
                  key={t}
                  onClick={() => setBillingCycle(t)}
                  className={`flex-1 py-2 rounded-lg ${
                    billingCycle === t
                      ? "bg-[#0E6BA8]"
                      : "text-[#9FB3C8]"
                  }`}
                >
                  {t === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="bg-[#0F1B2D] p-5 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Select Your Tools</h2>
            
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold">Select Your Tools</h2>

              {/* 🟢 ปุ่ม Select All ของเพื่อนคุณ อยู่ตรงนี้ครับ! */}
              {(() => {
                const selectableTools = TOOLS.filter(
                  (tool) => !getToolStatus(tool.id, billingCycle).isLocked
                );

                const allSelected =
                  selectableTools.length > 0 &&
                  selectableTools.every((tool) =>
                    selectedTools.some(
                      (t) => t.id === tool.id && t.billing === billingCycle
                    )
                  );

                const handleSelectAll = () => {
                  if (allSelected) {
                    // Deselect เฉพาะ cycle ปัจจุบัน
                    setSelectedTools((prev) =>
                      prev.filter((t) => t.billing !== billingCycle)
                    );
                  } else {
                    // Select all ของ cycle ปัจจุบัน (คงของอีก cycle ไว้)
                    setSelectedTools((prev) => {
                      const others = prev.filter((t) => t.billing !== billingCycle);
                      const current = selectableTools.map((tool) => ({
                        id: tool.id,
                        billing: billingCycle,
                      }));
                      return [...others, ...current];
                    });
                  }
                };

                return (
                  <button
                    onClick={handleSelectAll}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition whitespace-nowrap
                      ${
                        allSelected
                          ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                          : "border-[#0E6BA8] text-[#0EA5E9] hover:bg-[#0E6BA8]/20"
                      }`}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {TOOLS.map((tool) => {
                const { isLocked, text } = getToolStatus(tool.id, billingCycle);
                
                const active = selectedTools.some(
                  (t) => t.id === tool.id && t.billing === billingCycle
                );
                
                return (
                  <div
                    key={tool.id}
                    onClick={() => {
                      if (!isLocked) toggleTool(tool.id);
                    }}
                    className={`px-4 md:px-5 py-4 rounded-xl border flex items-center gap-2 min-h-[72px] transition-all
                    ${
                      isLocked
                        ? "border-[#1F3354] bg-[#0A1224] opacity-50 cursor-not-allowed" 
                        : active
                        ? "border-[#0E6BA8] bg-[#102B46] cursor-pointer"
                        : "border-[#1F3354] bg-[#13233A] cursor-pointer hover:border-[#0E6BA8]/50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={isLocked ? "line-through text-[#9FB3C8]" : "text-white"}>
                        {tool.name}
                      </span>
                      {!isLocked && text && (
                        <span className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-sm w-fit font-medium
                          ${text === "Renew" ? "bg-amber-500/20 text-amber-400" : ""}
                          ${text === "Expired" ? "bg-red-500/20 text-red-400" : ""}
                          ${text === "Upgrade" ? "bg-blue-500/20 text-blue-400" : ""}
                          ${text === "Extend" ? "bg-emerald-500/20 text-emerald-400" : ""}
                        `}>
                          {text}
                        </span>
                      )}
                    </div>

                    <div className="ml-auto text-sm">
                      {isLocked ? (
                        <span className="text-emerald-400 font-medium">Owned</span>
                      ) : (
                        <span className="text-[#9FB3C8]">
                          {billingCycle === "monthly"
                            ? `${tool.monthly}฿/m`
                            : `${tool.yearly}฿/y`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="xl:col-span-5 space-y-4">

          {/* Payment Method */}
          <div className="bg-[#0F1B2D] p-5 rounded-xl">
            <h2 className="text-xl font-semibold mb-3">Payment Method</h2>

            <div className="grid grid-cols-2 gap-3 justify-center">
              {paymentMethods.map((m) => {
                const active = selectedPayment === m.id;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPayment(m.id)}
                    className={`
                    h-20 sm:h-24 rounded-xl border flex flex-col items-center justify-center gap-1
                    transition-all duration-200
                    ${
                      active
                        ? "bg-[#0B2A4E] border-[#0E6BA8]"
                        : "bg-[#E5E7EB] border-transparent"
                    }
                  `}
                  >
                    <img
                      src={active ? m.activeIcon : m.icon}
                      alt={m.label}
                      className="w-12 h-12"
                    />
                    <span
                      className={`text-xs font-medium ${
                        active ? "text-white" : "text-black"
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#0F1B2D] p-4 md:p-6 rounded-xl max-h-none xl:max-h-[520px] flex flex-col">
            {/* Order Summary Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Order Summary</h2>
              <button
                onClick={() => setIsEditSummary(prev => !prev)}
                className="group relative flex items-center justify-center w-9 h-9
                          rounded-full hover:bg-white/10 transition"
              >
                {/* EDIT */}
                {!isEditSummary && (
                  <img
                    src={EditIcon}
                    alt="edit"
                    className="w-5 h-5 opacity-80 group-hover:opacity-100 transition"
                  />
                )}

                {/* CONFIRM ICON */}
                {isEditSummary && (
                  <>
                  {/* default confirm */}
                    <img
                      src={CancleEdit}
                      alt="confirm"
                      className="w-5 h-5 opacity-100 group-hover:opacity-0 transition"
                    />

                    {/* hover → blconfirm */}
                      <img
                        src={CancleEdit}
                        alt="confirm hover"
                        className="absolute w-5 h-5 opacity-0 group-hover:opacity-100 transition"
                      />
                  </>
                )}

                {/* ===== TOOLTIP ===== */}
                <div
                  className="absolute -top-10 left-1/2 -translate-x-1/2
                            whitespace-nowrap px-3 py-1 rounded-md text-xs
                            bg-[#1F3354] text-white
                            opacity-0 group-hover:opacity-100
                            pointer-events-none transition"
                >
                  {isEditSummary ? "Cancel Edit" : "Edit"}
                </div>
              </button>
            </div>

            {/* MONTHLY */}
            {hasMonthly && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#9FB3C8]">Monthly</p>
                <p className="text-sm font-semibold text-[#9FB3C8]">
                  {monthlyCount} Tools
                </p>
              </div>

              <div
                className={`
                  overflow-y-auto pr-2 space-y-2 custom-scrollbar
                  ${isSingleBilling ? "max-h-[150px]" : "max-h-[60px]"}
                `}
              >
                {selectedTools
                  .filter(t => t.billing === "monthly")
                  .map((t) => {
                    const tool = TOOLS.find(x => x.id === t.id);
                    return (
                      <div
                        key={`${t.id}-m`}
                        className="flex items-center justify-between text-sm text-white"
                      >
                        <span className="flex items-center gap-2">
                          {tool.name}
                        </span>

                        <div className="flex items-center gap-3">
                          <span>{tool.monthly.toLocaleString()} ฿</span>

                          {isEditSummary && (
                            <button
                              onClick={() => removeTool(t.id, "monthly")}
                              className="w-5 h-5 flex items-center justify-center
                                         border border-red-500 text-red-500
                                         rounded-full hover:bg-red-500 hover:text-white transition"
                            >
                              −
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {hasMonthly && hasYearly && (
            <div className="border-t border-[#1F3354] my-4" />
          )}
          
            {/* YEARLY */}
            {hasYearly && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#9FB3C8]">Yearly</p>
                <p className="text-sm font-semibold text-[#9FB3C8]">
                  {yearlyCount} Tools
                </p>
              </div>

              <div
                className={`
                  overflow-y-auto pr-2 space-y-2 custom-scrollbar
                  ${isSingleBilling ? "max-h-[150px]" : "max-h-[60px]"}
                `}
              >
                {selectedTools
                  .filter(t => t.billing === "yearly")
                  .map((t) => {
                    const tool = TOOLS.find(x => x.id === t.id);
                    return (
                      <div
                        key={`${t.id}-y`}
                        className="flex items-center justify-between text-sm text-white"
                      >
                        <span className="flex items-center gap-2">
                          {tool.name}
                        </span>

                        <div className="flex items-center gap-3">
                          <span>{tool.yearly.toLocaleString()} ฿</span>

                          {isEditSummary && (
                            <button
                              onClick={() => removeTool(t.id, "yearly")}
                              className="w-5 h-5 flex items-center justify-center
                                         border border-red-500 text-red-500
                                         rounded-full hover:bg-red-500 hover:text-white transition"
                            >
                              −
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

            <div className="border-t border-[#1F3354] my-4" />

            {/* TOTAL AMOUNT */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-[#9FB3C8] mb-2">
                TOTAL AMOUNT
              </p>

              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-[#0EA5E9]">
                  {totalPrice.toLocaleString()}฿
                </span>

                <div className="text-xs text-[#9FB3C8] text-right leading-tight">
                  <p>Charged annually</p>
                  <p>Cancel anytime</p>
                </div>
              </div>
            </div>

            {/* ACTION */}
            <button
              disabled={!selectedPayment || selectedTools.length === 0}
              onClick={() => setShowModal(true)}
              className="w-full h-12 rounded-lg bg-[#0EA5E9] text-black font-semibold disabled:bg-[#1F3354] disabled:text-[#9FB3C8]"
            >
              Complete Purchase
            </button>

            {/* Cancel */}
            <button
              onClick={() => {
                setSelectedTools([]);
                setSelectedPayment(null);
                navigate(-1);
              }}
              className="mt-3 w-full text-sm text-[#9FB3C8] hover:text-white transition"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0F1B2D] p-4 sm:p-6 rounded-xl w-[calc(100vw-32px)] max-w-[420px] space-y-4 max-h-[90vh] overflow-y-auto">

            {/* ================= BANK ACCOUNT ================= */}
            {selectedPayment === "bank" && (
              <div className="relative bg-[#0B1629] rounded-2xl p-5 space-y-4">

                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3"
                >
                  <img src={CloseIcon} alt="close" className="w-6 h-6" />
                </button>

                <p className="text-sm text-[#9FB3C8] font-medium">
                  Bank Account Detail
                </p>

                <div className="flex items-center gap-4 bg-[#2A2A2A] rounded-2xl p-4">
                  <img src={KbankIcon} alt="kbank" className="w-12 h-12" />

                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      Kbank <span className="text-[#9FB3C8]">(Kasikorn Bank)</span>
                    </p>
                    <p className="text-sm text-[#E5E7EB]">
                      Mr.Chalearmpol Neamsri
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[#9FB3C8]">
                        047-2-27169-7
                      </span>
                      <button onClick={() => handleCopyAccount("047-2-27169-7")}>
                        <img src={CopyIcon} alt="copy" className="w-4 h-4" />
                      </button>
                      {copied && (
                        <span className="text-xs text-green-400 ml-2">
                          Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label className="w-full h-12 rounded-xl bg-[#E5E7EB] text-black font-semibold flex items-center justify-center cursor-pointer">
                  Upload Slip
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleUploadSlip}
                  />
                </label>

                {slipImage && (
                  <div className="bg-[#13233A] rounded-xl p-3">
                    <p className="text-xs text-[#9FB3C8] mb-2">Uploaded Slip</p>

                    {/* Image Frame */}
                    <div className="w-full h-[220px] rounded-lg overflow-hidden bg-black/20 flex items-center justify-center">
                      <img
                        src={slipImage}
                        alt="slip"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                 {/* ACTION */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-11 bg-[#1F3354] rounded"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmPayment}
                    disabled={!slipImage}
                    className={`flex-1 h-11 rounded font-semibold transition
                      ${
                        slipImage
                          ? "bg-[#0E6BA8] text-black"
                          : "bg-[#3A3A3A] text-[#9CA3AF] cursor-not-allowed"
                      }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* ================= PROMPTPAY ================= */}
            {selectedPayment === "promptpay" && status === "idle" && (
              <div className="relative bg-gradient-to-b from-[#0A2442] to-[#071C34] rounded-2xl p-6 flex flex-col items-center text-white">

                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3"
                >
                  <img src={CloseIcon} alt="close" className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-semibold mb-6">
                  Scan QR Code
                </h2>

                {/* QR Frame */}
                <div className="relative w-full max-w-[260px] aspect-square bg-white rounded-xl flex items-center justify-center mb-6">
                  <img
                    src={PromptPayQR}
                    alt="promptpay"
                    className="w-[85%] h-[85%] object-contain"
                  />

                  {/* Corner */}
                  <span className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-white" />
                  <span className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-white" />
                  <span className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-white" />
                  <span className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-white" />
                </div>

                {/* Info */}
                <div className="text-center text-sm space-y-1">
                  <p className="font-semibold">Kbank (Kasikorn Bank)</p>
                  <p>Mr.Chalearmpol Neamsri</p>
                  <p className="opacity-70">xxx-x-x7169-x</p>
                  <p className="opacity-70">0000000000000</p>
                </div>

                {/* Demo */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStatus("success")}
                    className="px-4 py-2 rounded bg-[#0E6BA8]"
                  >
                    Simulate Success
                  </button>
                  <button
                    onClick={() => setStatus("failed")}
                    className="px-4 py-2 rounded bg-[#7A1C1C]"
                  >
                    Simulate Failed
                  </button>
                </div>

              </div>
            )}

            {/* SUCCESS */}
            {selectedPayment === "promptpay" && status === "success" && (
              <div className="relative bg-[#071C34] rounded-2xl p-10 flex flex-col items-center gap-6">

                {/* Close */}
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3"
                >
                  <img src={CloseIcon} alt="close" className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-semibold">
                  Payment received
                </h2>

                <img
                  src={TickIcon}
                  alt="success"
                  className="w-32 h-32"
                />
              </div>
            )}

            {/* FAILED */}
            {selectedPayment === "promptpay" && status === "failed" && (
              <div className="relative bg-[#071C34] rounded-2xl p-10 flex flex-col items-center gap-6">

                {/* Close */}
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3"
                >
                  <img src={CloseIcon} alt="close" className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-semibold">
                  Payment denied
                </h2>

                <img
                  src={CancelIcon}
                  alt="failed"
                  className="w-32 h-32"
                />
              </div>
            )}


            {/* ================= Credit / Debit Card ================= */}
            {selectedPayment === "card" && (
              <div className="relative bg-[#0B1629] rounded-2xl p-5 space-y-4">
                
                {/* Close Button */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 z-10"
                >
                  <img src={CloseIcon} alt="close" className="w-6 h-6" />
                </button>

                {/* Header: Card Type Selection */}
                <div className="bg-[#2A2A2A] rounded-xl p-4 mb-2">
                  <p className="text-white font-semibold mb-3">Credit Card Detail</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setCardType("mastercard")}
                      className={`h-10 w-14 flex items-center justify-center rounded transition-all ${cardType === 'mastercard' ? 'bg-white ring-2 ring-[#0E6BA8]' : 'bg-white/50 opacity-50'}`}
                    >
                        <img src={MastercardIcon} alt="mastercard" className="h-6 object-contain" />
                    </button>
                    <button 
                      onClick={() => setCardType("visa")}
                      className={`h-10 w-14 flex items-center justify-center rounded transition-all ${cardType === 'visa' ? 'bg-white ring-2 ring-[#0E6BA8]' : 'bg-white/50 opacity-50'}`}
                    >
                        <img src={VisaIcon} alt="visa" className="h-4 object-contain" />
                    </button>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-3">
                  
                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-white font-semibold text-sm mb-1">
                      Cardholder's name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Name on card"
                      className="w-full h-10 rounded-lg bg-[#D1D5DB] text-black px-3 focus:outline-none focus:ring-2 focus:ring-[#0E6BA8]"
                    />
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-white font-semibold text-sm mb-1">
                      Card number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      maxLength={19}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="w-full h-10 rounded-lg bg-[#D1D5DB] text-black px-3 focus:outline-none focus:ring-2 focus:ring-[#0E6BA8]"
                    />
                  </div>

                  {/* Expiry Date & CVV */}
                  <div className="flex gap-3">
                    {/* Month */}
                    <div className="flex-1">
                      <label className="block text-white font-semibold text-sm mb-1">
                        Exp. Month
                      </label>
                      <select 
                        value={expMonth}
                        onChange={(e) => setExpMonth(e.target.value)}
                        className="w-full h-10 rounded-lg bg-[#D1D5DB] text-black px-2 focus:outline-none focus:ring-2 focus:ring-[#0E6BA8]"
                      >
                        <option value="" disabled>MM</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="flex-1">
                      <label className="block text-white font-semibold text-sm mb-1">
                        Exp. Year
                      </label>
                      <select 
                        value={expYear}
                        onChange={(e) => setExpYear(e.target.value)}
                        className="w-full h-10 rounded-lg bg-[#D1D5DB] text-black px-2 focus:outline-none focus:ring-2 focus:ring-[#0E6BA8]"
                      >
                          <option value="" disabled>YYYY</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    {/* CVV */}
                    <div className="flex-1">
                      <label className="block text-white font-semibold text-sm mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="w-full h-10 rounded-lg bg-[#D1D5DB] text-black px-3 focus:outline-none focus:ring-2 focus:ring-[#0E6BA8] text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-11 bg-[#1F3354] rounded text-white hover:bg-[#2a456e] transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmPayment}
                    // เช็คว่ากรอกครบหรือยัง ถ้ายังให้ disable ปุ่ม
                    disabled={!cardName || !cardNumber || !expMonth || !expYear || !cvv}
                    className={`flex-1 h-11 rounded font-semibold transition
                      ${
                        cardName && cardNumber && expMonth && expYear && cvv
                          ? "bg-[#0E6BA8] text-black hover:bg-[#0c5a8d]"
                          : "bg-[#3A3A3A] text-[#9CA3AF] cursor-not-allowed"
                      }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
      </div>
    </div>
  );
}