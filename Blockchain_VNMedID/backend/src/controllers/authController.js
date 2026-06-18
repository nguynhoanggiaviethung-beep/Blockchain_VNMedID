const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const register = async (req, res) => {
  try {
    const { fullName, email, password, role, dob, gender, phone, specialty, licenseNumber } = req.body;
    const db = mongoose.connection.db;

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email đã tồn tại!" });
    }

    const commonId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      _id: commonId, fullName, email,
      password: hashedPassword, role: role || "doctor",
      createdAt: new Date(), updatedAt: new Date(),
    });

    if (role === "doctor") {
      await db.collection("doctors").insertOne({
        _id: commonId, fullName, email,
        dob, gender, phone, specialty, licenseNumber,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công!",
      data: { userId: commonId, fullName, email, role },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const db = mongoose.connection.db;

    if (!db) return res.status(500).json({ success: false, message: "Database chưa sẵn sàng!" });

    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Tài khoản không tồn tại!" });

    if (user.role !== role) {
      return res.status(403).json({ success: false, message: `Tài khoản không có quyền đăng nhập với tư cách ${role}!` });
    }

    const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch) return res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" });

    const secretKey = process.env.JWT_SECRET || "vnmedid_super_secret_key_2024";
    const token = jwt.sign({ userId: user._id, role }, secretKey, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token, role,
        fullName: user.fullName || "Người dùng VNmedID",
        userId: user._id,
        // ✅ Trả về walletAddress để frontend biết đã kết nối ví chưa
        walletAddress: user.walletAddress || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const registerPatient = async (req, res) => {
  try {
    const { email, password, fullName, dob, gender, phone, address, citizenId, walletAddress, isVerified } = req.body;

    if (!email || !password || !fullName || !citizenId) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    const db = mongoose.connection.db;

    const emailDaTon = await db.collection("users").findOne({ email });
    if (emailDaTon) return res.status(400).json({ success: false, message: "Email này đã được đăng ký!" });

    const cccdDaTon = await db.collection("patients").findOne({ citizenId });
    if (cccdDaTon) return res.status(400).json({ success: false, message: "Số CCCD này đã được đăng ký!" });

    const commonId = new mongoose.Types.ObjectId();
    const matKhauMaHoa = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      _id: commonId, fullName, email,
      password: matKhauMaHoa, role: "patient",
      walletAddress: walletAddress || null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    await db.collection("patients").insertOne({
      _id: commonId, fullName, dob, gender,
      phone, address, citizenId,
      isVerified: isVerified || false,
      cccdVerifiedAt: isVerified ? new Date() : null,
      walletAddress: walletAddress || null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản bệnh nhân thành công!",
      data: { userId: commonId, fullName, email, role: "patient" },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
  }
};

// ✅ Đăng nhập bằng ví MetaMask
const loginWithWallet = async (req, res) => {
  try {
    const { walletAddress, selectedRole } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp địa chỉ ví!" });
    }

    const db = mongoose.connection.db;

    const user = await db.collection("users").findOne({
      walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản liên kết với ví này! Vui lòng đăng nhập bằng email trước." });
    }

    if (selectedRole && user.role !== selectedRole) {
      const roleNameVi = selectedRole === 'doctor' ? 'Bác sĩ' : selectedRole === 'patient' ? 'Bệnh nhân' : 'Admin';
      return res.status(403).json({ 
        success: false, 
        message: `Ví này đã được liên kết với tài khoản có quyền [${user.role === 'patient' ? 'Bệnh nhân' : 'Bác sĩ'}]. Bạn không thể đăng nhập với tư cách ${roleNameVi}!` 
      });
    }

    const secretKey = process.env.JWT_SECRET || "vnmedid_super_secret_key_2024";
    const token = jwt.sign({ userId: user._id, role: user.role }, secretKey, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập bằng ví thành công!",
      data: {
        token, role: user.role,
        fullName: user.fullName || "Người dùng VNmedID",
        userId: user._id,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// ✅ Lưu ví MetaMask — sửa req.user.id → req.user.userId
const saveWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp địa chỉ ví!" });
    }

    const db = mongoose.connection.db;

    // ✅ FIX: dùng req.user.userId (khớp với authMiddleware)
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { walletAddress: walletAddress, updatedAt: new Date() } }
    );

    await db.collection("patients").updateOne(
      { _id: userId },
      { $set: { walletAddress: walletAddress, updatedAt: new Date() } }
    );

    return res.status(200).json({ success: true, message: "Lưu ví thành công!", data: { walletAddress } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = { register, login, registerPatient, loginWithWallet, saveWallet };