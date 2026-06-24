const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId:     { type: String, required: true, unique: true },
  amount:        { type: Number },
  amountInWei:   { type: String, default: "" }, 
  patientWallet: { type: String },
  txHash:        { type: String },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

  items: [{
        drugName: String,
        priceVND: Number
    }],
    totalVND: { type: Number }, // Lưu thêm tổng VND để đối chiếu nếu cần

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
