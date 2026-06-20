const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  patientId: { type: String, required: true },       // userId của bệnh nhân
  patientWallet: { type: String, required: true },   // Ví công khai của bệnh nhân để kiểm tra chữ ký
  doctorWallet: { type: String, required: true },    // Ví công khai của bác sĩ xin quyền
  doctorName: { type: String, required: true },      // Tên bác sĩ (hiển thị cho bệnh nhân biết)
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  txHash: { type: String, default: "" },             // Mã transaction sau khi On-chain thành công
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);