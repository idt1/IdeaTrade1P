import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; 

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [accessData, setAccessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFreeAccess, setIsFreeAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsFreeAccess(false);
        
        try {
          // 🔴 1. พยายามดึงข้อมูลจาก Firestore (กรณีเชื่อมต่อ Emulator ได้)
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setAccessData(docSnap.data().subscriptions || {});
          } else {
            // 🔴 2. ถ้า Firestore หาไม่เจอ หรือติดต่อไม่ได้ (เช่น เพื่อนใช้ผ่าน ngrok แล้วติดเรื่อง Port)
            // ให้ไปเช็คข้อมูลที่ "เราเซ็ตไว้ตอน Login" ใน localStorage แทน
            const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            if (savedProfile.role === "member") {
              // จำลองสิทธิ์ Member ให้ใช้งานได้
              setAccessData({ fortune: true }); // ให้สิทธิ์ใช้หน้า Stock Fortune
            } else {
              setAccessData({});
            }
          }
        } catch (error) {
          console.error("Error fetching subscriptions:", error);
          // 🔴 3. ถ้า Error (ส่วนใหญ่เพื่อนจะติด Load failed ตรงนี้) ให้ใช้ข้อมูลจาก localStorage เป็นหลัก
          const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
          if (savedProfile.role === "member") {
            setAccessData({ fortune: true });
          } else {
            setAccessData({});
          }
        }
      } else {
        // 🟢 ถ้ายังไม่ได้ล็อกอิน (โหมดคนนอก)
        setIsFreeAccess(true);
        setAccessData({});
        
        // เช็คเผื่อกรณีเป็น Free Access จากปุ่ม Try Free
        const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (savedProfile.role === "free") {
          setIsFreeAccess(true);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ accessData, loading, isFreeAccess }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);