import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";

const storageDir = path.resolve(import.meta.dirname, "../storage/encrypted");
const key = Buffer.from(env.encryptionKeyHex, "hex");

if (key.length !== 32) {
  throw new Error("SELFIE_ENCRYPTION_KEY must be 64 hex chars (32 bytes).");
}

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

export async function saveEncryptedImage(imageBuffer: Buffer) {
  await ensureStorageDir();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);
  const filename = `${uuidv4()}.bin`;
  const filePath = path.join(storageDir, filename);
  await fs.writeFile(filePath, payload);
  return filePath;
}

export async function readEncryptedImage(filePath: string) {
  const payload = await fs.readFile(filePath);
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
