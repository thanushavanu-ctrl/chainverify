import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import authRoutes from "./routes/auth.routes";
import identityRoutes from "./routes/identity.routes";
import adminRoutes from "./routes/admin.routes";
import blockchainRoutes from "./routes/blockchain.routes";
import userRoutes from "./routes/user.routes";
import { blockchainService } from "./blockchain/contractClient";

const app = express();

// Trust proxy for secure cookies behind reverse proxy
app.set("trust proxy", 1);

// CORS configuration supporting credentials (cookies)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost frontend or same-origin/no-origin (like curl / Postman)
      if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Standard body and cookie parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger for audit & observability
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  const bcStatus = await blockchainService.getStatus();
  res.status(200).json({
    status: "ok",
    service: "ChainVerify Backend API",
    timestamp: new Date().toISOString(),
    blockchain: {
      online: bcStatus.online,
      network: bcStatus.networkName,
      contractDeployed: bcStatus.contractDeployed,
    },
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/identity", identityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/user", userRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === "production" ? "Internal server error" : err.message || "Internal server error",
  });
});

// Start listening
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log("==========================================");
    console.log(` ChainVerify Backend Server Running`);
    console.log(` Listening on port: http://localhost:${config.port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` RPC Node: ${config.rpcUrl}`);
    console.log("==========================================");
    blockchainService.initialize();
  });
}

export default app;
