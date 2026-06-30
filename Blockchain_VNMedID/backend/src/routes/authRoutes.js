const express = require('express');
const router = express.Router();
const { xacThucToken } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// POST /api/v1/auth/register → Đăng ký bác sĩ/admin
router.post('/register', authController.register);

// POST /api/v1/auth/login → Đăng nhập bằng email
router.post('/login', authController.login);

// POST /api/v1/auth/register-patient → Đăng ký bệnh nhân
router.post('/register-patient', authController.registerPatient);

// ✅ POST /api/v1/auth/login-wallet → Đăng nhập bằng ví MetaMask
router.post('/login-wallet', authController.loginWithWallet);

// ✅ PUT /api/v1/auth/wallet → Lưu ví MetaMask sau khi đăng nhập
router.put('/wallet', xacThucToken, authController.saveWallet);

// ⚠️ module.exports PHẢI đặt cuối cùng
module.exports = router;