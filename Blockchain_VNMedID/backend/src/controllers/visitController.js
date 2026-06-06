const Visit = require('../models/Visit');

// POST /visits — Tạo lượt khám (Doctor)
exports.createVisit = async (req, res) => {
  try {
    const { patientId, symptoms, diagnosis, prescription } = req.body;

    if (!patientId || !symptoms || !diagnosis || !prescription) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin lượt khám'
      });
    }

    const mockIpfsHash = 'QmXoypuj' + Math.random().toString(36).substring(2, 15);

    const visit = new Visit({ patientId, symptoms, diagnosis, prescription, ipfsHash: mockIpfsHash });
    await visit.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo lượt khám thành công!',
      data: { visitId: visit._id }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
