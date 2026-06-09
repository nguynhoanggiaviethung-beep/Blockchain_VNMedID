const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Gọi đúng 2 hàm xuất bản từ file authMiddleware của bạn
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');

// 1. Chỉ Bệnh nhân (patient) mới được quyền POST (đăng ký lịch khám)
router.post('/', xacThucToken, phanQuyen('patient'), appointmentController.createAppointment);

// 2. Bác sĩ (doctor) và Admin mới được quyền GET (xem danh sách lịch khám)
router.get('/', xacThucToken, phanQuyen('doctor', 'admin'), appointmentController.getAppointments);

module.exports = router;

