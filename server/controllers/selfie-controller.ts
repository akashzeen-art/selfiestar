import { RequestHandler } from "express";
import { commentSchema, uploadSelfieBodySchema } from "../utils/validators";
import { asyncHandler, HttpError } from "../utils/http";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  generateSignedUrl,
} from "../services/uploadService";
import { scoreSelfie } from "../services/scoring";
import { Selfie, ISelfie } from "../models/Selfie";
import { User } from "../models/User";
import { Challenge } from "../models/Challenge";
import { ChallengeParticipation } from "../models/ChallengeParticipation";
import mongoose from "mongoose";

/**
 * Selfie Controllers
 * Handles selfie upload, retrieval, and management with Cloudinary storage
 */

/**
 * Upload selfie
 * POST /api/selfies/upload
 * Requires: Authentication, image file
 */
export const uploadSelfieController: RequestHandler = asyncHandler(async (req, res) => {
  // Validate file
  if (!req.file) {
    throw new HttpError(400, "Image file is required");
  }

  const validation = validateImageFile(req.file);
  if (!validation.valid) {
    throw new HttpError(400, validation.error || "Invalid image file");
  }

  // Validate request body
  const payload = uploadSelfieBodySchema.parse(req.body);

  // Score the selfie (AI scoring with brightness analysis and face detection)
  const scored = await scoreSelfie(req.file.buffer);

  // Upload to Cloudinary
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.user!._id.toString(), {
      filter: payload.filter,
      caption: payload.caption,
      challengeId: payload.challengeId,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    throw new HttpError(500, `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Validate challenge ID if provided
  let challengeId: mongoose.Types.ObjectId | undefined;
  if (payload.challengeId) {
    const challengeExists = await mongoose.model("Challenge").findById(payload.challengeId);
    if (!challengeExists) {
      throw new HttpError(400, "Invalid challenge ID");
    }
    challengeId = new mongoose.Types.ObjectId(payload.challengeId);
  }

  // Generate signed URL for additional security (optional, Cloudinary URLs are already secure)
  // For extra security, you can use signed URLs with expiration
  const imageUrl = cloudinaryResult.secureUrl; // Already secure, but can be signed if needed

  // Create selfie in MongoDB
  const selfie = new Selfie({
    userId: req.user!._id,
    challengeId,
    imageUrl, // Store Cloudinary secure URL (already HTTPS and secure)
    score: scored.score,
    isPublic: payload.isPublic,
    caption: payload.caption,
    likes: 0,
    comments: 0,
  });

  await selfie.save();

  // Update user stats
  await User.findByIdAndUpdate(req.user!._id, {
    $inc: { totalSelfies: 1, totalScore: scored.score },
  });

  // Update challenge participants count and participation record if challenge exists
  if (challengeId) {
    const userId = req.user!._id;

    // Ensure the user is an accepted participant before recording a challenge score
    const participation = await ChallengeParticipation.findOne({
      challengeId,
      userId,
    });

    if (!participation || (participation.status !== "accepted" && participation.status !== "completed")) {
      throw new HttpError(403, "You must accept the challenge before submitting a score");
    }

    // Check if this is the first selfie by this user for this challenge
    const existingSelfie = await Selfie.findOne({
      userId,
      challengeId: challengeId,
      _id: { $ne: selfie._id }, // Exclude the current selfie
    });
    
    // Only increment if this is the first participation
    if (!existingSelfie) {
      await Challenge.findByIdAndUpdate(challengeId, {
        $inc: { participantsCount: 1 },
      });
    }

    // Mark participation as completed and store score
    participation.status = "completed";
    participation.score = scored.score;
    participation.completedAt = new Date();
    await participation.save();
  }

  // Populate user info for response
  await selfie.populate("userId", "name email");

  res.status(201).json({
    message: "Selfie uploaded successfully",
    selfie: {
      id: selfie._id.toString(),
      userId: selfie.userId,
      challengeId: selfie.challengeId?.toString(),
      imageUrl: selfie.imageUrl, // Secure Cloudinary URL
      score: selfie.score,
      isPublic: selfie.isPublic,
      caption: selfie.caption,
      likes: selfie.likes,
      comments: selfie.comments,
      createdAt: selfie.createdAt.toISOString(),
      analysis: scored.analysis, // Include detailed analysis
    },
  });
});

/**
 * List user's selfies
 * GET /api/selfies/mine
 * Requires: Authentication
 */
export const listMySelfiesController: RequestHandler = asyncHandler(async (req, res) => {
  const selfies = await Selfie.find({ userId: req.user!._id })
    .populate("userId", "name email")
    .populate("challengeId", "title theme")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    selfies: selfies.map((selfie) => ({
      id: selfie._id.toString(),
      userId: selfie.userId,
      challengeId: selfie.challengeId ? (selfie.challengeId as any)._id.toString() : undefined,
      imageUrl: selfie.imageUrl,
      score: selfie.score,
      isPublic: selfie.isPublic,
      caption: selfie.caption,
      likes: selfie.likes,
      comments: selfie.comments,
      createdAt: selfie.createdAt.toISOString(),
    })),
  });
});

/**
 * List public selfies
 * GET /api/selfies/public
 * Requires: Authentication
 */
export const listPublicSelfiesController: RequestHandler = asyncHandler(async (req, res) => {
  const selfies = await Selfie.find({ isPublic: true })
    .populate("userId", "name email")
    .populate("challengeId", "title theme")
    .sort({ createdAt: -1 })
    .limit(50) // Limit for performance
    .lean();

  res.status(200).json({
    selfies: selfies.map((selfie) => ({
      id: selfie._id.toString(),
      userId: selfie.userId,
      challengeId: selfie.challengeId ? (selfie.challengeId as any)._id.toString() : undefined,
      imageUrl: selfie.imageUrl,
      score: selfie.score,
      isPublic: selfie.isPublic,
      caption: selfie.caption,
      likes: selfie.likes,
      comments: selfie.comments,
      createdAt: selfie.createdAt.toISOString(),
    })),
  });
});

/**
 * Delete selfie
 * DELETE /api/selfies/:id
 * Requires: Authentication (owner or admin)
 */
export const deleteSelfieController: RequestHandler = asyncHandler(async (req, res) => {
  const selfieId = req.params.id;

  const selfie = await Selfie.findById(selfieId);
  if (!selfie) {
    throw new HttpError(404, "Selfie not found");
  }

  // Check permissions - only allow selfie owner to delete
  if (selfie.userId.toString() !== req.user!._id.toString()) {
    throw new HttpError(403, "Forbidden: You can only delete your own selfies");
  }

  // Extract public ID from Cloudinary URL
  // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
  const urlParts = selfie.imageUrl.split("/");
  const uploadIndex = urlParts.findIndex((part) => part === "upload");
  if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
    // Get everything after "upload" and before file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join("/");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, ""); // Remove file extension

    try {
      await deleteFromCloudinary(publicId);
    } catch (error) {
      // Log error but continue with database deletion
      console.error("Failed to delete from Cloudinary:", error);
    }
  }

  // Delete from database
  await Selfie.findByIdAndDelete(selfieId);

  res.status(200).json({
    message: "Selfie deleted successfully",
  });
});

/**
 * Like selfie
 * POST /api/selfies/:id/like
 * Requires: Authentication
 */
export const likeSelfieController: RequestHandler = asyncHandler(async (req, res) => {
  const selfieId = req.params.id;

  const selfie = await Selfie.findById(selfieId);
  if (!selfie || !selfie.isPublic) {
    throw new HttpError(404, "Public selfie not found");
  }

  selfie.likes += 1;
  await selfie.save();

  res.status(200).json({
    likes: selfie.likes,
  });
});

/**
 * Comment on selfie
 * POST /api/selfies/:id/comments
 * Requires: Authentication
 */
export const commentSelfieController: RequestHandler = asyncHandler(async (req, res) => {
  const selfieId = req.params.id;
  const input = commentSchema.parse(req.body);

  const selfie = await Selfie.findById(selfieId);
  if (!selfie || !selfie.isPublic) {
    throw new HttpError(404, "Public selfie not found");
  }

  // TODO: Create Comment model and save comment
  // For now, just increment comment count
  selfie.comments += 1;
  await selfie.save();

  res.status(201).json({
    message: "Comment added",
    comments: selfie.comments,
  });
});

/**
 * Stream selfie (legacy endpoint for backward compatibility)
 * GET /api/selfies/access/:token
 * Note: With Cloudinary, we use direct URLs, but keeping this for compatibility
 */
export const streamSelfieController: RequestHandler = asyncHandler(async (req, res) => {
  // This endpoint is kept for backward compatibility
  // With Cloudinary, images are accessed via secure URLs directly
  throw new HttpError(410, "This endpoint is deprecated. Use direct image URLs from selfie.imageUrl");
});
