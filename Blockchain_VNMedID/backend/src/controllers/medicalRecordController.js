const MedicalRecord = require('../models/MedicalRecord'); 
const Visit = require('../models/Visit');
const Invoice = require('../models/Invoice'); // ✅ Tự động import model hóa đơn
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

        // ========================================================
        // 💳 TỰ ĐỘNG SINH HÓA ĐƠN KHI BÁC SĨ KHÁM XONG (ON-CHAIN & OFF-CHAIN)
        // ========================================================
        try {
            let patientObjectId;
            try { patientObjectId = new mongoose.Types.ObjectId(visit.patientId); } catch(_) {}
            
            const patientUser = await db.collection('users').findOne({ 
                $or: [{ _id: patientObjectId }, { _id: visit.patientId }] 
            });

            if (patientUser && patientUser.walletAddress) {
                const generatedInvoiceId = "INV-" + Math.floor(10000000 + Math.random() * 90000000);
                const defaultAmount = 0.002; 

                // 1. Lưu hóa đơn vào MongoDB
                const autoInvoice = new Invoice({
                    invoiceId: generatedInvoiceId,
                    amount: defaultAmount,
                    patientWallet: patientUser.walletAddress,
                    paymentStatus: 'pending',
                    createdAt: new Date()
                });
                await autoInvoice.save();

                // 2. Lưu hóa đơn lên Smart Contract Payment Sepolia
                const paymentContract = getContractInstance('payment');
                const amountWei = ethers.parseEther(defaultAmount.toString());
                const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientUser.walletAddress, amountWei);
                await paymentTx.wait();
                
                console.log(`[Tự động] Đã tạo hóa đơn liên kết: ${generatedInvoiceId} cho ví: ${patientUser.walletAddress}`);
            } else {
                console.warn("⚠️ Không tìm thấy địa chỉ ví bệnh nhân, bỏ qua bước sinh hóa đơn tự động.");
            }
        } catch (invoiceError) {
            console.error('❌ Lỗi tự động sinh hóa đơn:', invoiceError.message);
        }
        // ========================================================

        return res.json({ success: true, message: "Lưu bệnh án thành công!", data: visit, recordTxHash });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
};

// ========================================================
// 🔍 CHỨC NĂNG MỚI: GỌI HÀM getPatientRecord TỪ SMART CONTRACT
// ========================================================
const getOnChainRecord = async (req, res) => {
    try {
        const { patientAddress } = req.params;

        if (!patientAddress) {
            return res.status(400).json({ success: false, message: "Thiếu địa chỉ ví bệnh nhân!" });
        }

        // 1. Khởi tạo instance kết nối tới Smart Contract MedicalRecord
        const medicalContract = getContractInstance('medicalRecord');
        let result;
        try {
            result = await medicalContract.getPatientRecord(patientAddress);
        } catch (contractError) {

            console.warn(`⚠️ Ví bệnh nhân ${patientAddress} chưa có bệnh án On-chain:`, contractError.message);
            return res.status(200).json({
                success: true,
                data: {
                    patientAddress: patientAddress,
                    hospitalAddress: "0x0000000000000000000000000000000000000000",
                    history: []
                }
            });    
        }

        const fetchedPatient = result[0];
        const hospitalAddress = result[1];
        const recordHashes = result[2];
        const timestamps = result[3];

        // 3. Tiến hành map mảng song song giữa hash và timestamp
        const historyList = recordHashes.map((hash, index) => {
            const dateObj = new Date(Number(timestamps[index]) * 1000);
            return {
                stt: index + 1,
                hash: hash,
                time: dateObj.toLocaleString('vi-VN') // Định dạng ngày tháng VN đọc được
            };
        });

        // 4. Trả dữ liệu cấu trúc mảng hoàn chỉnh về cho Frontend
        return res.status(200).json({
            success: true,
            data: {
                patientAddress: fetchedPatient,
                hospitalAddress: hospitalAddress,
                history: historyList
            }
        });

    } catch (error) {
        console.error("❌ Lỗi khi thực thi hàm getPatientRecord:", error.message);
        return res.status(500).json({ success: false, message: "Lỗi truy vấn dữ liệu Blockchain", error: error.message });
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
    getOnChainRecord, // ✅ Đừng quên export hàm mới này ra nhé!
    getRecordById,
    updateRecordByDoctor,
    getPatientHistory
};