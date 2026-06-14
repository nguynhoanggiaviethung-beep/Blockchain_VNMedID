const MedicalRecord = require('../models/MedicalRecord'); 
const Visit = require('../models/Visit');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');

const createRecord = async (req, res) => {
    try {
        const { trieuChung } = req.body;
        const patientId = req.userId;

        if (!trieuChung) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập triệu chứng bệnh ban đầu!" });
        }

        const newRecord = new MedicalRecord({
            patientId,
            trieuChung,
            status: "Pending",
            createdAt: new Date()
        });

        await newRecord.save();

        return res.status(201).json({ 
            success: true, 
            message: "Đăng ký ca khám bệnh thành công!",
            data: newRecord 
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getPendingRecords = async (req, res) => {
    try {
        const pendingList = await MedicalRecord.find({ status: "Pending" })
                                               .populate('patientId', 'fullName dob gender phone');

        const formattedData = pendingList.map(item => ({
            _id: item._id,
            fullName: item.patientId?.fullName || "Bệnh nhân vãng lai",
            dob: item.patientId?.dob || "",
            gender: item.patientId?.gender || "Nam",
            phone: item.patientId?.phone || "---",
            trieuChung: item.trieuChung || "Khám tổng quát"
        }));

        return res.status(200).json({ success: true, data: formattedData });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getDoctorPendingList = async (req, res) => {
    try {
        const { specialty, date } = req.query;

        const filter = { status: "pending" };
        if (specialty) filter.specialty = specialty;
        if (date) filter.appointmentDate = date;

        const visits = await Visit.find(filter).sort({ createdAt: 1 });

        const formattedData = await Promise.all(visits.map(async (v) => {
            let patientInfo = {
                fullName: "Bệnh nhân",
                dob: "",
                gender: "",
                phone: "---"
            };

            try {
                const db = mongoose.connection.db;
                // ✅ FIX: _id trong DB là string → thử cả ObjectId lẫn string
                let patient = null;
                try {
                    const objId = new mongoose.Types.ObjectId(v.patientId);
                    patient = await db.collection('patients').findOne({ _id: objId });
                } catch (_) {}
                if (!patient) {
                    patient = await db.collection('patients').findOne({ _id: v.patientId });
                }
                if (patient) {
                    patientInfo.fullName = patient.fullName || "Bệnh nhân";
                    patientInfo.dob      = patient.dob      || "";
                    patientInfo.gender   = patient.gender   || "";
                    patientInfo.phone    = patient.phone    || "---";
                }
            } catch (e) {
                console.error("Lỗi lookup patient:", e.message);
            }

            return {
                _id: v._id,
                appointmentDate: v.appointmentDate,
                specialty: v.specialty,
                trieuChungLamSang: v.trieuChungLamSang,
                ...patientInfo
            };
        }));

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getDoctorCompletedList = async (req, res) => {
    try {
        const { specialty, date } = req.query;
        const filter = { status: "completed" };
        if (specialty) filter.specialty = specialty;
        if (date) filter.appointmentDate = date;

        const visits = await Visit.find(filter).sort({ createdAt: -1 });

        const formattedData = await Promise.all(visits.map(async (v) => {
            let patientInfo = {
                fullName: "Bệnh nhân",
                dob: "",
                gender: "",
                phone: "---"
            };
            try {
                const db = mongoose.connection.db;
                // ✅ FIX: _id trong DB là string → thử cả ObjectId lẫn string
                let patient = null;
                try {
                    const objId = new mongoose.Types.ObjectId(v.patientId);
                    patient = await db.collection('patients').findOne({ _id: objId });
                } catch (_) {}
                if (!patient) {
                    patient = await db.collection('patients').findOne({ _id: v.patientId });
                }
                if (patient) {
                    patientInfo.fullName = patient.fullName || "Bệnh nhân";
                    patientInfo.dob      = patient.dob      || "";
                    patientInfo.gender   = patient.gender   || "";
                    patientInfo.phone    = patient.phone    || "---";
                }
            } catch (e) {
                console.error("Lỗi lookup patient:", e.message);
            }
            return {
                _id: v._id,
                appointmentDate: v.appointmentDate,
                specialty: v.specialty,
                trieuChungLamSang: v.trieuChungLamSang,
                chanDoanChuyenMon: v.chanDoanChuyenMon,
                huongDieuTri: v.huongDieuTri,
                doctorName: v.doctorName,
                ...patientInfo
            };
        }));

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getDoctorCompletedCount = async (req, res) => {
    try {
        const { specialty, date } = req.query;
        const filter = { status: "completed" };
        if (specialty) filter.specialty = specialty;
        if (date) filter.appointmentDate = date;

        const count = await Visit.countDocuments(filter);
        return res.json({ success: true, count });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const completeVisit = async (req, res) => {
    try {
        const { recordId, diagnose, prescription, doctorName } = req.body;

        if (!recordId || !diagnose || !prescription) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bệnh án!" });
        }

        // ✅ FIX: _id là string → dùng findOneAndUpdate thay vì findByIdAndUpdate
       const db = mongoose.connection.db;
       const visitObjectId = new mongoose.Types.ObjectId(recordId);
       await db.collection('visits').updateOne(
           { _id: visitObjectId },
            { $set: {
                chanDoanChuyenMon: diagnose,
                huongDieuTri: prescription,
                doctorName: doctorName || "",
                status: "completed",
                updatedAt: new Date()
            }}
        );
        const visit = await db.collection('visits').findOne({ _id: visitObjectId });

        if (!visit) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lịch khám!" });
        }

        // Đồng bộ hash bệnh án lên blockchain
        let recordTxHash = null;
        try {
            const recordContent = JSON.stringify({ recordId, diagnose, prescription, doctorName });
            const recordHash = ethers.keccak256(ethers.toUtf8Bytes(recordContent));

            const medicalContract = getContractInstance('medicalRecord');
            const tx = await medicalContract.addRecordHash(
                String(visit.patientId),
                "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586",
                recordHash
            );
            await tx.wait();
            recordTxHash = tx.hash;
        } catch (bcError) {
            console.error('Lỗi đồng bộ MedicalRecord blockchain:', bcError.message);
        }

        return res.json({ success: true, message: "Lưu bệnh án thành công!", data: visit, recordTxHash });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
};

const getRecordById = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: "Lấy chi tiết bệnh án thành công" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const updateRecordByDoctor = async (req, res) => {
    try {
        const recordId = req.params.id;
        const { chanDoanChuyenMon, huongDieuTri } = req.body;
        const doctorId = req.userId || req.body.doctorId;

        const updatedRecord = await MedicalRecord.findByIdAndUpdate(
            recordId,
            { chanDoanChuyenMon, huongDieuTri, doctorId, status: "Completed", updatedAt: new Date() },
            { new: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca bệnh này" });
        }

        return res.status(200).json({ success: true, message: "Cập nhật bệnh án thành công!", data: updatedRecord });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getPatientHistory = async (req, res) => {
    try {
        const patientId = req.userId;
        const visits = await Visit.find({ patientId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: visits });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    createRecord,    
    getPendingRecords,
    getDoctorPendingList,
    getDoctorCompletedList,
    getDoctorCompletedCount,
    completeVisit,
    getRecordById,
    updateRecordByDoctor,
    getPatientHistory
};