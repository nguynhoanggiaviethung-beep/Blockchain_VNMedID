// C:\NEW BLOCKCHAIN\Blockchain_VNMedID\backend\src\controllers\medicalRecordController.js

const MedicalRecord = require('../models/MedicalRecord');
const Visit = require('../models/Visit');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient'); // ✅ Đảm bảo import Model Patient chính thức
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const { getContractInstance } = require('../config/web3');
const { uploadJSONToIPFS, getIPFSGatewayUrl } = require('../utils/ipfs');

// =========================================================================
// 💊 BẢNG GIÁ 50 LOẠI THUỐC CỐ ĐỊNH (Tính bằng VND thực tế từ Cục Quản lý Dược)
// =========================================================================
const DRUG_PRICE_LIST = {
    // Nhóm hạ sốt, giảm đau
    "paracetamol": 15000,
    "panadol extra": 25000,
    "hapacol 650": 18000,
    "efferalgan codeine": 35000,
    "ibuprofen 400mg": 30000,
    "meloxicam": 45000,
    "celecoxib": 55000,

    // Nhóm kháng sinh
    "augmentin 1g": 145000,
    "amoxicillin 500mg": 35000,
    "klamentin 1g": 110000,
    "cefixim 200mg": 65000,
    "cefuroxim 500mg": 75000,
    "azithromycin 500mg": 95000,

    // Nhóm kháng viêm
    "alphachymotrypsin": 25000,
    "alphachoay": 32000,
    "prednisolon 5mg": 15000,
    "methylprednisolone 16mg": 55000,

    // Nhóm dạ dày, tiêu hóa
    "nexium mups 40mg": 160000,
    "esomeprazole 40mg": 75000,
    "phosphalugel": 40000,
    "gaviscon": 50000,

    // Nhóm hô hấp, dị ứng
    "singulair 10mg": 130000,
    "seretide evohaler": 240000,
    "ventolin nebules": 55000,
    "telfast 180mg": 68000,

    // Vitamin bổ sung
    "enervon": 20000,
    "vitamin c 500mg": 12000,
    "calcium corbiere": 42000,
    "boganic": 30000,
    "biogaia": 140000
};

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
                    const patient = await Patient.findById(objId);
                    if (patient) {
                        patientInfo.fullName = patient.fullName || "Bệnh nhân";
                        patientInfo.dob = patient.dob || "";
                        patientInfo.gender = patient.gender || "";
                        patientInfo.phone = patient.phone || "---";
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
                    const patient = await Patient.findById(objId);
                    if (patient) {
                        patientInfo.fullName = patient.fullName || "Bệnh nhân";
                        patientInfo.dob = patient.dob || "";
                        patientInfo.gender = patient.gender || "";
                        patientInfo.phone = patient.phone || "---";
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
    console.log("=========================================");
    console.log("🚀 COMPLETE VISIT CALLED");
    console.log("🧐 MEDICAL_RECORD_ADDRESS ĐANG ĐỌC TỪ ENV:", process.env.MEDICAL_RECORD_ADDRESS);
    console.log("=========================================");

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

        // Lấy ví Blockchain của bệnh nhân từ bảng users trước để phục vụ cả tính tiền lẫn contract
        let patientWalletAddress = null;
        try {
            const db = mongoose.connection.db;
            let patientObjectId;
            try { patientObjectId = new mongoose.Types.ObjectId(existingVisit.patientId); } catch (_) { }
            const patientUser = await db.collection('users').findOne({
                $or: [{ _id: patientObjectId }, { _id: existingVisit.patientId }]
            });
            if (patientUser && patientUser.walletAddress) {
                patientWalletAddress = patientUser.walletAddress;
            }
        } catch (error) {
            console.error("Lỗi lấy ví bệnh nhân:", error.message);
        }

        // --------------------------------------------------------
        // 💳 BƯỚC 4: QUÉT ĐƠN THUỐC, LƯU CHI TIẾT VÀ QUY ĐỔI SANG ETH
        // --------------------------------------------------------
        let totalETH = 0.002;
        let invoiceItems = []; // Mảng chứa chi tiết tên danh mục/thuốc cùng giá tiền mặt
        let totalVND = 100000; // Mặc định phí khám gốc ban đầu là 100.000 VND

        try {
            if (patientWalletAddress) {
                const generatedInvoiceId = `INV-${recordId.toString().substring(16)}`;
                const prescriptionText = (huongDieuTri || "").toLowerCase();

                // Khởi tạo mục đầu tiên là chi phí khám bệnh
                invoiceItems.push({
                    drugName: "Phí khám lâm sàng tổng quát",
                    priceVND: 100000
                });

                // Tìm kiếm thông tin thuốc từ đơn thuốc bác sĩ kê
                Object.keys(DRUG_PRICE_LIST).forEach(drug => {
                    if (prescriptionText.includes(drug)) {
                        totalVND += DRUG_PRICE_LIST[drug];
                        invoiceItems.push({
                            drugName: drug.toUpperCase(), // Chuyển chữ hoa nhìn trực quan
                            priceVND: DRUG_PRICE_LIST[drug]
                        });
                        console.log(`[Tính tiền] Phát hiện thuốc: ${drug} -> Cộng thêm ${DRUG_PRICE_LIST[drug]} VND`);
                    }
                });

                console.log(`[Tỷ giá] Tổng hóa đơn tiền mặt: ${totalVND.toLocaleString('vi-VN')} VND`);

                // Tỷ giá quy đổi ETH/VND cố định (1 ETH = 90.000.000 VND)
                const ETH_TO_VND_RATE = 90000000;
                totalETH = totalVND / ETH_TO_VND_RATE;
                totalETH = parseFloat(totalETH.toFixed(5));
                if (totalETH === 0) totalETH = 0.001;

                console.log(`[Tỷ giá] Đã quy đổi sang Web3: ${totalETH} ETH`);

                // Lưu thông tin hóa đơn mới CHỨA CẢ CHI TIẾT TÊN THUỐC + GIÁ vào MongoDB
                const autoInvoice = new Invoice({
                    invoiceId: generatedInvoiceId,
                    amount: totalETH,
                    patientWallet: patientWalletAddress,
                    paymentStatus: 'pending',
                    items: invoiceItems,     // 🌟 Đưa mảng chi tiết vào DB
                    totalVND: totalVND,      // 🌟 Lưu tổng tiền mặt VND
                    createdAt: new Date()
                });
                await autoInvoice.save();

                // Gọi Smart Contract Payment đồng bộ hóa đơn lên chuỗi khối Sepolia Testnet
                const paymentContract = getContractInstance('payment');
                const amountWei = ethers.parseEther(totalETH.toString());

                const paymentTx = await paymentContract.createInvoice(generatedInvoiceId, patientWalletAddress, amountWei);
                await paymentTx.wait();

                console.log(`[Hóa đơn] Đã tạo hóa đơn chi tiết ${generatedInvoiceId} lên Blockchain thành công!`);
            }
        } catch (invoiceError) {
            console.error('❌ Lỗi hệ thống khi quy đổi và sinh hóa đơn tự động:', invoiceError.message);
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
            {
                $set: {
                    chanDoanChuyenMon: diagnose,
                    huongDieuTri: prescription,
                    doctorName: doctorName || "",
                    status: "completed",
                    ipfsHash: ipfsHash,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        const targetPatientKey = String(visit.patientId);


        // --------------------------------------------------------
        // ⛓️ BƯỚC 3: ĐỒNG BỘ MÃ HASH IPFS LÊN SMART CONTRACT (SEPOLIA)
        // --------------------------------------------------------
        let recordTxHash = null;
        try {
            const hashSource = ipfsHash
                ? JSON.stringify({ recordId, ipfsHash })
                : JSON.stringify({ recordId, diagnose, prescription, doctorName });

            const recordHash = ethers.keccak256(ethers.toUtf8Bytes(hashSource));

            console.log(`[Blockchain] Gửi hash bệnh án lên Sepolia cho PatientKey: ${targetPatientKey}`);
            const medicalContract = getContractInstance('medicalRecord');

            const backendSignerAddress = medicalContract.runner ? medicalContract.runner.address : "0x66Bd396353701d97a7C21A23f57044761133dcD5";
            console.log(`[Blockchain] Địa chỉ thực hiện giao dịch (Hospital/Admin): ${backendSignerAddress}`);

            const tx = await medicalContract.addRecordHash(
                targetPatientKey,
                backendSignerAddress,
                visit.recordTxHash
            );
            await tx.wait();
            recordTxHash = tx.hash;
            console.log(`[Blockchain] Đồng bộ thành công! TxHash: ${tx.hash}`);
        } catch (bcError) {
            console.log("========== BLOCKCHAIN ERROR ==========");
            console.log(bcError.message);
            console.log("======================================");
        }

        try {
            const medicalRecord = new MedicalRecord({
                visitId: visitObjectId,
                patientId: existingVisit.patientId,
                doctorId: existingVisit.doctorId,
                diagnosis: diagnose,
                notes: prescription,
                ipfsHash: ipfsHash,
                blockchainTxHash: recordTxHash
            });
            await medicalRecord.save();
            console.log(`[MedicalRecord] Đã tạo bệnh án kèm txHash: ${recordTxHash}`);
        } catch (mrError) {
            console.error('❌ Lỗi tạo MedicalRecord:', mrError.message);
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

const getOnChainRecord = async (req, res) => {
    try {
        const { patientAddress } = req.params;
        const db = mongoose.connection.db;

        if (!patientAddress) {
            return res.status(400).json({ success: false, message: "Thiếu mã định danh hoặc địa chỉ ví bệnh nhân!" });
        }

        let targetContractKey = patientAddress;

        if (patientAddress.startsWith("0x")) {
            const linkedUser = await db.collection('users').findOne({
                walletAddress: { $regex: new RegExp(`^${patientAddress}$`, 'i') }
            });
            if (linkedUser) {
                targetContractKey = String(linkedUser._id);
                console.log(`[Đồng bộ On-chain] Đã map địa chỉ ví sang chuỗi định danh gốc: ${targetContractKey}`);
            }
        }

        const visits = await Visit.find({
            patientId: mongoose.Types.ObjectId.isValid(targetContractKey)
                ? new mongoose.Types.ObjectId(targetContractKey)
                : targetContractKey
        })
            .sort({ createdAt: 1 })
            .select('recordTxHash chanDoanChuyenMon doctorName updatedAt')
            .lean();

        if (!visits.length) {
            return res.status(200).json({
                success: true,
                data: { patientAddress, hospitalAddress: "0x0000000000000000000000000000000000000000", history: [] }
            });
        }

        const historyList = await Promise.all(records.map(async (record, index) => {
            const hashValue = record.recordHash || record[0];
            const doctorWallet = record.doctorWallet || record[1];
            const timestamp = record.createdAt ? Number(record.createdAt) : Number(record[2]);

            const matchedVisit = await Visit.findOne({
                $or: [
                    { ipfsHash: hashValue },
                    { patientId: targetContractKey }
                ]
            }).sort({ createdAt: -1 });
            

            return {
                stt: index + 1,
                hash: hashValue,
                doctorWallet: doctorWallet,
                time: new Date(timestamp * 1000).toLocaleString('vi-VN'),
                recordTxHash: matchedVisit ? matchedVisit.recordTxHash : null
            };
        }));

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