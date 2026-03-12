import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    allowedHosts: [
      "perplexedly-ungelded-mollie.ngrok-free.dev" // โดเมน ngrok ของคุณ
    ],
    proxy: {
      // 1. อันนี้ของ Node.js (พอร์ต 5000) ที่เราเคยทำไว้
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // 🔴 2. เพิ่มอันนี้ สำหรับ Firebase Emulator (พอร์ต 5001)
      '/ideatrade-9548f': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});