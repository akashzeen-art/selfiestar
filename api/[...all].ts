import { createServer } from "../server";

// Create a single Express app instance to be reused across invocations
const app = createServer();

// Vercel serverless function handler
export default function handler(req: any, res: any) {
  return app(req, res);
}

