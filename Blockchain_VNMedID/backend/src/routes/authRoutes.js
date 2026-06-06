// API Format/src/routes/authRoutes.js
const express = require('express'); // 🔥 ĐÃ SỬA: Chuyển từ import sang require
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/v1/auth/register -> Đăng ký
router.post('/register', authController.register);

// POST /api/v1/auth/login -> Đăng nhập 
router.post('/login', authController.login);
// POST /api/v1/auth/register-patient -> Đăng ký bệnh nhân
router.post('/register-patient', authController.registerPatient);
module.exports = router;
