import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must include uppercase")
    .regex(/[a-z]/, "Password must include lowercase")
    .regex(/\d/, "Password must include a number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const challengeBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title cannot exceed 120 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description cannot exceed 1000 characters"),
  theme: z.string().min(2, "Theme must be at least 2 characters").max(80, "Theme cannot exceed 80 characters"),
  startDate: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Start date must be a valid date" }
    )
    .transform((val) => new Date(val).toISOString()),
  endDate: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "End date must be a valid date" }
    )
    .transform((val) => new Date(val).toISOString()),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal("")),
});

export const createChallengeSchema = challengeBaseSchema.refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export const updateChallengeSchema = challengeBaseSchema.partial().refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end > start;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export const uploadSelfieBodySchema = z.object({
  caption: z.string().max(300).optional(),
  isPublic: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true"),
  challengeId: z.string().optional(),
  filter: z.enum(["none", "glow", "vintage", "bw", "smooth"]).default("none"),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(500),
});
