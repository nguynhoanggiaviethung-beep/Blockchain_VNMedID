// File: backend/src/controllers/accessController.js
const { ethers } = require('ethers');
const AccessRequest = require('../models/AccessRequest');
const { getAccessContract } = require('../utils/blockchain');

// ✅ Thời hạn cấp quyền mỗi lần duyệt — 1 giờ
const ACCESS_DURATION_MS = 60 * 60 * 1000;

// 1. BÁC SĨ GỬI YÊU CẦU CẤP QUYỀN
exports.requestAccess = async (req, res) => {
  try {
    const { patientId, patientWallet, doctorWallet, doctorName } = req.body;
    if (!patientId || !patientWallet || !doctorWallet || !doctorName) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin yêu cầu!' });
    }

    const cleanDoctorWallet = doctorWallet.toLowerCase();
    const cleanPatientWallet = patientWallet.toLowerCase();

    // Kiểm tra yêu cầu trùng ở trạng thái pending
    const existing = await AccessRequest.findOne({ patientId, doctorWallet: cleanDoctorWallet, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Yêu cầu của bạn đang chờ bệnh nhân duyệt rồi!' });
    }

    // Kiểm tra quyền còn hạn
    const activeGrant = await AccessRequest.findOne({
      patientId,
      doctorWallet: cleanDoctorWallet,
      status: 'approved',
      expiresAt: { $gt: new Date() }
    });
    if (activeGrant) {
      return res.status(400).json({
        success: false,
        message: `Bạn đang có quyền truy cập hồ sơ này đến ${activeGrant.expiresAt.toLocaleString('vi-VN')}!`
      });
    }

    const newRequest = new AccessRequest({ 
      patientId, 
      patientWallet: cleanPatientWallet, 
      doctorWallet: cleanDoctorWallet, 
      doctorName 
    });
    await newRequest.save();

    return res.json({ success: true, message: 'Đã gửi yêu cầu xin cấp quyền tới bệnh nhân!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
};

// 2. BỆNH NHÂN LẤY DANH SÁCH YÊU CẦU CỦA CHÍNH HỌ
exports.getPendingRequestsForPatient = async (req, res) => {
  try {
    const { patientId } = req.query; // Hoặc req.params tùy frontend gọi
    const idToSearch = patientId || req.params.patientId;
    
    if (!idToSearch) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin định danh patientId!' });
    }

    const list = await AccessRequest.find({ patientId: idToSearch }).sort({ createdAt: -1 });
    return res.json({ success: true, data: list, accessDurationMs: ACCESS_DURATION_MS });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
};

// 3. BỆNH NHÂN PHÊ DUYỆT BẰNG CHỮ KÝ OFF-CHAIN + ĐẨY SMART CONTRACT
exports.grantAccess = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.requestId;
    const { signature } = req.body;
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Thiếu chữ ký xác thực signature!' });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã xử lý trước đó.' });
    }

    // Xác thực chữ ký số MetaMask khớp với ví bệnh nhân
    const message = `Toi dong y cap quyen cho bac si ${request.doctorWallet.toLowerCase()} xem ho so cua toi (${request.patientId})`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== request.patientWallet.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Xác thực không hợp lệ! Chữ ký không trùng khớp.' });
    }

    // Tương tác Smart Contract
    const contract = getAccessContract();
    const tx = await contract.grantAccess(request.patientId, request.doctorWallet);
    await tx.wait();

    // Cập nhật gia hạn 1 giờ
    const now = new Date();
    request.status = 'approved';
    request.txHash = tx.hash;
    request.approvedAt = now;
    request.expiresAt = new Date(now.getTime() + ACCESS_DURATION_MS);
    await request.save();

    return res.json({
      success: true,
      message: `Cấp quyền thành công! Quyền sẽ tự động hết hạn sau 60 phút.`,
      data: { txHash: tx.hash, expiresAt: request.expiresAt }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi Blockchain hoặc chữ ký: ' + err.message });
  }
};

// 4. BỆNH NHÂN TỪ CHỐI YÊU CẦU
exports.rejectAccess = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.requestId;
    const request = await AccessRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã xử lý.' });
    }
    request.status = 'rejected';
    await request.save();
    return res.json({ success: true, message: 'Đã từ chối yêu cầu truy cập.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
};

// 5. BÁC SĨ XEM QUYỀN CÒN HẠN
exports.getActiveRequestsForDoctor = async (req, res) => {
  try {
    const { doctorWallet } = req.query;
    if (!doctorWallet) {
      return res.status(400).json({ success: false, message: 'Thiếu doctorWallet!' });
    }

    const activeList = await AccessRequest.find({
      doctorWallet: { $regex: new RegExp(`^${doctorWallet}$`, 'i') },
      status: 'approved',
      expiresAt: { $gt: new Date() }
    }).sort({ approvedAt: -1 });

    return res.json({ success: true, data: activeList });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
};