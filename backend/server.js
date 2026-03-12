import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Route เดิมของคุณ (เอาไว้เช็คว่าเซิร์ฟเวอร์รันติดไหม)
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// ==========================================
// 👇 เพิ่ม Routes สำหรับรับข้อมูลจากหน้าบ้าน (Vite) ตรงนี้ 👇
// ==========================================

// 1. API สำหรับทดสอบระบบ
app.get("/api/test", (req, res) => {
  res.json({ message: "เชื่อมต่อหน้าบ้านกับหลังบ้านสำเร็จแล้ว! 🎉" });
});

// 2. API สำหรับหน้า Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body; // รับข้อมูลที่หน้าบ้านส่งมา
  console.log("ข้อมูล Login ที่ส่งมา:", email, password);
  
  // (เดี๋ยวอนาคตเราค่อยมาเขียนโค้ดเช็คกับ Database ตรงนี้)
  res.json({ success: true, message: "เข้าสู่ระบบสำเร็จ (จำลอง)" });
});

// 3. API สำหรับหน้า Register
app.post("/api/register", (req, res) => {
  const userData = req.body;
  console.log("ข้อมูลสมัครสมาชิกใหม่:", userData);
  
  res.json({ success: true, message: "สมัครสมาชิกสำเร็จ (จำลอง)" });
});

// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});