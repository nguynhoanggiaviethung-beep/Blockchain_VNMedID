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

// Lấy danh sách bác sĩ — Admin + Doctor
router.get('/', xacThucToken, phanQuyen('admin', 'doctor'), doctorController.getAllDoctors);

// Cập nhật bác sĩ — chỉ Admin
router.put('/:id', xacThucToken, phanQuyen('admin'), doctorController.updateDoctor);

// Xóa bác sĩ — chỉ Admin
router.delete('/:id', xacThucToken, phanQuyen('admin'), doctorController.deleteDoctor);

// 🌟 GỬI KÉ ROUTE: Lấy danh sách bệnh viện độc nhất từ các bác sĩ
// API lúc này Frontend gọi sẽ là: GET /api/v1/doctors/hospitals
router.get('/hospitals', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Quét bảng doctors lấy ra danh sách các bệnh viện khác nhau
    const hospitals = await db.collection('doctors').distinct('hospitalName', {
      hospitalName: { $ne: null }
    });

    return res.json({
      success: true,
      data: hospitals
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
// CHÚ Ý: Luôn để dòng này ở CUỐI CÙNG của file
module.exports = router;
