/**
 * Create Admin Account Script
 * 
 * This script creates a new admin user in MongoDB with default credentials.
 * 
 * Usage:
 *   pnpm tsx scripts/create-admin.ts
 * 
 * Or with custom credentials:
 *   pnpm tsx scripts/create-admin.ts admin@selfistar.app Admin123456
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../server/models/User";
import { connectDatabase } from "../server/config/db";

async function createAdmin(email?: string, password?: string, name?: string) {
  try {
    // Default admin credentials
    const adminEmail = email || "admin@selfistar.app";
    const adminPassword = password || "Admin123456";
    const adminName = name || "Admin User";

    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    
    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log(`ℹ️  Admin account already exists with email "${adminEmail}"`);
        console.log(`   To reset password, use: pnpm tsx scripts/reset-password.ts ${adminEmail} <new-password>`);
        process.exit(0);
      } else {
        // User exists but is not admin, promote them
        existingAdmin.role = "admin";
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        console.log(`✅ Promoted existing user to admin and updated password`);
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   Role: ${existingAdmin.role}`);
        console.log(`\n📝 Admin Credentials:`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        process.exit(0);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = new User({
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin",
      totalSelfies: 0,
      totalScore: 0,
      badges: [],
      isBlocked: false,
    });

    await admin.save();

    console.log(`✅ Admin account created successfully!`);
    console.log(`\n📝 Admin Credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`\n🔐 Login at: http://localhost:8080/admin/login`);
    console.log(`\n⚠️  IMPORTANT: Change the default password after first login!`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes("duplicate key")) {
      console.error(`\n💡 Admin with this email already exists. Use make-admin.ts to promote an existing user.`);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Get credentials from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

createAdmin(email, password, name);
