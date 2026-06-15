const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { createInvoice, makePayment, getMyInvoices } = require('../controllers/invoiceController')
router.get('/my', xacThucToken, phanQuyen('patient'), getMyInvoices);
// Tạo hóa đơn — chỉ Admin
router.post('/', xacThucToken, phanQuyen('admin'), createInvoice);

// Thanh toán — Patient
router.post('/payments', xacThucToken, phanQuyen('patient'), makePayment);

module.exports = router;
