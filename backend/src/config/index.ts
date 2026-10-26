import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "chainverify_super_secure_jwt_dev_secret_key_38f0923e",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  chainId: parseInt(process.env.CHAIN_ID || "31337", 10),
  verifierPrivateKey:
    process.env.VERIFIER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
