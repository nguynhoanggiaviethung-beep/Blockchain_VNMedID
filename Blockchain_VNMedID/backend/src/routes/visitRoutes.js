// routes/visits.js
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


// ✅ THÊM: Bệnh nhân xem lịch của mình
router.get(
  '/my',
  xacThucToken,
  phanQuyen('patient'),
  visitController.getMyAppointments
);


// Admin/Doctor xem tất cả lượt khám
router.get(
  '/',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.getAllVisits
);


// Admin/Doctor cập nhật lượt khám
router.put(
  '/:id',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.updateVisit
);


// Admin/Doctor xóa lượt khám
router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('doctor', 'admin'),
  visitController.deleteVisit
);


module.exports = router;

