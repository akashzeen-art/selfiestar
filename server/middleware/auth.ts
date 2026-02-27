import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth-service";
import { HttpError } from "../utils/http";
import { asyncHandler } from "../utils/http";

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request object
 * Optimized for low-cost hosting with efficient error handling
 */

/**
 * Require authentication middleware
 * - Extracts Bearer token from Authorization header
 * - Verifies token and loads user from database
 * - Attaches user to req.user for use in routes
 * - Throws 401 if token is missing or invalid
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token) {
      throw new HttpError(401, "Token is required");
    }

    // Verify token and load user from database
    const user = await verifyToken(token);
    
    // Attach user to request object
    req.user = user;
    
    next();
  }
);

/**
 * Optional authentication middleware
 * - Similar to requireAuth but doesn't throw if token is missing
 * - Useful for routes that work for both authenticated and anonymous users
 * - Attaches user to req.user if token is valid, otherwise req.user is undefined
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const user = await verifyToken(token);
        req.user = user;
      } catch (error) {
        // Ignore token errors for optional auth
        // req.user remains undefined
      }
    }

    next();
  }
);
