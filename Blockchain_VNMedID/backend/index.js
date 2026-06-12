const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. THÊM DÒNG NÀY
require('dotenv').config();

const app = express();

// 2. THÊM ĐOẠN CẤU HÌNH CORS NÀY VÀO TRƯỚC CÁC ROUTES
app.use(cors({
  origin: 'http://localhost:3000', // Đổi lại thành port React của bạn (3000 hoặc 5173 nếu dùng Vite)
  credentials: true // Bắt buộc phải có để truyền Cookie / Session khi làm hệ thống Login
}));

app.use(express.json());

// Routes
app.use('/api/v1/patients',        require('./src/routes/patientRoutes'));
app.use('/api/v1/doctors',         require('./src/routes/doctorRoutes'));
app.use('/api/v1/visits',          require('./src/routes/visitRoutes'));
app.use('/api/v1/medical-records', require('./src/routes/medicalRecordRoutes'));
app.use('/api/v1/invoices',        require('./src/routes/invoiceRoutes'));
app.use('/api/v1/access',          require('./src/routes/accessRoutes'));
app.use('/api/v1/payments',        require('./src/routes/paymentRoutes'));
app.use('/api/v1/auth',            require('./src/routes/authRoutes'));
// ── Thêm vào file routes của bạn (vd: routes/index.js hoặc app.js) ──────────

// (Đoạn router tĩnh phía dưới trong file này bị lỗi do dùng biến `router` chưa được khai báo.
// Server đã map route thông qua các file src/routes/* ở phía trên, nên bỏ qua phần này để boot server.
// (Không đụng blockchain)

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/vnmedid')
  .then(() => {
    console.log('✅ MongoDB connected');
    
    // Thêm số 5000 để dự phòng nếu file .env chưa nhận port
    const PORT = process.env.PORT || 5000; 
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log('❌ MongoDB error:', err));