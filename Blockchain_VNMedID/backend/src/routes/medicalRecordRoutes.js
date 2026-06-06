const express = require('express');
const router = express.Router();
const { 
    createRecord, 
    getPendingRecords, 
    getDoctorPendingList, 
    getDoctorCompletedCount, 
    completeVisit, 
    getPatientHistory 
} = require('../controllers/medicalRecordController');

// Định nghĩa các route
router.post('/create', createRecord);
router.get('/pending', getPendingRecords);
router.get('/doctor/pending', getDoctorPendingList);
router.get('/doctor/completed-count', getDoctorCompletedCount);
router.post('/complete', completeVisit);
router.get('/history', getPatientHistory);

module.exports = router;