import { IUser } from "../models/User";

/**
 * Express Request type extensions
 * Adds user property to Request object for authenticated routes
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // User object from MongoDB (set by auth middleware)
    }
  }
}

export {};
