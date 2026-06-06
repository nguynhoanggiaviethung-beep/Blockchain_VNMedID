const express = require('express');
const router = express.Router();
const { xacThucToken } = require('../middleware/authMiddleware');
const { bookAppointment, getMyAppointments } = require('../controllers/appointmentController');

router.post('/', xacThucToken, bookAppointment);
router.get('/my/history', xacThucToken, getMyAppointments);

module.exports = router;