import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { db } from "@/firebase"; 
import { doc, setDoc, getDoc } from "firebase/firestore"; 

const services = [
    { name: "หมอดูหุ้น", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "Petroleum", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "Rubber Thai", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "Flow Intraday", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "S50", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "Gold", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "BidAsk", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "TickMatch", monthlyPrice: 2500, yearlyPrice: 2063 },
    { name: "DR", monthlyPrice: 2500, yearlyPrice: 2063 },
];

const ErrorPopup = () => (
  <div className="absolute left-0 -bottom-9 z-20 w-full flex items-center gap-2 bg-white text-gray-800 text-sm px-3 py-2 border border-orange-400 shadow-sm rounded-md">
    <span className="bg-orange-500 text-white w-4 h-4 flex items-center justify-center text-xs font-bold rounded-full">!</span>
    Please fill out this field.
  </div>
);

const QRPayment = ({ onSuccess }) => {
  return (
    <div className="">
      <div className="aspect-square bg-white rounded-lg text-black text-center justify-center flex items-center">
        QR Promptpay Code
      </div>
      <div className="text-center text-slate-300 my-3">
        <div className="text-slate-50 font-bold">KBank (Kasikorn Bank)</div> 
        <div className="text-slate-50">Mr. John Doe</div> 
        <div>xxx-x7169-x</div> 
        <div>00000000</div> 
      </div>
      <button 
        onClick={onSuccess}
        className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors mt-2"
      >
        Simulate Successful Payment
      </button>
    </div>
  )
}

const BankTransfer = ({ onCancel, onSuccess }) => {
  return (
    <div className="flex flex-col w-full text-slate-200 mt-2">
      <div className="font-medium text-blue-200/80 mb-4 text-sm">
        Bank Account Detail
      </div>

      {/* Account Info Card */}
      <div className="bg-[#3a3a3a] rounded-xl p-4 flex items-center gap-4 mb-5 border border-slate-700/50">
        
        {/* Mock Kasikorn Logo */}
        <div className="w-12 h-12 rounded-full bg-white flex flex-col justify-between items-center overflow-hidden shrink-0 ring-2 ring-[#3a3a3a]">
        </div>

        <div className="flex flex-col text-sm leading-snug">
          <div className="mb-0.5">
            <span className="font-bold text-white text-base">Kbank</span>{" "}
            <span className="text-slate-400 text-sm">(Kasikorn Bank)</span>
          </div>
          <div className="text-slate-200 mb-0.5">Mr.Chalearmpol Neamsri</div>
          <div className="flex items-center gap-2 text-slate-300 font-mono">
            047-2-27169-7
            <button className="hover:text-white transition-colors" aria-label="Copy account number">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 16.5V19.5A2.25 2.25 0 0 1 13.5 21.75h-9a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25h3m3-3h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Slip Button */}
      <button className="w-full py-3 bg-[#e2e4e9] hover:bg-white text-slate-900 font-semibold rounded-xl mb-4 transition-colors">
        Upload Slip
      </button>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-[#24334a] text-white hover:bg-[#2c3d5a] rounded-xl transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          className="flex-1 py-3 bg-[#3a3a3a] text-slate-400 cursor-not-allowed rounded-xl font-medium"
          disabled
        >
          Confirm
        </button>
      </div>

      <button 
        onClick={onSuccess}
        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors"
      >
        Simulate Successful Payment
      </button>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agree: false,
  });

  const [isBillingMonthly, setBillingMonthly] = useState(true);
  const [selectedServices, setSelectedServices] = useState(new Array(services.length).fill(false));
  const [paymentMethod, setPaymentMethod] = useState("banktransfer"); // Changed default to show new UI
  const [errorField, setErrorField] = useState("");
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setShowPaymentSuccessModal(true);
  };

  const hasSelectedService = selectedServices.some(v => v);
  const hasSelectedAllServices = selectedServices.every(v => v);

  const totalAmount = services.reduce((acc, svc, i) => 
    acc + (selectedServices[i] ? (isBillingMonthly ? svc.monthlyPrice : svc.yearlyPrice * 12) : 0)
  , 0);

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
    // Simulation / Firebase logic here...
    setIsSubmitting(false);
  };

  const panelWidth = "w-full lg:w-[500px] xl:w-[540px]"; 

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans overflow-x-hidden relative">
      
      <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center transition-all duration-500 ease-in-out w-full max-w-[1800px] mx-auto">
        
        {/* ========================================================= */}
        {/* PANEL 1: REGISTRATION                                     */}
        {/* ========================================================= */}
        <div className={`${panelWidth} shrink-0 p-6 sm:p-8 md:p-10 lg:p-12 bg-slate-900 rounded-2xl md:rounded-[2rem] m-1 flex flex-col items-center`}>
          <h2 className="text-3xl font-bold text-blue-500 mb-8 text-center shrink-0">Registration</h2>

          <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col w-full">
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
              <button type="submit" disabled={isSubmitting} className={`py-3 rounded-lg text-white transition ${isSubmitting ? 'bg-sky-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500'}`}>Create account</button>
            </div>
          </form>
        </div>

        {/* ========================================================= */}
        {/* PANEL 2: SUBSCRIPTION                                     */}
        {/* ========================================================= */}
        <div className={`${panelWidth} shrink-0 py-6 sm:py-8 md:py-10 lg:py-12 px-6 bg-slate-900 rounded-2xl md:rounded-[2rem] m-1 flex flex-col`}>
            <div className="font-bold text-2xl shrink-0">Subscription & Checkout</div>
            <div className="text-xs text-slate-400 pt-1 shrink-0">charged annually, Cancel anytime</div>
            
            <div className="flex justify-between py-2 mt-4 shrink-0">
                <div className="font-bold text-sm">Billing Cycle</div>
                <div className="text-xs p-1 bg-green-800 rounded-lg font-light text-green-200">Only 2,063/m (Billing yearly)</div>
            </div>
            
            <button 
              className="w-full relative mb-4 h-12 overflow-visible shrink-0" 
              onClick={() => setBillingMonthly(s => !s)}
            >
              <div className="flex bg-slate-800 h-full rounded-lg py-2">
                  <div className="flex-1 z-20">Monthly</div>
                  <div className="flex-1 z-20">Annually</div>
              </div> 
              <div 
                className={`absolute top-0 w-1/2 bg-slate-700 h-full rounded-lg z-10 transition-all duration-100 ease-linear ${isBillingMonthly ? 'left-0' : 'left-1/2'}`}
              />
            </button>
            
            <div className="flex justify-between mb-2 shrink-0">
                <span>Select your tools</span>
                {
                    hasSelectedAllServices ? (
                        <button 
                            className="border border-blue-700 rounded-lg px-2 py-1 text-xs text-blue-700 hover:bg-blue-900 hover:text-white transition" 
                            onClick={() => setSelectedServices(new Array(services.length).fill(false))}
                        >
                            Deselect All
                        </button>
                    ) : (
                        <button 
                            className="border border-blue-700 rounded-lg px-2 py-1 text-xs text-blue-700 hover:bg-blue-900 hover:text-white transition" 
                            onClick={() => setSelectedServices(new Array(services.length).fill(true))}
                        >
                            Select All
                        </button>
                    )
                }
            </div>
            
            <div className="grid grid-cols-2 gap-2 min-h-0 overflow-y-auto pr-1">
                {services.map(({name, monthlyPrice, yearlyPrice}, i) => (
                    <button 
                        key={name}
                        data-select={selectedServices[i]} 
                        type="button" 
                        className="bg-slate-700 rounded-lg py-3 px-2 data-[select=true]:bg-blue-600 data-[select=true]:shadow-lg transition-colors max-h-14"
                        onClick={() => setSelectedServices(prev => prev.map((val, idx) => idx === i ? !val : val))}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-[0.8rem] font-medium">{name}</span> 
                            <span className="text-[0.7rem] text-slate-300">{isBillingMonthly ? monthlyPrice : yearlyPrice} ฿/{isBillingMonthly ? 'month' : 'year'}</span> 
                        </div>
                    </button>
                ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PANEL 3: PAYMENT & SUMMARY                                */}
        {/* ========================================================= */}
        <div 
          className={`overflow-hidden transition-[max-width,opacity,margin] duration-500 ease-in-out flex h-[70vh] lg:h-auto
            ${hasSelectedService 
              ? "max-w-[100vw] lg:max-w-[500px] xl:max-w-[540px] opacity-100 m-1" 
              : "max-w-0 opacity-0 m-0"
            }
          `}
        >
          {/* Inner container enforcing the width and vertical stacking */}
          <div className="w-[100vw] lg:w-[500px] xl:w-[540px] shrink-0 flex flex-col gap-2 h-full"> 
            
            {/* --- TOP DIV: Payment Method --- */}
            <div className="flex-[0.5] py-6 sm:py-8 px-6 bg-slate-900 rounded-2xl md:rounded-[2rem] flex flex-col min-h-0">
              <div className="font-bold text-lg mb-4 shrink-0">Payment Method</div>
              
              <div className="flex-1 pr-2 min-h-0 flex flex-row">
                {/* Option: Bank Transfer */}
                <button 
                  onClick={() => setPaymentMethod("banktransfer")}
                  className={`flex-1 mx-1 justify-between items-center p-3 rounded-lg border transition-colors shrink-0 ${
                    paymentMethod === "banktransfer" ? "border-blue-500 bg-blue-600/20" : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">Bank Transfer</span>
                </button>

                {/* Option: PromptPay */}
                <button 
                  onClick={() => setPaymentMethod("promptpay")}
                  className={`flex-1 mx-1 justify-between items-center p-3 rounded-lg border transition-colors shrink-0 ${
                    paymentMethod === "promptpay" ? "border-blue-500 bg-blue-600/20" : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">QR PromptPay</span>
                </button>
              </div>
            </div>

            {/* --- BOTTOM DIV: Order Summary --- */}
            <div className="flex-[1.5] py-6 sm:py-8 px-6 bg-slate-900 rounded-2xl md:rounded-[2rem] flex flex-col min-h-0">
              <div className="font-bold text-2xl shrink-0">Order Summary</div>
              <div className="text-slate-400 mt-2 text-sm shrink-0">
                You selected {selectedServices.filter(Boolean).length} service(s).
              </div>
              
              <div className="flex-1 mt-6 space-y-3 overflow-y-auto pr-2 min-h-0">
                {services.map((svc, i) => selectedServices[i] && (
                  <div key={svc.name} className="flex justify-between">
                    <span>{svc.name}</span>
                    <span className="text-sky-400 font-medium">
                      {(isBillingMonthly ? svc.monthlyPrice : svc.yearlyPrice * 12).toLocaleString()} ฿
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700 shrink-0 flex justify-between">
                <div className="flex flex-col justify-between font-bold text-xl flex-1">
                  <span className="text-sm">TOTAL AMOUNT</span>
                  <span className="text-blue-500 text-3xl">
                    {totalAmount.toLocaleString()} ฿
                  </span>
                </div>
                <div className="text-slate-400 text-sm pt-2 items-end flex flex-col">
                    <div>Charge {isBillingMonthly ? "monthly" : "annually"}.</div> 
                    <div>Cancel anytime.</div> 
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setShowPaymentModal(true)} 
                className="bg-blue-600 hover:bg-blue-500 transition-colors py-3 mt-5 w-full rounded-lg font-bold"
              >
                Complete Registration & Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PAYMENT MODAL (BLUR BACKGROUND)                           */}
      {/* ========================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-sm rounded-[1.5rem] p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 relative">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-full border border-slate-600 hover:bg-slate-800"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mt-5">
              {
                (paymentMethod === "promptpay") 
                ? <QRPayment onSuccess={handlePaymentSuccess} /> 
                : <BankTransfer onCancel={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUCCESS MODAL                                             */}
      {/* ========================================================= */}
      {showPaymentSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <h3 className="text-2xl font-bold text-white mb-2">Payment Received!</h3>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* <p className="text-slate-400 text-center mb-8"> */}
            {/*   Your subscription has been successfully activated. You now have full access to your selected tools. */}
            {/* </p> */}

            <button 
              onClick={() => navigate("/")}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
