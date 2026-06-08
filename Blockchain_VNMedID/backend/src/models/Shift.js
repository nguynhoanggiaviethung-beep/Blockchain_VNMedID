const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName:  { type: String, default: "" },   // cache tên BS
  specialty:   { type: String, default: "" },   // cache chuyên khoa
  date:        { type: String, required: true }, // "YYYY-MM-DD"
  shift:       { type: String, enum: ["morning", "afternoon", "evening"], default: "morning" },
  room:        { type: String, default: "" },
  maxPatients: { type: Number, default: 20 },
  status:      { type: String, enum: ["active", "inactive", "full"], default: "active" },
  note:        { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);