import { network } from "hardhat";

async function main() {
  const connection = await network.connect();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();

  console.log("Deploy by:", deployer.address);

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry:", userRegistryAddress);

  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy(userRegistryAddress);
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log("AccessControl:", accessControlAddress);

  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(accessControlAddress);
  await medicalRecord.waitForDeployment();
  const medicalRecordAddress = await medicalRecord.getAddress();
  console.log("MedicalRecord:", medicalRecordAddress);

  const Payment = await ethers.getContractFactory("Payment");
  const payment = await Payment.deploy();
  await payment.waitForDeployment();
  const paymentAddress = await payment.getAddress();
  console.log("Payment:", paymentAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});