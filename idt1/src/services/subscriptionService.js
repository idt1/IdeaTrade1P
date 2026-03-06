import { doc, getDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase"; // เช็ค path ให้ตรงกับไฟล์ firebase.js ของคุณ

/**
 * ฟังก์ชันสำหรับต่ออายุหรือซื้อแพ็กเกจใหม่
 * @param {string} userId - UID ของ User ที่ล็อกอิน
 * @param {string} toolId - รหัสเครื่องมือ (เช่น 'gold', 'rubber')
 * @param {number} daysToAdd - จำนวนวันที่ต้องการซื้อเพิ่ม (ค่าเริ่มต้น 30 วัน)
 */
export const renewSubscription = async (userId, toolId, daysToAdd = 30) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    let newExpireDate = new Date(); // เวลาปัจจุบัน

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentSubscriptions = userData.subscriptions || {};
      const currentExpireTimestamp = currentSubscriptions[toolId];

      // เช็คว่าถ้าแพ็กเกจเก่ายังไม่หมดอายุ ให้บวกวันเพิ่มจาก "วันหมดอายุเดิม"
      // แต่ถ้าหมดอายุไปแล้ว จะบวกวันเพิ่มจาก "วันนี้"
      if (currentExpireTimestamp && currentExpireTimestamp.toDate() > new Date()) {
        newExpireDate = currentExpireTimestamp.toDate();
      }
    } else {
      // กรณี User นี้เพิ่งสมัครและยังไม่เคยมี Document เลย
      await setDoc(userRef, { subscriptions: {} }, { merge: true });
    }

    // บวกจำนวนวันเข้าไป
    newExpireDate.setDate(newExpireDate.getDate() + daysToAdd);

    // อัปเดตข้อมูลลง Firestore (ใช้ dot notation เพื่ออัปเดตแค่ฟิลด์ที่กำหนด ไม่กระทบ tool อื่น)
    await updateDoc(userRef, {
      [`subscriptions.${toolId}`]: Timestamp.fromDate(newExpireDate)
    });

    console.log(`✅ ต่ออายุ ${toolId} สำเร็จ! วันหมดอายุใหม่: ${newExpireDate}`);
    return true; // ส่งค่ากลับไปบอกว่าสำเร็จ

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการอัปเดตวันหมดอายุ:", error);
    return false;
  }
};