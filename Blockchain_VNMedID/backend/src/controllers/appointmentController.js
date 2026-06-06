const Visit = require('../models/Visit');

exports.bookAppointment = async (req, res) => {
  try {
    const { patientId, specialty, appointmentDate, trieuChungLamSang } = req.body;

    if (!patientId || !specialty || !appointmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn chuyên khoa và ngày khám!'
      });
    }

    const visit = new Visit({
      patientId,
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

exports.getMyAppointments = async (req, res) => {
  try {
    const { patientId } = req.query;
    const visits = await Visit.find({ patientId }).populate('patientId', 'fullName').sort({ createdAt: -1 });
    return res.json({ success: true, data: visits });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};