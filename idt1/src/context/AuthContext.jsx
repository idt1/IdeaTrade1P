import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from "@/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// 1. สร้าง Context (ถังเก็บข้อมูล)
const AuthContext = createContext();

// 2. สร้าง Hook สำหรับเรียกใช้งานง่ายๆ
export const useAuth = () => useContext(AuthContext);

// 3. สร้าง Provider (ตัวจ่ายข้อมูลให้ทั้งเว็บ)
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // เก็บข้อมูลจาก Firebase Auth
  const [userData, setUserData] = useState(null);       // เก็บข้อมูลจาก Firestore (ชื่อ, เบอร์ ฯลฯ)
  const [loading, setLoading] = useState(true);         // เก็บสถานะกำลังโหลด

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // จัดการวันที่ Login
        const lastSignIn = new Date(user.metadata.lastSignInTime);
        const formattedDate = `${lastSignIn.getDate()} ${lastSignIn.toLocaleString('en-US', { month: 'long' })} ${lastSignIn.getFullYear()}, ${String(lastSignIn.getHours()).padStart(2, '0')}:${String(lastSignIn.getMinutes()).padStart(2, '0')}`;

        // โครงสร้างข้อมูลเริ่มต้น
        let fetchedData = {
          firstName: '',
          lastName: '',
          email: user.email || '',
          phone: '',
          lastLogin: formattedDate,
          isVerified: true
        };

        try {
          let foundData = false;

          // 1. ค้นหาด้วย UID (วิธีมาตรฐาน)
          const mainDocRef = doc(db, "users", user.uid);
          const mainDocSnap = await getDoc(mainDocRef);

          if (mainDocSnap.exists() && mainDocSnap.data()?.firstName) {
            fetchedData = { ...fetchedData, ...mainDocSnap.data() };
            foundData = true;
          } 
          
          // 🌟 2. ท่าไม้ตาย: ถ้าหาด้วย UID ไม่เจอ ให้ค้นหาจาก Field "email" แทน!
          if (!foundData && user.email) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // ถ้าเจอข้อมูลที่มีอีเมลตรงกัน ให้ดึงเอกสารแรกมาใช้
              const docData = querySnapshot.docs[0].data();
              console.log("🎉 ดึงข้อมูลสำเร็จด้วย Email:", docData);
              fetchedData = { ...fetchedData, ...docData };
              foundData = true;
            } else {
              // 3. ถ้ายังไม่เจออีก ให้ไปหาในโฟลเดอร์สำรอง (users_temp)
              const tempDocRef = doc(db, "users_temp", user.email.toLowerCase()); 
              const tempDocSnap = await getDoc(tempDocRef);
              if (tempDocSnap.exists()) {
                fetchedData = { ...fetchedData, ...tempDocSnap.data() };
              }
            }
          }
          
          setUserData(fetchedData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null); // ถ้าไม่ได้ล็อกอิน ให้ล้างข้อมูลทิ้ง
      }
      
      setLoading(false); // โหลดเสร็จแล้ว
    });

    return () => unsubscribe();
  }, []);

  // ส่งข้อมูลทั้งหมดออกไปให้ทุกหน้าใช้งาน
  return (
    <AuthContext.Provider value={{ currentUser, userData, setUserData, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};