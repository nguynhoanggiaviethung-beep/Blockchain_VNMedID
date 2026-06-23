const Visit = require('../models/Visit');
const Shift = require('../models/Shift');

const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');
const { uploadJSONToIPFS, getIPFSGatewayUrl } = require('../utils/ipfs'); // ✅ Thêm IPFS
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const getDrugPriceFromDAV = async (drugName) => {
  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    await client.get('https://dichvucong.dav.gov.vn/congbogiathuoc');
    const cookies = await jar.getCookies('https://dichvucong.dav.gov.vn');
    const xsrf = cookies.find(c => c.key === 'XSRF-TOKEN')?.value;
    if (!xsrf) return null;
    const { data } = await client.post(
      'https://dichvucong.dav.gov.vn/api/services/app/quanLyGiaThuoc/GetListCongBoPublicPaging',
      { filterAll: drugName, CongBoGiaThuoc: {}, KichHoat: true, skipCount: 0, maxResultCount: 1, sorting: null },
      { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrf, Origin: 'https://dichvucong.dav.gov.vn', Referer: 'https://dichvucong.dav.gov.vn/congbogiathuoc' } }
    );
    const items = data?.result?.items;
    if (!items || items.length === 0) return null;
    return { tenThuoc: items[0].tenThuoc, giaBanBuonDuKien: items[0].giaBanBuonDuKien || 0 };
  } catch (err) {
    console.error(`❌ DAV lỗi "${drugName}":`, err.message);
    return null;
  }
};

// ─── BỆNH NHÂN ĐẶT LỊCH ────────────────────────────────────────────────────
// ─── BỆNH NHÂN ĐẶT LỊCH (TỰ ĐỘNG GÁN BÁC SĨ) ──────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    // Lưu ý: Yêu cầu Frontend gửi thêm trường 'shift' (morning hoặc afternoon)
    const { patientId, patientName, specialty, appointmentDate, shift, trieuChungLamSang, hospitalName } = req.body;

    if (!patientId || !specialty || !appointmentDate || !hospitalName || !shift) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn chuyên khoa, ngày khám, ca khám và bệnh viện!' });
    }
  
    let DB_shift = shift;
    if (typeof shift === 'string') {
      if (shift.includes('Sáng') || shift.toLowerCase().includes('morning')) {
        DB_shift = 'morning';
      } else if (shift.includes('Chiều') || shift.toLowerCase().includes('afternoon')) {
        DB_shift = 'afternoon';
      }
    }

    // 1. TỰ ĐỘNG TÌM BÁC SĨ ĐANG TRỰC
    // Máy sẽ dò xem ngày hôm đó, ca đó, chuyên khoa đó có bác sĩ nào đang có lịch active không
    const activeShift = await Shift.findOne({
        date: appointmentDate,
        shift: DB_shift,
        specialty: specialty,
        status: 'active'
    });

    if (!activeShift) {
        return res.status(404).json({ 
            success: false, 
            message: `Rất tiếc, không có bác sĩ chuyên khoa ${specialty} trực vào ca này ngày ${appointmentDate}. Vui lòng chọn khung giờ khác!` 
        });
    }

    // 2. GÁN LUÔN BÁC SĨ VÀO HỒ SƠ & LƯU LẠI
    const visit = new Visit({
      patientId,
      patientName: patientName || "",
      specialty,
      appointmentDate,
      trieuChungLamSang: trieuChungLamSang || "",
      hospitalName,
      doctorId: activeShift.doctorId,       // 👈 Máy tự gán ID bác sĩ tìm được
      doctorName: activeShift.doctorName,   // 👈 Máy tự gán Tên bác sĩ
      shiftId: activeShift._id,             // 👈 Gắn chốt luôn vào ca trực đó
      status: "examining"                   // 👈 Đổi trạng thái bỏ qua bước pending của admin
    });
    
    await visit.save();

    return res.status(201).json({ 
        success: true, 
        message: 'Đặt lịch và tự động phân công bác sĩ thành công!',
        data: visit 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};


// ─── BÁC SĨ LẤY DANH SÁCH CHỜ THEO BỆNH VIỆN CÔNG TÁC ──────────────────────
// ─── BÁC SĨ LẤY DANH SÁCH CHỜ CỦA RIÊNG MÌNH ──────────────────────
// ─── BÁC SĨ LẤY DANH SÁCH CHỜ CỦA RIÊNG MÌNH ──────────────────────
exports.getDoctorPendingVisits = async (req, res) => {
  try {
    const doctorId = req.user?.userId;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin xác thực bác sĩ!' });
    }

    let queryConditions = [
      { doctorId: doctorId },
      { doctorId: String(doctorId) }
    ];

    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      queryConditions.push({ doctorId: new mongoose.Types.ObjectId(doctorId) });
    }

    // ✅ Đã xóa đoạn trùng lặp và sửa lỗi cú pháp hoàn chỉnh
    const pendingVisits = await Visit.find({
      $or: [
        { doctorId: doctorId },       // Khớp nếu DB lưu dạng String
        { doctorId: queryDoctorId }  // Khớp nếu DB lưu dạng ObjectId gốc từ bảng Shift
      ],
      status: "examining" 
    })
    .populate('shiftId', 'shift room date') 
    .sort({ createdAt: 1 });

    return res.json({
      success: true,
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
    const { status, doctorId, doctorName, shiftId,
  diagnosis, chanDoanChuyenMon, huongDieuTri,
  prescription, note, hospitalName,
  prescribedDrugs  // ✅ THÊM
} = req.body;


    // Lấy visit gốc trước để biết trạng thái cũ và đủ context
    const existingVisit = await Visit.findById(id);
    if (!existingVisit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    const isCompletingNow = status === 'completed' && existingVisit.status !== 'completed';
    // ✅ THÊM: Tra giá thuốc từ DAV
let drugsWithPrice = existingVisit.drugs || [];
let totalVND = existingVisit.totalVND || 0;

if (prescribedDrugs && Array.isArray(prescribedDrugs) && prescribedDrugs.length > 0) {
  drugsWithPrice = [];
  totalVND = 0;
  for (const drug of prescribedDrugs) {
    const result = await getDrugPriceFromDAV(drug.drugName);
    const priceVND = result?.giaBanBuonDuKien || 0;
    const tenThuoc = result?.tenThuoc || name;
    drugsWithPrice.push({ drugName: tenThuoc, priceVND });
    totalVND += priceVND;
    console.log(`✅ ${tenThuoc}: ${priceVND.toLocaleString('vi-VN')}đ`);
  }
}


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
        ...(isCompletingNow   && { ipfsHash }),
        ...(drugsWithPrice.length > 0 && { drugs: drugsWithPrice, totalVND }),
        
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
const ETH_RATE = 80_000_000;
const amountETH = totalVND > 0
  ? parseFloat((totalVND / ETH_RATE).toFixed(6))
  : 0.001;

const autoInvoice = new Invoice({
  invoiceId: generatedInvoiceId,
  amount: amountETH,
  patientWallet: patientUser.walletAddress,
  paymentStatus: 'pending',
  items: drugsWithPrice,
  totalVND,
});
await autoInvoice.save();

const paymentContract = getContractInstance('payment');
const amountWei = ethers.parseEther(amountETH.toString());
const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientUser.walletAddress, amountWei);
await paymentTx.wait();

console.log(`[Tự động] Đã tạo hóa đơn: ${generatedInvoiceId} | ${totalVND.toLocaleString('vi-VN')}đ | ${amountETH} ETH`);

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
// ─── ADMIN: PHÂN CÔNG BÁC SĨ VÀO LƯỢT KHÁM ────────────────────────────────
exports.assignDoctor = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { doctorId, doctorName, shiftId } = req.body;

    const updatedVisit = await Visit.findByIdAndUpdate(
      visitId,
      { 
        doctorId, 
        doctorName, 
        shiftId, 
        status: "examining" 
      },
      { new: true }
    )
    // Cú pháp đặc biệt để lấy các key có dấu cách
    .populate({ path: 'doctorId', select: { "Họ và tên": 1, "Chuyên Khoa": 1 } })
    .populate('shiftId', 'shift room date');

    if (!updatedVisit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    return res.json({ success: true, message: 'Phân công thành công', data: updatedVisit });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
