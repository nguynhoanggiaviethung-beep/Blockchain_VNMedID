const express = require('express');
const router = express.Router();

const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const visitController = require('../controllers/visitController');

// Bệnh nhân đặt lịch khám
router.post(
  '/',
  xacThucToken,
  phanQuyen('patient'),
  visitController.bookAppointment
);

// Doctor + Admin xem tất cả lượt khám
router.get(
  '/',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.getAllVisits
);

// Doctor + Admin cập nhật lượt khám
router.put(
  '/:id',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.updateVisit
);

// Doctor + Admin xóa lượt khám
router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.deleteVisit
);

module.exports = router;