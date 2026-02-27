import { RequestHandler } from "express";
import { User } from "../models/User";
import { asyncHandler, HttpError } from "../utils/http";
import mongoose from "mongoose";

/**
 * Friend Management Controllers
 * Handles adding/removing friends and getting friends list
 */

/**
 * Get user's friends list
 * GET /api/friends
 */
export const getFriendsController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;

  const user = await User.findById(userId)
    .populate("friends", "username name profileImage totalScore totalSelfies")
    .lean();

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const friends = (user.friends || []).map((friend: any) => ({
    id: friend._id.toString(),
    username: friend.username,
    name: friend.name,
    profileImage: friend.profileImage,
    totalScore: friend.totalScore || 0,
    totalSelfies: friend.totalSelfies || 0,
  }));

  res.status(200).json({
    friends,
    count: friends.length,
  });
});

/**
 * Search users to add as friends
 * GET /api/friends/search?q=username
 */
export const searchUsersController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const query = (req.query.q as string)?.trim() || "";

  if (query.length < 2) {
    res.status(200).json({ users: [] });
    return;
  }

  // Get current user's friends list
  const currentUser = await User.findById(userId).select("friends").lean();
  const friendIds = (currentUser?.friends || []).map((id: any) => id.toString());

  // Search users (exclude current user and existing friends)
  const users = await User.find({
    _id: { $ne: userId, $nin: friendIds },
    $or: [
      { username: { $regex: query, $options: "i" } },
      { name: { $regex: query, $options: "i" } },
    ],
    isBlocked: false,
  })
    .select("username name profileImage totalScore totalSelfies")
    .limit(20)
    .lean();

  const results = users.map((user: any) => ({
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    profileImage: user.profileImage,
    totalScore: user.totalScore || 0,
    totalSelfies: user.totalSelfies || 0,
  }));

  res.status(200).json({
    users: results,
  });
});

/**
 * Add a friend
 * POST /api/friends/:userId
 */
export const addFriendController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const friendId = req.params.userId;

  if (userId.toString() === friendId) {
    throw new HttpError(400, "Cannot add yourself as a friend");
  }

  // Validate friend ID
  if (!mongoose.Types.ObjectId.isValid(friendId)) {
    throw new HttpError(400, "Invalid user ID");
  }

  const friend = await User.findById(friendId);
  if (!friend) {
    throw new HttpError(404, "User not found");
  }

  if (friend.isBlocked) {
    throw new HttpError(400, "Cannot add blocked user as friend");
  }

  // Check if already friends
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.friends.some((id) => id.toString() === friendId)) {
    throw new HttpError(400, "User is already your friend");
  }

  // Add friend
  await User.findByIdAndUpdate(userId, {
    $addToSet: { friends: friendId },
  });

  res.status(200).json({
    message: "Friend added successfully",
    friend: {
      id: friend._id.toString(),
      username: friend.username,
      name: friend.name,
      profileImage: friend.profileImage,
    },
  });
});

/**
 * Remove a friend
 * DELETE /api/friends/:userId
 */
export const removeFriendController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const friendId = req.params.userId;

  // Validate friend ID
  if (!mongoose.Types.ObjectId.isValid(friendId)) {
    throw new HttpError(400, "Invalid user ID");
  }

  // Remove friend
  await User.findByIdAndUpdate(userId, {
    $pull: { friends: friendId },
  });

  res.status(200).json({
    message: "Friend removed successfully",
  });
});

/**
 * Check if users are friends
 * GET /api/friends/check/:userId
 */
export const checkFriendshipController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const otherUserId = req.params.userId;

  const user = await User.findById(userId).select("friends").lean();
  const isFriend = user?.friends.some((id: any) => id.toString() === otherUserId) || false;

  res.status(200).json({
    isFriend,
  });
});
