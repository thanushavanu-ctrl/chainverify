import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";
import { config } from "../config";
import { validateRequest } from "../middleware/validate";
import { authenticateToken } from "../middleware/auth";
import { authRateLimiter, sensitiveActionLimiter } from "../middleware/rateLimiter";
import { generatePseudonymousId, generateCommitmentHash } from "../utils/crypto";
import { blockchainService } from "../blockchain/contractClient";

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(150),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service and privacy policy",
  }),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(/[a-z]/, "New password must contain at least one lowercase letter")
    .regex(/[0-9]/, "New password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "New password must contain at least one special character"),
});

// POST /api/auth/register
router.post(
  "/register",
  authRateLimiter,
  validateRequest(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullName, email, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: "An account with this email address already exists.",
        });
        return;
      }

      // Hash password using bcryptjs with work factor 12
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate pseudonymous identifier (DID) - completely detached from sensitive credentials
      const pseudonymousId = generatePseudonymousId(`${email.toLowerCase()}_${Date.now()}`);
      const commitmentHash = generateCommitmentHash({
        pseudonymousId,
        documentType: "INITIAL_REGISTRATION",
        salt: Date.now().toString(),
      });

      // Attempt to register on the blockchain if local node & contract are running
      let registeredTxHash: string | null = null;
      let registeredBlockNumber: number | null = null;
      let onChainRegistered = false;

      try {
        const txResult = await blockchainService.registerIdentity(pseudonymousId, commitmentHash);
        registeredTxHash = txResult.txHash;
        registeredBlockNumber = txResult.blockNumber;
        onChainRegistered = true;
      } catch (chainErr: any) {
        // Safe fallback: Registration succeeds in off-chain DB, and pending on-chain registration is noted
        console.warn("Notice: Blockchain registration queued or skipped (node offline/not deployed yet)");
      }

      // Create User and IdentityProfile in database
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          role: "USER",
          identityProfile: {
            create: {
              pseudonymousId,
              commitmentHash,
              status: "PENDING",
              statusReason: "Identity registered; pending document verification review",
              registeredTxHash,
              registeredBlockNumber,
            },
          },
        },
        include: {
          identityProfile: true,
        },
      });

      // Record audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_REGISTERED",
          details: `User registered with pseudonymous ID ${pseudonymousId}. On-chain: ${onChainRegistered}`,
          ipAddress: req.ip || req.socket.remoteAddress,
          txHash: registeredTxHash,
        },
      });

      // Issue JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Set HttpOnly cookie
      res.cookie("chainverify_session", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: "Account created successfully.",
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        identityProfile: {
          pseudonymousId: user.identityProfile?.pseudonymousId,
          status: user.identityProfile?.status,
          onChainRegistered,
          registeredTxHash,
          registeredBlockNumber,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during registration.",
      });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  authRateLimiter,
  validateRequest(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          identityProfile: true,
        },
      });

      // Generic authentication error message to prevent user enumeration
      if (!user) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        });
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        });
        return;
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Set HttpOnly cookie
      res.cookie("chainverify_session", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Log successful login
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN_SUCCESS",
          details: `User logged in from ${req.ip || "unknown IP"}`,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(200).json({
        success: true,
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        identityProfile: user.identityProfile
          ? {
              pseudonymousId: user.identityProfile.pseudonymousId,
              status: user.identityProfile.status,
              registeredTxHash: user.identityProfile.registeredTxHash,
              verifiedTxHash: user.identityProfile.verifiedTxHash,
            }
          : null,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during login.",
      });
    }
  }
);

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response): void => {
  res.clearCookie("chainverify_session", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        identityProfile: {
          select: {
            id: true,
            pseudonymousId: true,
            commitmentHash: true,
            status: true,
            statusReason: true,
            documentType: true,
            registeredTxHash: true,
            registeredBlockNumber: true,
            verifiedTxHash: true,
            verifiedBlockNumber: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch user profile." });
  }
});

// POST /api/auth/change-password
router.post(
  "/change-password",
  authenticateToken,
  sensitiveActionLimiter,
  validateRequest(changePasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        res.status(404).json({ success: false, error: "User not found." });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          error: "Current password does not match.",
        });
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_CHANGED",
          details: "User password updated successfully",
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.status(200).json({
        success: true,
        message: "Password changed successfully.",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to change password.",
      });
    }
  }
);

export default router;
