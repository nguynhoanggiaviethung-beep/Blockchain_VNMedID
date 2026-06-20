const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  "Họ và tên": { type: String, required: true },
  "Ngày sinh": { type: String, required: true }, // hoặc Type: Date
  "Giới tính": { type: String, required: true },
  "Số điện thoại": { type: String, required: true },
  "Chuyên Khoa": { type: String, required: true }, 
  "Mã Bác sĩ": { type: String, required: true },
  "Giấy phép hành nghề": { type: String, required: true },
  "Tên Bệnh viện": { type: String, default: "Hệ thống Y tế số VNmedID" } // Lưu String để giữ đủ 12 số 0
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);