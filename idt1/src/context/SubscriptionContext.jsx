import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase'; 
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null); // ข้อมูลโพรไฟล์ (ชื่อ, นามสกุล)
  const [accessData, setAccessData] = useState({}); // ข้อมูลการสมัครสมาชิก
  const [isFreeAccess, setIsFreeAccess] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      // ล้างข้อมูลเก่าเมื่อมีการเปลี่ยนสถานะ Auth
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        setIsFreeAccess(false);
        setLoading(true);

        try {
          // --- สเต็ปพิเศษ: ค้นหาว่าข้อมูล User อยู่ที่ไหน (UID หรือ Email) ---
          let targetDocId = user.uid;
          const uidRef = doc(db, 'users', user.uid);
          const uidSnap = await getDocs(query(collection(db, 'users'), where("__name__", "==", user.uid)));

          // ถ้าหาด้วย UID ไม่เจอ ให้ลองหาด้วย Email
          if (uidSnap.empty) {
            const emailQuery = query(collection(db, 'users'), where("email", "==", user.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              targetDocId = emailSnap.docs[0].id; // ใช้ ID ของเอกสารที่เจอด้วย Email แทน
              console.log("🎯 Found user data by Email for subscription");
            }
          }

          // --- สเต็ป Real-time: ติดตามข้อมูลจากเอกสารที่ถูกต้อง ---
          const docRef = doc(db, 'users', targetDocId);
          unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserData(data); // เก็บชื่อ, นามสกุล ไว้โชว์ที่ Profile
              setAccessData(data.subscriptions || {}); // เก็บข้อมูลสิทธิ์
              setIsFreeAccess(false);
            } else {
              // ถ้าไม่มีข้อมูลใน Firestore เลยจริงๆ ให้ใช้ค่าจาก LocalStorage (ถ้ามี)
              handleLocalFallback(user.email);
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore Snapshot Error:", err);
            setLoading(false);
          });

        } catch (error) {
          console.error("Error setting up sub listener:", error);
          setLoading(false);
        }
      } else {
        // กรณีไม่ได้ล็อกอิน
        setUserData(null);
        setAccessData({});
        setIsFreeAccess(true);
        setLoading(false);
      }
    });

    // ฟังก์ชันช่วยดึงข้อมูลสำรองจาก LocalStorage
    const handleLocalFallback = (email) => {
      const saved = JSON.parse(localStorage.getItem("userProfile") || "{}");
      if (saved.email === email) {
        setUserData(saved);
        if (saved.role === "member") {
           // จำลองสิทธิ์ชั่วคราวถ้าดึงจากเครื่อง
           setAccessData({ fortune: Date.now() + 86400000 }); 
        }
      }
    };

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ currentUser, userData, accessData, isFreeAccess, loading, setUserData }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);