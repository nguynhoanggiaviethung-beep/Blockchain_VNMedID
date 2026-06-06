// API Format/src/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();

// 1. Import bộ gác cổng và xử lý
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const doctorController = require('../controllers/doctorController');

// 2. Định nghĩa API theo tư duy Nodemy
// Tạo bác sĩ mới: BẮT BUỘC phải đăng nhập VÀ phải là 'admin'
router.post('/', xacThucToken, phanQuyen('admin'), doctorController.createDoctor);

// Xem thông tin bác sĩ: BẮT BUỘC đăng nhập VÀ role phải là 'admin' HOẶC 'doctor'
router.get('/:id', xacThucToken, phanQuyen('admin', 'doctor'), doctorController.getDoctorById);

module.exports = router;
// Lấy danh sách bác sĩ — Admin + Doctor
router.get('/', xacThucToken, phanQuyen('admin', 'doctor'), doctorController.getAllDoctors);

// Cập nhật bác sĩ — chỉ Admin
router.put('/:id', xacThucToken, phanQuyen('admin'), doctorController.updateDoctor);

// Xóa bác sĩ — chỉ Admin
router.delete('/:id', xacThucToken, phanQuyen('admin'), doctorController.deleteDoctor);
