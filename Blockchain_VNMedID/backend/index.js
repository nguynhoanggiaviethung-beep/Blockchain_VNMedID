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
app.use('/api/v1/patients',        require('./API Format/src/routes/patientRoutes'));
app.use('/api/v1/doctors',         require('./API Format/src/routes/doctorRoutes'));
app.use('/api/v1/visits',          require('./API Format/src/routes/visitRoutes'));
app.use('/api/v1/medical-records', require('./API Format/src/routes/medicalRecordRoutes'));
app.use('/api/v1/invoices',        require('./API Format/src/routes/invoiceRoutes'));
app.use('/api/v1/access',          require('./API Format/src/routes/accessRoutes'));
app.use('/api/v1/payments',        require('./API Format/src/routes/paymentRoutes'));
app.use('/api/v1/auth',            require('./API Format/src/routes/authRoutes'));

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