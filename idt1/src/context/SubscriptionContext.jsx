import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // เช็ค path ให้ตรงกับไฟล์ firebase ของคุณ

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [accessData, setAccessData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFreeAccess, setIsFreeAccess] = useState(false); // 🟢 1. เพิ่ม State เช็คสถานะ Free Access

  useEffect(() => {
    // ดักจับเมื่อ User ล็อกอิน หรือรีเฟรชหน้าเว็บ
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsFreeAccess(false); // 🟢 2. ถ้าล็อกอินแล้ว ปิดโหมด Free Access
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // เก็บข้อมูล { gold: Timestamp, rubber: Timestamp, ... } ไว้ใน State
            setAccessData(docSnap.data().subscriptions || {});
          } else {
            setAccessData({});
          }
        } catch (error) {
          console.error("Error fetching subscriptions:", error);
          setAccessData({});
        }
      } else {
        setIsFreeAccess(true); // 🟢 3. ถ้าไม่ได้ล็อกอิน ให้เปิดโหมด Free Access
        setAccessData({});     // และเคลียร์ข้อมูลแพ็กเกจทิ้ง
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    // 🟢 4. อย่าลืมส่งตัวแปร isFreeAccess ออกไปให้ไฟล์อื่น (Guard) ใช้งานด้วย
    <SubscriptionContext.Provider value={{ accessData, loading, isFreeAccess }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);