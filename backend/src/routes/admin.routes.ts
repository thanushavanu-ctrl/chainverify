import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { blockchainService } from "../blockchain/contractClient";

const router = Router();

// Apply auth + requireAdmin to all routes in this router
router.use(authenticateToken);
router.use(requireAdmin);

const actionReasonSchema = z.object({
  reason: z.string().min(2, "Reason must be at least 2 characters").max(255),
});

// GET /api/admin/metrics
router.get("/metrics", async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalRequests, pendingRequests, verifiedProfiles, revokedProfiles] =
      await Promise.all([
        prisma.user.count(),
        prisma.verificationRequest.count(),
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.identityProfile.count({ where: { status: "VERIFIED" } }),
        prisma.identityProfile.count({ where: { status: "REVOKED" } }),
      ]);

    const onChainMetrics = await blockchainService.getContractMetrics();
    const blockchainStatus = await blockchainService.getStatus();

    res.status(200).json({
      success: true,
      database: {
        totalUsers,
        totalRequests,
        pendingRequests,
        verifiedProfiles,
        revokedProfiles,
      },
      onChain: onChainMetrics,
      blockchainStatus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch admin metrics." });
  }
});

// GET /api/admin/verification-requests
router.get("/verification-requests", async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const whereClause: any = {};
    if (status && typeof status === "string" && status !== "ALL") {
      whereClause.status = status.toUpperCase();
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      whereClause.identityProfile = {
        pseudonymousId: {
          contains: search.trim(),
        },
      };
    }

    const requests = await prisma.verificationRequest.findMany({
      where: whereClause,
      include: {
        identityProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch verification requests." });
  }
});

// POST /api/admin/verification-requests/:id/approve
router.post(
  "/verification-requests/:id/approve",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const request = await prisma.verificationRequest.findUnique({
        where: { id },
        include: { identityProfile: true },
      });

      if (!request) {
        res.status(404).json({ success: false, error: "Verification request not found." });
        return;
      }

      const pseudonymousId = request.identityProfile.pseudonymousId;

      // Execute on-chain smart contract approval
      let txHash: string | null = null;
      let blockNumber: number | null = null;

      try {
        // If profile was not registered on-chain yet, ensure on-chain registration first
        try {
          await blockchainService.getIdentity(pseudonymousId);
        } catch {
          const regTx = await blockchainService.registerIdentity(
            pseudonymousId,
            request.identityProfile.commitmentHash
          );
          await prisma.identityProfile.update({
            where: { id: request.identityProfile.id },
            data: {
              registeredTxHash: regTx.txHash,
              registeredBlockNumber: regTx.blockNumber,
            },
          });
        }

        const approveTx = await blockchainService.approveIdentity(pseudonymousId);
        txHash = approveTx.txHash;
        blockNumber = approveTx.blockNumber;
      } catch (chainError: any) {
        res.status(500).json({
          success: false,
          error: `Blockchain transaction failed: ${chainError.reason || chainError.message || "Smart contract error"}`,
        });
        return;
      }

      // Update Database records
      const updatedProfile = await prisma.identityProfile.update({
        where: { id: request.identityProfileId },
        data: {
          status: "VERIFIED",
          statusReason: "Identity verification approved by authorized administrator on-chain",
          verifiedTxHash: txHash,
          verifiedBlockNumber: blockNumber,
        },
      });

      const updatedRequest = await prisma.verificationRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: req.user!.email,
          reviewerNotes: "Approved and verified on blockchain",
          txHash,
          blockNumber,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "VERIFICATION_APPROVED_ONCHAIN",
          details: `Admin ${req.user!.email} approved identity ${pseudonymousId}. Tx: ${txHash}`,
          ipAddress: req.ip || req.socket.remoteAddress,
          txHash,
        },
      });

      res.status(200).json({
        success: true,
        message: "Identity verification approved and confirmed on blockchain.",
        request: updatedRequest,
        profile: updatedProfile,
        transaction: {
          txHash,
          blockNumber,
        },
      });
    } catch (error: any) {
      console.error("Approve error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to approve verification request.",
      });
    }
  }
);

// POST /api/admin/verification-requests/:id/reject
router.post(
  "/verification-requests/:id/reject",
  validateRequest(actionReasonSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const request = await prisma.verificationRequest.findUnique({
        where: { id },
        include: { identityProfile: true },
      });

      if (!request) {
        res.status(404).json({ success: false, error: "Verification request not found." });
        return;
      }

      const pseudonymousId = request.identityProfile.pseudonymousId;

      let txHash: string | null = null;
      let blockNumber: number | null = null;

      try {
        const rejectTx = await blockchainService.rejectIdentity(pseudonymousId, reason);
        txHash = rejectTx.txHash;
        blockNumber = rejectTx.blockNumber;
      } catch (chainError: any) {
        // If not registered on-chain yet, record rejection off-chain
        console.warn("Notice: Contract reject skipped or failed:", chainError.message);
      }

      const updatedProfile = await prisma.identityProfile.update({
        where: { id: request.identityProfileId },
        data: {
          status: "REJECTED",
          statusReason: reason,
        },
      });

      const updatedRequest = await prisma.verificationRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedBy: req.user!.email,
          reviewerNotes: reason,
          txHash,
          blockNumber,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "VERIFICATION_REJECTED",
          details: `Admin ${req.user!.email} rejected identity ${pseudonymousId}. Reason: ${reason}`,
          ipAddress: req.ip || req.socket.remoteAddress,
          txHash,
        },
      });

      res.status(200).json({
        success: true,
        message: "Identity verification request rejected.",
        request: updatedRequest,
        profile: updatedProfile,
        transaction: {
          txHash,
          blockNumber,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to reject verification request.",
      });
    }
  }
);

// POST /api/admin/verification-requests/:id/revoke
router.post(
  "/verification-requests/:id/revoke",
  validateRequest(actionReasonSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const request = await prisma.verificationRequest.findUnique({
        where: { id },
        include: { identityProfile: true },
      });

      if (!request) {
        res.status(404).json({ success: false, error: "Verification request not found." });
        return;
      }

      const pseudonymousId = request.identityProfile.pseudonymousId;

      let txHash: string | null = null;
      let blockNumber: number | null = null;

      try {
        const revokeTx = await blockchainService.revokeIdentity(pseudonymousId, reason);
        txHash = revokeTx.txHash;
        blockNumber = revokeTx.blockNumber;
      } catch (chainError: any) {
        res.status(500).json({
          success: false,
          error: `Blockchain revocation transaction failed: ${chainError.reason || chainError.message}`,
        });
        return;
      }

      const updatedProfile = await prisma.identityProfile.update({
        where: { id: request.identityProfileId },
        data: {
          status: "REVOKED",
          statusReason: reason,
        },
      });

      const updatedRequest = await prisma.verificationRequest.update({
        where: { id: request.id },
        data: {
          status: "REVOKED",
          reviewedAt: new Date(),
          reviewedBy: req.user!.email,
          reviewerNotes: `Revoked: ${reason}`,
          txHash,
          blockNumber,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "VERIFICATION_REVOKED_ONCHAIN",
          details: `Admin ${req.user!.email} revoked identity ${pseudonymousId}. Reason: ${reason}`,
          ipAddress: req.ip || req.socket.remoteAddress,
          txHash,
        },
      });

      res.status(200).json({
        success: true,
        message: "Identity verification revoked successfully on blockchain.",
        request: updatedRequest,
        profile: updatedProfile,
        transaction: {
          txHash,
          blockNumber,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to revoke verification.",
      });
    }
  }
);

// GET /api/admin/audit-logs
router.get("/audit-logs", async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch audit logs." });
  }
});

export default router;
