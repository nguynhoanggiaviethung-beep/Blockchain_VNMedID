const Shift = require('../models/Shift');
const mongoose = require('mongoose');

// ─── TẠO CA TRỰC THỦ CÔNG ───────────────────────────────────────────────────
exports.createShift = async (req, res) => {
  try {
    const { doctorId, doctorName, specialty, date, shift, room, status, note } = req.body;

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bác sĩ và ngày trực!' });
    }

    const exists = await Shift.findOne({ doctorId, date, shift });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Bác sĩ này đã có ca trực vào khung giờ đó!' });
    }

    const newShift = new Shift({ doctorId, doctorName, specialty, date, shift, room, status, note });
    await newShift.save();

    return res.status(201).json({ success: true, data: newShift });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── LẤY TẤT CẢ CA TRỰC ────────────────────────────────────────────────────
exports.getAllShifts = async (req, res) => {
  try {
    const { doctorId, date, shift: shiftType, specialty } = req.query;
    let filter = {};
    if (doctorId)  filter.doctorId = doctorId;
    if (date)      filter.date = date;
    if (shiftType) filter.shift = shiftType;
    if (specialty) filter.specialty = specialty;

    const shifts = await Shift.find(filter)
      .populate('doctorId', 'fullName specialty licenseNumber')
      .sort({ date: 1, shift: 1 });

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

// ─── AUTO SCHEDULE ───────────────────────────────────────────────────────────
/**
 * @desc  Admin bấm 1 nút → hệ thống tự xếp lịch cho toàn bộ bác sĩ theo chuyên khoa
 * @route POST /api/v1/shifts/auto-schedule
 * @body  { specialty, startDate, weeks }
 *
 * Thuật toán:
 *  1. Lấy danh sách bác sĩ theo chuyên khoa
 *  2. Tính tổng số buổi cần xếp trong khoảng thời gian (weeks tuần × 6 ngày × 2 ca)
 *  3. Shuffle bác sĩ ngẫu nhiên 1 lần để tạo thứ tự vòng tròn (round-robin)
 *  4. Với mỗi ngày làm việc (Thứ 2 → Thứ 7): xếp lần lượt ca sáng → ca chiều
 *     mỗi ca gán 1 bác sĩ theo vòng tròn → đảm bảo không trùng, phân đều
 *  5. Lịch tuần lặp lại giống nhau (vì dùng index % bác sĩ)
 */
exports.autoSchedule = async (req, res) => {
  try {
    const { specialty, startDate, weeks = 4 } = req.body;

    if (!specialty || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập chuyên khoa (specialty) và ngày bắt đầu (startDate: YYYY-MM-DD)'
      });
    }

    const db = mongoose.connection.db;

    // 1. Lấy danh sách bác sĩ theo chuyên khoa
    // Doctor model dùng field "Chuyên Khoa" theo schema của bạn
    const doctors = await db.collection('doctors').find({
      $or: [
        { specialty: specialty },
        { 'Chuyên Khoa': specialty }
      ]
    }).toArray();

    if (doctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy bác sĩ nào thuộc chuyên khoa "${specialty}"`
      });
    }

    // 2. Shuffle bác sĩ ngẫu nhiên 1 lần (Fisher-Yates)
    const shuffled = [...doctors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Tạo danh sách ngày làm việc (Thứ 2 → Thứ 7, bỏ Chủ nhật)
    const workingDays = [];
    const start = new Date(startDate);

    // Đảm bảo bắt đầu từ đúng ngày truyền vào
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const current = new Date(start);
        current.setDate(start.getDate() + w * 7 + d);

        const dayOfWeek = current.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
        if (dayOfWeek === 0) continue; // Bỏ Chủ nhật

        const dateStr = current.toISOString().split('T')[0]; // "YYYY-MM-DD"
        workingDays.push(dateStr);
      }
    }

    // 4. Xóa lịch cũ của chuyên khoa này trong khoảng thời gian (tránh trùng khi gọi lại)
    await Shift.deleteMany({
      specialty: specialty,
      date: { $in: workingDays }
    });

    // 5. Round-robin: mỗi slot (ngày + ca) gán 1 bác sĩ theo vòng tròn
    const SHIFTS = ['morning', 'afternoon']; // 2 ca / ngày
    const shiftSlots = [];

    workingDays.forEach(date => {
      SHIFTS.forEach(shiftType => {
        shiftSlots.push({ date, shift: shiftType });
      });
    });

    // Tổng số slot = workingDays × 2 ca
    // Mỗi bác sĩ sẽ làm: Math.floor(totalSlots / doctorCount) lần (phân đều)
    const bulkInsert = [];
    let doctorIndex = 0;

    shiftSlots.forEach(({ date, shift }) => {
      const doctor = shuffled[doctorIndex % shuffled.length];
      doctorIndex++;

      const doctorName = doctor.fullName || doctor['Họ và tên'] || 'Bác sĩ';
      const doctorSpecialty = doctor.specialty || doctor['Chuyên Khoa'] || specialty;

      bulkInsert.push({
        doctorId: doctor._id,
        doctorName,
        specialty: doctorSpecialty,
        date,
        shift,
        room: `Phòng ${doctorSpecialty.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 5) + 1}`,
        
        status: 'active',
        note: 'Tự động xếp lịch'
      });
    });

    // 6. Lưu hàng loạt vào DB
    await Shift.insertMany(bulkInsert);

    // 7. Tính thống kê số buổi mỗi bác sĩ
    const summary = {};
    shuffled.forEach(d => {
      const name = d.fullName || d['Họ và tên'];
      summary[name] = 0;
    });
    bulkInsert.forEach(s => {
      summary[s.doctorName] = (summary[s.doctorName] || 0) + 1;
    });

    return res.status(201).json({
      success: true,
      message: `✅ Đã tự động xếp lịch thành công cho chuyên khoa "${specialty}"`,
      data: {
        totalShifts: bulkInsert.length,
        doctors: shuffled.length,
        weeks,
        workingDays: workingDays.length,
        shiftPerDoctor: summary
      }
    });

  } catch (error) {
    console.error('❌ autoSchedule error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── XEM LỊCH THEO TUẦN ─────────────────────────────────────────────────────
/**
 * @desc  Lấy lịch làm việc trong 1 tuần cụ thể
 * @route GET /api/v1/shifts/week?startDate=YYYY-MM-DD&specialty=...
 */
exports.getWeeklySchedule = async (req, res) => {
  try {
    const { startDate, specialty } = req.query;

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập startDate (YYYY-MM-DD)' });
    }

    // Lấy 7 ngày từ startDate
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    let filter = { date: { $in: dates } };
    if (specialty) filter.specialty = specialty;

    const shifts = await Shift.find(filter)
      .populate('doctorId', 'fullName specialty')
      .sort({ date: 1, shift: 1 });

    // Group theo ngày để dễ hiển thị
    const grouped = {};
    dates.forEach(d => { grouped[d] = { morning: null, afternoon: null }; });

    shifts.forEach(s => {
      if (grouped[s.date]) {
        grouped[s.date][s.shift] = {
          shiftId: s._id,
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          specialty: s.specialty,
          room: s.room,
          status: s.status
        };
      }
    });

    return res.json({
      success: true,
      data: {
        week: startDate,
        specialty: specialty || 'Tất cả',
        schedule: grouped
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
