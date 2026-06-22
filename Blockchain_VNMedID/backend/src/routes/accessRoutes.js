const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');

// Khớp 100% với Frontend gọi POST /api/v1/access/requests (Sửa lỗi 404)
router.post('/requests', xacThucToken, phanQuyen('doctor'), accessController.requestAccess);

// Frontend gọi GET /api/v1/access/requests/my
router.get('/requests/my', xacThucToken, phanQuyen('patient'), accessController.getPendingRequestsForPatient);

// Frontend gọi phê duyệt POST /api/v1/access/requests/:id/approve
router.post('/requests/:id/approve', xacThucToken, phanQuyen('patient'), accessController.grantAccess);

// Frontend gọi từ chối POST /api/v1/access/requests/:id/reject
router.post('/requests/:id/reject', xacThucToken, phanQuyen('patient'), accessController.rejectAccess);

// Frontend gọi lấy quyền bác sĩ GET /api/v1/access/requests/active-for-doctor
router.get('/requests/active-for-doctor', xacThucToken, phanQuyen('doctor'), accessController.getActiveRequestsForDoctor);

module.exports = router;