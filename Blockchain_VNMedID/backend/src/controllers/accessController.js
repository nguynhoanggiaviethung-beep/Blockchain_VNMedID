const mongoose = require("mongoose");
const { getContractInstance } = require("../config/web3");

exports.grantAccess = async (req, res) => {
  try {
    const { doctorId, patientId } = req.body;

    if (!doctorId || !patientId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu doctorId hoặc patientId"
      });
    }

    const db = mongoose.connection.db;

    const doctor = await db
      .collection("doctors")
      .findOne({
        _id: new mongoose.Types.ObjectId(doctorId)
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ"
      });
    }

    if (!doctor.walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Bác sĩ chưa có ví blockchain"
      });
    }

    const accessContract =
      getContractInstance("accessControl");

    const tx = await accessContract.grantAccess(
      patientId,
      doctor.walletAddress
    );

    const receipt = await tx.wait();

    return res.status(200).json({
      success: true,
      message: "Cấp quyền thành công",
      data: {
        txHash: receipt.hash,
        doctorWallet: doctor.walletAddress,
        patientId
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};