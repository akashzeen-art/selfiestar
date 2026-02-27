import { RequestHandler } from "express";
import { Challenge, IChallenge } from "../models/Challenge";
import { asyncHandler, HttpError } from "../utils/http";
import { Selfie } from "../models/Selfie";

/**
 * Challenge Controllers
 * Handles challenge CRUD operations with MongoDB
 * Admin-only for create/update/delete
 */

/**
 * List all challenges (public - shows active challenges)
 * GET /api/challenges
 */
export const listChallengesController: RequestHandler = asyncHandler(async (_req, res) => {
  // Get all challenges, sorted by end date (ending soon first)
  const challenges = await Challenge.find()
    .populate("createdBy", "name email")
    .sort({ endDate: 1 })
    .lean();

  // Get participant counts for each challenge
  const challengesWithParticipants = await Promise.all(
    challenges.map(async (challenge) => {
      const participantCount = await Selfie.countDocuments({
        challengeId: challenge._id,
      });

      const now = new Date();
      const isActive =
        new Date(challenge.startDate) <= now && new Date(challenge.endDate) >= now;

      return {
        id: challenge._id.toString(),
        title: challenge.title,
        description: challenge.description,
        theme: challenge.theme,
        bannerImage: challenge.banner, // Map 'banner' to 'bannerImage' for DTO compatibility
        startDate: challenge.startDate.toISOString(),
        endDate: challenge.endDate.toISOString(),
        createdBy: challenge.createdBy,
        createdAt: challenge.createdAt.toISOString(),
        updatedAt: challenge.updatedAt.toISOString(),
        participants: participantCount,
        isActive,
      };
    }),
  );

  res.status(200).json({ challenges: challengesWithParticipants });
});

/**
 * Get all challenges (admin only - includes expired)
 * GET /api/admin/challenges
 */
export const getAllChallengesController: RequestHandler = asyncHandler(async (_req, res) => {
  const challenges = await Challenge.find()
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 }) // Newest first for admin
    .lean();

  const challengesWithStats = await Promise.all(
    challenges.map(async (challenge) => {
      const participantCount = await Selfie.countDocuments({
        challengeId: challenge._id,
      });

      const now = new Date();
      const isActive =
        new Date(challenge.startDate) <= now && new Date(challenge.endDate) >= now;
      const isExpired = new Date(challenge.endDate) < now;
      const isUpcoming = new Date(challenge.startDate) > now;

      return {
        id: challenge._id.toString(),
        title: challenge.title,
        description: challenge.description,
        theme: challenge.theme,
        bannerImage: challenge.banner, // Map 'banner' to 'bannerImage' for DTO compatibility
        startDate: challenge.startDate.toISOString(),
        endDate: challenge.endDate.toISOString(),
        createdBy: challenge.createdBy,
        createdAt: challenge.createdAt.toISOString(),
        updatedAt: challenge.updatedAt.toISOString(),
        participants: participantCount,
        isActive,
        isExpired,
        isUpcoming,
      };
    }),
  );

  res.status(200).json({ challenges: challengesWithStats });
});

/**
 * Create a new challenge (admin only)
 * POST /api/admin/challenges
 */
export const createChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  // Input is already validated by express-validator middleware
  // express-validator normalizes and sanitizes the input
  const input = {
    title: req.body.title?.trim() || "",
    description: req.body.description?.trim() || "",
    theme: req.body.theme?.trim() || "",
    startDate: req.body.startDate, // ISO string from express-validator
    endDate: req.body.endDate, // ISO string from express-validator
    banner: req.body.banner?.trim(),
  };

  // Validate dates
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const now = new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new HttpError(400, "Invalid date format");
  }

  if (endDate <= startDate) {
    throw new HttpError(400, "End date must be after start date");
  }

  // Create challenge
  const challenge = new Challenge({
    title: input.title.trim(),
    description: input.description.trim(),
    theme: input.theme.trim(),
    banner: input.banner?.trim(),
    startDate,
    endDate,
    createdBy: req.user!._id, // Admin user ID from auth middleware
  });

  await challenge.save();

  // Populate createdBy for response
  await challenge.populate("createdBy", "name email");

  res.status(201).json({
    message: "Challenge created successfully",
    challenge: {
      id: challenge._id.toString(),
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      banner: challenge.banner,
      startDate: challenge.startDate.toISOString(),
      endDate: challenge.endDate.toISOString(),
      createdBy: challenge.createdBy,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
      isActive: challenge.isActive,
    },
  });
});

/**
 * Update a challenge (admin only)
 * PUT /api/admin/challenges/:id
 */
export const updateChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;

  // Find challenge
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  // Input is already validated by express-validator middleware
  // express-validator normalizes and sanitizes the input

  // Update fields
  if (req.body.title !== undefined) challenge.title = req.body.title.trim();
  if (req.body.description !== undefined) challenge.description = req.body.description.trim();
  if (req.body.theme !== undefined) challenge.theme = req.body.theme.trim();
  if (req.body.banner !== undefined) challenge.banner = req.body.banner.trim();

  // Validate dates if provided
  if (req.body.startDate || req.body.endDate) {
    const startDate = req.body.startDate ? new Date(req.body.startDate) : challenge.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : challenge.endDate;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpError(400, "Invalid date format");
    }

    if (endDate <= startDate) {
      throw new HttpError(400, "End date must be after start date");
    }

    challenge.startDate = startDate;
    challenge.endDate = endDate;
  }

  await challenge.save();
  await challenge.populate("createdBy", "name email");

  res.status(200).json({
    message: "Challenge updated successfully",
    challenge: {
      id: challenge._id.toString(),
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      banner: challenge.banner,
      startDate: challenge.startDate.toISOString(),
      endDate: challenge.endDate.toISOString(),
      createdBy: challenge.createdBy,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
      isActive: challenge.isActive,
    },
  });
});

/**
 * Delete a challenge (admin only)
 * DELETE /api/admin/challenges/:id
 */
export const deleteChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;

  // Find and delete challenge
  const challenge = await Challenge.findByIdAndDelete(challengeId);
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  // Optionally: Delete all selfies associated with this challenge
  // Or just remove challengeId reference (keeping selfies but unlinked)
  // For now, we'll keep selfies but they'll have orphaned challengeId
  // Uncomment below if you want to delete associated selfies:
  // await Selfie.deleteMany({ challengeId: challenge._id });

  res.status(200).json({
    message: "Challenge deleted successfully",
    deletedId: challengeId,
  });
});
