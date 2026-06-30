// File: backend/src/controllers/accessController.js
const { ethers } = require('ethers');
const AccessRequest = require('../models/AccessRequest');
const { getAccessContract } = require('../utils/blockchain');

// ✅ Thời hạn cấp quyền mỗi lần duyệt — 1 giờ
const ACCESS_DURATION_MS = 60 * 60 * 1000;

// 1. BÁC SĨ GỬI YÊU CẦU CẤP QUYỀN (Đã sửa đổi trỏ đúng vào collection 'users')
exports.requestAccess = async (req, res) => {
  try {
    const { doctorId, patientId, patientWallet, doctorWallet, doctorName } = req.body; 

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin định danh patientId!' });
    }

    const mongoose = require("mongoose");
    const db = mongoose.connection.db;

    // === 1. XỬ LÝ TRÍCH XUẤT VÍ BÁC SĨ ===
    // Ưu tiên 1: Lấy ví thực tế từ token đăng nhập hoặc body frontend gửi lên
    let finalDoctorWallet = doctorWallet || (req.user && (req.user.walletAddress || req.user.wallet));
    let finalDoctorName = doctorName || (req.user && (req.user.fullName || req.user.name)) || "Bác sĩ hệ thống";

    // Ưu tiên 2: Nếu vẫn trống ví, lục tìm trong collection "users" theo ID
    if (!finalDoctorWallet && doctorId) {
      // 🎯 ĐÃ ĐỔI: Tìm kiếm bên collection "users" thay vì "doctors"
      const user = await db.collection("users").findOne({ 
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(doctorId) ? new mongoose.Types.ObjectId(doctorId) : null },
          { id: doctorId },
          { doctorId: doctorId }
        ].filter(Boolean)
      });
      
      if (user) {
        // Áp dụng chính xác tên các trường fullName và walletAddress từ cấu trúc tài khoản của bạn
        finalDoctorWallet = user.walletAddress || user.wallet || user.address;
        finalDoctorName = user.fullName || user.name || finalDoctorName;
      }
    }

    // === 2. XỬ LÝ TRÍCH XUẤT VÍ BỆNH NHÂN ===
    let finalPatientWallet = patientWallet;
    if (!finalPatientWallet) {
      const patient = await db.collection("patients").findOne({ 
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(patientId) ? new mongoose.Types.ObjectId(patientId) : null },
          { patientId: patientId },
          { id: patientId }
        ].filter(Boolean)
      });
      if (patient) {
        finalPatientWallet = patient.walletAddress || patient.wallet || patient.address;
      }
    }

    // === 3. KIỂM TRA BẢO VỆ CUỐI CÙNG ===
    if (!finalDoctorWallet || !finalPatientWallet) {
      return res.status(400).json({ 
        success: false, 
        message: `Dữ liệu không đủ để tạo giao dịch Web3! Ví bác sĩ: ${finalDoctorWallet}, Ví bệnh nhân: ${finalPatientWallet}.`,
        advice: "Hãy đảm bảo tài khoản bác sĩ trong bảng 'users' đã được cập nhật trường 'walletAddress'!"
      });
    }

    const cleanDoctorWallet = finalDoctorWallet.toLowerCase();
    const cleanPatientWallet = finalPatientWallet.toLowerCase();

    // Kiểm tra yêu cầu trùng ở trạng thái pending
    const existing = await AccessRequest.findOne({ patientId, doctorWallet: cleanDoctorWallet, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Yêu cầu của bạn đang chờ bệnh nhân duyệt rồi!' });
    }

    // Kiểm tra quyền còn hạn (1 giờ)
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

    // Lưu vào database
    const newRequest = new AccessRequest({ 
      patientId, 
      patientWallet: cleanPatientWallet, 
      doctorWallet: cleanDoctorWallet, 
      doctorName: finalDoctorName 
    });
    await newRequest.save();

    return res.json({ success: true, message: 'Đã gửi yêu cầu xin cấp quyền tới bệnh nhân!' });
  } catch (err) {
    console.error("❌ Lỗi API xin quyền:", err);
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
// 6. BỆNH NHÂN CHỦ ĐỘNG THU HỒI QUYỀN
exports.revokeAccessByPatient = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.requestId;

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu truy cập!' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Quyền này chưa được cấp hoặc đã bị thu hồi rồi!' });
    }

    // Gọi smart contract thu hồi on-chain
    try {
      const contract = getAccessContract();
      const tx = await contract.revokeAccess(request.patientId, request.doctorWallet);
      await tx.wait();
      request.revokeTxHash = tx.hash;
      console.log(`[Blockchain] Bệnh nhân thu hồi quyền thành công! TxHash: ${tx.hash}`);
    } catch (bcErr) {
      console.error('❌ Lỗi thu hồi on-chain:', bcErr.message);
      // Không chặn flow — vẫn cập nhật DB dù on-chain lỗi
    }

    request.status = 'revoked';
    request.revokedAt = new Date();
    await request.save();

    return res.json({ 
      success: true, 
      message: 'Đã thu hồi quyền truy cập thành công!',
      data: { revokedAt: request.revokedAt }
    });
  } catch (err) {
    console.error('❌ Lỗi thu hồi quyền:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
  }
};