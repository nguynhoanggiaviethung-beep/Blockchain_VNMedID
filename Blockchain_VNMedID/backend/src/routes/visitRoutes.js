const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { createVisit } = require('../controllers/visitController');

// Tạo lượt khám — chỉ Doctor
router.post('/', xacThucToken, phanQuyen('doctor'), createVisit);

module.exports = router;
