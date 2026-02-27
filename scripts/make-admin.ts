/**
 * Make User Admin Script
 * 
 * This script promotes a user to admin role in MongoDB.
 * 
 * Usage:
 *   pnpm tsx scripts/make-admin.ts <email>
 * 
 * Example:
 *   pnpm tsx scripts/make-admin.ts user@example.com
 */

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../server/models/User";
import { connectDatabase } from "../server/config/db";

async function makeAdmin(email: string) {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB");

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    // Check if already admin
    if (user.role === "admin") {
      console.log(`ℹ️  User "${email}" is already an admin`);
      process.exit(0);
    }

    // Update role to admin
    user.role = "admin";
    await user.save();

    console.log(`✅ Successfully promoted "${email}" to admin role`);
    console.log(`   User: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("\nUsage: pnpm tsx scripts/make-admin.ts <email>");
  console.log("Example: pnpm tsx scripts/make-admin.ts user@example.com");
  process.exit(1);
}

makeAdmin(email);
