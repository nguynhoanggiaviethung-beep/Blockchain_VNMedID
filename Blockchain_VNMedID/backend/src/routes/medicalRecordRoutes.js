const express = require('express');
const router = express.Router();
const { xacThucToken, phanQuyen } = require('../middleware/authMiddleware');
const {
    createRecord,
    getPendingRecords,
    getDoctorPendingList,
    getDoctorCompletedList,
    getDoctorCompletedCount,
    completeVisit,
    getRecordById,
    updateRecordByDoctor,
    getPatientHistory
} = require('../controllers/medicalRecordController');

router.post('/', xacThucToken, phanQuyen('doctor'), createRecord);
router.post('/complete', xacThucToken, phanQuyen('doctor'), completeVisit);

// ⚠️ Route cụ thể phải đặt TRƯỚC /:id
router.get('/my/history', xacThucToken, phanQuyen('patient'), getPatientHistory);
router.get('/doctor/pending', xacThucToken, phanQuyen('doctor'), getDoctorPendingList);
router.get('/doctor/completed-list', xacThucToken, phanQuyen('doctor'), getDoctorCompletedList);
router.get('/doctor/completed', xacThucToken, phanQuyen('doctor'), getDoctorCompletedCount);
router.get('/pending', getPendingRecords);

router.get('/:id', xacThucToken, phanQuyen('admin', 'doctor', 'patient'), getRecordById);
router.put('/:id', xacThucToken, phanQuyen('doctor'), updateRecordByDoctor);

module.exports = router;