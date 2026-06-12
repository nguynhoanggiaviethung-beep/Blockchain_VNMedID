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
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ACCESS, ACCESS_ABI, wallet);
};

module.exports = { getAccessContract };
