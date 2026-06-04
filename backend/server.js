import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

// 🌟 1. ตั้งค่า Firebase Admin (ใช้ข้อมูลจาก .env)
if (!admin.apps.length) {
  let formattedKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (formattedKey) {
    formattedKey = formattedKey.replace(/^"|"$/g, '');
    formattedKey = formattedKey.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formattedKey,
    }),
  });
  console.log("🔥 Firebase Admin Initialized! (With Auto-Format Key)");
}

const app = express();

app.use(cors());
app.use(express.json());

const db = admin.firestore();

// 1. Route เช็คสถานะเซิร์ฟเวอร์
app.get("/", (req, res) => {
  res.send("Backend Running on Vercel 🚀 (Powered by Google Apps Script & Firebase Admin)");
});

// 2. API สำหรับทดสอบระบบ
app.get("/api/test", (req, res) => {
  res.json({ message: "เชื่อมต่อหน้าบ้านกับหลังบ้านสำเร็จแล้ว! 🎉" });
});

// 3. API สำหรับขอ OTP
app.post("/api/request-otp", async (req, res) => { 
  const { email } = req.body;
  const formattedEmail = email.trim().toLowerCase();
  console.log("📩 มีคนขอ OTP มาที่อีเมล:", formattedEmail);

  // สร้างรหัส OTP 6 หลักแบบสุ่ม
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // 🟢 เก็บ OTP ไว้ใน Firestore แทน Memory (เพื่อรองรับ Serverless)
    await db.collection("otps").doc(formattedEmail).set({
      code: otpCode,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000)
    });

    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyWFvhTdfmWyIOlQT6feXrQCy-qVfMR7f_5y0-v74HqZGLkpMF4USXcBYXdADJKgxiH/exec"; 

    const emailPayload = {
      to: formattedEmail,
      subject: "รหัส OTP สำหรับเข้าสู่ระบบ IdeaTrade",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #333;">รหัส OTP ของคุณ</h2>
          <p style="color: #555; font-size: 16px;">กรุณานำรหัสนี้ไปกรอกในหน้าเว็บไซต์เพื่อยืนยันตัวตน</p>
          <h1 style="color: #4F46E5; letter-spacing: 5px; font-size: 36px; margin: 20px 0;">${otpCode}</h1>
          <p style="color: #999; font-size: 12px;">รหัสนี้มีอายุการใช้งาน 5 นาที</p>
        </div>
      `
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ส่ง OTP [${otpCode}] ไปที่ ${formattedEmail} สำเร็จ!`);
      res.json({ 
        success: true, 
        message: "ระบบได้ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว" 
      });
    } else {
      console.error("❌ Google Script Error:", result.error);
      res.status(500).json({ 
        success: false, 
        message: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง",
        error: result.error
      });
    }

  } catch (error) {
    console.error("❌ Catch Error (Backend):", error);
    res.status(500).json({ 
      success: false, 
      message: "เซิร์ฟเวอร์มีปัญหา", 
      error: error.message 
    });
  }
});

// 🌟 4. API สำหรับยืนยัน OTP
app.post("/api/verify-otp", async (req, res) => { 
  const { email, otp } = req.body;
  const formattedEmail = email.trim().toLowerCase();
  console.log("🔑 กำลังเช็ค OTP:", otp, "ของอีเมล:", formattedEmail);
  
  try {
    // 🟢 1. ดึง OTP จาก Firestore ออกมาเช็ค
    const otpDoc = await db.collection("otps").doc(formattedEmail).get();

    if (!otpDoc.exists) {
      console.log("❌ ไม่พบข้อมูล OTP");
      return res.status(400).json({ success: false, error: "ไม่พบรหัส OTP กรุณากดส่งใหม่อีกครั้ง" });
    }

    const storedData = otpDoc.data();

    // 🟢 2. เช็คเวลาหมดอายุ
    if (Date.now() > storedData.expiresAt.toMillis()) {
      await db.collection("otps").doc(formattedEmail).delete();
      console.log("❌ รหัส OTP หมดอายุ");
      return res.status(400).json({ success: false, error: "รหัส OTP หมดอายุแล้ว กรุณากดส่งใหม่" });
    }

    // 🟢 3. เช็คว่าเลขตรงกันไหม
    if (String(storedData.code) !== String(otp)) {
      console.log("❌ ลูกค้ากรอก OTP ผิด");
      return res.status(400).json({ success: false, error: "รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่" });
    }

    // 🌟 เสก Custom Token ของจริง
    const customToken = await admin.auth().createCustomToken(formattedEmail);
    
    console.log("✅ ยืนยัน OTP และสร้าง Token สำเร็จสำหรับ:", formattedEmail);
    
    // ลบ OTP ออกจาก Firestore
    await db.collection("otps").doc(formattedEmail).delete();

    res.json({ 
      success: true, 
      token: customToken 
    });

  } catch (error) {
    console.error("❌ สร้าง Token พลาด:", error);
    res.status(500).json({ 
      success: false, 
      message: "ไม่สามารถยืนยันตัวตนได้",
      error: error.message
    });
  }
});

// 5. API สำหรับหน้า Login
app.post("/api/login", (req, res) => {
  res.json({ success: true, message: "เข้าสู่ระบบสำเร็จ (จำลอง)" });
});

// 6. API สำหรับหน้า Register
app.post("/api/register", (req, res) => {
  res.json({ success: true, message: "สมัครสมาชิกสำเร็จ (จำลอง)" });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;