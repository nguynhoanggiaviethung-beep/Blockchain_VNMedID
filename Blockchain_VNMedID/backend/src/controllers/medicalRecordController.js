const MedicalRecord = require('../models/MedicalRecord'); 
const Visit = require('../models/Visit');
const Invoice = require('../models/Invoice'); 
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
        const { recordId, chanDoanChuyenMon, huongDieuTri, doctorName } = req.body;
        const diagnose = chanDoanChuyenMon;
        const prescription = huongDieuTri;

        if (!recordId || !diagnose || !prescription) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bệnh án!" });
        }

        const db = mongoose.connection.db;
        const visitObjectId = new mongoose.Types.ObjectId(recordId);
        
        // 1. Cập nhật hồ sơ Off-chain trong MongoDB
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

        // Lấy địa chỉ ví Blockchain chuẩn (0x...) của bệnh nhân từ database
        let patientWalletAddress = null;
        try {
            let patientObjectId;
            try { patientObjectId = new mongoose.Types.ObjectId(visit.patientId); } catch(_) {}
            const patientUser = await db.collection('users').findOne({ 
                $or: [{ _id: patientObjectId }, { _id: visit.patientId }] 
            });
            if (patientUser && patientUser.walletAddress) {
                patientWalletAddress = patientUser.walletAddress;
            }
        } catch (error) {
            console.error("Lỗi lấy ví bệnh nhân cho blockchain:", error.message);
        }

        // Định danh duy nhất để map bệnh án: Dùng ID bệnh nhân của MongoDB (String) theo đúng format struct Solidity của bạn
        const targetPatientKey = String(visit.patientId);

        // 2. Đồng bộ mã băm (Hash) bệnh án lên Mạng Sepolia
        let recordTxHash = null;
        try {
            const recordContent = JSON.stringify({ recordId, diagnose, prescription, doctorName });
            const recordHash = ethers.keccak256(ethers.toUtf8Bytes(recordContent));

            console.log(`[Blockchain] Tiến hành đẩy hash bệnh án lên Key: ${targetPatientKey}`);
            const medicalContract = getContractInstance('medicalRecord');
            
            // Hàm Smart Contract yêu cầu: addRecordHash(string patientId, address doctorWallet, string recordHash)
            const tx = await medicalContract.addRecordHash(
                targetPatientKey,
                "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586", // Địa chỉ ví bác sĩ / bệnh viện mặc định
                recordHash
            );
            await tx.wait();
            recordTxHash = tx.hash;
            console.log(`[Blockchain] Đẩy lên thành công! TxHash: ${tx.hash}`);
        } catch (bcError) {
            console.error('Lỗi đồng bộ MedicalRecord blockchain:', bcError.message);
        }

        // 3. Tự động sinh hóa đơn viện phí (On-chain & Off-chain)
        try {
            if (patientWalletAddress) {
                const generatedInvoiceId = "INV-" + Math.floor(10000000 + Math.random() * 90000000);
                const defaultAmount = 0.002; 

                // Lưu hóa đơn vào MongoDB
                const autoInvoice = new Invoice({
                    invoiceId: generatedInvoiceId,
                    amount: defaultAmount,
                    patientWallet: patientWalletAddress,
                    paymentStatus: 'pending',
                    createdAt: new Date()
                });
                await autoInvoice.save();

                // Lưu hóa đơn lên Smart Contract Payment Sepolia
                const paymentContract = getContractInstance('payment');
                const amountWei = ethers.parseEther(defaultAmount.toString());
                const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientWalletAddress, amountWei);
                await paymentTx.wait();
                
                console.log(`[Tự động] Đã tạo hóa đơn liên kết: ${generatedInvoiceId} cho ví: ${patientWalletAddress}`);
            } else {
                console.warn("⚠️ Không tìm thấy địa chỉ ví bệnh nhân, bỏ qua bước sinh hóa đơn tự động.");
            }
        } catch (invoiceError) {
            console.error('❌ Lỗi tự động sinh hóa đơn:', invoiceError.message);
        }

        return res.json({ success: true, message: "Lưu bệnh án thành công!", data: visit, recordTxHash });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
};

const getOnChainRecord = async (req, res) => {
    try {
        const { patientAddress } = req.params;

        if (!patientAddress) {
            return res.status(400).json({ success: false, message: "Thiếu mã định danh hoặc địa chỉ ví bệnh nhân!" });
        }

        const medicalContract = getContractInstance('medicalRecord');
        let records = [];

        try {
            // Gọi chính xác hàm getPatientRecord(string) từ file .sol
            records = await medicalContract.getPatientRecord(patientAddress);
        } catch (contractError) {
            console.warn(`⚠️ Bệnh nhân ${patientAddress} chưa có hồ sơ On-chain hoặc lỗi gọi hàm:`, contractError.message);
            return res.status(200).json({
                success: true,
                data: {
                    patientAddress: patientAddress,
                    hospitalAddress: "0x0000000000000000000000000000000000000000",
                    history: []
                }
            });
        }

        // Map mảng Struct PatientRecord[] từ Solidity sang mảng JSON object cho Frontend
        const historyList = records.map((record, index) => {
            // Trích xuất an toàn dữ liệu từ Struct object Solidity
            const hashValue = record.recordHash || record[0];
            const doctorWallet = record.doctorWallet || record[1];
            const timestamp = record.createdAt ? Number(record.createdAt) : Number(record[2]);

            const dateObj = new Date(timestamp * 1000);
            return {
                stt: index + 1,
                hash: hashValue,
                doctorWallet: doctorWallet,
                time: dateObj.toLocaleString('vi-VN')
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                patientAddress: patientAddress,
                hospitalAddress: "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586", // Mock địa chỉ bệnh viện xử lý ca bệnh
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
    getOnChainRecord, 
    getRecordById,
    updateRecordByDoctor,
    getPatientHistory
};