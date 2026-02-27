import { Router } from "express";
import {
  leaderboardController,
  topUsersController,
  myRankController,
} from "../controllers/leaderboard-controller";
import { requireAuth } from "../middleware/auth";
import { validateLeaderboardQuery } from "../middleware/validation";

/**
 * Leaderboard Routes
 * All routes require authentication
 */
const router = Router();

// Main leaderboard (top 100)
router.get("/", requireAuth, leaderboardController);

// Top N users (query param: ?limit=10) with validation
router.get("/top", requireAuth, validateLeaderboardQuery, topUsersController);

// Current user's rank
router.get("/me", requireAuth, myRankController);

export default router;
