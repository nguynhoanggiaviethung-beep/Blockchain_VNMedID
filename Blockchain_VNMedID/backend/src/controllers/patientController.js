// src/controllers/patientController.js
// Module 2 — Patient CRUD API

const Patient = require('../models/Patient');

// ==========================================
// POST /api/v1/patients
// Tạo bệnh nhân mới — chỉ Admin
// ==========================================
const createPatient = async (req, res) => {
    try {
        const { fullName, dob, gender, phone, address, citizenId } = req.body;

        // Kiểm tra citizenId đã tồn tại chưa
        const daCoBenh = await Patient.findOne({ citizenId });
        if (daCoBenh) {
            return res.status(400).json({
                success: false,
                message: 'Số CCCD này đã được đăng ký trong hệ thống'
            });
        }

        // Tạo bệnh nhân mới
        const benhNhanMoi = await Patient.create({
            fullName, dob, gender, phone, address, citizenId
        });

        return res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ bệnh nhân thành công!',
            data: { patientId: benhNhanMoi._id }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

// ==========================================
// GET /api/v1/patients
// Lấy danh sách tất cả bệnh nhân — Admin + Doctor
// ==========================================
const getAllPatients = async (req, res) => {
    try {
        // Hỗ trợ tìm kiếm theo tên hoặc CCCD
        const { search } = req.query;
        let filter = {};

        if (search) {
            filter = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { citizenId: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const danhSach = await Patient.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách bệnh nhân thành công',
            data: {
                total: danhSach.length,
                patients: danhSach
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

// ==========================================
// GET /api/v1/patients/:id
// Lấy thông tin 1 bệnh nhân — Admin + Doctor + Patient
// ==========================================
const getPatientById = async (req, res) => {
    try {
        const benhNhan = await Patient.findById(req.params.id);

        if (!benhNhan) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân này'
            });
        }

        return res.status(200).json({
            success: true,
            data: benhNhan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

// ==========================================
// PUT /api/v1/patients/:id
// Cập nhật thông tin bệnh nhân — chỉ Admin
// ==========================================
const updatePatient = async (req, res) => {
    try {
        const { fullName, dob, gender, phone, address, nhomMau, tienSuBenh, diUng, trieuChung, ghiChu } = req.body;

        const benhNhan = await Patient.findByIdAndUpdate(
            req.params.id,
            { fullName, dob, gender, phone, address, nhomMau, tienSuBenh, diUng, trieuChung, ghiChu },
            { new: true, runValidators: true }
        );

        if (!benhNhan) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân này'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin bệnh nhân thành công!',
            data: benhNhan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

// ==========================================
// DELETE /api/v1/patients/:id
// Xóa bệnh nhân — chỉ Admin
// ==========================================
const deletePatient = async (req, res) => {
    try {
        const benhNhan = await Patient.findByIdAndDelete(req.params.id);

        if (!benhNhan) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân này'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa bệnh nhân thành công!'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};
// ==========================================
// PUT /api/v1/patients/:id/health-profile
// Bệnh nhân tự cập nhật hồ sơ sức khỏe
// ==========================================
const capNhatHoSoSucKhoe = async (req, res) => {
    try {
        const { nhomMau, tienSuBenh, diUng, trieuChung, ghiChu } = req.body;

        const benhNhan = await Patient.findByIdAndUpdate(
            req.params.id,
            { nhomMau, tienSuBenh, diUng, trieuChung, ghiChu },
            { new: true }
        );

        if (!benhNhan) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân!'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật hồ sơ sức khỏe thành công!',
            data: benhNhan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống',
            error: error.message
        });
    }
};

module.exports = {
    createPatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    capNhatHoSoSucKhoe
};
