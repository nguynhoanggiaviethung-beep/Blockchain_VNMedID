require('dotenv').config();
const { ethers } = require('ethers');

// 1. Dán các thông tin cấu hình mạng của nhóm bạn vào đây
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "LINK_RPC_SEPOLIA_CỦA_NHÓM_BẠN";
const CONTRACT_ADDRESS = "0xdE36843aa11C06EAfA9f1fca0d463351A87e4BbF"; // Địa chỉ contract Payment 
// 2. DÁN PRIVATE KEY VÍ METAMASK BỆNH NHÂN CỦA BẠN VÀO ĐÂY (Ví có sẵn tiền Sepolia ETH)
const PATIENT_PRIVATE_KEY = "...."; // Dán private key ví metamask bệnh nhân của mình để test thanh toán (Lưu ý: chỉ dùng ví testnet Sepolia và không chứa tài sản quan trọng nào) VD: "0xabc123..." 

// 3. Nhập mã hóa đơn bạn muốn test thanh toán (mã đã được Admin tạo thành công)
const INVOICE_ID = "...."; // tự tạo hóa đơn và dán mã hóa đơn vào đây để test thanh toán VD: "HD_TEST_MON_HOC_01"
const AMOUNT_ETH = "0.0001"; // Số tiền của hóa đơn cần trả

// Đoạn ABI rút gọn chứa hàm payInvoice từ lệnh node -e của bạn
const abi = ["function payInvoice(string invoiceId) public payable"];

async function main() {
  console.log(`⏳ Đang kết nối mạng Sepolia để thanh toán hóa đơn: ${INVOICE_ID}...`);
  
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PATIENT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  try {
    // Gọi hàm payInvoice và đính kèm tiền (value) gửi lên chuỗi
    const tx = await contract.payInvoice(INVOICE_ID, {
      value: ethers.parseEther(AMOUNT_ETH)
    });
    
    console.log("⏳ Giao dịch đã gửi lên Sepolia. Đang đợi xác nhận (Mining)...");
    await tx.wait();
    
    console.log("\n=======================================================");
    console.log("✅ THANH TOÁN TRÊN BLOCKCHAIN THÀNH CÔNG THẬT 100%!");
    console.log(`➡️ Mã txHash mới tinh của bạn đây: ${tx.hash}`);
    console.log("=======================================================\n");
    console.log("👉 Bây giờ hãy copy mã txHash này dán vào Thunder Client để test Backend nha!");

  } catch (error) {
    console.error("❌ Lỗi thanh toán chuỗi:", error.message);
  }
}

main();
