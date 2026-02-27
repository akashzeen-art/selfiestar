import { Router } from "express";
import {
  getFriendsController,
  searchUsersController,
  addFriendController,
  removeFriendController,
  checkFriendshipController,
} from "../controllers/friend-controller";
import { requireAuth } from "../middleware/auth";
import { param } from "express-validator";
import { validate } from "../middleware/validation";

/**
 * Friend Management Routes
 * All routes require authentication
 */
const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get friends list
router.get("/", getFriendsController);

// Search users to add as friends
router.get("/search", searchUsersController);

// Check if users are friends
router.get(
  "/check/:userId",
  [param("userId").trim().isMongoId().withMessage("Invalid user ID"), validate],
  checkFriendshipController
);

// Add a friend
router.post(
  "/:userId",
  [param("userId").trim().isMongoId().withMessage("Invalid user ID"), validate],
  addFriendController
);

// Remove a friend
router.delete(
  "/:userId",
  [param("userId").trim().isMongoId().withMessage("Invalid user ID"), validate],
  removeFriendController
);

export default router;
