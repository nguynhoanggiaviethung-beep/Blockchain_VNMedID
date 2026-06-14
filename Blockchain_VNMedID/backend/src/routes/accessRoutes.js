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

const { getContractInstance } = require('../config/web3');
const { getAccessContract } = require('../utils/blockchain');

// POST /api/v1/access/register-doctor — Admin đăng ký ví bác sĩ vào UserRegistry
router.post('/register-doctor', xacThucToken, phanQuyen('admin'), async (req, res) => {
  try {
    const { wallet, userId } = req.body;
    if (!wallet || !userId) {
      return res.status(400).json({ success: false, message: 'Thiếu wallet hoặc userId!' });
    }

    const userRegistry = getContractInstance('userRegistry');
    const ROLE_DOCTOR = 2;
    const tx = await userRegistry.registerUser(wallet, userId, ROLE_DOCTOR);
    await tx.wait();

    return res.json({ success: true, message: 'Đã đăng ký ví là doctor!', data: { txHash: tx.hash } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

// POST /api/v1/access/grant
router.post('/grant', xacThucToken, phanQuyen('admin'), async (req, res) => {
  try {
    const { patientId, doctorWallet } = req.body;
    if (!patientId || !doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu patientId hoặc doctorWallet!' });
    }
    const contract = getAccessContract();
    const tx = await contract.grantAccess(patientId, doctorWallet);
    await tx.wait();
    return res.json({ success: true, message: 'Cấp quyền thành công!', data: { txHash: tx.hash } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

// POST /api/v1/access/revoke
router.post('/revoke', xacThucToken, phanQuyen('admin'), async (req, res) => {
  try {
    const { patientId, doctorWallet } = req.body;
    if (!patientId || !doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu patientId hoặc doctorWallet!' });
    }
    const contract = getAccessContract();
    const tx = await contract.revokeAccess(patientId, doctorWallet);
    await tx.wait();
    return res.json({ success: true, message: 'Thu hồi quyền thành công!', data: { txHash: tx.hash } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

// GET /api/v1/access/check
router.get('/check', xacThucToken, async (req, res) => {
  try {
    const { patientId, doctorWallet } = req.query;
    if (!patientId || !doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu patientId hoặc doctorWallet!' });
    }
    const contract = getAccessContract();
    const hasAccess = await contract.checkAccess(patientId, doctorWallet);
    return res.json({ success: true, data: { hasAccess, patientId, doctorWallet } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

// GET /api/v1/access/logs
router.get('/logs', xacThucToken, phanQuyen('admin'), async (req, res) => {
  try {
    const contract = getAccessContract();
    const count = await contract.getLogCount();
    const logs = [];
    for (let i = 0; i < count; i++) {
      const log = await contract.getLog(i);
      logs.push({
        patientId: log.patientId,
        doctorWallet: log.doctorWallet,
        allowed: log.allowed,
        time: new Date(Number(log.time) * 1000).toLocaleString('vi-VN')
      });
    }
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

module.exports = router;