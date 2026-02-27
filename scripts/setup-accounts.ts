/**
 * Setup Default Accounts Script
 * 
 * This script creates both an admin and a user account with default credentials.
 * 
 * Usage:
 *   pnpm tsx scripts/setup-accounts.ts
 * 
 * Or with custom credentials:
 *   pnpm tsx scripts/setup-accounts.ts admin@example.com AdminPass123 user@example.com UserPass123
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../server/models/User";
import { connectDatabase } from "../server/config/db";

async function setupAccounts(
  adminEmail?: string,
  adminPassword?: string,
  adminName?: string,
  userEmail?: string,
  userPassword?: string,
  userName?: string
) {
  try {
    // Default admin credentials
    const defaultAdminEmail = adminEmail || "admin@selfistar.app";
    const defaultAdminPassword = adminPassword || "Admin123456";
    const defaultAdminName = adminName || "Admin User";

    // Default user credentials
    const defaultUserEmail = userEmail || "user@selfistar.app";
    const defaultUserPassword = userPassword || "User123456";
    const defaultUserName = userName || "Test User";

    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB\n");

    // ============================================
    // Create Admin Account
    // ============================================
    console.log("🔐 Setting up Admin Account...");
    let admin = await User.findOne({ email: defaultAdminEmail.toLowerCase().trim() });

    if (admin) {
      if (admin.role === "admin") {
        console.log(`   ℹ️  Admin account already exists: ${defaultAdminEmail}`);
        // Update password if provided
        if (adminPassword) {
          const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
          admin.password = hashedPassword;
          await admin.save();
          console.log(`   ✅ Password updated`);
        }
      } else {
        // Promote existing user to admin
        admin.role = "admin";
        const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
        admin.password = hashedPassword;
        admin.name = defaultAdminName;
        await admin.save();
        console.log(`   ✅ Promoted existing user to admin`);
      }
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      admin = new User({
        name: defaultAdminName,
        email: defaultAdminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: "admin",
        totalSelfies: 0,
        totalScore: 0,
        badges: [],
        isBlocked: false,
      });
      await admin.save();
      console.log(`   ✅ Admin account created`);
    }

    // ============================================
    // Create User Account
    // ============================================
    console.log("\n👤 Setting up User Account...");
    let user = await User.findOne({ email: defaultUserEmail.toLowerCase().trim() });

    if (user) {
      console.log(`   ℹ️  User account already exists: ${defaultUserEmail}`);
      // Update password if provided
      if (userPassword) {
        const hashedPassword = await bcrypt.hash(defaultUserPassword, 10);
        user.password = hashedPassword;
        await user.save();
        console.log(`   ✅ Password updated`);
      }
      // Ensure role is user (not admin)
      if (user.role !== "user") {
        user.role = "user";
        await user.save();
        console.log(`   ✅ Role set to user`);
      }
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(defaultUserPassword, 10);
      user = new User({
        name: defaultUserName,
        email: defaultUserEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: "user",
        totalSelfies: 0,
        totalScore: 0,
        badges: [],
        isBlocked: false,
      });
      await user.save();
      console.log(`   ✅ User account created`);
    }

    // ============================================
    // Display Credentials
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📝 ACCOUNT CREDENTIALS");
    console.log("=".repeat(60));
    
    console.log("\n🔐 ADMIN ACCOUNT:");
    console.log(`   Email:    ${defaultAdminEmail}`);
    console.log(`   Password: ${defaultAdminPassword}`);
    console.log(`   Name:     ${defaultAdminName}`);
    console.log(`   Role:     admin`);
    console.log(`   Login:    http://localhost:8080/login`);
    console.log(`   Redirect: http://localhost:8080/admin`);

    console.log("\n👤 USER ACCOUNT:");
    console.log(`   Email:    ${defaultUserEmail}`);
    console.log(`   Password: ${defaultUserPassword}`);
    console.log(`   Name:     ${defaultUserName}`);
    console.log(`   Role:     user`);
    console.log(`   Login:    http://localhost:8080/login`);
    console.log(`   Redirect: http://localhost:8080/dashboard`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Setup Complete!");
    console.log("=".repeat(60));
    console.log("\n⚠️  IMPORTANT: Change default passwords after first login!");
    console.log("\n💡 Both accounts use the same login page:");
    console.log("   http://localhost:8080/login");
    console.log("   (Auto-redirects based on role)\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes("duplicate key")) {
      console.error(`\n💡 Account with this email already exists.`);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Get credentials from command line arguments
// Usage: pnpm tsx scripts/setup-accounts.ts [adminEmail] [adminPassword] [adminName] [userEmail] [userPassword] [userName]
const adminEmail = process.argv[2];
const adminPassword = process.argv[3];
const adminName = process.argv[4];
const userEmail = process.argv[5];
const userPassword = process.argv[6];
const userName = process.argv[7];

setupAccounts(adminEmail, adminPassword, adminName, userEmail, userPassword, userName);
