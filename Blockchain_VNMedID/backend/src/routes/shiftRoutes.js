const express = require('express');
const router = express.Router();

const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const shiftController = require('../controllers/shiftController');

// ── AUTO SCHEDULE (Admin bấm 1 nút → máy tự xếp) ──────────────────────────
// POST /api/v1/shifts/auto-schedule
// Body: { specialty: "Răng Hàm Mặt", startDate: "2025-01-06", weeks: 4 }
router.post(
  '/auto-schedule',
  xacThucToken,
  phanQuyen('admin'),
  shiftController.autoSchedule
);

// ── XEM LỊCH THEO TUẦN ─────────────────────────────────────────────────────
// GET /api/v1/shifts/week?startDate=2025-01-06&specialty=Răng Hàm Mặt
router.get(
  '/week',
  xacThucToken,
  phanQuyen('admin', 'doctor', 'patient'),
  shiftController.getWeeklySchedule
);

// ── CRUD CÁ NHÂN ────────────────────────────────────────────────────────────
// Lấy tất cả ca trực (có filter)
router.get(
  '/',
  xacThucToken,
  phanQuyen('admin', 'doctor'),
  shiftController.getAllShifts
);

// Tạo ca trực thủ công (nếu cần)
router.post(
  '/',
  xacThucToken,
  phanQuyen('admin'),
  shiftController.createShift
);

// Cập nhật ca trực
router.put(
  '/:id',
  xacThucToken,
  phanQuyen('admin'),
  shiftController.updateShift
);

// Xóa ca trực
router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('admin'),
  shiftController.deleteShift
);

module.exports = router;
