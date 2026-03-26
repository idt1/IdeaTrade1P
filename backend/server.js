import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer"; // 👈 1. นำเข้า Nodemailer

dotenv.config();

const app = express();

// ตั้งค่า CORS ให้รองรับการเรียกจาก Vercel
app.use(cors());
app.use(express.json());

// 👈 2. สร้าง Transporter สำหรับส่งอีเมล (ดึงค่าจากไฟล์ .env)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// 1. Route เช็คสถานะเซิร์ฟเวอร์
app.get("/", (req, res) => {
  res.send("Backend Running on Render 🚀");
});

// 2. API สำหรับทดสอบระบบ
app.get("/api/test", (req, res) => {
  res.json({ message: "เชื่อมต่อหน้าบ้านกับหลังบ้านสำเร็จแล้ว! 🎉" });
});

// 3. API สำหรับขอ OTP (จุดที่หน้าบ้าน Welcome.jsx จะยิงมา)
app.post("/api/request-otp", async (req, res) => { // 👈 เติม async เพราะต้องรอส่งเมล
  const { email } = req.body;
  console.log("📩 มีคนขอ OTP มาที่อีเมล:", email);

  // 👈 3. สร้างรหัส OTP 6 หลักแบบสุ่ม
  const otpCode = Math.floor(100000 + Math.random() * 900000);

  // 👈 4. ตั้งค่ารูปแบบอีเมลที่จะส่งออกไป
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "รหัส OTP สำหรับเข้าสู่ระบบ IdeaTrade",
    // ทำเป็น HTML สวยๆ ให้อ่านง่าย
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #333;">รหัส OTP ของคุณ</h2>
        <p style="color: #555; font-size: 16px;">กรุณานำรหัสนี้ไปกรอกในหน้าเว็บไซต์เพื่อยืนยันตัวตน</p>
        <h1 style="color: #4F46E5; letter-spacing: 5px; font-size: 36px; margin: 20px 0;">${otpCode}</h1>
        <p style="color: #999; font-size: 12px;">รหัสนี้มีอายุการใช้งาน 5 นาที</p>
      </div>
    `
  };

  try {
    // 👈 5. สั่งส่งอีเมลจริง
    await transporter.sendMail(mailOptions);
    console.log(`✅ ส่ง OTP [${otpCode}] ไปที่ ${email} สำเร็จ!`);
    
    res.json({ 
      success: true, 
      message: "ระบบได้ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว" 
    });
  } catch (error) {
    console.error("❌ ส่งอีเมลไม่สำเร็จ:", error);
    res.status(500).json({ 
      success: false, 
      message: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง",
      error: error.message 
    });
  }
});

// 4. API สำหรับยืนยัน OTP (จุดที่หน้าบ้าน OtpModal.jsx จะยิงมา)
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  console.log("🔑 กำลังเช็ค OTP:", otp, "ของอีเมล:", email);

  // *หมายเหตุ: ตอนนี้เรายังไม่ได้เก็บค่า OTP ไว้ใน Database 
  // ดังนั้นในการทดสอบ ให้ดูรหัส OTP จากหน้า Console ของ Backend หรือในอีเมลที่ได้รับ
  // แล้วเอามากรอก ถ้าต้องการให้ผ่านชัวร์ๆ ตอนทดสอบสามารถใส่เงื่อนไขชั่วคราวได้
  
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