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

router.post('/',                    xacThucToken, createRecord);
router.get('/pending',              xacThucToken, getPendingRecords);
router.get('/doctor/pending',       xacThucToken, getDoctorPendingList);
router.get('/doctor/completed',     xacThucToken, getDoctorCompletedList);
router.get('/doctor/completed/count', xacThucToken, getDoctorCompletedCount);
router.post('/complete',            xacThucToken, completeVisit);
router.get('/history',              xacThucToken, getPatientHistory);
router.get('/:id',                  xacThucToken, getRecordById);
router.put('/:id',                  xacThucToken, updateRecordByDoctor);

module.exports = router;