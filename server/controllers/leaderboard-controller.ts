import { RequestHandler } from "express";
import { asyncHandler } from "../utils/http";
import { User } from "../models/User";
import { leaderboardCache } from "../services/cache";

/**
 * Leaderboard Controller
 * Returns ranked users based on totalScore and totalSelfies
 * Uses MongoDB aggregation pipeline for optimal performance
 * Includes low-memory caching
 */

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  profileImage?: string;
  totalScore: number;
  totalSelfies: number;
  averageScore: number;
  challengeWins: number;
  challengesCreated: number;
}

/**
 * Get leaderboard
 * GET /api/leaderboard
 * Requires: Authentication
 */
export const leaderboardController: RequestHandler = asyncHandler(async (_req, res) => {
  const cacheKey = "leaderboard:all";

  // Check cache first
  const cached = leaderboardCache.get<LeaderboardEntry[]>(cacheKey);
  if (cached) {
    res.status(200).json({
      leaderboard: cached,
      cached: true,
    });
    return;
  }

  // Use MongoDB aggregation pipeline for optimal performance
  const leaderboard = await User.aggregate([
    // Stage 1: Filter out blocked users and admins (optional - remove if you want admins)
    {
      $match: {
        isBlocked: false,
        role: "user", // Only regular users in leaderboard
      },
    },
    // Stage 2: Calculate average score
    {
      $addFields: {
        averageScore: {
          $cond: {
            if: { $gt: ["$totalSelfies", 0] },
            then: {
              $divide: ["$totalScore", "$totalSelfies"],
            },
            else: 0,
          },
        },
      },
    },
    // Stage 3: Sort by totalScore (desc), then challengesCreated (desc), then totalSelfies (desc)
    {
      $sort: {
        totalScore: -1,
        challengesCreated: -1,
        totalSelfies: -1,
      },
    },
    // Stage 4: Add rank field
    {
      $group: {
        _id: null,
        users: {
          $push: {
            userId: { $toString: "$_id" },
            username: "$username",
            profileImage: "$profileImage",
            totalScore: "$totalScore",
            totalSelfies: "$totalSelfies",
            averageScore: "$averageScore",
            challengeWins: "$challengeWins",
            challengesCreated: "$challengesCreated",
          },
        },
      },
    },
    // Stage 5: Add rank numbers
    {
      $project: {
        leaderboard: {
          $map: {
            input: "$users",
            as: "user",
            in: {
              $mergeObjects: [
                "$$user",
                {
                  rank: {
                    $add: [
                      {
                        $indexOfArray: ["$users", "$$user"],
                      },
                      1,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    // Stage 6: Unwind to get array of users with ranks
    {
      $unwind: "$leaderboard",
    },
    // Stage 7: Replace root
    {
      $replaceRoot: {
        newRoot: "$leaderboard",
      },
    },
    // Stage 8: Limit results (top 100)
    {
      $limit: 100,
    },
  ]);

  // Format response
  const formatted: LeaderboardEntry[] = leaderboard.map((entry) => ({
    rank: entry.rank,
    userId: entry.userId,
    username: entry.username,
    profileImage: entry.profileImage,
    totalScore: entry.totalScore,
    totalSelfies: entry.totalSelfies,
    averageScore: Math.round(entry.averageScore * 10) / 10, // Round to 1 decimal
    challengeWins: entry.challengeWins || 0,
    challengesCreated: entry.challengesCreated || 0,
  }));

  // Cache the result (30 seconds TTL)
  leaderboardCache.set(cacheKey, formatted);

  res.status(200).json({
    leaderboard: formatted,
    cached: false,
  });
});

/**
 * Get top N users (alternative endpoint)
 * GET /api/leaderboard/top?limit=10
 */
export const topUsersController: RequestHandler = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const cacheKey = `leaderboard:top:${limit}`;

  // Check cache
  const cached = leaderboardCache.get<LeaderboardEntry[]>(cacheKey);
  if (cached) {
    res.status(200).json({
      leaderboard: cached,
      cached: true,
    });
    return;
  }

  // Simplified aggregation for top N
  const topUsers = await User.aggregate([
    {
      $match: {
        isBlocked: false,
        role: "user",
        totalSelfies: { $gt: 0 }, // Only users with at least 1 selfie
      },
    },
    {
      $sort: {
        totalScore: -1,
        totalSelfies: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        rank: { $literal: 0 }, // Will be set in application code
        userId: { $toString: "$_id" },
        username: "$username",
        profileImage: "$profileImage",
        totalScore: 1,
        totalSelfies: 1,
        challengeWins: 1,
        challengesCreated: 1,
        averageScore: {
          $cond: {
            if: { $gt: ["$totalSelfies", 0] },
            then: { $divide: ["$totalScore", "$totalSelfies"] },
            else: 0,
          },
        },
      },
    },
  ]);

  // Add ranks
  const formatted: LeaderboardEntry[] = topUsers.map((user, index) => ({
    ...user,
    rank: index + 1,
    averageScore: Math.round(user.averageScore * 10) / 10,
  }));

  // Cache result
  leaderboardCache.set(cacheKey, formatted);

  res.status(200).json({
    leaderboard: formatted,
    cached: false,
  });
});

/**
 * Get user's rank
 * GET /api/leaderboard/me
 */
export const myRankController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id.toString();
  const cacheKey = `leaderboard:rank:${userId}`;

  // Check cache
  const cached = leaderboardCache.get<{ rank: number; entry: LeaderboardEntry }>(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  // Get user's position in leaderboard
  const userRank = await User.aggregate([
    {
      $match: {
        isBlocked: false,
        role: "user",
      },
    },
    {
      $sort: {
        totalScore: -1,
        totalSelfies: -1,
      },
    },
    {
      $group: {
        _id: null,
        users: {
          $push: {
            userId: { $toString: "$_id" },
            username: "$username",
            profileImage: "$profileImage",
            totalScore: "$totalScore",
            totalSelfies: "$totalSelfies",
            challengeWins: { $ifNull: ["$challengeWins", 0] },
            challengesCreated: { $ifNull: ["$challengesCreated", 0] },
          },
        },
      },
    },
    {
      $project: {
        rank: {
          $add: [
            {
              $indexOfArray: [
                "$users.userId",
                userId,
              ],
            },
            1,
          ],
        },
        user: {
          $arrayElemAt: [
            "$users",
            {
              $indexOfArray: ["$users.userId", userId],
            },
          ],
        },
      },
    },
  ]);

  if (userRank.length === 0 || !userRank[0].user) {
    res.status(404).json({ message: "User not found in leaderboard" });
    return;
  }

  const result = {
    rank: userRank[0].rank,
    entry: {
      rank: userRank[0].rank,
      userId: userRank[0].user.userId,
      username: userRank[0].user.username,
      profileImage: userRank[0].user.profileImage,
      totalScore: userRank[0].user.totalScore,
      totalSelfies: userRank[0].user.totalSelfies,
      challengeWins: userRank[0].user.challengeWins || 0,
      challengesCreated: userRank[0].user.challengesCreated || 0,
      averageScore: userRank[0].user.totalSelfies > 0
        ? Math.round((userRank[0].user.totalScore / userRank[0].user.totalSelfies) * 10) / 10
        : 0,
    },
  };

  // Cache for 30 seconds
  leaderboardCache.set(cacheKey, result);

  res.status(200).json(result);
});
