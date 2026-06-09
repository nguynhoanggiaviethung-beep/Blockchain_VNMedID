const mongoose = require('mongoose');

// 1. Bệnh nhân đăng ký lịch khám trực tuyến
const createAppointment = async (req, res) => {
    try {
        const { specialty, appointmentDate, notes } = req.body;
        const patientId = req.user.userId; // Lấy ID bệnh nhân từ token đăng nhập (Module 4)
        const db = mongoose.connection.db;

        if (!specialty || !appointmentDate) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn chuyên khoa và ngày khám!' });
        }

        const newAppointment = {
            patientId: new mongoose.Types.ObjectId(patientId),
            patientName: req.user.fullName || "Bệnh nhân VNmedID",
            specialty,
            appointmentDate: new Date(appointmentDate),
            notes: notes || "",
            status: "pending", // Trạng thái chờ khám
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('appointments').insertOne(newAppointment);

        return res.status(201).json({
            success: true,
            message: 'Đăng ký lịch khám trực tuyến thành công!',
            data: newAppointment
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo lịch khám', error: error.message });
    }
};

// 2. Lấy danh sách lịch khám phân quyền (Bác sĩ thấy lịch của mình, Admin thấy hết)
const getAppointments = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const { role, userId } = req.user; // Lấy thông tin từ Middleware giải mã token

        let query = {};

        if (role === 'doctor') {
            // Lấy thông tin bác sĩ trước để biết chuyên khoa của họ
            const doctor = await db.collection('doctors').findOne({ _id: new mongoose.Types.ObjectId(userId) });
            if (doctor && doctor.specialty) {
                // Bác sĩ chỉ thấy lịch hẹn thuộc đúng chuyên khoa của mình
                query = { specialty: doctor.specialty };
            } else {
                return res.status(200).json({ success: true, data: [] });
            }
        } else if (role === 'admin') {
            // Admin thấy HẾT, không cần lọc gì cả
            query = {};
        } else if (role === 'patient') {
            // Tiện thể làm luôn cho Bệnh nhân tự xem lại lịch sử đăng ký của mình
            query = { patientId: new mongoose.Types.ObjectId(userId) };
        }

        const appointments = await db.collection('appointments').find(query).sort({ appointmentDate: 1 }).toArray();

        return res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách lịch khám', error: error.message });
    }
};

module.exports = { createAppointment, getAppointments };
