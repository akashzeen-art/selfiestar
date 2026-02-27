import { RequestHandler } from "express";
import { Challenge, IChallenge } from "../models/Challenge";
import { User } from "../models/User";
import { Selfie } from "../models/Selfie";
import { asyncHandler, HttpError } from "../utils/http";
import { v4 as uuidv4 } from "uuid";
import { ChallengeParticipation } from "../models/ChallengeParticipation";
import mongoose from "mongoose";

/**
 * User Challenge Controllers
 * Handles user-driven challenge CRUD operations
 * Users can create, edit, and delete their own challenges
 */

/**
 * Generate unique code for challenge
 */
function generateUniqueCode(): string {
  // Generate a short, URL-friendly code (8 characters)
  return uuidv4().replace(/-/g, "").substring(0, 8).toUpperCase();
}

/**
 * Generate invite code for private/invite-based challenges
 */
function generateInviteCode(): string {
  // Similar format to unique code but kept separate for clarity
  return uuidv4().replace(/-/g, "").substring(0, 10).toUpperCase();
}

/**
 * Helper to safely get creator info from populated or unpopulated creatorId
 */
function getCreatorInfo(creatorId: any): { id: string; info?: { username: string; profileImage?: string } } {
  if (!creatorId) {
    return { id: "" };
  }
  
  // If it's a populated object with _id
  if (creatorId._id) {
    return {
      id: creatorId._id.toString(),
      info: creatorId.username ? {
        username: creatorId.username,
        profileImage: creatorId.profileImage,
      } : undefined,
    };
  }
  
  // If it's just an ObjectId or string
  return {
    id: creatorId.toString(),
    info: creatorId.username ? {
      username: creatorId.username,
      profileImage: creatorId.profileImage,
    } : undefined,
  };
}

/**
 * Helper to safely get date string
 */
function getDateString(date: Date | string | null | undefined): string {
  if (!date) {
    return new Date().toISOString();
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  try {
    return new Date(date).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Create a new challenge (user)
 * POST /api/challenge/create
 */
export const createChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  
  // Check rate limit: max 3 challenges per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChallenges = await Challenge.countDocuments({
    creatorId: userId,
    createdAt: { $gte: oneDayAgo },
  });

  if (recentChallenges >= 3) {
    throw new HttpError(429, "Rate limit exceeded: Maximum 3 challenges per day");
  }

  // Validate dates & duration
  const startDate = new Date(req.body.startDate);
  const durationDays = Number(req.body.duration);
  const now = new Date();

  if (isNaN(startDate.getTime())) {
    throw new HttpError(400, "Invalid start date");
  }

  if (startDate < now) {
    throw new HttpError(400, "Start date must be in the future");
  }

  if (![1, 3, 7].includes(durationDays)) {
    throw new HttpError(400, "Invalid duration. Allowed values are 1, 3, or 7 days");
  }

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Generate unique share code (ensure it's unique)
  let uniqueCode = generateUniqueCode();
  let attempts = 0;
  while (await Challenge.findOne({ uniqueCode })) {
    uniqueCode = generateUniqueCode();
    attempts++;
    if (attempts > 10) {
      throw new HttpError(500, "Failed to generate unique code");
    }
  }

  // Generate invite code (ensure it's unique); used for private/invite flows
  let inviteCode = generateInviteCode();
  let inviteAttempts = 0;
  while (await Challenge.findOne({ inviteCode })) {
    inviteCode = generateInviteCode();
    inviteAttempts++;
    if (inviteAttempts > 10) {
      throw new HttpError(500, "Failed to generate invite code");
    }
  }

  // Create challenge
  const challenge = new Challenge({
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    theme: req.body.theme.trim(),
    banner: req.body.banner?.trim(),
    hashtags: Array.isArray(req.body.hashtags) 
      ? req.body.hashtags.map((tag: string) => tag.trim().replace(/^#/, "")).filter(Boolean)
      : [],
    startDate,
    endDate,
    uniqueCode,
    inviteCode,
    creatorId: userId,
    participantsCount: 0,
    winningReward: (req.body.winningReward || "").toString().trim(),
  });

  if (!challenge.winningReward) {
    throw new HttpError(400, "Winning reward is required");
  }

  await challenge.save();

  // Increment user's challengesCreated count
  await User.findByIdAndUpdate(userId, {
    $inc: { challengesCreated: 1 },
  });

  // Populate creator for response
  await challenge.populate("creatorId", "username profileImage");

  const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/challenge/${uniqueCode}`;

  // Safely extract creator info
  const creatorIdValue = typeof challenge.creatorId === 'object' && challenge.creatorId !== null && '_id' in challenge.creatorId
    ? (challenge.creatorId as any)._id.toString()
    : challenge.creatorId.toString();
  
  const creatorInfo = typeof challenge.creatorId === 'object' && challenge.creatorId !== null && 'username' in challenge.creatorId
    ? {
        username: (challenge.creatorId as any).username,
        profileImage: (challenge.creatorId as any).profileImage,
      }
    : undefined;

  res.status(201).json({
    message: "Challenge created successfully",
    challenge: {
      id: challenge._id.toString(),
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      banner: challenge.banner,
      uniqueCode: challenge.uniqueCode,
      startDate: challenge.startDate instanceof Date 
        ? challenge.startDate.toISOString() 
        : new Date(challenge.startDate).toISOString(),
      endDate: challenge.endDate instanceof Date 
        ? challenge.endDate.toISOString() 
        : new Date(challenge.endDate).toISOString(),
      participantsCount: challenge.participantsCount,
      creatorId: creatorIdValue,
      creator: creatorInfo,
      hashtags: challenge.hashtags,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
      isActive: challenge.isActive,
      shareUrl,
      winningReward: challenge.winningReward,
      winnerId: challenge.winnerId ? challenge.winnerId.toString() : undefined,
    },
  });
});

/**
 * Utility to determine and persist winner after challenge end.
 * Can be called from a cron job or on-demand endpoint.
 */
export const declareChallengeWinner = async (challengeId: string) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) return;

  const now = new Date();
  if (challenge.endDate > now) {
    // Challenge not ended yet
    return;
  }

  if (challenge.winnerId) {
    // Winner already declared
    return;
  }

  const top = await ChallengeParticipation.aggregate([
    {
      $match: {
        challengeId: new mongoose.Types.ObjectId(challengeId),
        status: "completed",
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $limit: 1,
    },
  ]);

  if (!top.length) {
    return;
  }

  const winnerUserId = top[0].userId;

  challenge.winnerId = winnerUserId;
  await challenge.save();

  await User.findByIdAndUpdate(winnerUserId, {
    $inc: { challengeWins: 1 },
  });
};

/**
 * Update a challenge (only creator)
 * PUT /api/challenge/:id
 */
export const updateChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user!._id;

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  // Check ownership
  if (challenge.creatorId.toString() !== userId.toString()) {
    throw new HttpError(403, "Forbidden: You can only edit your own challenges");
  }

  // Update fields
  if (req.body.title !== undefined) {
    challenge.title = req.body.title.trim();
  }
  if (req.body.description !== undefined) {
    challenge.description = req.body.description.trim();
  }
  if (req.body.theme !== undefined) {
    challenge.theme = req.body.theme.trim();
  }
  if (req.body.banner !== undefined) {
    challenge.banner = req.body.banner?.trim();
  }
  if (req.body.hashtags !== undefined) {
    challenge.hashtags = Array.isArray(req.body.hashtags)
      ? req.body.hashtags.map((tag: string) => tag.trim().replace(/^#/, "")).filter(Boolean)
      : [];
  }
  if (req.body.startDate !== undefined) {
    challenge.startDate = new Date(req.body.startDate);
  }
  if (req.body.endDate !== undefined) {
    challenge.endDate = new Date(req.body.endDate);
  }

  // Validate dates if updated
  if (challenge.endDate <= challenge.startDate) {
    throw new HttpError(400, "End date must be after start date");
  }

  await challenge.save();
  await challenge.populate("creatorId", "username profileImage");

  const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/challenge/${challenge.uniqueCode}`;

  // Safely extract creator info
  const creatorIdValue = typeof challenge.creatorId === 'object' && challenge.creatorId !== null && '_id' in challenge.creatorId
    ? (challenge.creatorId as any)._id.toString()
    : challenge.creatorId.toString();
  
  const creatorInfo = typeof challenge.creatorId === 'object' && challenge.creatorId !== null && 'username' in challenge.creatorId
    ? {
        username: (challenge.creatorId as any).username,
        profileImage: (challenge.creatorId as any).profileImage,
      }
    : undefined;

  res.status(200).json({
    message: "Challenge updated successfully",
    challenge: {
      id: challenge._id.toString(),
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      banner: challenge.banner,
      uniqueCode: challenge.uniqueCode,
      startDate: challenge.startDate instanceof Date 
        ? challenge.startDate.toISOString() 
        : new Date(challenge.startDate).toISOString(),
      endDate: challenge.endDate instanceof Date 
        ? challenge.endDate.toISOString() 
        : new Date(challenge.endDate).toISOString(),
      participantsCount: challenge.participantsCount,
      creatorId: creatorIdValue,
      creator: creatorInfo,
      hashtags: challenge.hashtags,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
      isActive: challenge.isActive,
      shareUrl,
    },
  });
});

/**
 * Delete a challenge (only creator)
 * DELETE /api/challenge/:id
 */
export const deleteChallengeController: RequestHandler = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user!._id;

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  // Check ownership
  if (challenge.creatorId.toString() !== userId.toString()) {
    throw new HttpError(403, "Forbidden: You can only delete your own challenges");
  }

  // Delete challenge
  await Challenge.findByIdAndDelete(challengeId);

  // Decrement user's challengesCreated count
  await User.findByIdAndUpdate(userId, {
    $inc: { challengesCreated: -1 },
  });

  res.status(200).json({
    message: "Challenge deleted successfully",
  });
});

/**
 * Get challenge by unique code (public)
 * GET /api/challenge/:uniqueCode
 */
export const getChallengeByCodeController: RequestHandler = asyncHandler(async (req, res) => {
  const code = req.params.uniqueCode.toUpperCase();

  const challenge = await Challenge.findOne({
    $or: [{ uniqueCode: code }, { inviteCode: code }],
  })
    .populate("creatorId", "username profileImage")
    .lean();

  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  // Get actual participant count
  const participantCount = await Selfie.countDocuments({
    challengeId: challenge._id,
  });

  const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/challenge/${challenge.uniqueCode}`;

  const { id: creatorIdValue, info: creatorInfo } = getCreatorInfo(challenge.creatorId);

  // Safely calculate isActive
  let isActive = false;
  try {
    const startDateObj = challenge.startDate instanceof Date 
      ? challenge.startDate 
      : new Date(challenge.startDate);
    const endDateObj = challenge.endDate instanceof Date 
      ? challenge.endDate 
      : new Date(challenge.endDate);
    const now = new Date();
    isActive = now >= startDateObj && now <= endDateObj;
  } catch {
    isActive = false;
  }

  res.status(200).json({
    challenge: {
      id: challenge._id?.toString() || "",
      title: challenge.title || "",
      description: challenge.description || "",
      theme: challenge.theme || "",
      banner: challenge.banner || undefined,
      uniqueCode: challenge.uniqueCode || code,
      inviteCode: challenge.inviteCode || undefined,
      startDate: getDateString(challenge.startDate),
      endDate: getDateString(challenge.endDate),
      participantsCount: participantCount || 0,
      creatorId: creatorIdValue,
      creator: creatorInfo,
      hashtags: Array.isArray(challenge.hashtags) ? challenge.hashtags : [],
      createdAt: getDateString(challenge.createdAt),
      updatedAt: getDateString(challenge.updatedAt),
      isActive,
      shareUrl,
    },
  });
});

/**
 * Get trending challenges (public)
 * GET /api/challenges/trending
 */
export const getTrendingChallengesController: RequestHandler = asyncHandler(async (_req, res) => {
    try {
    const challenges = await Challenge.find()
      .populate("creatorId", "username profileImage")
      .sort({ participantsCount: -1, createdAt: -1 })
      .limit(20)
      .lean();

    // If no challenges, return empty array
    if (!challenges || challenges.length === 0) {
      res.status(200).json({
        challenges: [],
      });
      return;
    }

    // Get actual participant counts
    const challengesWithCounts = await Promise.all(
      challenges.map(async (challenge) => {
        try {
          const participantCount = await Selfie.countDocuments({
            challengeId: challenge._id,
          });

          const uniqueCode = challenge.uniqueCode || generateUniqueCode();
          const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/challenge/${uniqueCode}`;

          const { id: creatorIdValue, info: creatorInfo } = getCreatorInfo(challenge.creatorId);

          // Safely calculate isActive
          let isActive = false;
          try {
            const startDateObj = challenge.startDate instanceof Date 
              ? challenge.startDate 
              : new Date(challenge.startDate);
            const endDateObj = challenge.endDate instanceof Date 
              ? challenge.endDate 
              : new Date(challenge.endDate);
            const now = new Date();
            isActive = now >= startDateObj && now <= endDateObj;
          } catch {
            isActive = false;
          }

          return {
            id: challenge._id?.toString() || "",
            title: challenge.title || "",
            description: challenge.description || "",
            theme: challenge.theme || "",
            banner: challenge.banner || undefined,
            uniqueCode,
            startDate: getDateString(challenge.startDate),
            endDate: getDateString(challenge.endDate),
            participantsCount: participantCount || 0,
            creatorId: creatorIdValue,
            creator: creatorInfo,
            hashtags: Array.isArray(challenge.hashtags) ? challenge.hashtags : [],
            createdAt: getDateString(challenge.createdAt),
            updatedAt: getDateString(challenge.updatedAt),
            isActive,
            shareUrl,
          };
        } catch (error) {
          console.error("Error processing challenge:", error);
          // Return a minimal valid object for this challenge
          return {
            id: challenge._id?.toString() || "",
            title: challenge.title || "Unknown Challenge",
            description: challenge.description || "",
            theme: challenge.theme || "",
            banner: challenge.banner || undefined,
            uniqueCode: challenge.uniqueCode || generateUniqueCode(),
            startDate: getDateString(challenge.startDate),
            endDate: getDateString(challenge.endDate),
            participantsCount: 0,
            creatorId: "",
            creator: undefined,
            hashtags: [],
            createdAt: getDateString(challenge.createdAt),
            updatedAt: getDateString(challenge.updatedAt),
            isActive: false,
            shareUrl: "",
          };
        }
      })
    );

    res.status(200).json({
      challenges: challengesWithCounts,
    });
  } catch (error) {
    console.error("Error in getTrendingChallengesController:", error);
    throw new HttpError(500, "Failed to fetch trending challenges");
  }
});

/**
 * Get user's challenges (protected)
 * GET /api/challenges/my
 */
export const getMyChallengesController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;

  const challenges = await Challenge.find({ creatorId: userId })
    .populate("creatorId", "username profileImage")
    .sort({ createdAt: -1 })
    .lean();

  // Get actual participant counts
  const challengesWithCounts = await Promise.all(
    challenges.map(async (challenge) => {
      const participantCount = await Selfie.countDocuments({
        challengeId: challenge._id,
      });

      const uniqueCode = challenge.uniqueCode || generateUniqueCode();
      const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/challenge/${uniqueCode}`;

      const { id: creatorIdValue, info: creatorInfo } = getCreatorInfo(challenge.creatorId);

      // Safely calculate isActive
      let isActive = false;
      try {
        const startDateObj = challenge.startDate instanceof Date 
          ? challenge.startDate 
          : new Date(challenge.startDate);
        const endDateObj = challenge.endDate instanceof Date 
          ? challenge.endDate 
          : new Date(challenge.endDate);
        const now = new Date();
        isActive = now >= startDateObj && now <= endDateObj;
      } catch {
        isActive = false;
      }

      return {
        id: challenge._id?.toString() || "",
        title: challenge.title || "",
        description: challenge.description || "",
        theme: challenge.theme || "",
        banner: challenge.banner || undefined,
        uniqueCode,
        startDate: getDateString(challenge.startDate),
        endDate: getDateString(challenge.endDate),
        participantsCount: participantCount || 0,
        creatorId: creatorIdValue,
        creator: creatorInfo,
        hashtags: Array.isArray(challenge.hashtags) ? challenge.hashtags : [],
        createdAt: getDateString(challenge.createdAt),
        updatedAt: getDateString(challenge.updatedAt),
        isActive,
        shareUrl,
      };
    })
  );

  res.status(200).json({
    challenges: challengesWithCounts,
  });
});

/**
 * Get challenge leaderboard
 * GET /api/challenge/:uniqueCode/leaderboard
 */
export const getChallengeLeaderboardController: RequestHandler = asyncHandler(async (req, res) => {
  const code = req.params.uniqueCode.toUpperCase();

  // Allow lookup by either public share code or private invite code
  const challenge = await Challenge.findOne({
    $or: [{ uniqueCode: code }, { inviteCode: code }],
  }).lean();
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  const isInviteCode = !!challenge.inviteCode && challenge.inviteCode.toUpperCase() === code;

  // Private/invite-based leaderboard using ChallengeParticipation
  if (isInviteCode) {
    const declinedUserIds = (challenge.declinedUsers || []).map((id: any) => id.toString());
    const participantIds = (challenge.participants || []).map((id: any) => id.toString());

    if (!participantIds.length) {
      res.status(200).json({
        challenge: {
          id: challenge._id.toString(),
          title: challenge.title,
          uniqueCode: challenge.uniqueCode,
        },
        leaderboard: [],
      });
      return;
    }

    const leaderboard = await ChallengeParticipation.aggregate([
      {
        $match: {
          challengeId: challenge._id,
          status: "completed",
          userId: {
            $in: participantIds.map((id) => new (ChallengeParticipation as any).db.base.Types.ObjectId(id)),
            ...(declinedUserIds.length
              ? {
                  $nin: declinedUserIds.map(
                    (id) => new (ChallengeParticipation as any).db.base.Types.ObjectId(id),
                  ),
                }
              : {}),
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$userId",
          username: "$user.username",
          profileImage: "$user.profileImage",
          score: "$score",
        },
      },
      {
        $sort: { score: -1 },
      },
      {
        $limit: 100,
      },
    ]);

    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: entry.username,
      profileImage: entry.profileImage,
      score: entry.score,
    }));

    res.status(200).json({
      challenge: {
        id: challenge._id.toString(),
        title: challenge.title,
        uniqueCode: challenge.uniqueCode,
      },
      leaderboard: leaderboardWithRank,
    });
    return;
  }

  // Get leaderboard using aggregation
  const leaderboard = await Selfie.aggregate([
    {
      $match: {
        challengeId: challenge._id,
      },
    },
    {
      $group: {
        _id: "$userId",
        totalScore: { $sum: "$score" },
        totalSelfies: { $sum: 1 },
        highestScore: { $max: "$score" },
        averageScore: { $avg: "$score" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        userId: "$_id",
        username: "$user.username",
        profileImage: "$user.profileImage",
        totalScore: 1,
        totalSelfies: 1,
        highestScore: 1,
        averageScore: { $round: ["$averageScore", 2] },
      },
    },
    {
      $sort: { totalScore: -1, highestScore: -1 },
    },
    {
      $limit: 100,
    },
  ]);

  // Add rank
  const leaderboardWithRank = leaderboard.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  res.status(200).json({
    challenge: {
      id: challenge._id.toString(),
      title: challenge.title,
      uniqueCode: challenge.uniqueCode,
    },
    leaderboard: leaderboardWithRank,
  });
});

/**
 * Accept challenge via invite code (private/invite-based)
 * POST /api/challenge/:inviteCode/accept
 */
export const acceptChallengeByInviteCodeController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const inviteCode = req.params.inviteCode.toUpperCase();

  const challenge = await Challenge.findOne({ inviteCode }).lean();
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  const participantIds = (challenge.participants || []).map((id: any) => id.toString());

  // Optional max participants cap
  if (!participantIds.includes(userId.toString()) && participantIds.length >= 10) {
    throw new HttpError(400, "This challenge already has the maximum number of participants (10)");
  }

  // Add to participants and remove from declinedUsers if present
  await Challenge.updateOne(
    { _id: challenge._id },
    {
      $addToSet: { participants: userId },
      $pull: { declinedUsers: userId },
    },
  );

  // Upsert participation record
  await ChallengeParticipation.findOneAndUpdate(
    { challengeId: challenge._id, userId },
    {
      $set: {
        status: "accepted",
      },
      $setOnInsert: {
        score: 0,
      },
    },
    { upsert: true, new: true },
  );

  res.status(200).json({
    message: "Challenge accepted successfully",
  });
});

/**
 * Decline challenge via invite code
 * POST /api/challenge/:inviteCode/decline
 */
export const declineChallengeByInviteCodeController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const inviteCode = req.params.inviteCode.toUpperCase();

  const challenge = await Challenge.findOne({ inviteCode }).lean();
  if (!challenge) {
    throw new HttpError(404, "Challenge not found");
  }

  await Challenge.updateOne(
    { _id: challenge._id },
    {
      $addToSet: { declinedUsers: userId },
      $pull: { participants: userId },
    },
  );

  await ChallengeParticipation.deleteOne({
    challengeId: challenge._id,
    userId,
  });

  res.status(200).json({
    message: "Challenge declined",
  });
});
