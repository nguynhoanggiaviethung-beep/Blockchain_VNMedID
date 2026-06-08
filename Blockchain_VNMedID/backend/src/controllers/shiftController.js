const Shift = require('../models/Shift');
const mongoose = require('mongoose');

// ─── TẠO CA TRỰC ────────────────────────────────────────────────────────────
exports.createShift = async (req, res) => {
  try {
    const { doctorId, doctorName, specialty, date, shift, room, maxPatients, status, note } = req.body;

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bác sĩ và ngày trực!' });
    }

    // Kiểm tra trùng ca
    const exists = await Shift.findOne({ doctorId, date, shift });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Bác sĩ này đã có ca trực vào khung giờ đó!' });
    }

    const newShift = new Shift({ doctorId, doctorName, specialty, date, shift, room, maxPatients, status, note });
    await newShift.save();

    return res.status(201).json({ success: true, data: newShift });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── LẤY TẤT CẢ CA TRỰC ────────────────────────────────────────────────────
exports.getAllShifts = async (req, res) => {
  try {
    const { doctorId, date, shift: shiftType } = req.query;
    let filter = {};
    if (doctorId)   filter.doctorId = doctorId;
    if (date)       filter.date = date;
    if (shiftType)  filter.shift = shiftType;

    const shifts = await Shift.find(filter)
      .populate('doctorId', 'fullName specialty licenseNumber')
      .sort({ date: -1, shift: 1 });

    return res.json({
      success: true,
      data: { total: shifts.length, schedules: shifts }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── CẬP NHẬT CA TRỰC ───────────────────────────────────────────────────────
exports.updateShift = async (req, res) => {
  try {
    const updated = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy ca trực!' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── XÓA CA TRỰC ────────────────────────────────────────────────────────────
exports.deleteShift = async (req, res) => {
  try {
    const deleted = await Shift.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy ca trực!' });
    return res.json({ success: true, message: 'Đã xóa ca trực!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};