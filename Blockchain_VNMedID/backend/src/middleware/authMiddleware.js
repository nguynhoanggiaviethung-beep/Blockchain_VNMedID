const jwt = require('jsonwebtoken');

// 1. Middleware kiểm tra Login (Verify Token)
const xacThucToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập!' });
    }

    try {
        const secretKey = process.env.JWT_SECRET || 'vnmedid_super_secret_key_2024';
        const decoded = jwt.verify(token, secretKey);
        
        // ✅ Gán rõ ràng từng trường để Controller gọi không bao giờ bị undefined
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            hospitalName: decoded.hospitalName // Truyền thẻ tên Bệnh viện
        };
        req.userId = decoded.userId;
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ!' });
    }
};

// 2. Middleware phân quyền đa vai trò theo cách Nodemy
const phanQuyen = (...roles) => {
    return (req, res, next) => {
        // Nếu không có thông tin user hoặc role của user không nằm trong danh sách roles truyền vào
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Bạn không có quyền truy cập. Yêu cầu quyền: ${roles.join(', ')}`
            });
        }
        next();
    };
};

module.exports = { xacThucToken, phanQuyen };

