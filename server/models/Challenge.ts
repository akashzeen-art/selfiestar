import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Challenge Model
 * Stores daily/weekly challenges for users to participate in
 */

export interface IChallenge extends Document {
  title: string;
  description: string;
  theme: string;
  banner?: string; // URL to banner image
  hashtags: string[]; // Array of hashtags for discovery
  uniqueCode: string; // Unique shareable code (indexed, unique)
  inviteCode?: string; // Private invite code for invite-only challenges
  startDate: Date;
  endDate: Date;
  participantsCount: number; // Cached participant count
  creatorId: mongoose.Types.ObjectId; // Reference to user who created it (indexed)
  winningReward: string;
  winnerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isPrivate?: boolean;
  participants?: mongoose.Types.ObjectId[]; // Users who accepted the invite
  declinedUsers?: mongoose.Types.ObjectId[]; // Users who declined the invite
  
  // Virtual/computed fields
  isActive: boolean;
  participantCount: number;
}

interface IChallengeModel extends Model<IChallenge> {
  // Add static methods here if needed
  findActive(): Promise<IChallenge[]>;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
      index: true, // Index for search
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    theme: {
      type: String,
      required: [true, "Theme is required"],
      trim: true,
      index: true, // Index for filtering by theme
    },
    banner: {
      type: String,
      trim: true,
      default: undefined,
    },
    hashtags: {
      type: [String],
      default: [],
      index: true, // Index for hashtag search
    },
    winningReward: {
      type: String,
      required: [true, "Winning reward is required"],
      trim: true,
      minlength: [3, "Winning reward must be at least 3 characters"],
      maxlength: [200, "Winning reward cannot exceed 200 characters"],
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      index: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    uniqueCode: {
      type: String,
      required: [true, "Unique code is required"],
      unique: true,
      trim: true,
      // Note: unique: true automatically creates an index, no need for index: true
    },
    participantsCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true, // Index for sorting by popularity
    },
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    declinedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      index: true, // Index for date range queries
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (this: IChallenge, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
      index: true, // Index for date range queries
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
      index: true, // Index for filtering by creator
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for checking if challenge is currently active
ChallengeSchema.virtual("isActive").get(function (this: IChallenge) {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Virtual for participant count (will be populated from Selfie model)
ChallengeSchema.virtual("participantCount", {
  ref: "Selfie",
  localField: "_id",
  foreignField: "challengeId",
  count: true,
});

// Compound indexes for common queries
ChallengeSchema.index({ startDate: 1, endDate: 1 }); // Date range queries
ChallengeSchema.index({ isActive: 1, endDate: 1 }); // Active challenges sorted by end date
ChallengeSchema.index({ creatorId: 1, createdAt: -1 }); // Challenges by creator
// Note: uniqueCode already has unique index from schema definition, no need to add again
ChallengeSchema.index({ participantsCount: -1, createdAt: -1 }); // Trending challenges

// Text search index
ChallengeSchema.index({ title: "text", description: "text", theme: "text" });

// Static method to find active challenges
ChallengeSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ endDate: 1 }); // Sort by end date ascending (ending soon first)
};

// Ensure indexes are created
ChallengeSchema.set("autoIndex", true);

// Prevent model redefinition during hot reloading
export const Challenge: IChallengeModel =
  (mongoose.models.Challenge as IChallengeModel) ||
  mongoose.model<IChallenge, IChallengeModel>("Challenge", ChallengeSchema);
