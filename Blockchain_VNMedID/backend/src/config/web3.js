const { ethers } = require("ethers");
require("dotenv").config();

const UserRegistryABI = require("../abis/UserRegistry.json");
// const AccessControlABI = require("../abis/AccessControl.json");
// const MedicalRecordABI = require("../abis/MedicalRecord.json");
// const PaymentABI = require("../abis/Payment.json");

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

const adminWallet = new ethers.Wallet(
  process.env.ADMIN_PRIVATE_KEY,
  provider
);

console.log(
  "🌐 Đang thiết lập kết nối Blockchain Sepolia... ✅"
);

const contractAddresses = {
  userRegistry: process.env.CONTRACT_USER,
  accessControl: process.env.CONTRACT_ACCESS,
  medicalRecord: process.env.CONTRACT_MEDICAL,
  payment: process.env.CONTRACT_PAYMENT,
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