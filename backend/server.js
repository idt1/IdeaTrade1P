import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ตั้งค่า CORS ให้รองรับการเรียกจาก Vercel
app.use(cors());
app.use(express.json());

// 1. Route เช็คสถานะเซิร์ฟเวอร์
app.get("/", (req, res) => {
  res.send("Backend Running on Render 🚀 (Powered by Google Apps Script)");
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

  // 👇 1. นำ URL ที่ได้จาก Google Apps Script มาใส่ในนี้ (ต้องอยู่ในเครื่องหมายคำพูด "")
  const GOOGLE_SCRIPT_URL = "วาง_URL_ของ_Google_Apps_Script_ที่ก๊อปปี้มาไว้ตรงนี้"; 

  // 👇 2. จัดเตรียมเนื้อหาอีเมลที่จะส่งไปให้ Google Apps Script
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
    // 👇 3. ยิงคำขอ (HTTP POST) ไปที่ Google Apps Script ของเราแทน Nodemailer
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        // สำคัญ: ใช้ text/plain เลี่ยงปัญหา CORS ตอนยิงทะลุข้ามโดเมน
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

// 4. API สำหรับยืนยัน OTP (จุดที่หน้าบ้าน OtpModal.jsx จะยิงมา)
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  console.log("🔑 กำลังเช็ค OTP:", otp, "ของอีเมล:", email);
  
  res.json({ 
    success: true, 
    token: "mock-firebase-custom-token-for-" + email 
  });
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