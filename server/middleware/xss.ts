import { Request, Response, NextFunction } from "express";
import xss from "xss";

/**
 * XSS Prevention Middleware
 * Sanitizes user input to prevent XSS attacks
 */

/**
 * XSS sanitization options
 */
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true, // Remove unknown tags
  stripIgnoreTagBody: ["script"], // Remove script tags and content
  allowList: {
    // Allow only safe attributes if needed
  },
};

/**
 * Sanitize request body to prevent XSS attacks
 * Express 5 compatibility: Only sanitizes req.body (query/params are handled by express-validator)
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  try {
    // Skip sanitization for FormData (file uploads) or binary data
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/octet-stream")) {
      return next();
    }

    // Sanitize body only (query and params are read-only in Express 5 and handled by express-validator)
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !(req.body instanceof FormData)) {
      req.body = sanitizeObject(req.body);
    }

    // Note: req.query and req.params are read-only in Express 5
    // They are sanitized by express-validator's .escape() in validation middleware
    // No need to sanitize them here to avoid "Cannot set property" errors
  } catch (error) {
    // If sanitization fails, log but don't block the request
    // Most XSS protection is handled by express-validator's .escape() anyway
  }

  next();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: any): any {
  // Skip null, undefined, or non-objects (except strings)
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Sanitize strings
  if (typeof obj === "string") {
    return xss(obj, xssOptions);
  }

  // Skip non-plain objects (Date, Buffer, File, etc.)
  if (typeof obj !== "object") {
    return obj;
  }

  // Skip special objects
  if (obj instanceof Date || Buffer.isBuffer(obj) || obj instanceof FormData || obj instanceof File) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  // Handle plain objects
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        try {
          sanitized[key] = sanitizeObject(obj[key]);
        } catch (error) {
          // If sanitization fails for a property, keep original value
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize specific string value
 */
export function sanitizeString(value: string): string {
  return xss(value, xssOptions);
}
