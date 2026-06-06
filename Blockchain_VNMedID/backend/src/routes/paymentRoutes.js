const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { makePayment } = require('../controllers/invoiceController');

// Thanh toán — Patient
router.post('/', xacThucToken, phanQuyen('patient'), makePayment);

module.exports = router;
