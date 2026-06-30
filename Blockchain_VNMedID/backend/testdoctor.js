// File: C:\NEW BLOCKCHAIN\Blockchain_VNMedID\backend\testdoctor.js
require('dotenv').config();
const { getContractInstance } = require('./src/config/web3');

async function kichHoatBacSi() {
  try {
    console.log("🌐 Đang kết nối Smart Contract UserRegistry...");
    const userRegistry = getContractInstance('userRegistry');
    
    // 🎯 ĐIỀN ĐỊA CHỈ VÍ METAMASK CỦA BÁC SĨ LÊ THỊ THU THƯ VÀO ĐÂY
    // (Lấy ví thực tế hiển thị trên MetaMask của tài khoản bác sĩ Thu Thư)
    const doctorWallet = "0xc3b16a4657460e6ce68bdda91a0f8a49d5dd8039"; // Thay bằng ví thực tế nếu ví này chưa đúng
    const userId = "DOC_THUTHU_2026"; 
    const ROLE_DOCTOR = 2; // Quyền Doctor trong contract của bạn

    console.log(`🚀 Đang gửi giao dịch đăng ký ví ${doctorWallet} làm Doctor lên mạng Sepolia...`);
    
    // Gọi hàm registerUser từ Smart Contract của bạn
    const tx = await userRegistry.registerUser(doctorWallet, userId, ROLE_DOCTOR);
    
    console.log("⏳ Giao dịch đã gửi. Chờ Blockchain Sepolia xác nhận (mất khoảng 10-15 giây)...");
    await tx.wait();
    
    console.log(`\n✅ THÀNH CÔNG RỰC RỠ!`);
    console.log(`📝 Tx Hash: ${tx.hash}`);
    console.log("Ví bác sĩ đã được kích hoạt ROLE_DOCTOR trên Smart Contract.");
    console.log("👉 Giờ bạn hãy quay lại trang Bệnh nhân, bấm 'Xác nhận Ký Số Phê Duyệt' lại nhé!");

  } catch (err) {
    console.error("❌ Lỗi khi thực thi giao dịch Blockchain:", err.message);
  }
}

kichHoatBacSi();