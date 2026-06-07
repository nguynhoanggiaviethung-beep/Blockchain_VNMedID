const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { getSummary } = require('../controllers/adminController');

router.get('/summary', xacThucToken, phanQuyen('admin'), getSummary);

module.exports = router;