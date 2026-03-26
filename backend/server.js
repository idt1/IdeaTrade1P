import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin"; // 👈 นำเข้า Firebase Admin

dotenv.config();

// 🌟 1. ตั้งค่า Firebase Admin (ใช้ข้อมูลจาก .env)
if (!admin.apps.length) {
  // ดึงคีย์มาเก็บในตัวแปรก่อน
  let formattedKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (formattedKey) {
    // ทริคปราบเซียน: ลบเครื่องหมายคำพูด (") ที่หัวและท้ายออกให้หมด (เผื่อติดมาตอนก๊อปใส่ Render)
    formattedKey = formattedKey.replace(/^"|"$/g, '');
    // แปลงอักขระ \n ให้กลายเป็นการขึ้นบรรทัดใหม่จริงๆ
    formattedKey = formattedKey.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formattedKey, // 👈 ใช้คีย์ที่ล้างทำความสะอาดแล้ว
    }),
  });
  console.log("🔥 Firebase Admin Initialized! (With Auto-Format Key)");
}

const app = express();

// ตั้งค่า CORS ให้รองรับการเรียกจาก Vercel
app.use(cors());
app.use(express.json());

// 1. Route เช็คสถานะเซิร์ฟเวอร์
app.get("/", (req, res) => {
  res.send("Backend Running on Render 🚀 (Powered by Google Apps Script & Firebase Admin)");
});

// 2. API สำหรับทดสอบระบบ
app.get("/api/test", (req, res) => {
  res.json({ message: "เชื่อมต่อหน้าบ้านกับหลังบ้านสำเร็จแล้ว! 🎉" });
});

// 3. API สำหรับขอ OTP (จุดที่หน้าบ้าน Welcome.jsx จะยิงมา)
app.post("/api/request-otp", async (req, res) => { 
  const { email } = req.body;
  console.log("📩 มีคนขอ OTP มาที่อีเมล:", email);

  // สร้างรหัส OTP 6 หลักแบบสุ่ม
  const otpCode = Math.floor(100000 + Math.random() * 900000);

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWFvhTdfmWyIOlQT6feXrQCy-qVfMR7f_5y0-v74HqZGLkpMF4USXcBYXdADJKgxiH/exec"; 

  const emailPayload = {
    to: email,
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

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ส่ง OTP [${otpCode}] ไปที่ ${email} สำเร็จผ่าน Google Script!`);
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

// 🌟 4. API สำหรับยืนยัน OTP (อัปเดตเป็นของจริงแล้ว)
app.post("/api/verify-otp", async (req, res) => { // 👈 เติม async ตรงนี้
  const { email, otp } = req.body;
  console.log("🔑 กำลังเช็ค OTP:", otp, "ของอีเมล:", email);
  
  // (ณ ตอนนี้ระบบจะยอมให้ผ่านเลยถ้ากดยืนยัน OTP อนาคตเราค่อยมาเพิ่มการเช็คเลข OTP ให้ตรงกัน)

  try {
    // 🌟 เสก Custom Token ของจริง! (ใช้ email เป็นรหัสประจำตัวผู้ใช้)
    const customToken = await admin.auth().createCustomToken(email);
    
    console.log("✅ สร้าง Token ของจริงสำเร็จสำหรับ:", email);
    
    // ส่ง Token กลับไปให้หน้าบ้าน
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

// 5. API สำหรับหน้า Login (เดิมของคุณ)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  console.log("ข้อมูล Login ที่ส่งมา:", email, password);
  res.json({ success: true, message: "เข้าสู่ระบบสำเร็จ (จำลอง)" });
});

// 6. API สำหรับหน้า Register (เดิมของคุณ)
app.post("/api/register", (req, res) => {
  const userData = req.body;
  console.log("ข้อมูลสมัครสมาชิกใหม่:", userData);
  res.json({ success: true, message: "สมัครสมาชิกสำเร็จ (จำลอง)" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});