// C:\NEW BLOCKCHAIN\Blockchain_VNMedID\backend\src\controllers\medicalRecordController.js

const MedicalRecord = require('../models/MedicalRecord'); 
const Visit = require('../models/Visit');
const Invoice = require('../models/Invoice'); 
const Patient = require('../models/Patient'); // ✅ Đảm bảo import Model Patient chính thức
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');
const { uploadJSONToIPFS, getIPFSGatewayUrl } = require('../utils/ipfs'); 

// ==========================================
// 1. ĐĂNG KÝ CA KHÁM BAN ĐẦU
// ==========================================
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

// ==========================================
// 2. LẤY DANH SÁCH CHỜ CHUNG
// ==========================================
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

// ==========================================
// 3. DANH SÁCH BỆNH NHÂN CHỜ KHÁM (TRANG BÁC SĨ)
// ==========================================
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
                if (v.patientId) {
                    const objId = new mongoose.Types.ObjectId(v.patientId);
                    // ✅ Thay đổi sang tìm bằng Model Patient chính thức giúp hiển thị chính xác tên
                    const patient = await Patient.findById(objId);
                    if (patient) {
                        patientInfo.fullName = patient.fullName || "Bệnh nhân";
                        patientInfo.dob      = patient.dob      || "";
                        patientInfo.gender   = patient.gender   || "";
                        patientInfo.phone    = patient.phone    || "---";
                    }
                }
            } catch (e) {
                console.error("Lỗi lookup patient tại pending list:", e.message);
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

// ==========================================
// 4. DANH SÁCH BỆNH NHÂN ĐÃ KHÁM XONG
// ==========================================
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
                if (v.patientId) {
                    const objId = new mongoose.Types.ObjectId(v.patientId);
                    // ✅ Đồng bộ sửa đổi tìm bằng Model Patient chính thức tại đây
                    const patient = await Patient.findById(objId);
                    if (patient) {
                        patientInfo.fullName = patient.fullName || "Bệnh nhân";
                        patientInfo.dob      = patient.dob      || "";
                        patientInfo.gender   = patient.gender   || "";
                        patientInfo.phone    = patient.phone    || "---";
                    }
                }
            } catch (e) {
                console.error("Lỗi lookup patient tại completed list:", e.message);
            }
            return {
                _id: v._id,
                appointmentDate: v.appointmentDate,
                specialty: v.specialty,
                trieuChungLamSang: v.trieuChungLamSang,
                chanDoanChuyenMon: v.chanDoanChuyenMon,
                huongDieuTri: v.huongDieuTri,
                doctorName: v.doctorName,
                ipfsHash: v.ipfsHash || "",      
                ...patientInfo
            };
        }));

        return res.json({ success: true, data: formattedData });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 5. ĐẾM SỐ CA ĐÃ HOÀN THÀNH
// ==========================================
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

// ==========================================
// 6. XỬ LÝ HOÀN THÀNH CA KHÁM (IPFS + SEPOLIA)
// ==========================================
const completeVisit = async (req, res) => {
    try {
        const { recordId, chanDoanChuyenMon, huongDieuTri, doctorName } = req.body;
        const diagnose = chanDoanChuyenMon;
        const prescription = huongDieuTri;

        if (!recordId || !diagnose || !prescription) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bệnh án!" });
        }

        const visitObjectId = new mongoose.Types.ObjectId(recordId);
        const existingVisit = await Visit.findById(visitObjectId);
        if (!existingVisit) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lịch khám!" });
        }

        // --------------------------------------------------------
        // 📦 BƯỚC 1: UPLOAD TOÀN BỘ NỘI DUNG BỆNH ÁN LÊN IPFS
        // --------------------------------------------------------
        let ipfsHash = "";
        let ipfsUrl = "";
        try {
            const recordPayload = {
                recordId,
                patientId: String(existingVisit.patientId),
                specialty: existingVisit.specialty || "",
                appointmentDate: existingVisit.appointmentDate || "",
                trieuChungLamSang: existingVisit.trieuChungLamSang || "",
                chanDoanChuyenMon: diagnose,
                huongDieuTri: prescription,
                doctorName: doctorName || "",
                timestamp: new Date().toISOString(),
            };

            ipfsHash = await uploadJSONToIPFS(recordPayload, `vnmedid-record-${recordId}`);
            ipfsUrl = getIPFSGatewayUrl(ipfsHash);
            console.log(`[IPFS] Đã upload bệnh án thành công lên IPFS: ${ipfsUrl}`);
        } catch (ipfsError) {
            console.error('❌ Lỗi upload IPFS:', ipfsError.message);
        }

        // --------------------------------------------------------
        // 💾 BƯỚC 2: CẬP NHẬT HỒ SƠ TRONG MONGODB (Lưu kèm ipfsHash)
        // --------------------------------------------------------
        const visit = await Visit.findByIdAndUpdate(
            visitObjectId,
            { $set: {
                chanDoanChuyenMon: diagnose,
                huongDieuTri: prescription,
                doctorName: doctorName || "",
                status: "completed",
                ipfsHash: ipfsHash, 
                updatedAt: new Date()
            }},
            { new: true }
        );

        // Lấy ví Blockchain của bệnh nhân từ bảng users
        let patientWalletAddress = null;
        try {
            const db = mongoose.connection.db;
            let patientObjectId;
            try { patientObjectId = new mongoose.Types.ObjectId(visit.patientId); } catch(_) {}
            const patientUser = await db.collection('users').findOne({ 
                $or: [{ _id: patientObjectId }, { _id: visit.patientId }] 
            });
            if (patientUser && patientUser.walletAddress) {
                patientWalletAddress = patientUser.walletAddress;
            }
        } catch (error) {
            console.error("Lỗi lấy ví bệnh nhân:", error.message);
        }

        const targetPatientKey = String(visit.patientId);

        // --------------------------------------------------------
        // ⛓️ BƯỚC 3: ĐỒNG BỘ MÃ HASH IPFS LÊN SMART CONTRACT (SEPOLIA)
        // --------------------------------------------------------
        let recordTxHash = null;
        try {
            // ✅ Đổi mới: Sử dụng trực tiếp ipfsHash làm nguyên liệu băm để lưu trữ trên Smart Contract
            const hashSource = ipfsHash
                ? JSON.stringify({ recordId, ipfsHash })
                : JSON.stringify({ recordId, diagnose, prescription, doctorName });

            const recordHash = ethers.keccak256(ethers.toUtf8Bytes(hashSource));

            console.log(`[Blockchain] Gửi hash bệnh án lên Sepolia cho PatientKey: ${targetPatientKey}`);
            const medicalContract = getContractInstance('medicalRecord');

            // Gọi hàm smart contract lưu dấu vân tay dữ liệu bất biến
            const tx = await medicalContract.addRecordHash(
                targetPatientKey,
                "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586", // Địa chỉ bệnh viện điều hành
                recordHash
            );
            await tx.wait();
            recordTxHash = tx.hash;
            console.log(`[Blockchain] Đồng bộ thành công! TxHash: ${tx.hash}`);
        } catch (bcError) {
            console.error('Lỗi đồng bộ MedicalRecord blockchain:', bcError.message);
        }

        // --------------------------------------------------------
        // 💳 BƯỚC 4: TỰ ĐỘNG SINH HÓA ĐƠN VIỆN PHÍ TRÊN CONTRACT
        // --------------------------------------------------------
        try {
            if (patientWalletAddress) {
                const generatedInvoiceId = "INV-" + Math.floor(10000000 + Math.random() * 90000000);
                const defaultAmount = 0.002; 

                const autoInvoice = new Invoice({
                    invoiceId: generatedInvoiceId,
                    amount: defaultAmount,
                    patientWallet: patientWalletAddress,
                    paymentStatus: 'pending',
                    createdAt: new Date()
                });
                await autoInvoice.save();

                const paymentContract = getContractInstance('payment');
                const amountWei = ethers.parseEther(defaultAmount.toString());
                const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientWalletAddress, amountWei);
                await paymentTx.wait();

                console.log(`[Hóa đơn] Đã tự động tạo hóa đơn: ${generatedInvoiceId} cho ví: ${patientWalletAddress}`);
            }
        } catch (invoiceError) {
            console.error('❌ Lỗi tự động sinh hóa đơn:', invoiceError.message);
        }

        return res.json({ 
            success: true, 
            message: "Lưu bệnh án và đồng bộ chuỗi khối thành công!", 
            data: visit, 
            recordTxHash,
            ipfsHash,
            ipfsUrl
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống hoàn tất ca khám", error: error.message });
    }
};

// ==========================================
// 7. TRUY VẤN DỮ LIỆU LỊCH SỬ TỪ CONTRACT (ON-CHAIN)
// ==========================================
const getOnChainRecord = async (req, res) => {
    try {
        const { patientAddress } = req.params;

        if (!patientAddress) {
            return res.status(400).json({ success: false, message: "Thiếu mã định danh hoặc địa chỉ ví bệnh nhân!" });
        }

        const medicalContract = getContractInstance('medicalRecord');
        let records = [];

        try {
            records = await medicalContract.getPatientRecord(patientAddress);
        } catch (contractError) {
            console.warn(`⚠️ Bệnh nhân chưa có hồ sơ On-chain:`, contractError.message);
            return res.status(200).json({
                success: true,
                data: { patientAddress, hospitalAddress: "0x0000000000000000000000000000000000000000", history: [] }
            });
        }

        const historyList = records.map((record, index) => {
            const hashValue = record.recordHash || record[0];
            const doctorWallet = record.doctorWallet || record[1];
            const timestamp = record.createdAt ? Number(record.createdAt) : Number(record[2]);

            return {
                stt: index + 1,
                hash: hashValue,
                doctorWallet: doctorWallet,
                time: new Date(timestamp * 1000).toLocaleString('vi-VN')
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                patientAddress,
                hospitalAddress: "0xD2db8cea80bFA1f536FaFDfe52f7d6404b21c586",
                history: historyList
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi truy vấn dữ liệu Blockchain", error: error.message });
    }
};

// ==========================================
// 8. CÁC HÀM PHỤ TRỢ KHÁC
// ==========================================
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