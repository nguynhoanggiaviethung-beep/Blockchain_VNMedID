const { ethers } = require('ethers');
require('dotenv').config();

// Đường dẫn chuẩn khi web3.js nằm trong src/config/
// Mỗi contract sẽ có ABI riêng. Hiện backend có VNmedID_Core.json và cần thêm UserRegistry.json nếu muốn registerUser.
const vnmedIdCore = require('../abis/VNmedID_Core.json');

const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

const logSepolia = () => {
    console.log('🌐 Đang thiết lập kết nối Blockchain Sepolia... ✅');
};

// Log giúp user thấy rõ khi bắt đầu khởi động backend (không phụ thuộc vào việc có gọi contract hay không)
logSepolia();


const contractAddresses = {
    userRegistry: process.env.CONTRACT_USER,
    accessControl: process.env.CONTRACT_ACCESS,
    medicalRecord: process.env.CONTRACT_MEDICAL,
    payment: process.env.CONTRACT_PAYMENT
};

const getContractInstance = (contractName) => {
    const address = contractAddresses[contractName];
    if (!address) {
        throw new Error(`Không tìm thấy địa chỉ cho contract: ${contractName}`);
    }
    const abi = contractData.abi || contractData[contractName]?.abi || contractData;

    // Bảo vệ: nếu ABI không có function cần thiết, ethers sẽ không gọi được.
    // Hiện tại backend đang chỉ có VNmedID_Core.json nên dễ xảy ra mismatch.
    if (!contractData.abi && contractData[contractName]?.abi == null) {
        console.warn(`⚠️ ABI đang không khớp cho contract: ${contractName}. Hãy thêm ABI đúng vào backend/src/abis/.`);
    }
    return new ethers.Contract(address, abi, adminWallet);
};

module.exports = {
    provider,
    adminWallet,
    contractAddresses,
    getContractInstance
};
