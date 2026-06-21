import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import solc from "solc";

dotenv.config();

// Hàm tự động đọc file .sol và biên dịch trực tiếp không qua Hardhat
function compileContracts() {
  console.log("⏳ Đang tự động biên dịch các Smart Contract bằng solc thuần...");
  
  const contractsToCompile = ["UserRegistry", "AccessControl", "MedicalRecord", "Payment"];
  const sources = {};

  for (const name of contractsToCompile) {
    const filePath = path.resolve(`./contracts/${name}.sol`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy file contract: ${filePath}`);
    }
    sources[`${name}.sol`] = { content: fs.readFileSync(filePath, "utf8") };
  }

  const input = {
    language: "Solidity",
    sources: sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    for (const err of output.errors) {
      if (err.severity === "error") {
        console.error("❌ Lỗi biên dịch:", err.message);
        throw new Error("Biên dịch thất bại!");
      }
    }
  }

  return output.contracts;
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error("❌ Lỗi: Thiếu SEPOLIA_RPC_URL hoặc SEPOLIA_PRIVATE_KEY trong file .env!");
    return;
  }

  // 1. Biên dịch trực tiếp
  const compiledContracts = compileContracts();
  console.log("✅ Biên dịch thành công!");

  // 2. Kết nối mạng Sepolia
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("=========================================");
  console.log("🚀 Đang tiến hành Deploy bằng ví:", wallet.address);
  console.log("=========================================");

  // Hàm lấy ABI và Bytecode sau khi compiled
  const getContractObj = (name) => {
    const contractData = compiledContracts[`${name}.sol`][name];
    return {
      abi: contractData.abi,
      bytecode: contractData.evm.bytecode.object
    };
  };

  // 1. Deploy UserRegistry
  console.log("⏳ Đang deploy UserRegistry...");
  const userRegistryData = getContractObj("UserRegistry");
  const factory1 = new ethers.ContractFactory(userRegistryData.abi, userRegistryData.bytecode, wallet);
  const contract1 = await factory1.deploy();
  await contract1.waitForDeployment();
  const addr1 = await contract1.getAddress();
  console.log("✅ UserRegistry tại:", addr1);

  // 2. Deploy AccessControl
  console.log("⏳ Đang deploy AccessControl...");
  const accessControlData = getContractObj("AccessControl");
  const factory2 = new ethers.ContractFactory(accessControlData.abi, accessControlData.bytecode, wallet);
  const contract2 = await factory2.deploy(addr1);
  await contract2.waitForDeployment();
  const addr2 = await contract2.getAddress();
  console.log("✅ AccessControl tại:", addr2);

  // 3. Deploy MedicalRecord (🎯 TARGET CHÍNH)
  console.log("⏳ Đang deploy MedicalRecord...");
  const medicalRecordData = getContractObj("MedicalRecord");
  const factory3 = new ethers.ContractFactory(medicalRecordData.abi, medicalRecordData.bytecode, wallet);
  const contract3 = await factory3.deploy(addr2);
  await contract3.waitForDeployment();
  const addr3 = await contract3.getAddress();
  console.log("\n🎯🎯🎯 TARGET - MedicalRecord (CẦN LẤY):", addr3, "\n");

  console.log("⏳ Đang thiết lập quyền truy cập giữa các contract...");
  const accessControlInstance = new ethers.Contract(addr2, accessControlData.abi, wallet);
  const MEDICAL_RECORD_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MEDICAL_RECORD_ROLE"));
  const tx = await accessControlInstance.grantRole(MEDICAL_RECORD_ROLE, addr3);
    await tx.wait();
    console.log("✅ Đã cấp quyền thành công cho MedicalRecord trên AccessControl!");
    
  // 4. Deploy Payment
  console.log("⏳ Đang deploy Payment...");
  const paymentData = getContractObj("Payment");
  const factory4 = new ethers.ContractFactory(paymentData.abi, paymentData.bytecode, wallet);
  const contract4 = await factory4.deploy();
  await contract4.waitForDeployment();
  console.log("✅ Payment tại:", await contract4.getAddress());
  console.log("=========================================");
}

main().catch(console.error);