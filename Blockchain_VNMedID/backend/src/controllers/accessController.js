const { ethers } = require('ethers');

// POST /access/grant — Cấp quyền bác sĩ xem hồ sơ (Admin)
exports.grantAccess = async (req, res) => {
  try {
    const { doctorId, patientId } = req.body;

    if (!doctorId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập doctorId và patientId'
      });
    }

    // Giả lập txHash blockchain (sau này thay bằng blockchain thật)
    const mockTxHash = '0x' + Math.random().toString(16).substring(2, 42);

    return res.status(200).json({
      success: true,
      message: 'Cấp quyền truy cập thành công!',
      data: { txHash: mockTxHash }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
  }
};
