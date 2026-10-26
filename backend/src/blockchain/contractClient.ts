import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { config } from "../config";

interface ContractDeploymentInfo {
  address: string;
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  abi: any[];
}

export class BlockchainService {
  private static instance: BlockchainService;
  private provider: ethers.JsonRpcProvider;
  private verifierSigner: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private isConnected: boolean = false;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.initialize();
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      // Check RPC network connection
      const network = await this.provider.getNetwork();
      this.isConnected = true;

      // Load deployed contract artifact if present
      const artifactPath = path.join(__dirname, "IdentityRegistry.json");
      if (fs.existsSync(artifactPath)) {
        const artifact: ContractDeploymentInfo = JSON.parse(
          fs.readFileSync(artifactPath, "utf-8")
        );
        this.contractAddress = artifact.address;

        // Initialize verifier signer
        if (config.verifierPrivateKey) {
          this.verifierSigner = new ethers.Wallet(config.verifierPrivateKey, this.provider);
          this.contract = new ethers.Contract(
            this.contractAddress,
            artifact.abi,
            this.verifierSigner
          );
        } else {
          this.contract = new ethers.Contract(
            this.contractAddress,
            artifact.abi,
            this.provider
          );
        }
      }
      return true;
    } catch (err) {
      this.isConnected = false;
      this.contract = null;
      return false;
    }
  }

  public async getStatus() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const network = await this.provider.getNetwork();
      let verifierAddress = null;
      let verifierBalance = "0";

      if (this.verifierSigner) {
        verifierAddress = await this.verifierSigner.getAddress();
        const bal = await this.provider.getBalance(verifierAddress);
        verifierBalance = ethers.formatEther(bal);
      }

      return {
        online: true,
        networkName: network.name === "unknown" ? "Hardhat Localhost" : network.name,
        chainId: Number(network.chainId),
        latestBlockNumber: blockNumber,
        contractAddress: this.contractAddress,
        contractDeployed: !!this.contractAddress,
        verifierAddress,
        verifierBalanceEth: verifierBalance,
        rpcUrl: config.rpcUrl,
      };
    } catch (error: any) {
      return {
        online: false,
        networkName: "Unavailable",
        chainId: config.chainId,
        latestBlockNumber: 0,
        contractAddress: this.contractAddress,
        contractDeployed: !!this.contractAddress,
        verifierAddress: null,
        verifierBalanceEth: "0",
        rpcUrl: config.rpcUrl,
        error: error.message || "Failed to connect to blockchain node",
      };
    }
  }

  public getContract(): ethers.Contract {
    if (!this.contract) {
      throw new Error(
        "IdentityRegistry contract is not loaded or local blockchain node is offline."
      );
    }
    return this.contract;
  }

  public async registerIdentity(
    identifier: string,
    commitmentHash: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = this.getContract();
    const tx = await contract.registerIdentity(identifier, commitmentHash);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  public async approveIdentity(
    identifier: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = this.getContract();
    const tx = await contract.approveIdentity(identifier);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  public async rejectIdentity(
    identifier: string,
    reason: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = this.getContract();
    const tx = await contract.rejectIdentity(identifier, reason);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  public async revokeIdentity(
    identifier: string,
    reason: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = this.getContract();
    const tx = await contract.revokeIdentity(identifier, reason);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  public async getIdentity(identifier: string) {
    const contract = this.getContract();
    const raw = await contract.getIdentity(identifier);
    const statusMap = ["None", "Pending", "Verified", "Rejected", "Revoked"];

    return {
      identifier: raw.identifier,
      commitmentHash: raw.commitmentHash,
      status: statusMap[Number(raw.status)] || "Unknown",
      statusCode: Number(raw.status),
      registeredAt: new Date(Number(raw.registeredAt) * 1000).toISOString(),
      updatedAt: new Date(Number(raw.updatedAt) * 1000).toISOString(),
      registrant: raw.registrant,
      updatedBy: raw.updatedBy,
      statusReason: raw.statusReason,
    };
  }

  public async getContractMetrics() {
    try {
      const contract = this.getContract();
      const metrics = await contract.getMetrics();
      return {
        totalRegistered: Number(metrics.registered),
        totalVerified: Number(metrics.verified),
        totalPending: Number(metrics.pending),
        totalRejected: Number(metrics.rejected),
        totalRevoked: Number(metrics.revoked),
      };
    } catch {
      return {
        totalRegistered: 0,
        totalVerified: 0,
        totalPending: 0,
        totalRejected: 0,
        totalRevoked: 0,
      };
    }
  }

  public async getAllIdentifiers(): Promise<string[]> {
    try {
      const contract = this.getContract();
      return await contract.getAllIdentifiers();
    } catch {
      return [];
    }
  }

  public async getRecentEvents() {
    try {
      const contract = this.getContract();
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000);

      const filterRegistered = contract.filters.IdentityRegistered();
      const filterApproved = contract.filters.IdentityApproved();
      const filterRejected = contract.filters.IdentityRejected();
      const filterRevoked = contract.filters.IdentityRevoked();

      const [regEvents, appEvents, rejEvents, revEvents] = await Promise.all([
        contract.queryFilter(filterRegistered, fromBlock),
        contract.queryFilter(filterApproved, fromBlock),
        contract.queryFilter(filterRejected, fromBlock),
        contract.queryFilter(filterRevoked, fromBlock),
      ]);

      const events: any[] = [];

      for (const e of regEvents as any[]) {
        events.push({
          type: "IdentityRegistered",
          identifier: e.args[0],
          commitmentHash: e.args[1],
          actor: e.args[2],
          timestamp: Number(e.args[3]) * 1000,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        });
      }

      for (const e of appEvents as any[]) {
        events.push({
          type: "IdentityApproved",
          identifier: e.args[0],
          actor: e.args[1],
          timestamp: Number(e.args[2]) * 1000,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        });
      }

      for (const e of rejEvents as any[]) {
        events.push({
          type: "IdentityRejected",
          identifier: e.args[0],
          actor: e.args[1],
          reason: e.args[2],
          timestamp: Number(e.args[3]) * 1000,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        });
      }

      for (const e of revEvents as any[]) {
        events.push({
          type: "IdentityRevoked",
          identifier: e.args[0],
          actor: e.args[1],
          reason: e.args[2],
          timestamp: Number(e.args[3]) * 1000,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        });
      }

      events.sort((a, b) => b.timestamp - a.timestamp);
      return events;
    } catch (err: any) {
      return [];
    }
  }
}

export const blockchainService = BlockchainService.getInstance();
