import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticateToken } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { sensitiveActionLimiter } from "../middleware/rateLimiter";
import { hashDocument, generateCommitmentHash } from "../utils/crypto";
import { blockchainService } from "../blockchain/contractClient";

const router = Router();

const requestVerificationSchema = z.object({
  documentType: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"], {
    errorMap: () => ({ message: "Document type must be PASSPORT, NATIONAL_ID, or DRIVERS_LICENSE" }),
  }),
  documentNumberMasked: z.string().min(4, "Document identifier must be provided").max(50),
  issuingAuthority: z.string().min(2, "Issuing authority required").max(100),
  simulatedPayload: z.string().optional(),
});

// POST /api/identity/request-verification
router.post(
  "/request-verification",
  authenticateToken,
  sensitiveActionLimiter,
  validateRequest(requestVerificationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentType, documentNumberMasked, issuingAuthority, simulatedPayload } = req.body;
      const userId = req.user!.id;

      // Find user profile
      let profile = await prisma.identityProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        res.status(404).json({
          success: false,
          error: "Identity profile not found.",
        });
        return;
      }

      if (profile.status === "VERIFIED") {
        res.status(400).json({
          success: false,
          error: "Your identity is already verified on the blockchain.",
        });
        return;
      }

      // Check for pending request
      const pendingRequest = await prisma.verificationRequest.findFirst({
        where: {
          identityProfileId: profile.id,
          status: "PENDING",
        },
      });

      if (pendingRequest) {
        res.status(400).json({
          success: false,
          error: "A verification request is already pending administrator review.",
        });
        return;
      }

      // Cryptographically hash document metadata so sensitive details never leak
      const rawDocData = `${documentType}:${documentNumberMasked}:${issuingAuthority}:${simulatedPayload || ""}`;
      const docHash = hashDocument(rawDocData);

      // Create new commitment hash
      const newCommitment = generateCommitmentHash({
        pseudonymousId: profile.pseudonymousId,
        documentType,
        salt: Date.now().toString(),
      });

      // Update IdentityProfile
      profile = await prisma.identityProfile.update({
        where: { id: profile.id },
        data: {
          status: "PENDING",
          documentType,
          documentHash: docHash,
          commitmentHash: newCommitment,
          statusReason: "Verification request submitted for simulated administrative review",
        },
      });

      // Create verification request entry
      const request = await prisma.verificationRequest.create({
        data: {
          identityProfileId: profile.id,
          status: "PENDING",
          reviewerNotes: `Submitted simulated document: ${documentType} (${issuingAuthority})`,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "VERIFICATION_REQUESTED",
          details: `Verification requested for ${profile.pseudonymousId} [Doc: ${documentType}]`,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(200).json({
        success: true,
        message: "Identity verification request submitted successfully.",
        request,
        profile: {
          pseudonymousId: profile.pseudonymousId,
          status: profile.status,
          documentType: profile.documentType,
          commitmentHash: profile.commitmentHash,
        },
      });
    } catch (error: any) {
      console.error("Verification request error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to submit verification request.",
      });
    }
  }
);

// GET /api/identity/status
router.get("/status", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.identityProfile.findUnique({
      where: { userId },
      include: {
        verificationRequests: {
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!profile) {
      res.status(404).json({ success: false, error: "Identity profile not found." });
      return;
    }

    // Try reading live blockchain state
    let onChainData: any = null;
    let onChainStatusMatch: boolean = true;
    let blockchainOnline: boolean = false;

    try {
      const bcStatus = await blockchainService.getStatus();
      blockchainOnline = bcStatus.online && bcStatus.contractDeployed;

      if (blockchainOnline) {
        onChainData = await blockchainService.getIdentity(profile.pseudonymousId);
        onChainStatusMatch = onChainData.status.toUpperCase() === profile.status.toUpperCase();
      }
    } catch (bcErr) {
      blockchainOnline = false;
    }

    res.status(200).json({
      success: true,
      profile: {
        pseudonymousId: profile.pseudonymousId,
        status: profile.status,
        statusReason: profile.statusReason,
        documentType: profile.documentType,
        commitmentHash: profile.commitmentHash,
        registeredTxHash: profile.registeredTxHash,
        registeredBlockNumber: profile.registeredBlockNumber,
        verifiedTxHash: profile.verifiedTxHash,
        verifiedBlockNumber: profile.verifiedBlockNumber,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      latestRequest: profile.verificationRequests[0] || null,
      onChain: {
        available: blockchainOnline,
        record: onChainData,
        statusMatchesDatabase: onChainStatusMatch,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch identity status." });
  }
});

// GET /api/identity/history
router.get("/history", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [requests, auditLogs] = await Promise.all([
      prisma.verificationRequest.findMany({
        where: { identityProfile: { userId } },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    res.status(200).json({
      success: true,
      requests,
      auditLogs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch identity history." });
  }
});

export default router;
