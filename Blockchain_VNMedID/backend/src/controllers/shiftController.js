const Shift = require('../models/Shift');
const mongoose = require('mongoose');

// ✅ FIX CHÍ MẠNG: Hàm bổ trợ bẫy mọi định dạng ngày từ Frontend (YYYY-MM-DD, ISO String, v.v.) 
// Đảm bảo luôn trả về chuỗi sạch dạng "YYYY-MM-DD" để khớp chính xác dữ liệu trong DB
const formatDateString = (dateInput) => {
  if (!dateInput) return null;
  
  // Nếu là chuỗi và chứa ký tự gạch ngang (VD: "2026-06-23" hoặc "2026-06-23T00:00:00.000Z")
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    return dateInput.split('T')[0]; // Cắt bỏ toàn bộ phần giờ phía sau nếu có
  }

  // Nếu là chuỗi dạng DD/MM/YYYY (Nếu Frontend truyền định dạng ngày Việt Nam)
  if (typeof dateInput === 'string' && dateInput.includes('/')) {
    const parts = dateInput.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Đảo lại thành YYYY-MM-DD
    }
  }

  // Trường hợp còn lại (Date Object hoặc định dạng khác)
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// ─── TẠO CA TRỰC THỦ CÔNG ───────────────────────────────────────────────────
exports.createShift = async (req, res) => {
  try {
    const { doctorId, doctorName, specialty, date, shift, room, status, note } = req.body;
    const adminHospital = req.user?.hospitalName || null;

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bác sĩ và ngày trực!' });
    }

    const normalizedDate = formatDateString(date);

    const exists = await Shift.findOne({ doctorId, date: normalizedDate, shift });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Bác sĩ này đã có ca trực vào khung giờ đó!' });
    }

    const newShift = new Shift({ 
      doctorId, 
      doctorName, 
      specialty, 
      date: normalizedDate, 
      shift, 
      room, 
      status, 
      note,
      hospitalName: adminHospital
    });
    
    await newShift.save();
    return res.status(201).json({ success: true, data: newShift });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};

// ─── LẤY TẤT CẢ CA TRỰC (FIXED FOR CLIENT & ADMIN) ──────────────────────────
exports.getAllShifts = async (req, res) => {
  try {
    // Thêm hospitalName nhận từ query params của Frontend gửi lên
    const { doctorId, date, shift: shiftType, specialty, hospitalName } = req.query;
    const adminHospital = req.user?.hospitalName || null;
    let filter = {};
    
    // ✅ FIX LOGIC: Nếu là Admin đăng nhập thì ép buộc lọc theo bệnh viện quản lý. 
    // Nếu là Bệnh nhân (không có adminHospital) thì lọc theo bệnh viện bệnh nhân đang chọn ở giao diện.
    if (adminHospital) {
      filter.hospitalName = adminHospital;
    } else if (hospitalName) {
      filter.hospitalName = hospitalName;
    }
    
    if (doctorId) filter.doctorId = doctorId;
    if (shiftType) filter.shift = shiftType;
    if (specialty) filter.specialty = specialty;
    
    if (date) {
      const normalizedDate = formatDateString(date);
      if (normalizedDate) filter.date = normalizedDate;
    }

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
    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = formatDateString(updateData.date);
    }

    const updated = await Shift.findByIdAndUpdate(req.params.id, updateData, { new: true });
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

// ─── AUTO SCHEDULE (ROUND-ROBIN) ─────────────────────────────────────────────
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
    const adminHospital = req.user?.hospitalName || null;

    const query = {
      $or: [
        { specialty: specialty },
        { 'Chuyên Khoa': specialty }
      ]
    };
    if (adminHospital) {
        query.hospitalName = adminHospital;
    }
    
    const doctors = await db.collection('doctors').find(query).toArray();

    if (doctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy bác sĩ nào thuộc chuyên khoa "${specialty}" tại ${adminHospital || 'hệ thống'}`
      });
    }

    const shuffled = [...doctors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const workingDays = [];
    const start = new Date(startDate);



    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const current = new Date(start);
        current.setDate(start.getDate() + w * 7 + d);

        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0) continue; 

        const dateStr = formatDateString(current); 
        if (dateStr) workingDays.push(dateStr);
      }
    }

    const deleteFilter = {
        specialty: specialty,
        date: { $in: workingDays }
    };
    if (adminHospital) deleteFilter.hospitalName = adminHospital;
    await Shift.deleteMany(deleteFilter);

    const SHIFTS = ['morning', 'afternoon'];
    const bulkInsert = [];
    let doctorIndex = 0;

    workingDays.forEach(date => {
      SHIFTS.forEach(shiftType => {
        const doctor = shuffled[doctorIndex % shuffled.length];
        doctorIndex++; 

        const doctorName = doctor.fullName || doctor['Họ và tên'] || 'Bác sĩ';
        const doctorSpecialty = doctor.specialty || doctor['Chuyên Khoa'] || specialty;

        bulkInsert.push({
          doctorId: doctor._id,
          doctorName,
          specialty: doctorSpecialty,
          hospitalName: adminHospital || doctor.hospitalName || null, 
          date, 
          shift: shiftType,
          room: `Phòng ${doctorSpecialty.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 5) + 1}`,
          status: 'active',
          note: 'Tự động xếp lịch'
        });
      });
    });

    await Shift.insertMany(bulkInsert);

    const summary = {};
    shuffled.forEach(d => {
      const name = d.fullName || d['Họ và tên'];
      summary[name] = 0;
    });
    bulkInsert.forEach(s => {
      summary[s.doctorName] = (summary[s.doctorName] || 0) + 1;
    });

        console.log("doctors found:", doctors.length);
console.log("workingDays:", workingDays);
console.log("bulkInsert length:", bulkInsert.length);

    return res.status(201).json({
      success: true,
      message: `✅ Đã tự động xếp lịch xoay vòng thành công cho chuyên khoa "${specialty}" tại ${adminHospital || 'hệ thống'}`,
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
exports.getWeeklySchedule = async (req, res) => {
  try {
    const { startDate, specialty } = req.query;
    const adminHospital = req.user?.hospitalName || null;

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập startDate (YYYY-MM-DD)' });
    }

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const formatted = formatDateString(d);
      if (formatted) dates.push(formatted);
    }

    let filter = { date: { $in: dates } };
    if (specialty) filter.specialty = specialty;
    if (adminHospital) filter.hospitalName = adminHospital;

    const shifts = await Shift.find(filter)
      .populate('doctorId', 'fullName specialty')
      .sort({ date: 1, shift: 1 });

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