import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChallengeParticipation extends Document {
  challengeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  score: number;
  status: "accepted" | "completed";
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface IChallengeParticipationModel extends Model<IChallengeParticipation> {}

const ChallengeParticipationSchema = new Schema<IChallengeParticipation>(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["accepted", "completed"],
      required: true,
      default: "accepted",
      index: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// One participation record per user per challenge
ChallengeParticipationSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

// Ensure indexes are created
ChallengeParticipationSchema.set("autoIndex", true);

export const ChallengeParticipation: IChallengeParticipationModel =
  (mongoose.models.ChallengeParticipation as IChallengeParticipationModel) ||
  mongoose.model<IChallengeParticipation, IChallengeParticipationModel>(
    "ChallengeParticipation",
    ChallengeParticipationSchema,
  );

