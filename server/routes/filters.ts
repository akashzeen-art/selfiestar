import { Router } from "express";
import {
  getFiltersController,
  getFilterByIdController,
  getFiltersByCategoryController,
} from "../controllers/filter-controller";

const router = Router();

// Public routes - no authentication required
router.get("/", getFiltersController);
router.get("/category/:category", getFiltersByCategoryController);
router.get("/:id", getFilterByIdController);

export default router;
