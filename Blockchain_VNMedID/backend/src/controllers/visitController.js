const Visit = require('../models/Visit');
const mongoose = require('mongoose');

// ─── BỆNH NHÂN ĐẶT LỊCH ────────────────────────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    const { patientId, patientName, specialty, appointmentDate, trieuChungLamSang } = req.body;

    if (!patientId || !specialty || !appointmentDate) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn chuyên khoa và ngày khám!' });
    }

    const visit = new Visit({
      patientId,
      patientName: patientName || "",
      specialty,
      appointmentDate,
      trieuChungLamSang: trieuChungLamSang || "",
      status: "pending"
    });
    await visit.save();

    return res.status(201).json({ success: true, data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── BỆNH NHÂN XEM LỊCH CỦA MÌNH ───────────────────────────────────────────
exports.getMyAppointments = async (req, res) => {
  try {
    const { patientId } = req.query;
    const visits = await Visit.find({ patientId }).sort({ createdAt: -1 });
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

    if (date) filter.appointmentDate = date; // "YYYY-MM-DD"

    if (search) {
      filter.$or = [
        { patientName:  { $regex: search, $options: 'i' } },
        { doctorName:   { $regex: search, $options: 'i' } },
        { specialty:    { $regex: search, $options: 'i' } },
        { patientId:    { $regex: search, $options: 'i' } },
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

// ─── ADMIN: CẬP NHẬT LƯỢT KHÁM (phân công BS, đổi trạng thái, ghi chẩn đoán) 
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
        ...(status           !== undefined && { status }),
        ...(doctorId         !== undefined && { doctorId }),
        ...(doctorName       !== undefined && { doctorName }),
        ...(shiftId          !== undefined && { shiftId }),
        ...(diagnosis        !== undefined && { diagnosis }),
        ...(chanDoanChuyenMon!== undefined && { chanDoanChuyenMon }),
        ...(huongDieuTri     !== undefined && { huongDieuTri }),
        ...(prescription     !== undefined && { prescription }),
        ...(note             !== undefined && { note: note }),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── ADMIN: XÓA LƯỢT KHÁM ───────────────────────────────────────────────────
exports.deleteVisit = async (req, res) => {
  try {
    const deleted = await Visit.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khám!' });
    return res.json({ success: true, message: 'Đã xóa lượt khám!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};