import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { createCipheriv, randomBytes } from "crypto";

/**
 * Cloudinary Upload Service
 * Handles image uploads to Cloudinary free tier
 * Includes metadata encryption before storage
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

/**
 * Encrypt metadata before storing
 * Uses AES-256-GCM encryption
 */
function encryptMetadata(metadata: Record<string, any>): string {
  const key = Buffer.from(env.encryptionKeyHex, "hex");
  if (key.length !== 32) {
    throw new Error("SELFIE_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  
  const metadataJson = JSON.stringify(metadata);
  const encrypted = Buffer.concat([cipher.update(metadataJson, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine IV, auth tag, and encrypted data
  const payload = Buffer.concat([iv, authTag, encrypted]);
  
  // Return base64 encoded for storage in Cloudinary context
  return payload.toString("base64");
}

/**
 * Upload image to Cloudinary
 * @param imageBuffer - Image file buffer
 * @param userId - User ID who uploaded the image
 * @param metadata - Additional metadata to encrypt and store
 * @returns Cloudinary secure URL and public ID
 */
export async function uploadToCloudinary(
  imageBuffer: Buffer,
  userId: string,
  metadata: {
    filter?: string;
    caption?: string;
    challengeId?: string;
    mimeType: string;
  }
): Promise<{
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}> {
  return new Promise((resolve, reject) => {
    // Encrypt metadata
    const encryptedMetadata = encryptMetadata({
      userId,
      filter: metadata.filter,
      caption: metadata.caption,
      challengeId: metadata.challengeId,
      uploadedAt: new Date().toISOString(),
    });

    // Upload to Cloudinary with signed URL generation
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "selfistar/selfies", // Organize in folder
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          {
            quality: "auto:good", // Optimize for free tier
            fetch_format: "auto", // Auto format (webp when supported)
          },
        ],
        // Store encrypted metadata in context (Cloudinary's metadata field)
        context: {
          encrypted: encryptedMetadata,
        },
        // Tags for organization
        tags: ["selfie", `user-${userId}`],
        // Use signed URLs for security
        type: "upload",
        access_mode: "public", // Public for signed URLs
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    // Pipe buffer to upload stream
    uploadStream.end(imageBuffer);
  });
}

/**
 * Generate signed URL for Cloudinary image
 * Adds expiration and signature for security
 * @param publicId - Cloudinary public ID
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed secure URL
 */
export function generateSignedUrl(publicId: string, expiresIn: number = 3600): string {
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true, // Enable signed URLs
    expires_at: Math.floor(Date.now() / 1000) + expiresIn, // Expiration timestamp
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(new Error(`Cloudinary delete failed: ${error.message}`));
        return;
      }
      if (result?.result !== "ok" && result?.result !== "not found") {
        reject(new Error(`Cloudinary delete failed: ${result?.result}`));
        return;
      }
      resolve();
    });
  });
}

/**
 * Upload video to Cloudinary
 * @param videoBuffer - Video file buffer
 * @param userId - User ID who uploaded the video
 * @param metadata - Additional metadata to encrypt and store
 * @returns Cloudinary secure URL and public ID
 */
export async function uploadVideoToCloudinary(
  videoBuffer: Buffer,
  userId: string,
  metadata: {
    filter?: string;
    challengeId?: string;
    mimeType: string;
  }
): Promise<{
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    // Encrypt metadata
    const encryptedMetadata = encryptMetadata({
      userId,
      filter: metadata.filter,
      challengeId: metadata.challengeId,
      uploadedAt: new Date().toISOString(),
    });

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "selfistar/videos", // Organize in folder
        resource_type: "video",
        allowed_formats: ["mp4", "webm", "mov"],
        transformation: [
          {
            quality: "auto:good", // Optimize for free tier
            fetch_format: "auto",
          },
        ],
        // Store encrypted metadata
        context: {
          encrypted: encryptedMetadata,
        },
        tags: ["video", `user-${userId}`],
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          bytes: result.bytes,
          duration: result.duration || 0,
        });
      }
    );

    // Pipe buffer to upload stream
    uploadStream.end(videoBuffer);
  });
}

/**
 * Validate image file
 * @param file - Multer file object
 * @returns Validation result
 */
export function validateImageFile(file: Express.Multer.File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  // Check file size (5MB limit for free tier)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check minimum size (at least 1KB)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return {
      valid: false,
      error: "File size is too small",
    };
  }

  return { valid: true };
}

/**
 * Validate video file
 * @param file - Multer file object
 * @returns Validation result
 */
export function validateVideoFile(file: Express.Multer.File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  // Check file size (50MB limit for videos)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check minimum size (at least 10KB)
  const minSize = 10 * 1024; // 10KB
  if (file.size < minSize) {
    return {
      valid: false,
      error: "File size is too small",
    };
  }

  return { valid: true };
}
