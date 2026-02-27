import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import {
  commentSelfieController,
  deleteSelfieController,
  likeSelfieController,
  listMySelfiesController,
  listPublicSelfiesController,
  streamSelfieController,
  uploadSelfieController,
} from "../controllers/selfie-controller";
import { validateUploadSelfie, validateComment } from "../middleware/validation";

const router = Router();

// Configure multer for image uploads
// Limits: 5MB max file size (optimized for Cloudinary free tier)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Validate file type
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`));
    }
  },
});

// Routes with validation
router.post("/upload", requireAuth, upload.single("image"), validateUploadSelfie, uploadSelfieController);
router.get("/mine", requireAuth, listMySelfiesController);
router.get("/public", requireAuth, listPublicSelfiesController);
router.get("/access/:token", streamSelfieController);
router.delete("/:id", requireAuth, deleteSelfieController);
router.post("/:id/like", requireAuth, likeSelfieController);
router.post("/:id/comments", requireAuth, validateComment, commentSelfieController);

export default router;
