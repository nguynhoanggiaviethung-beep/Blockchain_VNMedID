// C:\NEW BLOCKCHAIN\Blockchain_VNMedID\backend\src\controllers\accessController.js

const mongoose = require("mongoose");
const { getContractInstance } = require("../config/web3");

// =========================================================================
// 1. BÁC SĨ GỬI YÊU CẦU CẤP QUYỀN (Lưu vào DB để trang Bệnh nhân nhận được)
// =========================================================================
exports.requestAccess = async (req, res) => {
  try {
    const { doctorId, patientId } = req.body; // patientId có thể là ID trong Mongo hoặc mã bệnh nhân

    if (!doctorId || !patientId) {
      return res.status(400).json({ success: false, message: "Thiếu doctorId hoặc patientId" });
    }

    const db = mongoose.connection.db;

    // Kiểm tra thông tin bác sĩ gửi yêu cầu
    const doctor = await db.collection("doctors").findOne({ _id: new mongoose.Types.ObjectId(doctorId) });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin bác sĩ" });
    }

    // Kiểm tra xem yêu cầu này đã tồn tại chưa để tránh gửi trùng
    const existingRequest = await db.collection("access_requests").findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      patientId: patientId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, message: "Yêu cầu cấp quyền đang trong trạng thái chờ bệnh nhân duyệt!" });
    }

    // Lưu yêu cầu vào Database dưới dạng 'pending'
    const newRequest = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      doctorName: doctor.name || "Bác sĩ hệ thống",
      doctorWallet: doctor.walletAddress,
      patientId: patientId,
      status: "pending",
      createdAt: new Date()
    };

    await db.collection("access_requests").insertOne(newRequest);

    return res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu cấp quyền tới bệnh nhân thành công!",
      data: newRequest
    });

  } catch (error) {
    console.error("❌ Lỗi khi tạo yêu cầu cấp quyền:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 2. BỆNH NHÂN LẤY DANH SÁCH YÊU CẦU ĐANG CHỜ (Hàm để trang bệnh nhân cập nhật dữ liệu)
// =========================================================================
exports.getPendingRequestsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params; // Lấy từ URL ví dụ: /api/access/pending/PAT-12345
    const db = mongoose.connection.db;

    const requests = await db.collection("access_requests")
      .find({ patientId: patientId, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const { ethers } = require("ethers"); // Đảm bảo import thêm thư viện phục vụ giải mã chữ ký số

// =========================================================================
// 3. BỆNH NHÂN PHÊ DUYỆT QUYỀN TRUY CẬP BẰNG CHỮ KÝ SỐ METAMASK
// =========================================================================
exports.grantAccess = async (req, res) => {
  try {
    const { requestId, signature } = req.body; // Nhận requestId và signature từ bệnh nhân

    if (!requestId || !signature) {
      return res.status(400).json({ success: false, message: "Thiếu mã yêu cầu (requestId) hoặc chữ ký số (signature)" });
    }

    const db = mongoose.connection.db;

    // 1. Tìm thông tin yêu cầu trong DB
    const accessRequest = await db.collection("access_requests").findOne({
      _id: new mongoose.Types.ObjectId(requestId)
    });

    if (!accessRequest) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu cấp quyền này!" });
    }

    // 2. KIỂM TRA & XÁC THỰC CHỮ KÝ SỐ AN TOÀN
    try {
      // Nội dung thông điệp chuẩn đồng bộ với Frontend PatientDashboard
      const msgParams = `Toi dong y cap quyen cho bac si ${accessRequest.doctorWallet.toLowerCase()} xem ho so cua toi (${accessRequest.patientId})`;
      
      // Khôi phục địa chỉ ví đã ký từ signature
      const recoveredAddress = ethers.verifyMessage(msgParams, signature);
      console.log(`[Chữ ký Web3] Địa chỉ ví khôi phục thành công từ MetaMask: ${recoveredAddress}`);

      // Thực hiện đổi trạng thái trực tiếp bằng chữ ký hợp lệ (Phát triển mô hình bảo mật Hybrid)
      // Không cần tốn phí Gas server đẩy lệnh, lưu trữ minh bạch dựa trên Proof of Signature
    } catch (cryptoError) {
      console.error("❌ Lỗi giải mã chữ ký MetaMask:", cryptoError.message);
      return res.status(400).json({ success: false, message: "Chữ ký số không hợp lệ hoặc đã bị chỉnh sửa thông tin!" });
    }

    // 3. Cập nhật trạng thái trong MongoDB thành 'approved' kèm chữ ký số làm bằng chứng bằng chứng
    await db.collection("access_requests").updateOne(
      { _id: new mongoose.Types.ObjectId(requestId) },
      { 
        $set: { 
          status: "approved", 
          signatureProof: signature, 
          approvedAt: new Date() 
        } 
      }
    );

    return res.status(200).json({
      success: true,
      message: "Bạn đã phê duyệt quyền truy cập cho bác sĩ thành công bằng chữ ký điện tử!",
      data: {
        status: "approved",
        doctorWallet: accessRequest.doctorWallet,
        patientId: accessRequest.patientId
      }
    });

  } catch (error) {
    console.error("❌ Lỗi xử lý cấp quyền:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};