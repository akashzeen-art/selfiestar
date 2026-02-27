/**
 * Netlify Serverless Function Wrapper
 * Wraps Express app for Netlify Functions deployment
 */

import serverless from "serverless-http";
import { createServer } from "./server/index.js";

// Create Express app
const app = createServer();

// Export as serverless function
export const handler = serverless(app, {
  binary: ["image/*", "application/octet-stream"],
});
