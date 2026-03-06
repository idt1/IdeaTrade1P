import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/App.jsx';

// 🟢 Import ตัว Provider
import { SubscriptionProvider } from './context/SubscriptionContext.jsx'; 

// 🟢 สั่ง Render แค่รอบเดียว และเอา Provider ครอบ App ไว้
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SubscriptionProvider>
      <App />
    </SubscriptionProvider>
  </StrictMode>
);