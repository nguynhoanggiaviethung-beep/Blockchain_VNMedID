const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const JWT_SECRET = 'vnmedid_super_secret_key_2024';
const MONGO_URI = 'mongodb://localhost:27017/vnmedid';
const PORT = 5000;

process.env.JWT_SECRET = JWT_SECRET;

const app = express();

// 1. CÁC MIDDLEWARE HỆ THỐNG (Phải đặt trên cùng)
app.use(cors());
app.use(express.json());

// 2. MIDDLEWARE DEBUG LOG (Đưa lên đây để bắt được TẤT CẢ request, kể cả api/v1/drugs)
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// 3. ENDPOINT TRA CỨU OPENFDA REAL-TIME
app.get('/api/v1/drugs/search', async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    
    // Nếu bác sĩ gõ dưới 2 ký tự thì không cần gọi API để tránh nghẽn
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // URL gọi trực tiếp đến kho dữ liệu mở openFDA toàn cầu
    const fdaUrl = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(query)}"*&limit=10`;
    
    const response = await fetch(fdaUrl);
    
    if (!response.ok) {
      // openFDA trả về lỗi 404 hoặc lỗi mạng khi không tìm thấy kết quả nào khớp
      return res.json([]);
    }

    const fdaData = await response.json();
    
    // Bóc tách mảng kết quả thô trả về dạng chuỗi đẹp gọn gàng
    const cleanDrugs = fdaData.results.map(item => {
      const brandName = item.brand_name || "Unknown Brand";
      const genericName = item.generic_name ? `(${item.generic_name})` : "";
      const labeler = item.labeler_name ? ` - ${item.labeler_name}` : "";
      return `${brandName} ${genericName}${labeler}`;
    });

    res.json(cleanDrugs);

  } catch (error) {
    console.error("Lỗi kết nối openFDA:", error);
    res.status(500).json({ error: "Lỗi hệ thống tra cứu kho thuốc FDA" });
  }
});

// 4. NẠP CÁC ROUTE ĐƯỜNG DẪN HỆ THỐNG
app.use('/api/v1/auth',            require('./src/routes/authRoutes'));
app.use('/api/v1/patients',        require('./src/routes/patientRoutes'));
app.use('/api/v1/doctors',         require('./src/routes/doctorRoutes'));
app.use('/api/v1/visits',          require('./src/routes/visitRoutes'));
app.use('/api/v1/medical-records', require('./src/routes/medicalRecordRoutes'));
app.use('/api/v1/invoices',        require('./src/routes/invoiceRoutes'));
app.use('/api/v1/access',          require('./src/routes/accessRoutes'));
app.use('/api/v1/payments',        require('./src/routes/paymentRoutes'));
app.use('/api/v1/appointments', require('./src/routes/appointmentRoutes'));

app.get("/", (req, res) => {
    res.send("Backend VNmedID đang chạy!");
});

// 5. KHỞI ĐỘNG SERVER PORT 5000
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
});

// 6. KẾT NỐI DATABASE MONGO
mongoose.connect(MONGO_URI, {
    directConnection: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
})
.then(() => {
    console.log('✅ Kết nối MongoDB thành công!');
})
.catch((err) => {
    console.log('❌ Lỗi kết nối MongoDB:', err.message);
});