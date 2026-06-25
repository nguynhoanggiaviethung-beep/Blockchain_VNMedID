const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { createInvoice, makePayment, getMyInvoices, getInvoiceById } = require('../controllers/invoiceController')
router.get('/my', xacThucToken, phanQuyen('patient'), getMyInvoices);
router.post('/payments', xacThucToken, phanQuyen('patient'), makePayment); // ← LÊN TRƯỚC
router.post('/', xacThucToken, phanQuyen('admin'), createInvoice);
router.get('/:id', xacThucToken, phanQuyen('patient', 'admin'), getInvoiceById); // ← XUỐNG SAU

module.exports = router;
