import { network } from "hardhat";

async function main() {
  const connection = await network.connect();
  const { ethers } = connection;

  const [admin] = await ethers.getSigners();

  // ================================
  // 1. CONTRACT ADDRESS ON SEPOLIA
  // ================================
  const userRegistryAddress = "0x329c229ace03f86375d8aa70ca0ccee221507bc4";
  const accessControlAddress = "0xd820785ad2591d4238e2052e85609068fe252876";
  const medicalRecordAddress = "0x50eca891a1a7847dd6257c02ad91d8d7b4c16a36";
  const paymentAddress = "0xde36843aa11c06eafa9f1fca0d463351a87e4bbf";

  // Ví doctor test, chỉ cần public address
  const doctorWallet = "0x69fc135104443f7f3597ba42187f5a39ac8f3667";

  // Dùng ví deployer làm patient để test thanh toán dễ hơn
  const patientWallet = admin.address;

  // ================================
  // 2. CHECK ADDRESS FORMAT
  // ================================
  const addresses = {
    userRegistryAddress,
    accessControlAddress,
    medicalRecordAddress,
    paymentAddress,
    doctorWallet,
    patientWallet,
  };

  for (const [name, value] of Object.entries(addresses)) {
    if (!ethers.isAddress(value)) {
      throw new Error(`${name} is not valid: ${value}`);
    }
  }

  // ================================
  // 3. CREATE TEST DATA
  // ================================
  const time = Date.now();

  const doctorId = "DOC_" + time;
  const patientId = "PAT_" + time;
  const invoiceId = "INV_" + time;
  const fakeIpfsHash = "QmTestMedicalRecordHash_" + time;

  // ================================
  // 4. CONNECT TO CONTRACTS
  // ================================
  const userRegistry = await ethers.getContractAt(
    "UserRegistry",
    userRegistryAddress
  );

  const accessControl = await ethers.getContractAt(
    "AccessControl",
    accessControlAddress
  );

  const medicalRecord = await ethers.getContractAt(
    "MedicalRecord",
    medicalRecordAddress
  );

  const payment = await ethers.getContractAt(
    "Payment",
    paymentAddress
  );

  console.log("================================");
  console.log("VNMedID Sepolia Test Flow");
  console.log("================================");
  console.log("Admin/deployer:", admin.address);
  console.log("Doctor wallet:", doctorWallet);
  console.log("Patient wallet:", patientWallet);
  console.log("Doctor ID:", doctorId);
  console.log("Patient ID:", patientId);
  console.log("Invoice ID:", invoiceId);
  console.log("Fake IPFS hash:", fakeIpfsHash);

  // ================================
  // 5. REGISTER DOCTOR
  // ================================
  console.log("\n1. Register doctor...");

  const tx1 = await userRegistry.registerUser(
    doctorWallet,
    doctorId,
    2
  );

  await tx1.wait();

  console.log("Doctor registered");
  console.log("Tx hash:", tx1.hash);

  // ================================
  // 6. REGISTER PATIENT
  // ================================
  console.log("\n2. Register patient...");

  const tx2 = await userRegistry.registerUser(
    patientWallet,
    patientId,
    1
  );

  await tx2.wait();

  console.log("Patient registered");
  console.log("Tx hash:", tx2.hash);

  // ================================
  // 7. GRANT ACCESS
  // ================================
  console.log("\n3. Grant access to doctor...");

  const tx3 = await accessControl.grantAccess(
    patientId,
    doctorWallet
  );

  await tx3.wait();

  console.log("Access granted");
  console.log("Tx hash:", tx3.hash);

  // ================================
  // 8. CHECK ACCESS
  // ================================
  console.log("\n4. Check doctor access...");

  const canAccess = await accessControl.checkAccess(
    patientId,
    doctorWallet
  );

  console.log("Doctor can access patient record:", canAccess);

  if (!canAccess) {
    throw new Error("Access control test failed");
  }

  // ================================
  // 9. ADD MEDICAL RECORD HASH
  // ================================
  console.log("\n5. Add medical record hash...");

  const tx4 = await medicalRecord.addRecordHash(
    patientId,
    doctorWallet,
    fakeIpfsHash
  );

  await tx4.wait();

  console.log("Medical record hash added");
  console.log("Tx hash:", tx4.hash);

  // ================================
  // 10. READ MEDICAL RECORD HASH
  // ================================
  console.log("\n6. Read medical record hashes...");

  const hashes = await medicalRecord.getRecordHashes(patientId);

  console.log("Record hashes:", hashes);

  // ================================
  // 11. CREATE INVOICE
  // ================================
  console.log("\n7. Create invoice...");

  const amount = ethers.parseEther("0.0001");

  const tx5 = await payment.createInvoice(
    invoiceId,
    patientWallet,
    amount
  );

  await tx5.wait();

  console.log("Invoice created");
  console.log("Tx hash:", tx5.hash);

  // ================================
  // 12. PAY INVOICE
  // ================================
  console.log("\n8. Pay invoice...");

  const tx6 = await payment.payInvoice(invoiceId, {
    value: amount,
  });

  await tx6.wait();

  console.log("Invoice paid");
  console.log("Tx hash:", tx6.hash);

  // ================================
  // 13. READ INVOICE
  // ================================
  console.log("\n9. Read invoice...");

  const invoice = await payment.invoices(invoiceId);

  console.log("Invoice patient wallet:", invoice.patientWallet);
  console.log("Invoice amount:", invoice.amount.toString());
  console.log("Invoice paid status:", invoice.paid);

  console.log("\n================================");
  console.log("TEST FLOW SEPOLIA DONE");
  console.log("================================");
}

main().catch((error) => {
  console.error("\nTEST FLOW FAILED");
  console.error(error);
  process.exitCode = 1;
});