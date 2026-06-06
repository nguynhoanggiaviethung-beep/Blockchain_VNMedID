const Invoice = require('../models/Invoice');

// POST /invoices — Tạo hóa đơn (Admin)
exports.createInvoice = async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã hóa đơn và số tiền' });
    }

    const existing = await Invoice.findOne({ invoiceId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã hóa đơn đã tồn tại!' });
    }

    const invoice = new Invoice({ invoiceId, amount, paymentStatus: 'pending' });
    await invoice.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn thành công!',
      data: { invoiceId: invoice.invoiceId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// POST /payments — Thanh toán (Patient)
exports.makePayment = async (req, res) => {
  try {
    const { invoiceId, txHash } = req.body;

    if (!invoiceId || !txHash) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã hóa đơn và mã giao dịch' });
    }

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
    }

    invoice.txHash = txHash;
    invoice.paymentStatus = 'paid';
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công!',
      data: { paymentStatus: 'paid' }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
