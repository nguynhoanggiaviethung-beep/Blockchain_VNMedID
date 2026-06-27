const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const { createInvoice, makePayment, getMyInvoices, getInvoiceById, getAllInvoices, updateInvoiceStatus } = require('../controllers/invoiceController');


router.post('/payments', xacThucToken, phanQuyen('patient'), makePayment); // ← LÊN TRƯỚC
router.post('/', xacThucToken, phanQuyen('admin'), createInvoice);
router.get('/', xacThucToken, phanQuyen('admin'), getAllInvoices);
router.patch(':id/status', updateInvoiceStatus);
router.get('/:id', xacThucToken, phanQuyen('patient', 'admin'), getInvoiceById); // ← XUỐNG SAU


module.exports = router;
