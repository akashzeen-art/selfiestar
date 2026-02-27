import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { ChallengeRecord, CommentRecord, SelfieRecord, UserRecord } from "../models/types";

function nowIso() {
  return new Date().toISOString();
}

const adminId = uuidv4();

const users: UserRecord[] = [
  {
    id: adminId,
    email: "admin@selfistar.app",
    username: "admin",
    passwordHash: bcrypt.hashSync("Admin@12345", 10),
    role: "admin",
    isBlocked: false,
    createdAt: nowIso(),
  },
];

const challenges: ChallengeRecord[] = [
  {
    id: uuidv4(),
    title: "Golden Hour Magic",
    description: "Capture your best selfie with warm natural light.",
    theme: "Nature",
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: adminId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const selfies: SelfieRecord[] = [];
const comments: CommentRecord[] = [];

export const store = {
  users,
  challenges,
  selfies,
  comments,
};
