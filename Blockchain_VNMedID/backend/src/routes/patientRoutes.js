// src/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const {
    createPatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    capNhatHoSoSucKhoe
} = require('../controllers/patientController');

// Tạo bệnh nhân mới — chỉ Admin
router.post('/', xacThucToken, phanQuyen('admin'), createPatient);

// Lấy danh sách bệnh nhân — Admin + Doctor
router.get('/', xacThucToken, phanQuyen('admin', 'doctor'), getAllPatients);

// ⚠️ PHẢI ĐẶT TRƯỚC /:id — route cụ thể hơn lên trước
// Cập nhật hồ sơ sức khỏe — Patient + Admin
router.put('/:id/health-profile', xacThucToken, phanQuyen('patient', 'admin'), capNhatHoSoSucKhoe);

// Lấy 1 bệnh nhân theo ID — Admin + Doctor + Patient
router.get('/:id', xacThucToken, phanQuyen('admin', 'doctor', 'patient'), getPatientById);

// Cập nhật bệnh nhân — chỉ Admin + Doctor + patient
router.put('/:id', xacThucToken, phanQuyen('admin', 'doctor', 'patient'), updatePatient);

// Xóa bệnh nhân — chỉ Admin
router.delete('/:id', xacThucToken, phanQuyen('admin'), deletePatient);

module.exports = router;
