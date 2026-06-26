import hre from "hardhat";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function verify(address, constructorArgs) {
  console.log(`\n🔍 Đang verify ${address}...`);
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ Verify thành công: ${address}`);
  } catch (e) {
    if (e.message.includes("Already Verified")) {
      console.log(`✅ Đã verify rồi: ${address}`);
    } else {
      console.log(`❌ Verify thất bại: ${e.message}`);
    }
  }
}

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("=========================================");
  console.log("🚀 Deploy bằng ví:", deployer.address);
  console.log("=========================================\n");

  // 1. UserRegistry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddr = await userRegistry.getAddress();
  console.log("✅ UserRegistry:", userRegistryAddr);

  // 2. AccessControl
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy(userRegistryAddr);
  await accessControl.waitForDeployment();
  const accessControlAddr = await accessControl.getAddress();
  console.log("✅ AccessControl:", accessControlAddr);

  // 3. MedicalRecord
  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(accessControlAddr);
  await medicalRecord.waitForDeployment();
  const medicalRecordAddr = await medicalRecord.getAddress();
  console.log("✅ MedicalRecord:", medicalRecordAddr);

  // 4. Payment
  const Payment = await ethers.getContractFactory("Payment");
  const payment = await Payment.deploy();
  await payment.waitForDeployment();
  const paymentAddr = await payment.getAddress();
  console.log("✅ Payment:", paymentAddr);

  console.log("\n=========================================");
  console.log("📋 ĐỊA CHỈ MỚI - cập nhật vào .env BE:");
  console.log("=========================================");
  console.log(`USER_REGISTRY_ADDRESS=${userRegistryAddr}`);
  console.log(`ACCESS_CONTROL_ADDRESS=${accessControlAddr}`);
  console.log(`MEDICAL_RECORD_ADDRESS=${medicalRecordAddr}`);
  console.log(`PAYMENT_ADDRESS=${paymentAddr}`);

  // Đợi Etherscan index
  console.log("\n⏳ Đợi 30 giây để Etherscan index...");
  await sleep(30000);

  // Verify tất cả
  console.log("\n=========================================");
  console.log("🔍 Bắt đầu verify...");
  console.log("=========================================");
  await verify(userRegistryAddr, []);
  await verify(accessControlAddr, [userRegistryAddr]);
  await verify(medicalRecordAddr, [accessControlAddr]);
  await verify(paymentAddr, []);

  console.log("\n🎉 XONG! Kiểm tra trên Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${userRegistryAddr}`);
  console.log(`https://sepolia.etherscan.io/address/${accessControlAddr}`);
  console.log(`https://sepolia.etherscan.io/address/${medicalRecordAddr}`);
  console.log(`https://sepolia.etherscan.io/address/${paymentAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
