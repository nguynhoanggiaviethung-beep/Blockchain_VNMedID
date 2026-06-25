// C:\NEW BLOCKCHAIN\Blockchain_VNMedID\backend\src\controllers\invoiceController.js

const Invoice = require('../models/Invoice');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');
const mongoose = require('mongoose'); // Đưa lên đầu file để mọi hàm đều dùng được

// =========================================================================
// 1. TẠO HÓA ĐƠN MỚI (Đảm bảo đồng bộ tuyệt đối với Blockchain)
// =========================================================================
exports.createInvoice = async (req, res) => {
  try {
    const { invoiceId, amount, patientWallet, items, totalVND } = req.body;

    if (!invoiceId || !amount || !patientWallet) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã hóa đơn, số tiền và ví bệnh nhân' });
    }

    const existing = await Invoice.findOne({ invoiceId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã hóa đơn đã tồn tại!' });
    }

    // 🛑 BƯỚC KHÓA: Phải đẩy lên Blockchain THÀNH CÔNG trước khi lưu Database
    let txHash = null;
    let amountWei = null;
    try {
      const paymentContract = getContractInstance('payment');
      amountWei = ethers.parseEther(amount.toString());
      
      // Gọi Smart Contract để tạo hóa đơn On-chain
      const tx = await paymentContract.createInvoice(invoiceId, patientWallet, amountWei);
      await tx.wait(); // Đợi block được đào xong trên Sepolia
      txHash = tx.hash;
    } catch (bcError) {
      console.error('❌ Lỗi đồng bộ blockchain thất bại:', bcError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Không thể tạo hóa đơn trên Blockchain mạng Sepolia. Vui lòng kiểm tra số dư ví Admin hoặc Gas!',
        error: bcError.message 
      });
    }

    // Nếu On-chain thành công mới tiến hành lưu MongoDB
    const invoice = new Invoice({ 
      invoiceId, 
      amount, 
      amountInWei: amountWei.toString(),
      patientWallet, 
      paymentStatus: 'pending',
      items: items || [],
      totalVND: totalVND || 0,
      txHash: txHash // Lưu lại luôn txHash tạo hóa đơn ban đầu
    });
    await invoice.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo hóa đơn thành công và đã đồng bộ lên Blockchain!',
      data: { invoiceId: invoice.invoiceId, txHash }
    });
    
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// =========================================================================
// 2. XỬ LÝ THANH TOÁN HÓA ĐƠN (Xác thực On-chain đồng bộ - KHỚP FRONTEND)
// =========================================================================
exports.makePayment = async (req, res) => {
  try {
    const { invoiceId, txHash, senderWallet } = req.body; // Thêm nhận diện ví người gửi từ frontend

    if (!invoiceId || !txHash) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã hóa đơn và mã giao dịch' });
    }

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn dưới Database!' });
    }

    try {
      const paymentContract = getContractInstance('payment');
      
      // Lấy dữ liệu Struct: [patientWallet, amount, paid] tự Blockchain Sepolia
     const onChainData = await paymentContract.invoices(invoiceId);
     const isPaidOnChain = onChainData.paid || onChainData[2];


      if (!isPaidOnChain) {
        return res.status(400).json({ 
          success: false, 
          message: 'Giao dịch MetaMask thất bại hoặc trạng thái PAID chưa được cập nhật on-chain!' 
        });
      }
    } catch (bcError) {
      console.error('❌ Lỗi xác thực Blockchain:', bcError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Server Backend lỗi kết nối hoặc không thể đồng bộ với mạng Sepolia!', 
        error: bcError.message 
      });
    }

    // Nếu on-chain xác thực đúng là đã thanh toán -> Tiến hành cập nhật DB
    invoice.txHash = txHash;
    invoice.paymentStatus = 'paid';
    
    // Cập nhật ví thực tế thanh toán (chuyển về dạng lowercase để đồng bộ)
    if (senderWallet) {
      invoice.patientWallet = senderWallet.toLowerCase();
    } else if (req.body.patientWallet) {
      invoice.patientWallet = req.body.patientWallet.toLowerCase();
    }
    
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: 'Thanh toán thành công và đồng bộ dữ liệu hoàn tất!',
      data: { paymentStatus: 'paid', invoiceId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// =========================================================================
// 3. LẤY TOÀN BỘ HÓA ĐƠN CỦA TÔI
// =========================================================================
exports.getMyInvoices = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const userId = req.userId || req.user?.userId || req.user?.id;
    let patientWallet = null;

    if (userId) {
      try {
        let objId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
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

// =========================================================================
// 4. LẤY CHI TIẾT 1 HÓA ĐƠN THEO ID (Đã sửa lỗi khai báo mongoose)
// =========================================================================
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params; 
    
    const invoice = await Invoice.findOne({
      $or: [
        { invoiceId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin hóa đơn này!' });
    }

    return res.json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy chi tiết hóa đơn', error: error.message });
  }
};