import { Router } from "express";
import { listChallengesController } from "../controllers/challenge-controller";
import { getTrendingChallengesController } from "../controllers/user-challenge-controller";
import { requireAuth, optionalAuth } from "../middleware/auth";

/**
 * Challenge Routes (Legacy + New)
 * Combines old challenge listing with new trending endpoint
 */
const router = Router();

// Legacy route - list active challenges (requires auth to see all)
router.get("/", requireAuth, listChallengesController);

// New route - get trending challenges (optional auth)
router.get("/trending", optionalAuth, getTrendingChallengesController);

export default router;
