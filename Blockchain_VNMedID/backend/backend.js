require('dotenv').config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDatabase = require('./src/config/mongodb');

// Force-load web3 config so startup always prints the Sepolia connection log
require('./src/config/web3');

const JWT_SECRET = 'vnmedid_super_secret_key_2024';
const PORT = process.env.PORT || 5000; // ✅ FIX: Render tự cấp PORT, ưu tiên lấy process.env.PORT để không bị lỗi bind port
process.env.JWT_SECRET = JWT_SECRET;

// 1. KHỞI TẠO APP TRƯỚC
const app = express();

// 2. MIDDLEWARE CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép request không có origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Cho phép tất cả origin (Linh hoạt cho môi trường dev và production Render)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Xử lý êm đẹp cho các trình duyệt cũ khi gửi request OPTIONS
};

// Sử dụng một lần duy nhất middleware cors ở đầu app
app.use(cors(corsOptions));
app.use(express.json());

// 3. MIDDLEWARE DEBUG LOG
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// 4. ENDPOINT TRA CỨU OPENFDA REAL-TIME
app.get('/api/v1/drugs/search', async (req, res, next) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query || query.length < 2) return res.json([]);

    const fdaUrl = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(query)}"*&limit=10`;
    const response = await fetch(fdaUrl);
    if (!response.ok) return res.json([]);

    const fdaData = await response.json();
    const cleanDrugs = fdaData.results.map(item => {
      const brandName = item.brand_name || "Unknown Brand";
      const genericName = item.generic_name ? `(${item.generic_name})` : "";
      const labeler = item.labeler_name ? ` - ${item.labeler_name}` : "";
      return `${brandName} ${genericName}${labeler}`;
    });

    res.json(cleanDrugs);
  } catch (error) {
    next(error); // Chuyển lỗi xuống Error Handler xử lý tập trung
  }
});

// 5. ROUTES ĐỊNH TUYẾN
require('./src/models/Shift');
app.use('/api/v1/shifts', require('./src/routes/shiftRoutes')); 

app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/ekyc', require('./src/routes/ekycRoutes'));
app.use('/api/v1/patients', require('./src/routes/patientRoutes'));
app.use('/api/v1/doctors', require('./src/routes/doctorRoutes'));
app.use('/api/v1/visits', require('./src/routes/visitRoutes'));       
app.use('/api/v1/medical-records', require('./src/routes/medicalRecordRoutes'));
app.use('/api/v1/invoices', require('./src/routes/invoiceRoutes'));
app.use('/api/v1/access', require('./src/routes/accessRoutes'));
app.use('/api/v1/payments', require('./src/routes/paymentRoutes'));
app.use('/api/v1/gov', require('./src/routes/govRoutes'));

app.get("/", (req, res) => res.send("Backend VNmedID đang chạy mượt mà!"));

const { startRevokeExpiredAccessJob } = require('./src/cron/revokeExpiredAccess');
startRevokeExpiredAccessJob();

// 🛠️ THÊM MỚI: GLOBAL ERROR HANDLER MIDDLEWARE (Phải đặt dưới cùng của các routes)
// Giúp bẫy toàn bộ lỗi crash ngầm trong controller, trả về JSON kèm Header CORS đầy đủ
app.use((err, req, res, next) => {
  console.error("❌ Lỗi Hệ Thống:", err.stack || err.message || err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ trong quá trình xử lý.",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 6. KHỔI ĐỘNG SERVER
connectDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server đang chạy thành công tại cổng ${PORT}`));
  })
  .catch((err) => console.log('❌ Lỗi kết nối MongoDB:', err.message));