const { ethers } = require("ethers");
require("dotenv").config();
console.log("ENV FILE TEST:");
console.log(process.env);

const UserRegistryABI = require("../abis/UserRegistry.json");
// const AccessControlABI = require("../abis/AccessControl.json");
// const MedicalRecordABI = require("../abis/MedicalRecord.json");
// const PaymentABI = require("../abis/Payment.json");

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);
console.log("PRIVATE KEY:", process.env.SEPOLIA_PRIVATE_KEY);
console.log("LENGTH:", process.env.SEPOLIA_PRIVATE_KEY?.length);
const adminWallet = new ethers.Wallet(
  process.env.SEPOLIA_PRIVATE_KEY,
  provider
);

console.log(
  "🌐 Đang thiết lập kết nối Blockchain Sepolia... ✅"
);

const contractAddresses = {
  userRegistry: process.env.USER_REGISTRY_ADDRESS,
  accessControl: process.env.ACCESS_CONTROL_ADDRESS,
  medicalRecord: process.env.MEDICAL_RECORD_ADDRESS,
  payment: process.env.PAYMENT_ADDRESS,
};

const contractABIs = {
  userRegistry: UserRegistryABI.abi,
  // accessControl: AccessControlABI.abi,
  // medicalRecord: MedicalRecordABI.abi,
  // payment: PaymentABI.abi,
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