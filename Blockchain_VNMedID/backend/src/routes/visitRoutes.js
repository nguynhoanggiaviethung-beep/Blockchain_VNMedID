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

// Bệnh nhân xem lịch của mình
router.get(
  '/my',
  xacThucToken,
  phanQuyen('patient'),
  visitController.getMyAppointments
);

// Bác sĩ xem danh sách hàng đợi
router.get(
  '/pending-hospital',
  xacThucToken,
  phanQuyen('doctor'),
  visitController.getDoctorPendingVisits
);

// ✅ Bác sĩ xem lịch sử đã khám của mình
router.get(
  '/completed-doctor',
  xacThucToken,
  phanQuyen('doctor'),
  visitController.getDoctorCompletedVisits
);

// Admin phân công bác sĩ vào lượt khám
router.put(
  '/assign/:visitId',
  xacThucToken,
  phanQuyen('admin'),
  visitController.assignDoctor
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
