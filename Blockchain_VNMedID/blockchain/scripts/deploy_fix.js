import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("=========================================");
  console.log("🚀 Bắt đầu deploy bằng ví:", deployer.address);
  console.log("=========================================");

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  console.log("✅ UserRegistry tại:", await userRegistry.getAddress());

  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy(await userRegistry.getAddress());
  await accessControl.waitForDeployment();
  console.log("✅ AccessControl tại:", await accessControl.getAddress());

  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(await accessControl.getAddress());
  await medicalRecord.waitForDeployment();
  console.log("\n🎯 TARGET - MedicalRecord:", await medicalRecord.getAddress(), "\n");

  const Payment = await ethers.getContractFactory("Payment");
  const payment = await Payment.deploy();
  await payment.waitForDeployment();
  console.log("✅ Payment tại:", await payment.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});