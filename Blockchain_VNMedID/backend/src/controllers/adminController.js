const mongoose = require('mongoose');

const getSummary = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Tổng bệnh nhân
    const totalPatients = await db.collection('patients').countDocuments();

    // Tổng bác sĩ
    const totalDoctors = await db.collection('doctors').countDocuments();

    // Lượt khám hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // "2026-06-02"

    const totalVisitsToday = await db.collection('visits').countDocuments({
      appointmentDate: todayStr
    });

    const completedVisitsToday = await db.collection('visits').countDocuments({
      appointmentDate: todayStr,
      status: 'completed'
    });

    // Hoạt động gần đây — lấy 5 visits mới nhất
    const recentVisits = await db.collection('visits')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Lấy thông tin bệnh nhân cho từng visit
    const recentActivities = await Promise.all(recentVisits.map(async (v) => {
      let patientName = "Bệnh nhân";
      try {
        let patient = null;
        try {
          const objId = new mongoose.Types.ObjectId(v.patientId);
          patient = await db.collection('patients').findOne({ _id: objId });
        } catch (_) {}
        if (!patient) {
          patient = await db.collection('patients').findOne({ _id: v.patientId });
        }
        if (patient) patientName = patient.fullName;
      } catch (_) {}

      const time = new Date(v.createdAt);
      const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const statusText = v.status === 'completed' ? 'đã hoàn thành khám' : 'đã đặt lịch khám';

      return {
        time: timeStr,
        text: `${patientName} ${statusText} — ${v.specialty || 'Khám tổng quát'}`
      };
    }));

    return res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalVisitsToday,
        completedVisitsToday,
        recentActivities
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getSummary };