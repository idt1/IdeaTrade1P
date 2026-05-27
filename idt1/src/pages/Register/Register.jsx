import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import KbankIcon from "@/assets/icons/Kbank.png";
import CloseIcon from "@/assets/icons/Close_Circle.png";
import PromptPayQR from "@/assets/icons/Promptpay.png";
import TickIcon from "@/assets/icons/tick-01.png";
import BankGray from "@/assets/icons/blbanktrasfer.png";
import BankBlue from "@/assets/icons/bbanktransfer.png";
import QrGray from "@/assets/icons/blqr.png";
import QrBlue from "@/assets/icons/bqr.png";
import EditIcon from "@/assets/icons/edit.svg";
import CancleEdit from "@/assets/icons/cancleedit.svg";

const SERVICES = [
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

const ErrorPopup = () => (
  <div className="absolute left-0 -bottom-9 z-20 w-full flex items-center gap-2 bg-white text-gray-800 text-sm px-3 py-2 border border-orange-400 shadow-sm rounded-md">
    <span className="bg-orange-500 text-white w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full">!</span>
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

  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditSummary, setIsEditSummary] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("idle");
  const [slipImage, setSlipImage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorField("");
    if (name === "agree") setShowPrivacyPopup(false);
  };

  const toggleTool = (id) => {
    setSelectedTools((prev) => {
      const exists = prev.find((t) => t.id === id && t.billing === billingCycle);
      if (exists) {
        return prev.filter((t) => !(t.id === id && t.billing === billingCycle));
      }
      return [...prev, { id, billing: billingCycle }];
    });
  };

  const removeTool = (id, billing) => {
    setSelectedTools((prev) => prev.filter((t) => !(t.id === id && t.billing === billing)));
  };

  const handleUploadSlip = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSlipImage(URL.createObjectURL(file));
  };

  const totalPrice = selectedTools.reduce((sum, t) => {
    const tool = SERVICES.find((x) => x.id === t.id);
    if (!tool) return sum;
    return sum + (t.billing === "monthly" ? tool.monthly : tool.yearly);
  }, 0);

  const handleCompleteRegistration = () => {
    // Basic validation before showing success
    if (!formData.firstName.trim()) return setErrorField("firstName");
    if (!formData.lastName.trim()) return setErrorField("lastName");
    if (!formData.email.trim()) return setErrorField("email");
    if (!formData.phone.trim()) return setErrorField("phone");
    if (!formData.agree) {
      setShowPrivacyPopup(true);
      return;
    }

    alert("Simulation: Registration & Subscription Successful!");
    navigate("/");
  };

  const hasMonthly = selectedTools.some(t => t.billing === "monthly");
  const hasYearly = selectedTools.some(t => t.billing === "yearly");
  const monthlyCount = selectedTools.filter(t => t.billing === "monthly").length;
  const yearlyCount = selectedTools.filter(t => t.billing === "yearly").length;
  const hasSelectedService = selectedTools.length > 0;

  const panelWidth = "w-full lg:w-[500px] xl:w-[540px]"; 

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-700 p-4 font-sans overflow-x-hidden relative text-white">
      
      <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center transition-all duration-500 ease-in-out w-full max-w-[1800px] max-h-[650px] mx-auto">
        
        {/* PANEL 1: REGISTRATION */}
        <div className={`${panelWidth} shrink-0 p-6 sm:p-8 md:p-10 lg:p-12 from-slate-900 to-slate-800 bg-gradient-to-br rounded-2xl md:rounded-[2rem] m-1 flex flex-col items-center`}>
          <h2 className="text-3xl font-bold text-blue-500 mb-8 text-center shrink-0">Registration</h2>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5 flex-1 flex flex-col w-full">
            <div className="flex flex-col md:flex-row gap-4 shrink-0">
              <div className="relative w-full">
                <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg ${errorField === "firstName" ? "border-orange-400" : "border-slate-600"}`} />
                {errorField === "firstName" && <ErrorPopup />}
              </div>
              <div className="relative w-full">
                <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg ${errorField === "lastName" ? "border-orange-400" : "border-slate-600"}`} />
                {errorField === "lastName" && <ErrorPopup />}
              </div>
            </div>
            <div className="relative shrink-0">
              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg ${errorField === "email" ? "border-orange-400" : "border-slate-600"}`} />
              {errorField === "email" && <ErrorPopup />}
            </div>
            <div className="relative shrink-0">
              <input type="tel" name="phone" placeholder="Phone number" value={formData.phone} onChange={handleChange} className={`w-full bg-slate-700/50 text-white border px-4 py-3 rounded-lg ${errorField === "phone" ? "border-orange-400" : "border-slate-600"}`} />
              {errorField === "phone" && <ErrorPopup />}
            </div>
            <div className="relative flex items-center gap-2 mt-auto pt-4 shrink-0">
              <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} className="w-4 h-4 shrink-0" />
              <span className="text-sm text-gray-400">I accept all <span className="underline hover:text-white cursor-pointer">Terms & Privacy</span> <span className="text-red-500">*</span></span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 shrink-0">
              <button type="button" onClick={() => navigate("/")} className="py-3 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 transition">Cancel</button>
              <button type="button" onClick={handleCompleteRegistration} className="py-3 rounded-lg text-white transition bg-sky-600 hover:bg-sky-500">Create account</button>
            </div>
          </form>
        </div>

        {/* PANEL 2: SUBSCRIPTION */}
        <div className={`${panelWidth} shrink-0 py-6 sm:py-8 md:py-10 lg:py-12 px-6 from-slate-900 to-slate-800 bg-gradient-to-br rounded-2xl md:rounded-[2rem] m-1 flex flex-col`}>
            <div className="font-bold text-2xl shrink-0">Subscription & Checkout</div>
            <div className="text-xs text-slate-400 pt-1 shrink-0">charged annually, Cancel anytime</div>
            
            <div className="flex justify-between py-2 mt-4 shrink-0">
                <div className="font-bold text-sm">Billing Cycle</div>
                <div className="text-xs px-3 py-1 bg-green-800/30 rounded-lg font-light text-green-400">Only 2,083฿/m (Billed Yearly)</div>
            </div>
            
            <div className="flex bg-[#0F1B2D] rounded-xl p-1 w-full mb-6 shrink-0">
              {["monthly", "yearly"].map((t) => (
                <button key={t} onClick={() => setBillingCycle(t)} className={`flex-1 py-2 rounded-lg transition-all ${billingCycle === t ? "bg-[#0E6BA8] text-white" : "text-[#9FB3C8] hover:text-white"}`}>
                  {t === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between mb-4 shrink-0">
                <span className="font-semibold text-lg">Select Your Tools</span>
                {(() => {
                  const allSelectedInCycle = SERVICES.every(tool => 
                    selectedTools.some(st => st.id === tool.id && st.billing === billingCycle)
                  );

                  const handleSelection = () => {
                    if (allSelectedInCycle) {
                      // Deselect All for current cycle
                      setSelectedTools(prev => prev.filter(t => t.billing !== billingCycle));
                    } else {
                      // Select All for current cycle (merge with other cycle's selections)
                      const others = selectedTools.filter(t => t.billing !== billingCycle);
                      const current = SERVICES.map(tool => ({ id: tool.id, billing: billingCycle }));
                      setSelectedTools([...others, ...current]);
                    }
                  };

                  return (
                    <button 
                      onClick={handleSelection}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition whitespace-nowrap
                        ${allSelectedInCycle 
                          ? "border-red-500/50 text-red-400 hover:bg-red-500/10" 
                          : "border-[#0E6BA8] text-[#0EA5E9] hover:bg-[#0E6BA8]/20"
                        }`}
                    >
                      {allSelectedInCycle ? "Deselect All" : "Select All"}
                    </button>
                  );
                })()}
            </div>            

            <button className="flex justify-between rounded-lg border border-sky-600 text-sky-500 p-2 mb-4">
                <div className="flex">
                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="aspect-square w-4 mr-1 text-sky-500">
                        <path d="M28.8745 14.6248C28.8745 15.3664 28.6546 16.0915 28.2426 16.7081C27.8305 17.3248 27.2449 17.8054 26.5597 18.0893C25.8745 18.3731 25.1205 18.4473 24.3931 18.3027C23.6657 18.158 22.9976 17.8008 22.4732 17.2764C21.9487 16.7519 21.5916 16.0838 21.4469 15.3564C21.3022 14.6289 21.3765 13.875 21.6603 13.1897C21.9441 12.5045 22.4247 11.9189 23.0414 11.5068C23.6581 11.0948 24.3831 10.8749 25.1247 10.8749C26.1192 10.8749 27.073 11.2699 27.7762 11.9732C28.4795 12.6764 28.8745 13.6302 28.8745 14.6248ZM26.8631 28.444C26.57 29.5964 26.1536 30.7138 25.6212 31.777C24.638 33.6363 23.1618 35.1889 21.3543 36.2645C19.5469 37.3401 17.4782 37.897 15.3751 37.8743H13.8752V30.589C13.848 29.3472 13.3426 28.1637 12.4643 27.2854C11.5861 26.4071 10.4027 25.9017 9.16086 25.8746H1.87567V24.3746C1.85296 22.2714 2.40994 20.2027 3.48549 18.3952C4.56105 16.5878 6.11363 15.1115 7.97291 14.1283C9.03605 13.5958 10.1534 13.1794 11.3058 12.8863C16.815 5.44496 23.2063 2.14202 32.5614 1.87503H32.6244C33.3209 1.87272 34.0109 2.00949 34.6539 2.27731C35.2969 2.54512 35.8799 2.93861 36.3689 3.43469C36.8578 3.93077 37.2428 4.51947 37.5013 5.16628C37.7598 5.81309 37.8866 6.50499 37.8742 7.20143C37.6042 16.6902 34.4033 22.8746 26.8631 28.444ZM33.3744 7.13693C33.3776 6.93979 33.3031 6.7493 33.1669 6.6067C33.0308 6.46409 32.844 6.38083 32.6469 6.37494C24.4557 6.61794 19.3889 9.32388 14.5906 16.0213C13.3465 17.8027 12.2404 19.6766 11.2818 21.6266C12.9337 22.0427 14.442 22.8985 15.6466 24.1031C16.8511 25.3077 17.7069 26.8161 18.123 28.468C20.0731 27.5097 21.947 26.4035 23.7283 25.1591C30.4375 20.3502 33.1434 15.2983 33.3744 7.13693ZM4.32207 29.9665C3.16111 31.1245 2.44564 34.6209 2.19215 36.0744L1.87567 37.8743L3.67559 37.5563C5.11703 37.3013 8.59239 36.5829 9.75334 35.4189C10.4728 34.694 10.8766 33.714 10.8766 32.6927C10.8766 31.6713 10.4728 30.6914 9.75334 29.9665C9.02332 29.265 8.05015 28.8732 7.0377 28.8732C6.02526 28.8732 5.05209 29.265 4.32207 29.9665Z" fill="currentColor"/>
                    </svg>
                    Preview Stock Market Tools
                </div>
                <div className="font-bold">{">"}</div>
            </button>
    
            <div className="grid grid-cols-2 gap-2 min-h-0 overflow-y-auto pr-1">
                {SERVICES.map((tool) => {
                  const active = selectedTools.some((t) => t.id === tool.id && t.billing === billingCycle);
                  return (
                    <button key={tool.id} type="button" onClick={() => toggleTool(tool.id)} className={`rounded-lg py-3 px-3 transition-all border ${active ? "bg-[#102B46] border-[#0E6BA8]" : "bg-[#13233A] border-[#1F3354] hover:border-[#0E6BA8]/50"}`}>
                        <div className="flex flex-col items-start">
                            <span className="text-[0.9rem] font-medium text-white">{tool.name}</span> 
                            <span className="text-[0.7rem] text-slate-400">
                              {billingCycle === "monthly" ? `${tool.monthly}฿/m` : `${tool.yearly}฿/y`}
                            </span> 
                        </div>
                    </button>
                  );
                })}
            </div>
        </div>

        {/* PANEL 3: PAYMENT & SUMMARY */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out flex h-auto ${hasSelectedService ? "max-w-[100vw] lg:max-w-[500px] xl:max-w-[540px] opacity-100 m-1" : "max-w-0 opacity-0 m-0"}`}>
          <div className="w-[100vw] lg:w-[500px] xl:w-[540px] shrink-0 flex flex-col gap-2 h-full"> 
            
            <div className="py-6 sm:py-8 px-6 from-slate-900 to-slate-800 bg-gradient-to-br rounded-2xl md:rounded-[2rem] flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((m) => {
                  const active = selectedPayment === m.id;
                  return (
                    <button key={m.id} onClick={() => setSelectedPayment(m.id)} className={`h-20 sm:h-24 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-200 ${active ? "bg-[#0B2A4E] border-[#0E6BA8]" : "bg-[#E5E7EB] border-transparent"}`}>
                      <img src={active ? m.activeIcon : m.icon} alt={m.label} className="w-10 h-10" />
                      <span className={`text-xs font-medium ${active ? "text-white" : "text-black"}`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 py-6 sm:py-8 px-6 from-slate-900 to-slate-800 bg-gradient-to-br rounded-2xl md:rounded-[2rem] flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Order Summary</h2>
                <button onClick={() => setIsEditSummary(!isEditSummary)} className="group relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition">
                  <img src={isEditSummary ? CancleEdit : EditIcon} alt="edit" className="w-5 h-5 opacity-80" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {hasMonthly && (
                  <div>
                    <p className="text-sm font-semibold text-[#9FB3C8] mb-2">Monthly ({monthlyCount})</p>
                    <div className="space-y-2">
                      {selectedTools.filter(t => t.billing === "monthly").map(t => {
                        const tool = SERVICES.find(x => x.id === t.id);
                        return (
                          <div key={t.id} className="flex justify-between text-sm">
                            <span>{tool.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sky-400">{tool.monthly.toLocaleString()} ฿</span>
                              {isEditSummary && <button onClick={() => removeTool(t.id, "monthly")} className="text-red-500 border border-red-500 rounded-full w-4 h-4 flex items-center justify-center">−</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hasMonthly && hasYearly && <div className="border-t border-slate-700 my-2" />}
                {hasYearly && (
                  <div>
                    <p className="text-sm font-semibold text-[#9FB3C8] mb-2">Yearly ({yearlyCount})</p>
                    <div className="space-y-2">
                      {selectedTools.filter(t => t.billing === "yearly").map(t => {
                        const tool = SERVICES.find(x => x.id === t.id);
                        return (
                          <div key={t.id} className="flex justify-between text-sm">
                            <span>{tool.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sky-400">{tool.yearly.toLocaleString()} ฿</span>
                              {isEditSummary && <button onClick={() => removeTool(t.id, "yearly")} className="text-red-500 border border-red-500 rounded-full w-4 h-4 flex items-center justify-center">−</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-sm font-semibold text-[#9FB3C8] mb-1">TOTAL AMOUNT</p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-blue-500">{totalPrice.toLocaleString()} ฿</span>
                </div>
              </div>
              
              <button disabled={!selectedPayment || selectedTools.length === 0} onClick={() => setShowModal(true)} className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 transition-colors py-3 mt-5 w-full rounded-lg font-bold">
                Complete Registration
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0F1B2D] p-6 rounded-xl w-[calc(100vw-32px)] max-w-[420px] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Payment Details</h3>
              <button onClick={() => setShowModal(false)}><img src={CloseIcon} alt="close" className="w-6 h-6" /></button>
            </div>

            {selectedPayment === "bank" && (
              <div className="space-y-4">
                <div className="bg-[#2A2A2A] rounded-xl p-4 flex items-center gap-4">
                  <img src={KbankIcon} alt="kbank" className="w-12 h-12" />
                  <div>
                    <p className="font-semibold">Kbank</p>
                    <p className="text-sm opacity-70">Mr.Chalearmpol Neamsri</p>
                    <p className="text-sm">047-2-27169-7</p>
                  </div>
                </div>
                <label className="w-full h-12 rounded-xl bg-slate-200 text-black font-semibold flex items-center justify-center cursor-pointer">
                  Upload Slip
                  <input type="file" hidden onChange={handleUploadSlip} />
                </label>
                {slipImage && <img src={slipImage} alt="slip" className="w-full h-40 object-cover rounded-lg" />}
                <button onClick={handleCompleteRegistration} disabled={!slipImage} className="w-full h-12 bg-sky-600 rounded-lg font-bold disabled:opacity-50">Confirm Payment</button>
              </div>
            )}

            {selectedPayment === "promptpay" && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-2 rounded-lg">
                  <img src={PromptPayQR} alt="qr" className="w-48 h-48" />
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStatus("success")} className="flex-1 h-10 bg-green-600 rounded-lg">Simulate Success</button>
                  <button onClick={() => setStatus("failed")} className="flex-1 h-10 bg-red-600 rounded-lg">Simulate Failed</button>
                </div>
                {status === "success" && (
                   <div className="flex flex-col items-center gap-2">
                     <img src={TickIcon} alt="success" className="w-12 h-12" />
                     <button onClick={handleCompleteRegistration} className="bg-sky-600 px-4 py-2 rounded-lg font-bold">Finish Registration</button>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
