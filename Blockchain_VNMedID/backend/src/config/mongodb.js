const mongoose = require('mongoose');
const logger = require('../utils/logger');

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDatabase = async () => {
  try {
    const MONGO_URI = process.env.MONGODB_URI;
    
    // Kiểm tra biến môi trường
    if (!MONGO_URI) {
      throw new Error('Biến MONGODB_URI không được định nghĩa trong .env');
    }

    logger.database(`Đang kết nối: ${MONGO_URI.split('@')[0]}@...`); // Ẩn pass
    
    await mongoose.connect(MONGO_URI);

    logger.success('MongoDB kết nối thành công!');
  
    
    return true;
  } catch (err) {
    logger.error('Không thể kết nối MongoDB', err);
    return false;
  }
};

module.exports = connectDatabase;
