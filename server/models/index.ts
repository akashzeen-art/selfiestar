/**
 * Models Index
 * Central export for all Mongoose models
 */

export { User, type IUser } from "./User";
export { Challenge, type IChallenge } from "./Challenge";
export { Selfie, type ISelfie } from "./Selfie";

// Re-export mongoose for convenience
export { mongoose } from "../config/db";
