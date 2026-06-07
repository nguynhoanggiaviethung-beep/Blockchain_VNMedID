const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  fullName:  { type: String, default: '' },
  dob:       { type: String, default: '' },
  gender:    { type: String, default: '' },
  phone:     { type: String, default: '' },
  address:   { type: String, default: '' },
  citizenId: { type: String, default: '', unique: true },
  nhomMau:    { type: String, default: '' },
  tienSuBenh: { type: String, default: '' },
  diUng:      { type: String, default: '' },
  trieuChung: { type: String, default: '' },
  ghiChu:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);