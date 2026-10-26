import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Look in cookies first (HttpOnly), then fallback to Authorization header
    let token = req.cookies?.chainverify_session;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Authentication required. Please sign in to continue.",
      });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: string;
    };

    // Check user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Session user account not found or has been revoked.",
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: "Session expired. Please log in again.",
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: "Invalid authentication credentials.",
    });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
    });
    return;
  }
  next();
};
