import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import {
  uploadVideoController,
  listMyVideosController,
  listPublicVideosController,
} from "../controllers/videoController";

const router = Router();

// Configure multer for video uploads
// Limits: 50MB max file size (for 15-second videos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Validate file type
    const allowedMimeTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`));
    }
  },
});

// Routes
router.post("/upload", requireAuth, upload.single("video"), uploadVideoController);
router.get("/mine", requireAuth, listMyVideosController);
router.get("/public", requireAuth, listPublicVideosController);

export default router;
