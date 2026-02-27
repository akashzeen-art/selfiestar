import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/http";

interface SelfieAccessPayload {
  selfieId: string;
  viewerId: string;
}

export function createSelfieAccessToken(selfieId: string, viewerId: string) {
  return jwt.sign({ selfieId, viewerId }, env.signedUrlSecret, {
    expiresIn: `${env.selfieTokenTtlSec}s`,
  });
}

export function verifySelfieAccessToken(token: string) {
  try {
    return jwt.verify(token, env.signedUrlSecret) as SelfieAccessPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired media token");
  }
}
