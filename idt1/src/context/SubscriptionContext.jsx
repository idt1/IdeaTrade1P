import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // เช็ค path ให้ตรงกับไฟล์ firebase ของคุณ

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [accessData, setAccessData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ดักจับเมื่อ User ล็อกอิน หรือรีเฟรชหน้าเว็บ
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // เก็บข้อมูล { gold: Timestamp, rubber: Timestamp, ... } ไว้ใน State
            setAccessData(docSnap.data().subscriptions || {});
          }
        } catch (error) {
          console.error("Error fetching subscriptions:", error);
        }
      } else {
        setAccessData({}); // ถ้าไม่ได้ล็อกอิน ให้เคลียร์ข้อมูล
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ accessData, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);