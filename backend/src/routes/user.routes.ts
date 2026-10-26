import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { authenticateToken } from "../middleware/auth";
import { blockchainService } from "../blockchain/contractClient";

const router = Router();

router.use(authenticateToken);

// GET /api/user/report - Download privacy-conscious activity report
router.get("/report", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        identityProfile: {
          select: {
            pseudonymousId: true,
            commitmentHash: true,
            status: true,
            statusReason: true,
            documentType: true,
            documentHash: true,
            registeredTxHash: true,
            registeredBlockNumber: true,
            verifiedTxHash: true,
            verifiedBlockNumber: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        auditLogs: {
          select: {
            action: true,
            details: true,
            txHash: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found." });
      return;
    }

    let onChainVerification = null;
    if (user.identityProfile?.pseudonymousId) {
      try {
        onChainVerification = await blockchainService.getIdentity(
          user.identityProfile.pseudonymousId
        );
      } catch {
        onChainVerification = { note: "On-chain record currently offline or pending" };
      }
    }

    const report = {
      title: "ChainVerify Decentralized Identity & Verification Report",
      generatedAt: new Date().toISOString(),
      reportId: `CV-REP-${Date.now()}`,
      privacyNotice:
        "This report contains tamper-evident cryptographic proofs. Sensitive identity documents and credentials remain completely off-chain.",
      subject: {
        fullName: user.fullName,
        email: user.email,
        accountCreated: user.createdAt,
      },
      cryptographicIdentity: user.identityProfile
        ? {
            pseudonymousIdentifier: user.identityProfile.pseudonymousId,
            verificationStatus: user.identityProfile.status,
            commitmentHash: user.identityProfile.commitmentHash,
            documentHash: user.identityProfile.documentHash,
            blockchainRegistrationTx: user.identityProfile.registeredTxHash,
            blockchainVerificationTx: user.identityProfile.verifiedTxHash,
          }
        : null,
      onChainSmartContractVerification: onChainVerification,
      auditHistory: user.auditLogs,
    };

    res.setHeader("Content-Disposition", `attachment; filename="ChainVerify-Report-${user.id.slice(0, 8)}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(report, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to generate report." });
  }
});

export default router;
