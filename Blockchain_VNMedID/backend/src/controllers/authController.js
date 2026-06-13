const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const ethers = require("ethers");

const { getContractInstance } = require("../config/web3");

const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      dob,
      gender,
      phone,
      specialty,
      doctorId,
      licenseNumber,
      
    } = req.body;

    const db = mongoose.connection.db;

    const existing = await db.collection("users").findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại!",
      });
    }

    // Tạo ID trước
    const commonId = new mongoose.Types.ObjectId();

    // Tạo wallet blockchain
    const wallet = ethers.Wallet.createRandom();

    const walletAddress = wallet.address;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    await db.collection("users").insertOne({
      _id: commonId,
      fullName,
      email,
      password: hashedPassword,
      role: role || "doctor",

      walletAddress,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save doctor
    if (role === "doctor") {
      await db.collection("doctors").insertOne({
        _id: commonId,
        fullName,
        email,
        dob,
        gender,
        phone,
        specialty,
        licenseNumber,

        walletAddress,

        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Blockchain sync
    const userRegistry = getContractInstance("userRegistry");

    const roleValue = role === "doctor" ? 2 : 1;

    const tx = await userRegistry.registerUser(
      walletAddress,
      commonId.toString(),
      roleValue,
    );

    await tx.wait();

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công và đồng bộ blockchain!",

      data: {
        userId: commonId,
        walletAddress,
        txHash: tx.hash,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const db = mongoose.connection.db;

    if (!db) {
      return res
        .status(500)
        .json({ success: false, message: "Database chưa sẵn sàng!" });
    }

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không tồn tại!" });
    }

    if (user.role !== role) {
      return res
        .status(403)
        .json({
          success: false,
          message: `Tài khoản không có quyền đăng nhập với tư cách ${role}!`,
        });
    }

    const isMatch = await bcrypt
      .compare(password, user.password)
      .catch(() => false);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Mật khẩu không chính xác!" });
    }

    const secretKey = process.env.JWT_SECRET || "vnmedid_super_secret_key_2024";
    const token = jwt.sign({ userId: user._id, role }, secretKey, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token,
        role,
        fullName: user.fullName || "Người dùng VNmedID",
        userId: user._id,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const registerPatient = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      dob,
      gender,
      phone,
      address,
      citizenId,
    } = req.body;

    if (!email || !password || !fullName || !citizenId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc!",
      });
    }

    const db = mongoose.connection.db;

    // Kiểm tra email đã tồn tại chưa
    const emailDaTon = await db.collection("users").findOne({ email });
    if (emailDaTon) {
      return res.status(400).json({
        success: false,
        message: "Email này đã được đăng ký!",
      });
    }

    // Kiểm tra CCCD đã tồn tại chưa
    const cccdDaTon = await db.collection("patients").findOne({ citizenId });
    if (cccdDaTon) {
      return res.status(400).json({
        success: false,
        message: "Số CCCD này đã được đăng ký!",
      });
    }

    // Dùng chung 1 ID cho cả 2 bảng
    const commonId = new mongoose.Types.ObjectId();
    const matKhauMaHoa = await bcrypt.hash(password, 10);

    // Lưu vào bảng users
    await db.collection("users").insertOne({
      _id: commonId,
      fullName,
      email,
      password: matKhauMaHoa,
      role: "patient",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Lưu vào bảng patients
    await db.collection("patients").insertOne({
      _id: commonId,
      fullName,
      dob,
      gender,
      phone,
      address,
      citizenId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản bệnh nhân thành công!",
      data: { userId: commonId, fullName, email, role: "patient" },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message,
    });
  }
};

module.exports = { register, login, registerPatient };
