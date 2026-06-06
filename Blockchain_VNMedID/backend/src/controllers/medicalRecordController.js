const MedicalRecord = require('../models/MedicalRecord');

const createRecord = async (req, res) => {
    try {
        const { trieuChung } = req.body;
        // Đảm bảo req.userId tồn tại (được xác thực qua middleware)
        const newRecord = new MedicalRecord({ 
            patientId: req.userId, 
            trieuChung, 
            status: "pending",
            createdAt: new Date()
        });
        await newRecord.save();
        res.status(201).json({ success: true, data: newRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPendingRecords = async (req, res) => {
    try {
        const list = await MedicalRecord.find({ status: "pending" })
            .populate('patientId', 'fullName phone dob'); // Thêm các trường cần thiết
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getDoctorPendingList = async (req, res) => {
    try {
        // Chỉ lọc theo status 'pending', bỏ lọc ngày để tránh lỗi định dạng
        const list = await MedicalRecord.find({ status: "pending" })
            .populate('patientId', 'fullName phone dob gender');
        
        console.log("DEBUG: Số lượng bệnh nhân pending tìm thấy:", list.length);
        
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        console.error("DEBUG Lỗi:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getDoctorCompletedCount = async (req, res) => {
    try {
        const count = await MedicalRecord.countDocuments({ status: "completed" });
        res.status(200).json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const completeVisit = async (req, res) => {
    try {
        const { recordId, diagnose, prescription } = req.body;
        const updated = await MedicalRecord.findByIdAndUpdate(
            recordId, 
            { 
                status: "completed",
                diagnose,
                prescription,
                updatedAt: new Date()
            }, 
            { new: true }
        );
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPatientHistory = async (req, res) => {
    try {
        const history = await MedicalRecord.find({ patientId: req.userId })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createRecord,
    getPendingRecords,
    getDoctorPendingList,
    getDoctorCompletedCount,
    completeVisit,
    getPatientHistory
};