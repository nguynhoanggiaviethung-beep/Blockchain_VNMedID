const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
},
  symptoms: { type: String, default: "" },
  diagnosis: { type: String, default: "" },
  prescription: { type: String, default: "" },
  ipfsHash: { type: String, default: "" },
  specialty: { type: String, default: "" },
  appointmentDate: { type: String, default: "" },
  trieuChungLamSang: { type: String, default: "" },
  status: { type: String, default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);