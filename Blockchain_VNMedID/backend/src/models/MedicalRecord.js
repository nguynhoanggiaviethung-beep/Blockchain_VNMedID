const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  visitId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  diagnosis: { type: String, required: true },
  notes:     { type: String },
  ipfsHash:  { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
