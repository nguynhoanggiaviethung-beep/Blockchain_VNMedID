// File: backend/src/routes/accessRoutes.js
const express = require('express');
const router = express.Router();

// Import middleware của bạn
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');

// Import blockchain utilities có sẵn của bạn
const { getContractInstance } = require('../config/web3');
const { getAccessContract } = require('../utils/blockchain');

// Import thư viện để verify signature và model lưu trữ yêu cầu
const { ethers } = require('ethers');
const AccessRequest = require('../models/AccessRequest');

// ✅ Thời hạn cấp quyền mỗi lần duyệt — 1 giờ (đổi số này nếu muốn thay đổi)
const ACCESS_DURATION_MS = 60 * 60 * 1000; // 1 giờ = 60 phút * 60 giây * 1000ms

// ─── ROUTES CƠ BẢN CÓ SẴN CỦA BẠN ──────────────────────────────────────────
router.get('/profile', xacThucToken, (req, res) => {
    res.json({ message: "Chào người dùng:", user: req.user });
});

router.post('/add-record', xacThucToken, phanQuyen('doctor'), (req, res) => {
    res.json({ message: "Bác sĩ đã thêm hồ sơ thành công!" });
});

router.delete('/delete-record/:id', xacThucToken, phanQuyen('admin'), (req, res) => {
    res.json({ message: "Admin đã xóa hồ sơ." });
});

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

// ─── FLOW XIN QUYỀN — BỆNH NHÂN DUYỆT — TỰ ĐỘNG HẾT HẠN ───────────────────

// API 1: Bác sĩ gửi yêu cầu xin quyền
// POST /api/v1/access/requests/create
router.post('/requests/create', xacThucToken, phanQuyen('doctor'), async (req, res) => {
  try {
    const { patientId, patientWallet, doctorWallet, doctorName } = req.body;
    if (!patientId || !patientWallet || !doctorWallet || !doctorName) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin yêu cầu!' });
    }

    // Kiểm tra xem đã tồn tại yêu cầu tương tự đang ở trạng thái pending chưa
    const existing = await AccessRequest.findOne({ patientId, doctorWallet, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Yêu cầu của bạn đang chờ bệnh nhân duyệt rồi!' });
    }

    // Kiểm tra xem đã có quyền đang còn hạn chưa (tránh xin trùng)
    const activeGrant = await AccessRequest.findOne({
      patientId, doctorWallet, status: 'approved',
      expiresAt: { $gt: new Date() }
    });
    if (activeGrant) {
      return res.status(400).json({
        success: false,
        message: `Bạn đang có quyền truy cập hồ sơ này đến ${activeGrant.expiresAt.toLocaleString('vi-VN')}!`
      });
    }

    const newRequest = new AccessRequest({ patientId, patientWallet, doctorWallet, doctorName });
    await newRequest.save();

    return res.json({ success: true, message: 'Đã gửi yêu cầu xin cấp quyền tới bệnh nhân!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
});

// API 2: Bệnh nhân lấy danh sách yêu cầu của chính họ
// GET /api/v1/access/requests/my
router.get('/requests/my', xacThucToken, phanQuyen('patient'), async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin định danh patientId!' });
    }

    const list = await AccessRequest.find({ patientId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: list, accessDurationMs: ACCESS_DURATION_MS });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
});

// API 3: Bệnh nhân phê duyệt bằng chữ ký off-chain → set thời hạn quyền
// POST /api/v1/access/requests/:id/approve
router.post('/requests/:id/approve', xacThucToken, phanQuyen('patient'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const { signature } = req.body;
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Thiếu chữ ký xác thực signature!' });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã xử lý trước đó.' });
    }

    const message = `Toi dong y cap quyen cho bac si ${request.doctorWallet.toLowerCase()} xem ho so cua toi (${request.patientId})`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== request.patientWallet.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Xác thực không hợp lệ! Chữ ký không trùng khớp với ví bệnh nhân.' });
    }

    const contract = getAccessContract();
    const tx = await contract.grantAccess(request.patientId, request.doctorWallet);
    await tx.wait();

    // ✅ Ghi nhận thời điểm duyệt và thời điểm hết hạn quyền
    const now = new Date();
    request.status = 'approved';
    request.txHash = tx.hash;
    request.approvedAt = now;
    request.expiresAt = new Date(now.getTime() + ACCESS_DURATION_MS);
    await request.save();

    return res.json({
      success: true,
      message: `Cấp quyền thành công! Quyền sẽ tự động hết hạn sau ${ACCESS_DURATION_MS / 60000} phút.`,
      data: { txHash: tx.hash, expiresAt: request.expiresAt }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi Blockchain hoặc vai trò Bác sĩ chưa hợp lệ: ' + err.message });
  }
});

// API 4: Bệnh nhân từ chối yêu cầu
// POST /api/v1/access/requests/:id/reject
router.post('/requests/:id/reject', xacThucToken, phanQuyen('patient'), async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã xử lý trước đó.' });
    }
    request.status = 'rejected';
    await request.save();
    return res.json({ success: true, message: 'Đã từ chối yêu cầu truy cập.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
});

// API 5: Bác sĩ xem các quyền truy cập hiện đang còn hạn của mình
// GET /api/v1/access/requests/active-for-doctor
router.get('/requests/active-for-doctor', xacThucToken, phanQuyen('doctor'), async (req, res) => {
  try {
    const { doctorWallet } = req.query;
    if (!doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu doctorWallet!' });
    }

    const activeList = await AccessRequest.find({
      doctorWallet,
      status: 'approved',
      expiresAt: { $gt: new Date() }
    }).sort({ approvedAt: -1 });

    return res.json({ success: true, data: activeList });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
});

// ─── ROUTES TIỆN ÍCH GỐC (admin ép quyền, check, logs) ───────────────────

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

router.post('/revoke', xacThucToken, phanQuyen('admin'), async (req, res) => {
  try {
    const { patientId, doctorWallet } = req.body;
    if (!patientId || !doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu patientId hoặc doctorWallet!' });
    }
    const contract = getAccessContract();
    const tx = await contract.revokeAccess(patientId, doctorWallet);
    await tx.wait();

    // ✅ Đồng bộ trạng thái MongoDB nếu admin thu hồi tay
    await AccessRequest.updateMany(
      { patientId, doctorWallet, status: 'approved' },
      { $set: { status: 'expired', revokeTxHash: tx.hash } }
    );

    return res.json({ success: true, message: 'Thu hồi quyền thành công!', data: { txHash: tx.hash } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi blockchain: ' + err.message });
  }
});

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