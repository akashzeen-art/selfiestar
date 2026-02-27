#!/usr/bin/env tsx
/**
 * MongoDB Data Viewer
 * View all collections and data in your MongoDB database
 * 
 * Usage: pnpm tsx scripts/view-db.ts
 * Or:    tsx scripts/view-db.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../server/config/db";
import { User, Challenge, Selfie } from "../server/models";

async function viewDatabase() {
  try {
    // Connect to database
    await connectDatabase();

    console.log("\n" + "=".repeat(60));
    console.log("📊 MONGODB DATABASE VIEWER");
    console.log("=".repeat(60) + "\n");

    // Get database name
    const dbName = mongoose.connection.db?.databaseName || "unknown";
    console.log(`Database: ${dbName}\n`);

    // View Users
    console.log("👥 USERS");
    console.log("-".repeat(60));
    const users = await User.find({}).select("-password").lean();
    if (users.length === 0) {
      console.log("  No users found.\n");
    } else {
      console.log(`  Total users: ${users.length}\n`);
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     Role: ${user.role} | Selfies: ${user.totalSelfies} | Score: ${user.totalScore} | Avg: ${user.averageScore.toFixed(2)}`);
        console.log(`     Blocked: ${user.isBlocked} | Created: ${user.createdAt}`);
        console.log();
      });
    }

    // View Challenges
    console.log("🎯 CHALLENGES");
    console.log("-".repeat(60));
    const challenges = await Challenge.find({}).lean();
    if (challenges.length === 0) {
      console.log("  No challenges found.\n");
    } else {
      console.log(`  Total challenges: ${challenges.length}\n`);
      challenges.forEach((challenge, index) => {
        console.log(`  ${index + 1}. ${challenge.title}`);
        console.log(`     Theme: ${challenge.theme || "N/A"}`);
        console.log(`     Active: ${challenge.isActive}`);
        console.log(`     Start: ${challenge.startDate} | End: ${challenge.endDate}`);
        console.log(`     Created: ${challenge.createdAt}`);
        console.log();
      });
    }

    // View Selfies
    console.log("📸 SELFIES");
    console.log("-".repeat(60));
    const selfies = await Selfie.find({})
      .populate("userId", "name email")
      .populate("challengeId", "title")
      .lean();
    
    if (selfies.length === 0) {
      console.log("  No selfies found.\n");
    } else {
      console.log(`  Total selfies: ${selfies.length}\n`);
      selfies.forEach((selfie, index) => {
        const user = selfie.userId as any;
        const challenge = selfie.challengeId as any;
        console.log(`  ${index + 1}. Selfie #${selfie._id}`);
        console.log(`     User: ${user?.name || "Unknown"} (${user?.email || "N/A"})`);
        console.log(`     Challenge: ${challenge?.title || "None"}`);
        console.log(`     Score: ${selfie.score} | Likes: ${selfie.likes} | Comments: ${selfie.comments}`);
        console.log(`     Public: ${selfie.isPublic} | Created: ${selfie.createdAt}`);
        console.log();
      });
    }

    // Summary
    console.log("=".repeat(60));
    console.log("📈 SUMMARY");
    console.log("-".repeat(60));
    console.log(`  Users: ${users.length}`);
    console.log(`  Challenges: ${challenges.length}`);
    console.log(`  Selfies: ${selfies.length}`);
    console.log("=".repeat(60) + "\n");

    // Disconnect
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error viewing database:", error);
    await disconnectDatabase();
    process.exit(1);
  }
}

viewDatabase();
