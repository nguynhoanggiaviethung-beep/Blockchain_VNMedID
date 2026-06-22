const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId:        { type: String, required: true },
  symptoms:         { type: String, default: "" },
  diagnosis:        { type: String, default: "" },
  prescription:     { type: String, default: "" },
  ipfsHash:         { type: String, default: "" },
  specialty:        { type: String, default: "" },
  appointmentDate:  { type: String, default: "" },
  trieuChungLamSang:{ type: String, default: "" },
  status:           { type: String, default: "pending" }, // pending | examining | completed | cancelled
  chanDoanChuyenMon:{ type: String, default: "" },
  huongDieuTri:     { type: String, default: "" },
  doctorName:       { type: String, default: "" },
  doctorId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null }, // ✅ thêm để phân công BS
  shiftId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },  // ✅ liên kết ca trực
  patientName:      { type: String, default: "" },
  hospitalName:     { type: String, default: "" }, // ✅ cache tên BN cho dễ hiển thị
  // ✅ THÊM MỚI: Bác sĩ kê tên thuốc → hệ thống tự tra DAV lấy giá
  drugs: [{
    drugName: { type: String, default: "" },  // Tên thuốc từ DAV
    quantity: { type: Number, default: 1 },
    
    priceVND:  { type: Number, default: 0 },  // Giá lấy từ DAV
  }],
  totalVND: { type: Number, default: 0 },     // Tổng tiền VND tự tính
  
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);