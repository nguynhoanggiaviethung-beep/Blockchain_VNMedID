const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: { type: String, required: true }, // ✅ String vì lưu từ localStorage userId
  symptoms: { type: String, default: "" },
  diagnosis: { type: String, default: "" },
  prescription: { type: String, default: "" },
  ipfsHash: { type: String, default: "" },
  specialty: { type: String, default: "" },
  appointmentDate: { type: String, default: "" },
  trieuChungLamSang: { type: String, default: "" },
  status: { type: String, default: "pending" },
  chanDoanChuyenMon: { type: String, default: "" }, // ✅ thêm
  huongDieuTri: { type: String, default: "" },       // ✅ thêm
  doctorName: { type: String, default: "" },          // ✅ thêm
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);