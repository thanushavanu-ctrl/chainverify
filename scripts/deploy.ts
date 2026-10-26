import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================");
  console.log(" Deploying IdentityRegistry Smart Contract");
  console.log("==========================================");

  const [deployer, verifierAccount] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();

  const contractAddress = await identityRegistry.getAddress();
  console.log("✓ IdentityRegistry deployed successfully to:", contractAddress);

  // Grant VERIFIER_ROLE to deployer and optional verifier account
  const VERIFIER_ROLE = await identityRegistry.VERIFIER_ROLE();
  if (verifierAccount) {
    const tx = await identityRegistry.grantRole(VERIFIER_ROLE, verifierAccount.address);
    await tx.wait();
    console.log(`✓ Granted VERIFIER_ROLE to secondary verifier: ${verifierAccount.address}`);
  }

  // Get Contract ABI from Hardhat artifacts
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const deploymentData = {
    address: contractAddress,
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // Ensure export directories exist
  const backendContractsDir = path.join(__dirname, "../backend/src/blockchain");
  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");

  fs.mkdirSync(backendContractsDir, { recursive: true });
  fs.mkdirSync(frontendContractsDir, { recursive: true });

  const backendExportPath = path.join(backendContractsDir, "IdentityRegistry.json");
  const frontendExportPath = path.join(frontendContractsDir, "IdentityRegistry.json");

  fs.writeFileSync(backendExportPath, JSON.stringify(deploymentData, null, 2));
  fs.writeFileSync(frontendExportPath, JSON.stringify(deploymentData, null, 2));

  console.log("✓ Deployed contract artifact & ABI exported to:");
  console.log("   -", backendExportPath);
  console.log("   -", frontendExportPath);
  console.log("==========================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
