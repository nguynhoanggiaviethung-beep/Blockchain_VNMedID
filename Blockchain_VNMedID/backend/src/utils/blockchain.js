const { ethers } = require("ethers");

// ABI lấy đúng từ contract AccessControl.sol của team blockchain
const ACCESS_ABI = [
  "function grantAccess(string patientId, address doctorWallet) external",
  "function revokeAccess(string patientId, address doctorWallet) external",
  "function checkAccess(string patientId, address doctorWallet) external view returns (bool)",
  "function getLogCount() external view returns (uint256)",
  "function getLog(uint256 index) external view returns (string patientId, address doctorWallet, bool allowed, uint256 time)",
  "event AccessGranted(string patientId, address doctorWallet, uint256 time)",
  "event AccessRevoked(string patientId, address doctorWallet, uint256 time)",
];

const getAccessContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

  // ✅ FIX: dùng đúng biến đã có sẵn trong .env, không cần thêm biến mới
  //    ADMIN_PRIVATE_KEY → SEPOLIA_PRIVATE_KEY
  //    CONTRACT_ACCESS   → ACCESS_CONTROL_ADDRESS
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
  const contractAddress = process.env.ACCESS_CONTROL_ADDRESS;

  if (!privateKey) throw new Error("Thiếu SEPOLIA_PRIVATE_KEY trong .env!");
  if (!contractAddress) throw new Error("Thiếu ACCESS_CONTROL_ADDRESS trong .env!");

  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, ACCESS_ABI, wallet);
};

module.exports = { getAccessContract };