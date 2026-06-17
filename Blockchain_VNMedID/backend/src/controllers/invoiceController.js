const Invoice = require('../models/Invoice');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');

exports.createInvoice = async (req, res) => {
  try {
    const { invoiceId, amount, patientWallet } = req.body;

    if (!invoiceId || !amount || !patientWallet) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã hóa đơn, số tiền và ví bệnh nhân' });
    }

    const existing = await Invoice.findOne({ invoiceId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã hóa đơn đã tồn tại!' });
    }

    const invoice = new Invoice({ invoiceId, amount, patientWallet, paymentStatus: 'pending' });
    await invoice.save();

    let txHash = null;
    try {
      const paymentContract = getContractInstance('payment');
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await paymentContract.createInvoice(invoiceId, patientWallet, amountWei);
      await tx.wait();
      txHash = tx.hash;
    } catch (bcError) {
      console.error('Lỗi đồng bộ blockchain:', bcError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn thành công!',
      data: { invoiceId: invoice.invoiceId, txHash }
    });
    
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

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

    if (req.body.patientWallet) {
      invoice.patientWallet = req.body.patientWallet;
    }

    await invoice.save();

    try {
      const paymentContract = getContractInstance('payment');
      const onChainData = await paymentContract.invoices(invoiceId);
      const isPaidOnChain = onChainData[2];

      if (!isPaidOnChain) {
        return res.status(400).json({ 
          success: false, 
          message: 'Hóa đơn chưa được cập nhật trạng thái PAID trên Smart Contract!' 
        });
      }
    } catch (bcError) {
      console.error('❌ Lỗi xác thực Blockchain:', bcError.message);
      return res.status(500).json({ success: false, message: 'Hệ thống không thể kết nối Blockchain Sepolia!', error: bcError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công!',
      data: { paymentStatus: 'paid' }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ✅ Fix bóc tách token linh hoạt phục vụ hiển thị trên web deploy
exports.getMyInvoices = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const userId = req.userId || req.user?.userId || req.user?.id;
    let patientWallet = null;

    if (userId) {
      try {
        let objId;
        try { objId = new mongoose.Types.ObjectId(userId); } catch(_) { objId = userId; }
        const user = await db.collection('users').findOne({ _id: objId });
        patientWallet = user?.walletAddress || null;
      } catch {}
    }

    if (!patientWallet) {
      patientWallet = req.query.wallet || null;
    }

    if (!patientWallet) {
      return res.json({ success: true, data: [], message: 'Chưa liên kết ví MetaMask' });
    }

    const invoices = await Invoice.find({
      patientWallet: { $regex: new RegExp(`^${patientWallet}$`, 'i') }
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: invoices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};