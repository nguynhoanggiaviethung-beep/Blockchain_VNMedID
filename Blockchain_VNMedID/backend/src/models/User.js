// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: [true, 'Vui lòng nhập họ và tên'] 
  },
  email: { 
    type: String, 
    required: [true, 'Vui lòng nhập địa chỉ email'], 
    unique: true 
  },
  password: { 
    type: String, 
    required: [true, 'Vui lòng nhập mật khẩu'] 
  },
  role: { 
    type: String, 
    enum: {
      values: ['admin', 'doctor', 'patient'],
      message: 'Vai trò không hợp lệ! Chỉ được chọn: admin, doctor, hoặc patient.'
    }, 
    default: 'patient'
  },
  // 🔑 BỔ SUNG TRƯỜNG NÀY ĐỂ LƯU VÍ METAMASK CỦA BÁC SĨ/BỆNH NHÂN
  walletAddress: {
    type: String,
    default: '' // Không bắt buộc vì admin có thể không cần ví, nhưng bác sĩ thì cần
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', userSchema, 'users');