// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import './Profile.css';

// ✅ Import Firebase Auth และ Firestore
import { auth, db } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const Profile = () => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [isSaving, setIsSaving] = useState(false);

  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    lastLogin: '',
    isVerified: true
  });

  // ================= 1. ดึงข้อมูลจาก Firebase ตอนเปิดหน้า =================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const lastSignIn = new Date(user.metadata.lastSignInTime);
        const day = lastSignIn.getDate();
        const month = lastSignIn.toLocaleString('en-US', { month: 'long' });
        const year = lastSignIn.getFullYear();
        const hours = String(lastSignIn.getHours()).padStart(2, '0');
        const minutes = String(lastSignIn.getMinutes()).padStart(2, '0');
        const formattedDate = `${day} ${month} ${year}, ${hours}:${minutes}`;

        setUserData(prev => ({
          ...prev,
          email: user.email || '',
          lastLogin: formattedDate
        }));

        try {
          const mainDocRef = doc(db, "users", user.uid);
          const mainDocSnap = await getDoc(mainDocRef);
          const mainData = mainDocSnap.data();

          if (mainDocSnap.exists() && mainData?.firstName) {
            setUserData(prev => ({
              ...prev,
              firstName: mainData.firstName || '',
              lastName: mainData.lastName || '',
              phone: mainData.phone || ''
            }));
          } else {
            const tempDocRef = doc(db, "users_temp", user.email.toLowerCase()); 
            const tempDocSnap = await getDoc(tempDocRef);
            
            if (tempDocSnap.exists()) {
              const data = tempDocSnap.data();
              setUserData(prev => ({
                ...prev,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || ''
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return alert("กรุณาล็อกอินใหม่อีกครั้ง");

    setIsSaving(true);
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });

      const storedProfile = localStorage.getItem("userProfile");
      let profile = storedProfile ? JSON.parse(storedProfile) : {};
      localStorage.setItem("userProfile", JSON.stringify({
        ...profile,
        firstName: userData.firstName,
        lastName: userData.lastName
      }));

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (

   <div className="w-full min-h-screen bg-transparent p-4 md:p-8 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-6 text-left">Account Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 w-full overflow-x-auto hide-scrollbar">
          <button 
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors text-sm
              ${activeTab === 'Profile' ? 'bg-[#007bff] text-white' : 'bg-[#1b1d28]/40 border border-gray-700/30 text-gray-400 hover:bg-[#1b1d28]/60'}`}
            onClick={() => setActiveTab('Profile')}
          >
            <UserIcon /> Profile
          </button>
          <button 
            className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors text-sm
              ${activeTab === 'API' ? 'bg-[#007bff] text-white' : 'bg-[#1b1d28]/40 border border-gray-700/30 text-gray-400 hover:bg-[#1b1d28]/60'}`}
            onClick={() => setActiveTab('API')}
          >
            <CodeIcon /> API
          </button>
        </div>

        {activeTab === 'Profile' && (
          <div className="w-full">
            {/* Card Container */}
            <div className="bg-transparent w-full flex flex-col gap-6">
              
              <div className="flex flex-col gap-1 w-full">
                <h2 className="text-lg md:text-xl font-bold text-white text-left">Personal Information</h2>
                <p className="text-xs text-gray-500 text-left">Last Login: {userData.lastLogin}</p>
              </div>
              
              <div className="flex flex-col gap-5 w-full">
                
                {/* First & Last Name */}
                <div className="flex flex-col md:flex-row gap-5 w-full">
                  <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-sm font-medium text-gray-400 text-left">First Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111827]/50 border border-gray-700/50 rounded-lg p-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      value={userData.firstName}
                      onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-sm font-medium text-gray-400 text-left">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#111827]/50 border border-gray-700/50 rounded-lg p-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      value={userData.lastName}
                      onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-sm font-medium text-gray-400 text-left">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-[#111827]/30 border border-gray-700/30 rounded-lg p-3.5 text-gray-500 text-sm cursor-not-allowed"
                    value={userData.email}
                    disabled
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-sm font-medium text-gray-400 text-left">Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full bg-[#111827]/50 border border-gray-700/50 rounded-lg p-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={userData.phone}
                    onChange={(e) => setUserData({...userData, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Action Button */}
                <div className="w-full pt-2">
                  <button 
                    className="w-full bg-[#007bff] hover:bg-[#0069d9] text-white text-sm font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20" 
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ opacity: isSaving ? 0.7 : 1 }}
                  >
                    <EditIcon /> {isSaving ? "Saving..." : "Save Profile"} 
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {activeTab === 'API' && (
          <div className="w-full fade-in">
             <div className="bg-transparent w-full">
                  <h2 className="text-lg md:text-xl font-bold text-white mb-4 text-left">API Configuration</h2>
                  <div className="text-gray-500 text-sm text-left">
                      Manage your API keys here.
                  </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Icons ---
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CodeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;

export default Profile;