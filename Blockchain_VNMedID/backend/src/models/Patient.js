const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // ===== THÔNG TIN CƠ BẢN (đã có) =====
  fullName:  { type: String, required: [true, 'Vui lòng nhập họ tên'] },
  dob:       { type: String, required: [true, 'Vui lòng nhập ngày sinh'] },
  gender:    { type: String, required: [true, 'Vui lòng nhập giới tính'] },
  phone:     { type: String, required: [true, 'Vui lòng nhập số điện thoại'] },
  address:   { type: String, required: [true, 'Vui lòng nhập địa chỉ'] },
  citizenId: { type: String, required: [true, 'Vui lòng nhập số CCCD'], unique: true },

  // ===== HỒ SƠ SỨC KHỎE (thêm mới) =====
  nhomMau:    { type: String, default: '' },  // Nhóm máu: A, B, AB, O
  tienSuBenh: { type: String, default: '' },  // Tiền sử bệnh lý
  diUng:      { type: String, default: '' },  // Dị ứng thuốc/thực phẩm
  trieuChung: { type: String, default: '' },  // Triệu chứng hiện tại
  ghiChu:     { type: String, default: '' },  // Ghi chú thêm

}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
