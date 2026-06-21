const { ethers } = require("ethers");
require("dotenv").config();
const logger = require("../utils/logger");

const UserRegistryABI = require("../abis/UserRegistry.json");
const AccessControlABI = require("../abis/AccessControl.json");
const MedicalRecordABI = require("../abis/MedicalRecord.json");
const PaymentABI = require("../abis/Payment.json");

// ================= DEBUG ABI =================
console.log("\n========== MEDICAL RECORD ABI ==========");

if (MedicalRecordABI.abi) {
  console.log(
    MedicalRecordABI.abi
      .filter((item) => item.type === "function")
      .map((item) => item.name)
  );

  console.log(
    "\nCó getPatientRecord không:",
    MedicalRecordABI.abi.some(
      (item) =>
        item.type === "function" &&
        item.name === "getPatientRecord"
    )
  );
} else {
  console.log("❌ Không tìm thấy thuộc tính .abi trong MedicalRecord.json");
}

console.log("========================================\n");
// ============================================

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

console.log("PRIVATE KEY:", process.env.SEPOLIA_PRIVATE_KEY);
console.log("LENGTH:", process.env.SEPOLIA_PRIVATE_KEY?.length);

const adminWallet = new ethers.Wallet(
  process.env.SEPOLIA_PRIVATE_KEY,
  provider
);

logger.blockchain("Thiết lập kết nối Blockchain Sepolia...");
logger.blockchain(
  `✅ RPC: ${
    process.env.SEPOLIA_RPC_URL?.split("/v2/")[0] + "/v2/***"
  }`
);

const contractAddresses = {
  userRegistry: process.env.USER_REGISTRY_ADDRESS,
  accessControl: process.env.ACCESS_CONTROL_ADDRESS,
  medicalRecord: process.env.MEDICAL_RECORD_ADDRESS,
  payment: process.env.PAYMENT_ADDRESS,
};

console.log("\n========== CONTRACT ADDRESSES ==========");
console.log("UserRegistry :", contractAddresses.userRegistry);
console.log("AccessControl:", contractAddresses.accessControl);
console.log("MedicalRecord:", contractAddresses.medicalRecord);
console.log("Payment      :", contractAddresses.payment);
console.log("========================================\n");

const contractABIs = {
  userRegistry: UserRegistryABI.abi,
  accessControl: AccessControlABI.abi,
  medicalRecord: MedicalRecordABI.abi,
  payment: PaymentABI.abi,
};

const getContractInstance = (contractName) => {
  const address = contractAddresses[contractName];

  if (!address) {
    throw new Error(
      `Không tìm thấy địa chỉ contract: ${contractName}`
    );
  }

  const abi = contractABIs[contractName];

  if (!abi) {
    throw new Error(
      `Không tìm thấy ABI cho contract: ${contractName}`
    );
  }

  return new ethers.Contract(
    address,
    abi,
    adminWallet
  );
};

module.exports = {
  provider,
  adminWallet,
  contractAddresses,
  getContractInstance,
};