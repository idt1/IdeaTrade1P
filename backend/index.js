const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// 1. สร้างตัวแปร app สำหรับเปิดเซิร์ฟเวอร์
const app = express();

// 2. ตั้งค่าให้เซิร์ฟเวอร์รับ-ส่งข้อมูลกับหน้าบ้าน (React) ได้
app.use(cors({ origin: true }));
app.use(express.json()); // บังคับให้อ่านข้อมูลแบบ JSON ได้

// 🌟🌟 3. นำเข้าไฟล์กุญแจลับ (อย่าลืมเอาไฟล์ firebase-key.json มาไว้ในโฟลเดอร์เดียวกันนะครับ)
const serviceAccount = require("./firebase-key.json"); 

// 🌟🌟 4. ตั้งค่าเชื่อมต่อ Firebase ให้ใช้กุญแจจริง
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// กำหนดตัวแปรสำหรับเรียกใช้ Firestore
const db = admin.firestore();

// 🟢 ตัวแปรสำหรับเก็บ OTP ชั่วคราว (ในระบบจริง แนะนำให้เก็บลง Firestore หรือ Redis เพื่อป้องกันข้อมูลหายตอน Server รีสตาร์ท)
const otpStorage = new Map();

// ==========================================
// API 1: สมัครสมาชิก (สร้างบัญชี Auth และบันทึกลง Firestore)
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { email, firstName, lastName, phone } = req.body;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: "มีอีเมลนี้ในระบบแล้ว กรุณาใช้ชื่ออื่น" });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: email,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานในระบบแล้ว" });
      }
      throw authErr; 
    }

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30); 

    const newUser = {
      email: email,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      memberExpireAt: expireDate,
      uid: userRecord.uid, 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    };

    await db.collection('users').doc(userRecord.uid).set(newUser);

    console.log("✅ สมัครสมาชิกสำเร็จ! โพรไฟล์ถูกสร้างด้วย UID:", userRecord.uid);
    res.json({ message: "สมัครสมาชิกสำเร็จและบันทึกลงฐานข้อมูลแล้ว!" });

  } catch (error) {
    console.error("❌ Error saving to Firebase:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
});

// ==========================================
// API 2: ขอ OTP (ส่งไปยังอีเมล)
// ==========================================
app.post('/api/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const formattedEmail = email.trim().toLowerCase();

    // 1. เช็คว่ามีผู้ใช้นี้ใน Firebase Auth หรือไม่
    try {
      await admin.auth().getUserByEmail(formattedEmail);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // 🟢 ส่ง Error กลับไปให้ Frontend รู้ว่าหาอีเมลไม่เจอ
        return res.status(404).json({ success: false, error: "Email not found" });
      }
      throw error;
    }

    // 2. สร้างรหัส OTP 6 หลัก (แบบสุ่ม)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. เก็บ OTP ไว้ใน Memory พร้อมเวลาหมดอายุ (เช่น 5 นาที)
    otpStorage.set(formattedEmail, {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 นาที
    });

    // 4. 🚀 TODO: โค้ดสำหรับส่งอีเมลจริงๆ
    console.log(`\n📧 [SIMULATE EMAIL] ส่ง OTP: ${otp} ไปยังอีเมล: ${formattedEmail}\n`);

    res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error("❌ Error requesting OTP:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ==========================================
// API 3: ยืนยัน OTP และสร้าง Custom Token 🌟
// ==========================================
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const formattedEmail = email.trim().toLowerCase();

    // 1. เช็คว่ามี OTP ของอีเมลนี้เก็บไว้ไหม
    const storedData = otpStorage.get(formattedEmail);

    if (!storedData) {
      return res.status(400).json({ success: false, error: "ไม่พบรหัส OTP หรือรหัสหมดอายุแล้ว" });
    }

    // 2. เช็คเวลาหมดอายุ
    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(formattedEmail); // ลบทิ้ง
      return res.status(400).json({ success: false, error: "รหัส OTP หมดอายุแล้ว" });
    }

    // 3. เช็คว่ารหัสตรงกันไหม
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, error: "รหัส OTP ไม่ถูกต้อง" });
    }

    // 🌟 4. ถ้ารหัสถูกต้อง ให้หา UID ของผู้ใช้จาก Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(formattedEmail);
    const uid = userRecord.uid;

    // 🟢 เช็คว่า Backend อ่าน UID ได้ถูกต้องหรือไม่!
    console.log(`\n👀 [DEBUG] กำลังสร้าง Token ให้ Email: ${formattedEmail}`);
    console.log(`👀 [DEBUG] UID ของแท้ที่จะฝังใน Token คือ: ${uid}\n`);

    // 🌟 5. สร้าง Custom Token ด้วย UID
    const customToken = await admin.auth().createCustomToken(uid);

    console.log(`✅ ยืนยัน OTP สำเร็จ! ออกบัตรผ่าน (Token) ให้เรียบร้อย`);

    // ล้าง OTP ทิ้งเมื่อใช้งานสำเร็จแล้ว
    otpStorage.delete(formattedEmail);

    // 6. ส่ง Token กลับไปให้หน้าบ้านเอาไปใช้ล็อกอิน
    res.json({ 
      success: true, 
      token: customToken, 
      message: "Login successful" 
    });

  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ==========================================
// สั่งให้เซิร์ฟเวอร์เปิดทำงานที่ Port 8000
// ==========================================
const PORT = process.env.PORT || 8000; // 🟢 ปรับให้รองรับ Port ของ Render อัตโนมัติ
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});