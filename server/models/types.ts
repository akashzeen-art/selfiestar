export type UserRole = "user";
export type SelfieFilter = "none" | "glow" | "vintage" | "bw" | "smooth";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  profileImage?: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface ChallengeRecord {
  id: string;
  title: string;
  description: string;
  theme: string;
  startDate: string;
  endDate: string;
  bannerImage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelfieRecord {
  id: string;
  ownerId: string;
  encryptedPath: string;
  mimeType: string;
  sizeBytes: number;
  score: number;
  analysis: {
    symmetry: number;
    brightness: number;
    smile: number;
  };
  caption?: string;
  isPublic: boolean;
  filter: SelfieFilter;
  challengeId?: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export interface CommentRecord {
  id: string;
  selfieId: string;
  userId: string;
  text: string;
  createdAt: string;
}
