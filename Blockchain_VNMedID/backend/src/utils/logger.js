// 🎯 Tập trung log - dễ theo dõi lỗi
const logger = {
  // ✅ Success
  success: (msg) => console.log(`✅ ${msg}`),
  
  // ❌ Error
  error: (msg, err = null) => {
    console.error(`❌ ${msg}`);
    if (err) console.error(`   Chi tiết: ${err.message}`);
  },
  
  // 🔄 Process
  process: (msg) => console.log(`🔄 ${msg}`),
  
  // 📍 Info
  info: (msg) => console.log(`📍 ${msg}`),
  
  // 🚀 Server
  server: (msg) => console.log(`🚀 ${msg}`),
  
  // 🔌 Database
  database: (msg) => console.log(`🔌 ${msg}`),
  
  // ⚠️ Warning
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  
  // 🌐 Blockchain
  blockchain: (msg) => console.log(`🌐 ${msg}`),
};

module.exports = logger;
