// API Format/src/controllers/doctorController.js
const mongoose = require('mongoose');
const Doctor = require('../models/doctor'); 
const bcrypt = require('bcrypt');
const Visit = require('../models/Visit');
/**
 * @desc    Tạo hồ sơ bác sĩ mới (Gồm: Tạo tài khoản ở 'users' + Tạo hồ sơ ở 'doctors')
 * @route   POST /api/v1/doctors
 * @note    GIỮ NGUYÊN HOÀN TOÀN cấu trúc Native Driver gốc của bạn
 */
const createDoctor = async (req, res) => {
    try {
        const { fullName, specialty, licenseNumber, walletAddress, email, password } = req.body;

        // 1. KIỂM TRA ĐẦU VÀO
        if (!fullName || !licenseNumber || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ các trường bắt buộc (Họ tên, Số giấy phép, Email, Mật khẩu)!' 
            });
        }

        const db = mongoose.connection.db;
        if (!db) {
            return res.status(500).json({ success: false, message: 'Database chưa sẵn sàng!' });
        }

        // 2. KIỂM TRA TRÙNG LẶP (Quét email bên bảng users và licenseNumber bên bảng doctors)
        const isEmailExist = await db.collection('users').findOne({ email });
        const isLicenseExist = await Doctor.findOne({ licenseNumber });

        if (isEmailExist || isLicenseExist) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email hoặc Số giấy phép này đã được đăng ký trên hệ thống!' 
            });
        }

        // 3. MÃ HÓA MẬT KHẨU
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. BƯỚC CHỐT: ÉP LƯU VÀO 2 BẢNG ĐỒNG THỜI BẰNG NATIVE DRIVER GỐC 100%
        const commonId = new mongoose.Types.ObjectId(); 

        // Bước 4.1: Ép lưu trực tiếp vào collection 'users' 
        await db.collection('users').insertOne({
            _id: commonId,
            fullName,
            email,
            password: hashedPassword,
            role: 'doctor',
            walletAddress,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ Đã ÉP lưu tài khoản vào bảng users với ID: ${commonId}`);

        // Bước 4.2: Lưu trực tiếp vào collection 'doctors'
        await db.collection('doctors').insertOne({
            _id: commonId, // Dùng chung ID với bảng users để đồng bộ 100%
            fullName,
            specialty,
            licenseNumber,
            walletAddress
        });
        console.log(`✅ Đã lưu hồ sơ vào bảng doctors với ID: ${commonId}`);

        // 5. PHẢN HỒI THÀNH CÔNG
        return res.status(201).json({ 
            success: true, 
            message: 'Tạo tài khoản và hồ sơ bác sĩ thành công!',
            data: {
                id: commonId,
                fullName,
                email
            }
        });

    } catch (error) {
        console.error("❌ Lỗi tại createDoctor:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống khi tạo bác sĩ!', 
            error: error.message 
        });
    }
};

/**
 * @desc    Lấy chi tiết thông tin 1 bác sĩ bằng ID tài khoản (userId từ token)
 * @route   GET /api/v1/doctors/:id
 * @note    SỬA LỖI TRUY VẤN: Vì bạn dùng native driver insert trực tiếp vào collection 'doctors' 
 * mà không qua mongoose model khép kín, một số trường hợp Mongoose Model `Doctor.findById` 
 * sẽ bị rỗng nếu Schema cấu trúc không khớp. Đổi sang dùng db.collection('doctors') gốc để ăn chặt 100%.
 */
const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const db = mongoose.connection.db;
        
        // Chuyển string ID nhận từ client về dạng ObjectId để tìm chính xác
        const objId = new mongoose.Types.ObjectId(id);
        
        // Dùng bộ driver gốc để tìm theo đúng cơ chế ép chung _id lúc tạo của bạn
        const doctor = await db.collection('doctors').findOne({ _id: objId });
        
        if (!doctor) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy thông tin hồ sơ của bác sĩ này!' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            data: doctor 
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống khi truy vấn dữ liệu bác sĩ!', 
            error: error.message 
        });
    }
};

/**
 * @desc    Lấy danh sách tất cả bác sĩ
 * @route   GET /api/v1/doctors
 * @note    GIỮ NGUYÊN HOÀN TOÀN
 */
const getAllDoctors = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            filter = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { specialty: { $regex: search, $options: 'i' } },
                    { licenseNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const danhSach = await Doctor.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách bác sĩ thành công',
            data: {
                total: danhSach.length,
                doctors: danhSach
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

/**
 * @desc    Cập nhật thông tin bác sĩ
 * @route   PUT /api/v1/doctors/:id
 * @note    GIỮ NGUYÊN HOÀN TOÀN
 */
const updateDoctor = async (req, res) => {
    try {
        const { fullName, specialty, walletAddress } = req.body;
        const db = mongoose.connection.db;

        // Cập nhật trong collection doctors
        const bacSi = await Doctor.findByIdAndUpdate(
            req.params.id,
            { fullName, specialty, walletAddress },
            { new: true, runValidators: true }
        );

        if (!bacSi) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ này!'
            });
        }

        // Cập nhật fullName trong collection users (đồng bộ 2 bảng)
        await db.collection('users').updateOne(
            { _id: bacSi._id },
            { $set: { fullName, walletAddress, updatedAt: new Date() } }
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin bác sĩ thành công!',
            data: bacSi
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

/**
 * @desc    Xóa bác sĩ (Xóa cả trong users và doctors)
 * @route   DELETE /api/v1/doctors/:id
 * @note    GIỮ NGUYÊN HOÀN TOÀN
 */
const deleteDoctor = async (req, res) => {
    try {
        const db = mongoose.connection.db;

        const bacSi = await Doctor.findByIdAndDelete(req.params.id);

        if (!bacSi) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ này!'
            });
        }

        // Xóa tài khoản trong collection users luôn
        await db.collection('users').deleteOne({ _id: bacSi._id });

        return res.status(200).json({
            success: true,
            message: 'Xóa bác sĩ thành công!'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};
/**
 * @desc    Xem chi tiết bác sĩ & lịch khám được phân công
 * @route   GET /api/v1/doctors/:doctorId/details
 */
const getDoctorDetails = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const db = mongoose.connection.db;
        
        // Tìm thông tin bác sĩ bằng native driver
        const objId = new mongoose.Types.ObjectId(doctorId);
        const doctorInfo = await db.collection('doctors').findOne({ _id: objId });
        
        if (!doctorInfo) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bác sĩ!' });
        }

        // Tìm danh sách bệnh nhân/ca khám đã gán cho bác sĩ này
        const assignedVisits = await Visit.find({ doctorId: doctorId })
            .sort({ appointmentDate: 1 })
            .populate('shiftId', 'shift room date');

        return res.json({ 
            success: true, 
            doctor: doctorInfo, 
            visits: assignedVisits,
            totalVisits: assignedVisits.length
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống', error: error.message });
    }
};

module.exports = {
    createDoctor,
    getDoctorById,
    getAllDoctors,
    updateDoctor,
    deleteDoctor,
    getDoctorDetails,
};