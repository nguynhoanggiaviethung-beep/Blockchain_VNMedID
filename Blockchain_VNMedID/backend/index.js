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
// ── Thêm vào file routes của bạn (vd: routes/index.js hoặc app.js) ──────────

const visitController = require('./controllers/visitController');
const shiftController = require('./controllers/shiftController');

// Visit / Lượt khám
router.post  ('/visits',          visitController.bookAppointment);   // BN đặt lịch
router.get   ('/visits/my',       visitController.getMyAppointments); // BN xem lịch của mình
router.get   ('/visits',          visitController.getAllVisits);       // Admin xem tất cả
router.put   ('/visits/:id',      visitController.updateVisit);       // Admin cập nhật
router.delete('/visits/:id',      visitController.deleteVisit);       // Admin xóa

// Shift / Ca trực bác sĩ
router.post  ('/shifts',          shiftController.createShift);
router.get   ('/shifts',          shiftController.getAllShifts);
router.put   ('/shifts/:id',      shiftController.updateShift);
router.delete('/shifts/:id',      shiftController.deleteShift);
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