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

    const { hospitalName } = req.user || {};

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
      hospitalName,
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

    // 1. Lấy userId từ tất cả các vị trí có thể có của Middleware gán vào
    const userId = req.userId || req.user?.id || req.user?.userId;
    let patientWallet = null;

    // 2. Tìm ví của User trong cơ sở dữ liệu
    if (userId) {
      try {
        // Kiểm tra hợp lệ và chuyển đổi sang ObjectId chuẩn mã nguồn MongoDB
        const isObjectId = mongoose.Types.ObjectId.isValid(userId);
        const objId = isObjectId ? new mongoose.Types.ObjectId(userId.toString()) : userId;

        const user = await db.collection('users').findOne({ _id: objId });
        patientWallet = user?.walletAddress || null;
      } catch (dbErr) {
        console.error("Lỗi truy vấn ví user:", dbErr);
      }
    }

    // 3. Dự phòng: Nếu không tìm thấy trong DB, thử lấy từ query params hoặc headers do frontend gửi lên
    if (!patientWallet) {
      patientWallet = req.query.wallet || req.query.patientWallet || null;
    }

    // 4. Nếu cuối cùng vẫn không xác định được ví, trả về mảng rỗng thay vì báo lỗi hệ thống
    if (!patientWallet) {
      return res.json({
        success: true,
        data: [],
        message: 'Hệ thống chưa tìm thấy địa chỉ ví MetaMask liên kết với tài khoản này.'
      });
    }

    // 5. Truy vấn danh sách hóa đơn theo địa chỉ ví (Không phân biệt hoa/thường)
    // Đã loại bỏ dòng const patientId bị thừa và dễ gây crash app phía trên
    const invoices = await Invoice.find({
      patientWallet: { $regex: new RegExp(`^${patientWallet}$`, 'i') }
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: invoices
    });

  } catch (error) {
    console.error("Lỗi tại getMyInvoices:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống trong quá trình lấy danh sách hóa đơn',
      error: error.message
    });
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
// Thêm vào cuối invoiceController.js
// invoiceController.js
exports.getAllInvoices = async (req, res) => {
  try {
    const { hospitalName } = req.user;
    console.log("HOSPITALNAME", hospitalName);
    const User = require('../models/User');
    let filter = {};

    if (hospitalName) {
      filter.hospitalName = { $regex: hospitalName, $options: "i" };
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    // Lấy toàn bộ walletAddress duy nhất từ các hóa đơn
    const wallets = [...new Set(invoices.map(inv => inv.patientWallet).filter(Boolean))];

    // Query 1 lần, map lại theo wallet
    const users = await User.find({
      walletAddress: { $in: wallets.map(w => new RegExp(`^${w}$`, 'i')) }
    }).select('fullName walletAddress').lean();

    const walletToName = {};
    users.forEach(u => {
      walletToName[u.walletAddress.toLowerCase()] = u.fullName;
    });

    // Gắn patientName vào từng hóa đơn
    const result = invoices.map(inv => ({
      ...inv,
      patientName: walletToName[inv.patientWallet?.toLowerCase()] || "Không xác định"
    }));

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};


exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const invoiceId = req.body.invoiceId || req.params.id;

    if (!invoiceId || !status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp invoiceId và status' });
    }

    const allowed = ['pending', 'paid', 'failed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Status không hợp lệ. Chỉ chấp nhận: ${allowed.join(', ')}` });
    }

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
    }

    // Không cho phép đổi trạng thái nếu đã paid (tránh gian lận)
    if (invoice.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Hóa đơn đã thanh toán, không thể cập nhật lại trạng thái!' });
    }

    invoice.paymentStatus = status;
    if (reason) invoice.failReason = reason; // tuỳ chọn lưu lý do thất bại
    await invoice.save();

    return res.json({
      success: true,
      message: `Cập nhật trạng thái hóa đơn thành [${status}] thành công!`,
      data: { invoiceId, paymentStatus: status }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
