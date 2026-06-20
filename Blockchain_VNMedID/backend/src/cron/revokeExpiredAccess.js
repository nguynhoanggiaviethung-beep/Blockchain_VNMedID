// File: backend/src/cron/revokeExpiredAccess.js
// ✅ Cron job tự động thu hồi quyền truy cập hồ sơ đã hết hạn (chạy mỗi phút)

const cron = require('node-cron');
const AccessRequest = require('../models/AccessRequest');
const { getAccessContract } = require('../utils/blockchain');

const startRevokeExpiredAccessJob = () => {
  // Chạy mỗi phút: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Tìm tất cả request đã approved nhưng đã hết hạn quyền (expiresAt <= hiện tại)
      const expiredRequests = await AccessRequest.find({
        status: 'approved',
        expiresAt: { $lte: now }
      });

      if (expiredRequests.length === 0) return;

      console.log(`⏰ [Cron] Tìm thấy ${expiredRequests.length} quyền truy cập đã hết hạn, đang thu hồi...`);

      const contract = getAccessContract();

      for (const request of expiredRequests) {
        try {
          // Gọi revokeAccess on-chain
          const tx = await contract.revokeAccess(request.patientId, request.doctorWallet);
          await tx.wait();

          // Cập nhật trạng thái trong MongoDB
          request.status = 'expired';
          request.revokeTxHash = tx.hash;
          await request.save();

          console.log(`✅ [Cron] Đã thu hồi quyền: patientId=${request.patientId}, doctorWallet=${request.doctorWallet}, txHash=${tx.hash}`);
        } catch (err) {
          console.error(`❌ [Cron] Lỗi thu hồi quyền cho request ${request._id}:`, err.message);
          // Không update status để lần sau cron job thử lại
        }
      }
    } catch (err) {
      console.error('❌ [Cron] Lỗi tổng quát khi quét quyền hết hạn:', err.message);
    }
  });

  console.log('🕐 Đã khởi động cron job tự động thu hồi quyền truy cập hồ sơ (chạy mỗi phút).');
};

module.exports = { startRevokeExpiredAccessJob };