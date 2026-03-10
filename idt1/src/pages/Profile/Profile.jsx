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
        // 1.1 จัดการเวลา Last Login
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

        // 1.2 ดึงข้อมูลแบบ 2 สเต็ป (หาตารางหลักก่อน ถ้าไม่เจอไปหาตารางสำรอง)
        try {
          // สเต็ป A: หาในตาราง users (หลัก)
          const mainDocRef = doc(db, "users", user.uid);
          const mainDocSnap = await getDoc(mainDocRef);
          const mainData = mainDocSnap.data();

          if (mainDocSnap.exists() && mainData?.firstName) {
            console.log("✅ เจอข้อมูลใน users (หลัก):", mainData);
            setUserData(prev => ({
              ...prev,
              firstName: mainData.firstName || '',
              lastName: mainData.lastName || '',
              phone: mainData.phone || ''
            }));
          } else {
            // สเต็ป B: ถ้าไม่เจอ ไปหาในตาราง users_temp (สำรองตอนสมัคร)
            console.log("⚠️ ไม่พบใน users กำลังหาใน users_temp...");
            const tempDocRef = doc(db, "users_temp", user.email.toLowerCase()); 
            const tempDocSnap = await getDoc(tempDocRef);
            
            if (tempDocSnap.exists()) {
              console.log("✅ เจอข้อมูลใน users_temp:", tempDocSnap.data());
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

  // ================= 2. ฟังก์ชันบันทึกข้อมูลลง Firestore =================
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return alert("กรุณาล็อกอินใหม่อีกครั้ง");

    setIsSaving(true);
    try {
      // เวลาบันทึก จะบันทึกเข้าตารางหลัก (users) เสมอ
      const docRef = doc(db, "users", user.uid);
      
      await setDoc(docRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });

      // อัปเดต LocalStorage ด้วย
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
      alert("Failed to save profile. See console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page-container">
      <h1 className="page-title">Your account</h1>

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'Profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('Profile')}
        >
          <UserIcon /> Profile
        </button>
        <button 
          className={`tab-btn ${activeTab === 'API' ? 'active' : ''}`}
          onClick={() => setActiveTab('API')}
        >
          <CodeIcon /> API
        </button>
      </div>

      {activeTab === 'Profile' && (
        <div className="profile-layout fade-in" style={{ display: 'block' }}>
          
          {/* --- LEFT COLUMN: Form --- */}
          <div className="card form-card" style={{ maxWidth: '800px' }}>
            
            {/* ปรับให้ Header ใช้ Flexbox ดันข้อความไปซ้ายสุดและขวาสุด */}
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, padding: 0, border: 'none' }}>My Account Information</h2>
              <span className="last-login-text" style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: 'normal' }}>
                Last Login: {userData.lastLogin}
              </span>
            </div>
            
            <div className="form-content">
              <div className="form-row two-cols">
                <div className="form-group">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    className="dark-input"
                    value={userData.firstName}
                    onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    className="dark-input"
                    value={userData.lastName}
                    onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="dark-input"
                    value={userData.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    className="dark-input"
                    value={userData.phone}
                    onChange={(e) => setUserData({...userData, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn-save-changes" 
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ opacity: isSaving ? 0.7 : 1 }}
                >
                  <LockIcon /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'API' && (
        <div className="api-content fade-in">
           <div className="card">
                <h2 className="card-header">API Configuration</h2>
                <div style={{padding: '20px', color: '#9ca3af'}}>
                    Manage your API keys here.
                </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Icons Components ---
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CodeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

export default Profile;