import { Router, Request, Response } from "express";
import { blockchainService } from "../blockchain/contractClient";

const router = Router();

// GET /api/blockchain/status
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await blockchainService.getStatus();
    res.status(200).json({
      success: true,
      status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to read blockchain node status.",
    });
  }
});

// GET /api/blockchain/transactions
router.get("/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await blockchainService.getRecentEvents();
    res.status(200).json({
      success: true,
      events,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch blockchain events.",
      events: [],
    });
  }
});

// GET /api/blockchain/identity/:identifier
router.get("/identity/:identifier", async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const record = await blockchainService.getIdentity(identifier);
    res.status(200).json({
      success: true,
      record,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: "Identity record not found on blockchain or node unreachable.",
    });
  }
});

// GET /api/blockchain/identifiers
router.get("/identifiers", async (req: Request, res: Response): Promise<void> => {
  try {
    const identifiers = await blockchainService.getAllIdentifiers();
    res.status(200).json({
      success: true,
      identifiers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch identifiers.",
      identifiers: [],
    });
  }
});

export default router;
