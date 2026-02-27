import mongoose from "mongoose";
import { env } from "./env";

/**
 * MongoDB Atlas Connection Manager
 * Optimized for free tier with proper error handling and reconnection logic
 */

let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

/**
 * Get MongoDB connection URI
 * Supports both standard and Atlas connection strings
 */
function getMongoUri(): string {
  const uri = env.mongoUri;

  if (!uri || uri === "mongodb://localhost:27017/selfistar") {
    throw new Error(
      "MONGODB_URI is not set. Please set it in your .env file.\n" +
        "For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority",
    );
  }

  // Validate Atlas connection string format
  if (uri.includes("mongodb+srv://")) {
    // Ensure Atlas connection string has proper parameters for free tier
    const url = new URL(uri);
    url.searchParams.set("retryWrites", "true");
    url.searchParams.set("w", "majority");
    // Optimize for free tier
    url.searchParams.set("maxPoolSize", "10"); // Free tier limit
    url.searchParams.set("serverSelectionTimeoutMS", "5000");
    url.searchParams.set("socketTimeoutMS", "45000");
    return url.toString();
  }

  return uri;
}

/**
 * Configure Mongoose for MongoDB Atlas free tier
 */
function configureMongoose() {
  // Set mongoose options optimized for free tier
  mongoose.set("strictQuery", true); // Deprecation warning fix

  // Connection event handlers
  mongoose.connection.on("connected", () => {
    isConnected = true;
    connectionAttempts = 0;
    console.log("✅ MongoDB Atlas connected successfully");
    console.log(`   Database: ${mongoose.connection.db?.databaseName || "unknown"}`);
  });

  mongoose.connection.on("error", (err) => {
    isConnected = false;
    console.error("❌ MongoDB connection error:", err.message);
    
    // Log specific error types for debugging
    if (err.message.includes("authentication failed")) {
      console.error("   → Check your username and password in MONGODB_URI");
    } else if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
      console.error("   → Check your cluster hostname in MONGODB_URI");
    } else if (err.message.includes("timeout")) {
      console.error("   → Connection timeout. Check your network or IP whitelist in Atlas");
    }
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️  MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    isConnected = true;
    console.log("🔄 MongoDB reconnected");
  });

  // Handle process termination
  process.on("SIGINT", async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

/**
 * Connect to MongoDB Atlas
 * Includes retry logic and proper error handling
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("ℹ️  MongoDB already connected");
    return;
  }

  try {
    const uri = getMongoUri();
    
    // Configure mongoose before connecting
    configureMongoose();

    console.log("🔄 Connecting to MongoDB Atlas...");
    
    const connectionOptions: mongoose.ConnectOptions = {
      // Connection pool settings (optimized for free tier)
      maxPoolSize: 10, // Free tier limit
      minPoolSize: 1,
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout
      connectTimeoutMS: 10000, // How long to wait for initial connection
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Heartbeat settings (important for free tier)
      heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
    };

    await mongoose.connect(uri, connectionOptions);
    
    isConnected = true;
    connectionAttempts = 0;
  } catch (error) {
    isConnected = false;
    connectionAttempts++;

    if (error instanceof Error) {
      // Provide helpful error messages
      if (error.message.includes("authentication failed")) {
        throw new Error(
          "MongoDB Authentication Failed\n" +
            "→ Check your username and password in MONGODB_URI\n" +
            "→ Ensure your database user has proper permissions in Atlas",
        );
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
        throw new Error(
          "MongoDB Host Not Found\n" +
            "→ Check your cluster hostname in MONGODB_URI\n" +
            "→ Verify your cluster is running in MongoDB Atlas",
        );
      } else if (error.message.includes("IP")) {
        throw new Error(
          "MongoDB IP Whitelist Error\n" +
            "→ Add your IP address to MongoDB Atlas Network Access\n" +
            "→ Or use 0.0.0.0/0 to allow all IPs (development only)",
        );
      }
    }

    // Retry logic for transient errors
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `⚠️  Connection attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS} failed. Retrying in ${RECONNECT_DELAY / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
      return connectDatabase(); // Retry
    }

    console.error("❌ Failed to connect to MongoDB after multiple attempts");
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("✅ MongoDB disconnected gracefully");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get connection status information
 */
export function getConnectionStatus() {
  return {
    isConnected: isDatabaseConnected(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    state: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  };
}

// Export mongoose connection for direct access if needed
export { mongoose };
