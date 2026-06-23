const express = require('express');
const router = express.Router();

const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const shiftController = require('../controllers/shiftController');

// ── AUTO SCHEDULE (Admin bấm 1 nút → máy tự xếp) ──────────────────────────
// POST /api/v1/shifts/auto-schedule
router.post(
  '/auto-schedule',
  xacThucToken,
  phanQuyen('admin'),
  shiftController.autoSchedule
);

// ── XEM LỊCH THEO TUẦN ─────────────────────────────────────────────────────
// GET /api/v1/shifts/week
router.get(
  '/week',
  xacThucToken,
  phanQuyen('admin', 'doctor', 'patient'),
  shiftController.getWeeklySchedule
);

// ── CRUD CÁ NHÂN ────────────────────────────────────────────────────────────
// FIX: Thêm 'patient' vào phân quyền để giao diện Đặt lịch phía Client gọi API check ca trực thành công
router.get(
  '/',
  xacThucToken,
  phanQuyen('admin', 'doctor', 'patient'), 
  shiftController.getAllShifts // Đảm bảo trong shiftController.js của ông có export hàm tên này
);

// Tạo ca trực thủ công
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