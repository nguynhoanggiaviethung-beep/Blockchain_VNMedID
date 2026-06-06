const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId:     { type: String, required: true, unique: true },
  amount:        { type: Number },
  txHash:        { type: String },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
