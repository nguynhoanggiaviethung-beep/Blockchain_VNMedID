const Visit = require('../models/Visit');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');
const { uploadJSONToIPFS, getIPFSGatewayUrl } = require('../utils/ipfs'); // ✅ Thêm IPFS

// ─── BỆNH NHÂN ĐẶT LỊCH ────────────────────────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    const { patientId, patientName, specialty, appointmentDate, trieuChungLamSang, hospitalName } = req.body;

    if (!patientId || !specialty || !appointmentDate || !hospitalName) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn chuyên khoa, ngày khám và bệnh viện!' });
    }

    const visit = new Visit({
      patientId,
      patientName: patientName || "",
      specialty,
      appointmentDate,
      trieuChungLamSang: trieuChungLamSang || "",
      hospitalName,
      status: "pending"
    });
    await visit.save();

    return res.status(201).json({ success: true, data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── BÁC SĨ LẤY DANH SÁCH CHỜ THEO BỆNH VIỆN CÔNG TÁC ──────────────────────
exports.getDoctorPendingVisits = async (req, res) => {
  try {
    const doctorId = req.user?.userId;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin xác thực bác sĩ!' });
    }

    const db = mongoose.connection.db;
    const doctorInfo = await db.collection("doctors").findOne({ _id: new mongoose.Types.ObjectId(doctorId) });
    if (!doctorInfo || !doctorInfo.hospitalName) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bệnh viện của bác sĩ này!' });
    }

    const currentHospital = doctorInfo.hospitalName;

    const pendingVisits = await Visit.find({
      hospitalName: currentHospital,
      status: "pending"
    }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      hospitalName: currentHospital,
      count: pendingVisits.length,
      data: pendingVisits
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── BỆNH NHÂN XEM LỊCH CỦA MÌNH ───────────────────────────────────────────
exports.getMyAppointments = async (req, res) => {
  try {
    const patientId = req.user?.userId || req.query.patientId;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Thiếu patientId!' });
    }

    const visits = await Visit.find({ patientId: patientId })
      .populate('doctorId', 'fullName specialty')
      .populate('shiftId', 'shift room date')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: visits });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ADMIN: LẤY TẤT CẢ LƯỢT KHÁM ───────────────────────────────────────────
exports.getAllVisits = async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (date) filter.appointmentDate = date;

    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName:  { $regex: search, $options: 'i' } },
        { specialty:   { $regex: search, $options: 'i' } },
        { patientId:   { $regex: search, $options: 'i' } },
        { hospitalName:{ $regex: search, $options: 'i' } },
      ];
    }

    const visits = await Visit.find(filter)
      .populate('doctorId', 'fullName specialty licenseNumber')
      .populate('shiftId', 'shift room date')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { total: visits.length, records: visits }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ADMIN/DOCTOR: CẬP NHẬT LƯỢT KHÁM ───────────────────────────────────────
// ✅ Khi status chuyển thành "completed" → upload IPFS + ghi hash lên blockchain + tự sinh hóa đơn
exports.updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, doctorId, doctorName, shiftId,
      diagnosis, chanDoanChuyenMon, huongDieuTri,
      prescription, note, hospitalName
    } = req.body;

    // Lấy visit gốc trước để biết trạng thái cũ và đủ context
    const existingVisit = await Visit.findById(id);
    if (!existingVisit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    const isCompletingNow = status === 'completed' && existingVisit.status !== 'completed';

    let ipfsHash = existingVisit.ipfsHash || "";
    let ipfsUrl = ipfsHash ? getIPFSGatewayUrl(ipfsHash) : "";
    let recordTxHash = null;

    // ========================================================
    // 📦 NẾU ĐANG HOÀN THÀNH CA KHÁM: Upload bệnh án lên IPFS + ghi hash lên blockchain
    // ========================================================
    if (isCompletingNow) {
      const finalDiagnose = chanDoanChuyenMon || diagnosis || "";
      const finalPrescription = huongDieuTri || prescription || "";

      // Bước 1: Upload nội dung bệnh án đầy đủ lên IPFS (bất biến)
      try {
        const recordPayload = {
          recordId: id,
          patientId: String(existingVisit.patientId),
          specialty: existingVisit.specialty || "",
          appointmentDate: existingVisit.appointmentDate || "",
          trieuChungLamSang: existingVisit.trieuChungLamSang || "",
          chanDoanChuyenMon: finalDiagnose,
          huongDieuTri: finalPrescription,
          doctorName: doctorName || "",
          timestamp: new Date().toISOString(),
        };

        ipfsHash = await uploadJSONToIPFS(recordPayload, `vnmedid-record-${id}`);
        ipfsUrl = getIPFSGatewayUrl(ipfsHash);
        console.log(`[IPFS] Đã upload bệnh án lên IPFS: ${ipfsUrl}`);
      } catch (ipfsError) {
        console.error('❌ Lỗi upload IPFS:', ipfsError.message);
        // Không chặn flow nếu IPFS lỗi
      }

      // Bước 2: Ghi hash (đại diện cho ipfsHash) lên Sepolia qua contract MedicalRecord
      try {
        const targetPatientKey = String(existingVisit.patientId);
        const hashSource = ipfsHash
          ? JSON.stringify({ recordId: id, ipfsHash })
          : JSON.stringify({ recordId: id, diagnose: finalDiagnose, prescription: finalPrescription, doctorName });

        const recordHash = ethers.keccak256(ethers.toUtf8Bytes(hashSource));

        console.log(`[Blockchain] Đẩy hash bệnh án lên Key: ${targetPatientKey}`);
        const medicalContract = getContractInstance('medicalRecord');
        const tx = await medicalContract.addRecordHash(
          targetPatientKey,
          "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586",
          recordHash
        );
        await tx.wait();
        recordTxHash = tx.hash;
        console.log(`[Blockchain] Đẩy lên thành công! TxHash: ${tx.hash}`);
      } catch (bcError) {
        console.error('Lỗi đồng bộ MedicalRecord blockchain:', bcError.message);
      }
    }

    // ========================================================
    // 💾 CẬP NHẬT VISIT TRONG MONGODB
    // ========================================================
    const updated = await Visit.findByIdAndUpdate(
      id,
      {
        ...(status            !== undefined && { status }),
        ...(doctorId          !== undefined && { doctorId }),
        ...(doctorName        !== undefined && { doctorName }),
        ...(shiftId           !== undefined && { shiftId }),
        ...(diagnosis         !== undefined && { diagnosis }),
        ...(chanDoanChuyenMon !== undefined && { chanDoanChuyenMon }),
        ...(huongDieuTri      !== undefined && { huongDieuTri }),
        ...(prescription      !== undefined && { prescription }),
        ...(note              !== undefined && { note }),
        ...(hospitalName      !== undefined && { hospitalName }),
        ...(isCompletingNow   && { ipfsHash }), // ✅ chỉ ghi ipfsHash khi vừa hoàn thành
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    // ========================================================
    // 💳 TỰ ĐỘNG SINH HÓA ĐƠN VIỆN PHÍ (chỉ khi vừa hoàn thành ca khám)
    // ========================================================
    if (isCompletingNow) {
      try {
        const db = mongoose.connection.db;
        let patientObjectId;
        try { patientObjectId = new mongoose.Types.ObjectId(updated.patientId); } catch (_) {}

        const patientUser = await db.collection('users').findOne({
          $or: [{ _id: patientObjectId }, { _id: updated.patientId }]
        });

        if (patientUser && patientUser.walletAddress) {
          const generatedInvoiceId = "INV-" + Math.floor(10000000 + Math.random() * 90000000);
          const defaultAmount = 0.002;

          const autoInvoice = new Invoice({
            invoiceId: generatedInvoiceId,
            amount: defaultAmount,
            patientWallet: patientUser.walletAddress,
            paymentStatus: 'pending',
            createdAt: new Date()
          });
          await autoInvoice.save();

          const paymentContract = getContractInstance('payment');
          const amountWei = ethers.parseEther(defaultAmount.toString());
          const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientUser.walletAddress, amountWei);
          await paymentTx.wait();

          console.log(`[Tự động] Đã tạo hóa đơn liên kết: ${generatedInvoiceId} cho ví: ${patientUser.walletAddress}`);
        } else {
          console.warn("⚠️ Không tìm thấy địa chỉ ví bệnh nhân, bỏ qua bước sinh hóa đơn tự động.");
        }
      } catch (invoiceError) {
        console.error('❌ Lỗi tự động sinh hóa đơn:', invoiceError.message);
      }
    }

    return res.json({ success: true, data: updated, recordTxHash, ipfsHash, ipfsUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ADMIN/DOCTOR: XÓA LƯỢT KHÁM ────────────────────────────────────────────
exports.deleteVisit = async (req, res) => {
  try {
    const deleted = await Visit.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    return res.json({ success: true, message: 'Đã xóa lượt khám!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};