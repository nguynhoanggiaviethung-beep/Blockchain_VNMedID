const Invoice = require('../models/Invoice');
const { ethers } = require('ethers');

const { getContractInstance } = require('../config/web3');


// POST /invoices — Tạo hóa đơn (Admin)
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

    // Đồng bộ lên blockchain
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

    // === CẬP NHẬT DATABASE (CÓ CHECK VÀ BỔ SUNG PATIENT WALLET) ===
    invoice.txHash = txHash;
    invoice.paymentStatus = 'paid';

    // Nếu trong body gửi lên có truyền patientWallet, và trong database chưa có hoặc khác ví cũ
    if (req.body.patientWallet) {
      invoice.patientWallet = req.body.patientWallet;
      console.log(`📝 Đã cập nhật/bổ sung ví bệnh nhân: ${req.body.patientWallet}`);
    } else {
      console.log(`ℹ️ Giữ nguyên ví bệnh nhân cũ: ${invoice.patientWallet}`);
    }

    await invoice.save();
    // =============================================================
    
// Đồng bộ lên blockchain
  // === XÁC THỰC BLOCKCHAIN CHUẨN ABI TRẢ VỀ ===
    try {
      const paymentContract = getContractInstance('payment');
      
      // Gọi hàm invoices lấy dữ liệu on-chain của invoiceId này
      const onChainData = await paymentContract.invoices(invoiceId);
      
      // Vì onChainData trả về mảng: [patientWallet, amount, paid]
      // Nên onChainData[2] chính là giá trị của biến 'paid' (true/false)
      const isPaidOnChain = onChainData[2]; 

      if (!isPaidOnChain) {
        return res.status(400).json({ 
          success: false, 
          message: 'Hóa đơn chưa được cập nhật trạng thái PAID trên Smart Contract!' 
        });
      }

      console.log(`✅ Blockchain xác nhận hóa đơn ${invoiceId} đã được thanh toán thật!`);
    } catch (bcError) {
      console.error('❌ Lỗi xác thực Blockchain:', bcError.message);
      return res.status(500).json({ success: false, message: 'Hệ thống không thể kết nối Blockchain mạng Sepolia!', error: bcError.message });
    }
    // ===========================================

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công!',
      data: { paymentStatus: 'paid' }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
