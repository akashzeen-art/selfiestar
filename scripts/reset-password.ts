/**
 * Reset User Password Script
 * 
 * This script resets a user's password in MongoDB.
 * 
 * Usage:
 *   pnpm tsx scripts/reset-password.ts <email> <new-password>
 * 
 * Example:
 *   pnpm tsx scripts/reset-password.ts test@example.com NewPassword123
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../server/models/User";
import { connectDatabase } from "../server/config/db";

async function resetPassword(email: string, newPassword: string) {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB\n");

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    // Validate password
    if (newPassword.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      process.exit(1);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = passwordHash;
    await user.save();

    console.log(`✅ Successfully reset password for "${email}"`);
    console.log(`   User: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n💡 You can now login with:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("❌ Please provide email and new password");
  console.log("\nUsage: pnpm tsx scripts/reset-password.ts <email> <new-password>");
  console.log("Example: pnpm tsx scripts/reset-password.ts test@example.com NewPassword123");
  process.exit(1);
}

resetPassword(email, newPassword);
