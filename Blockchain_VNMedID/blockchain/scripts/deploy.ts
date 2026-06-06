import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const connection = await network.connect();
  const { ethers } = connection;
  const networkName = connection.networkName;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying VNmedID_Core...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.address);

  const contract = await ethers.deployContract("VNmedID_Core", [], deployer);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();

  console.log("VNmedID_Core deployed to:", contractAddress);
  console.log("Chain ID:", chainId);
  console.log("Deployment tx:", deploymentTx?.hash ?? "N/A");

  const factory = await ethers.getContractFactory("VNmedID_Core");

  const backendArtifact = {
    contractName: "VNmedID_Core",
    address: contractAddress,
    abi: JSON.parse(factory.interface.formatJson()),
    network: networkName,
    chainId,
    deployedAt: new Date().toISOString(),
    deploymentTx: deploymentTx?.hash ?? null,
  };

  const outDir = path.resolve(process.cwd(), "bin", "contract");
  const outFile = path.join(outDir, "VNmedID_Core.json");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(backendArtifact, null, 2), "utf8");

  console.log("Backend artifact written to:", outFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});