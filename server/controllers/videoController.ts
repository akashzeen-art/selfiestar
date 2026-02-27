import { RequestHandler } from "express";
import { asyncHandler, HttpError } from "../utils/http";
import { uploadVideoToCloudinary, validateVideoFile } from "../services/uploadService";
import mongoose from "mongoose";

/**
 * Video Controllers
 * Handles video upload and management with Cloudinary storage
 */

/**
 * Upload video
 * POST /api/video/upload
 * Requires: Authentication, video file
 */
export const uploadVideoController: RequestHandler = asyncHandler(async (req, res) => {
  // Validate file
  if (!req.file) {
    throw new HttpError(400, "Video file is required");
  }

  const validation = validateVideoFile(req.file);
  if (!validation.valid) {
    throw new HttpError(400, validation.error || "Invalid video file");
  }

  // Get metadata from request body
  const filter = req.body.filter || "none";
  const challengeId = req.body.challengeId || null;

  // Validate challenge ID if provided
  let challengeObjectId: mongoose.Types.ObjectId | undefined;
  if (challengeId) {
    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      throw new HttpError(400, "Invalid challenge ID");
    }
    challengeObjectId = new mongoose.Types.ObjectId(challengeId);
    // Verify challenge exists
    const Challenge = mongoose.model("Challenge");
    const challengeExists = await Challenge.findById(challengeObjectId);
    if (!challengeExists) {
      throw new HttpError(404, "Challenge not found");
    }
  }

  // Upload to Cloudinary
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadVideoToCloudinary(
      req.file.buffer,
      req.user!._id.toString(),
      {
        filter,
        challengeId: challengeObjectId?.toString(),
        mimeType: req.file.mimetype,
      }
    );
  } catch (error) {
    throw new HttpError(
      500,
      `Failed to upload video: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // TODO: Save video metadata to database (create Video model if needed)
  // For now, just return the upload result

  // Return success response
  res.status(201).json({
    message: "Video uploaded successfully",
    video: {
      id: cloudinaryResult.publicId,
      url: cloudinaryResult.secureUrl,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      duration: cloudinaryResult.duration,
      size: cloudinaryResult.bytes,
      filter,
      challengeId: challengeObjectId?.toString() || null,
    },
  });
});

/**
 * Get user's videos
 * GET /api/video/mine
 * Requires: Authentication
 */
export const listMyVideosController: RequestHandler = asyncHandler(async (req, res) => {
  // TODO: Implement video listing from database
  // For now, return empty array
  res.status(200).json({
    videos: [],
    message: "Video listing not yet implemented",
  });
});

/**
 * Get public videos
 * GET /api/video/public
 * Requires: Authentication
 */
export const listPublicVideosController: RequestHandler = asyncHandler(async (req, res) => {
  // TODO: Implement public video listing from database
  // For now, return empty array
  res.status(200).json({
    videos: [],
    message: "Public video listing not yet implemented",
  });
});
