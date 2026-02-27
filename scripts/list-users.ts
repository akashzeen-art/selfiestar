/**
 * List All Users Script
 * 
 * This script lists all users in the database with their emails and roles.
 * 
 * Usage:
 *   pnpm tsx scripts/list-users.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../server/models/User";
import { connectDatabase } from "../server/config/db";

async function listUsers() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB\n");

    // Find all users
    const users = await User.find({}).select("name email role createdAt").lean();
    
    if (users.length === 0) {
      console.log("❌ No users found in database");
      console.log("   Please register a user first at /register");
      process.exit(0);
    }

    console.log(`📋 Found ${users.length} user(s):\n`);
    console.log("─".repeat(60));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log();
    });
    
    console.log("─".repeat(60));
    console.log("\n💡 To make a user admin, run:");
    console.log(`   pnpm tsx scripts/make-admin.ts <email>`);
    console.log(`\nExample: pnpm tsx scripts/make-admin.ts ${users[0].email}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

listUsers();
