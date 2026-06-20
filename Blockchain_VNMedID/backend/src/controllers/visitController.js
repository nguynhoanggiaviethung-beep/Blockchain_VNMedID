const Visit = require('../models/Visit');
const mongoose = require('mongoose');

// ─── BỆNH NHÂN ĐẶT LỊCH ────────────────────────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    // ✅ ĐÃ CẬP NHẬT: Thêm hospitalName bóc tách từ body
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
      hospitalName, // ✅ Lưu tên bệnh viện vào DB
      status: "pending"
    });
    await visit.save();

    return res.status(201).json({ success: true, data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ✅ THÊM: BÁC SĨ LẤY DANH SÁCH CHỜ THEO BỆNH VIỆN CÔNG TÁC ──────────────────
exports.getDoctorPendingVisits = async (req, res) => {
  try {
    const doctorId = req.user?.userId;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin xác thực bác sĩ!' });
    }

    const db = mongoose.connection.db;

    // Tìm thông tin bệnh viện của bác sĩ
    const doctorInfo = await db.collection("doctors").findOne({ _id: new mongoose.Types.ObjectId(doctorId) });
    if (!doctorInfo || !doctorInfo.hospitalName) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bệnh viện của bác sĩ này!' });
    }

    const currentHospital = doctorInfo.hospitalName;

    // Lấy các ca khám "pending" thuộc bệnh viện đó
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
        { hospitalName:{ $regex: search, $options: 'i' } }, // Tìm kiếm thêm theo bệnh viện
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

// ─── ADMIN: CẬP NHẬT LƯỢT KHÁM ──────────────────────────────────────────────
exports.updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, doctorId, doctorName, shiftId,
      diagnosis, chanDoanChuyenMon, huongDieuTri,
      prescription, note
    } = req.body;

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
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ADMIN: XÓA LƯỢT KHÁM ───────────────────────────────────────────────────
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