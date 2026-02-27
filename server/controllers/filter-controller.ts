import { RequestHandler } from "express";
import { asyncHandler } from "../utils/http";

/**
 * Filter Controller
 * Handles filter-related operations
 */

export interface Filter {
  id: string;
  name: string;
  description: string;
  category: "beauty" | "artistic" | "color" | "effect" | "ar" | "mask";
  preview?: string; // URL to preview image
  isActive: boolean;
  is3D?: boolean; // Whether this is a 3D AR filter
}

/**
 * Available filters in the system
 */
const AVAILABLE_FILTERS: Filter[] = [
  {
    id: "none",
    name: "None",
    description: "No filter applied",
    category: "color",
    isActive: true,
  },
  {
    id: "glow",
    name: "Glow",
    description: "Adds a soft glowing effect to your selfie",
    category: "effect",
    isActive: true,
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Classic vintage film look with warm tones",
    category: "artistic",
    isActive: true,
  },
  {
    id: "bw",
    name: "Black & White",
    description: "Classic monochrome filter",
    category: "color",
    isActive: true,
  },
  {
    id: "smooth",
    name: "Beauty Smooth",
    description: "Smooths skin and enhances beauty",
    category: "beauty",
    isActive: true,
  },
  // AR Filters (Snapchat-style)
  {
    id: "dog",
    name: "Dog Mask",
    description: "Transform into a cute dog with 3D face mask",
    category: "mask",
    isActive: true,
    is3D: true,
  },
  {
    id: "cat",
    name: "Cat Mask",
    description: "Transform into a cute cat with 3D face mask",
    category: "mask",
    isActive: true,
    is3D: true,
  },
  {
    id: "glasses3d",
    name: "3D Glasses",
    description: "Realistic 3D glasses that track your face",
    category: "ar",
    isActive: true,
    is3D: true,
  },
  {
    id: "crown3d",
    name: "3D Crown",
    description: "Royal 3D crown that sits on your head",
    category: "ar",
    isActive: true,
    is3D: true,
  },
  {
    id: "bighead",
    name: "Big Head",
    description: "Funny big head distortion effect",
    category: "ar",
    isActive: true,
    is3D: true,
  },
  {
    id: "sparkles",
    name: "Sparkles",
    description: "Animated sparkle particles around your face",
    category: "ar",
    isActive: true,
    is3D: true,
  },
  {
    id: "confetti",
    name: "Confetti",
    description: "Celebratory confetti particles",
    category: "ar",
    isActive: true,
    is3D: true,
  },
];

/**
 * Get all available filters
 * GET /api/filters
 */
export const getFiltersController: RequestHandler = asyncHandler(async (_req, res) => {
  res.status(200).json({
    filters: AVAILABLE_FILTERS.filter((f) => f.isActive),
  });
});

/**
 * Get filter by ID
 * GET /api/filters/:id
 */
export const getFilterByIdController: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filter = AVAILABLE_FILTERS.find((f) => f.id === id && f.isActive);

  if (!filter) {
    res.status(404).json({
      error: "Filter not found",
    });
    return;
  }

  res.status(200).json({
    filter,
  });
});

/**
 * Get filters by category
 * GET /api/filters/category/:category
 */
export const getFiltersByCategoryController: RequestHandler = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const validCategories = ["beauty", "artistic", "color", "effect", "ar", "mask"];

  if (!validCategories.includes(category)) {
    res.status(400).json({
      error: "Invalid category",
      validCategories,
    });
    return;
  }

  const filters = AVAILABLE_FILTERS.filter(
    (f) => f.category === category && f.isActive
  );

  res.status(200).json({
    category,
    filters,
  });
});
