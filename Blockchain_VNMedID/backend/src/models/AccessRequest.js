const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  patientId: { type: String, required: true },       // userId của bệnh nhân
  patientWallet: { type: String, required: true },   // Ví công khai của bệnh nhân để kiểm tra chữ ký
  doctorWallet: { type: String, required: true },    // Ví công khai của bác sĩ xin quyền
  doctorName: { type: String, required: true },      // Tên bác sĩ (hiển thị cho bệnh nhân biết)
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'expired', 'revoked'], 
    default: 'pending' 
  },
  txHash: { type: String, default: "" },             // Mã transaction lúc cấp quyền on-chain
  revokeTxHash: { type: String, default: "" },        // ✅ Mã transaction lúc thu hồi quyền on-chain
  approvedAt: { type: Date, default: null },          // ✅ Thời điểm bệnh nhân duyệt
  expiresAt: { type: Date, default: null },           // ✅ Thời điểm quyền tự động hết hạn
  revokedAt: { type: Date, default: null },           // ✅ Thời điểm quyền bị thu hồi
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);