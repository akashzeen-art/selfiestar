import { Router } from "express";
import {
  createChallengeController,
  updateChallengeController,
  deleteChallengeController,
  getChallengeByCodeController,
  getTrendingChallengesController,
  getMyChallengesController,
  getChallengeLeaderboardController,
  acceptChallengeByInviteCodeController,
  declineChallengeByInviteCodeController,
} from "../controllers/user-challenge-controller";
import { requireAuth, optionalAuth } from "../middleware/auth";
import {
  validateCreateChallenge,
  validateUpdateChallenge,
} from "../middleware/validation";

/**
 * User Challenge Routes
 * User-driven challenge management system
 */
const router = Router();

// Protected routes - require authentication
router.post("/create", requireAuth, validateCreateChallenge, createChallengeController);
router.put("/:id", requireAuth, validateUpdateChallenge, updateChallengeController);
router.delete("/:id", requireAuth, deleteChallengeController);
router.get("/my", requireAuth, getMyChallengesController);

// Invite-based challenge actions (private/invite flows)
router.post("/:inviteCode/accept", requireAuth, acceptChallengeByInviteCodeController);
router.post("/:inviteCode/decline", requireAuth, declineChallengeByInviteCodeController);

// Public routes - optional authentication
router.get("/trending", optionalAuth, getTrendingChallengesController);
router.get("/:uniqueCode", optionalAuth, getChallengeByCodeController);
router.get("/:uniqueCode/leaderboard", optionalAuth, getChallengeLeaderboardController);

export default router;
