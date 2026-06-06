const express = require('express');
const router = express.Router();
// Import middleware bạn vừa viết
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');

// Route này ai đăng nhập cũng vào được
router.get('/profile', xacThucToken, (req, res) => {
    res.json({ message: "Chào người dùng:", user: req.user });
});

// Route này chỉ Bác sĩ mới được POST hồ sơ
router.post('/add-record', xacThucToken, phanQuyen('doctor'), (req, res) => {
    // Code xử lý thêm bệnh án vào đây
    res.json({ message: "Bác sĩ đã thêm hồ sơ thành công!" });
});

// Route này chỉ Admin mới được xóa dữ liệu
router.delete('/delete-record/:id', xacThucToken, phanQuyen('admin'), (req, res) => {
    // Code xóa hồ sơ
    res.json({ message: "Admin đã xóa hồ sơ." });
});

module.exports = router;