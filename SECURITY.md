# Security Implementation

## Overview
Comprehensive security setup with Helmet, CORS, rate limiting, input validation, XSS prevention, and signed URLs. Optimized for Netlify + Node deployment.

## Security Features

### 1. **Helmet - Security Headers**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy

**Production CSP:**
```
defaultSrc: 'self'
styleSrc: 'self' 'unsafe-inline' fonts.googleapis.com
imgSrc: 'self' data: blob: res.cloudinary.com
connectSrc: 'self' *.cloudinary.com
```

### 2. **CORS - Cross-Origin Resource Sharing**
- Configurable allowed origins
- Credentials support
- Method restrictions (GET, POST, PUT, DELETE, PATCH, OPTIONS)
- Header restrictions
- 24-hour preflight cache

**Configuration:**
```typescript
// Development: Allow all origins
// Production: Specific origins from CORS_ORIGIN env var
```

### 3. **Rate Limiting**
Different limits for different endpoints:

- **General API:** 100 req/min (prod), 2000 req/min (dev)
- **Authentication:** 5 attempts/15 min (prod), 20 attempts/15 min (dev)
- **Upload:** 20 uploads/hour (prod), 100 uploads/hour (dev)
- **Admin:** 30 req/min (prod), 100 req/min (dev)

**Features:**
- Skip successful login attempts
- Standard headers (RateLimit-*)
- Custom error messages

### 4. **Input Validation (express-validator)**
Comprehensive validation for all endpoints:

**Auth:**
- Email: Valid email format, normalized, lowercase
- Username: 3-30 chars, alphanumeric + underscore
- Password: Min 8 chars, uppercase, lowercase, number

**Challenges:**
- Title: 3-120 chars
- Description: 10-1000 chars
- Theme: 2-80 chars
- Dates: ISO 8601 format, endDate > startDate
- Banner: Valid URL (optional)

**Selfies:**
- Caption: Max 500 chars
- Filter: Enum validation
- ChallengeId: MongoDB ObjectId validation

**Comments:**
- Text: 1-500 chars

### 5. **XSS Prevention**
- Input sanitization middleware
- Strips HTML tags
- Removes script tags and content
- Sanitizes body, query, and params
- Recursive object sanitization

**Implementation:**
```typescript
// Sanitizes all user input automatically
app.use(sanitizeInput);
```

### 6. **MongoDB Injection Prevention**
- `express-mongo-sanitize` middleware
- Removes `$` and `.` from user input
- Prevents NoSQL injection attacks

### 7. **Signed Image URLs (Cloudinary)**
- Cloudinary secure URLs (HTTPS)
- Optional signed URLs with expiration
- Metadata encryption
- Access control via Cloudinary settings

**Function:**
```typescript
generateSignedUrl(publicId, expiresIn = 3600) // 1 hour default
```

### 8. **Direct Folder Access Prevention**
Blocks access to sensitive paths:
- `/.env`
- `/.git`
- `/node_modules`
- `/server`
- `/storage`
- `/config`

Returns 403 Forbidden for blocked paths.

## Netlify Deployment

### Configuration Files

**`netlify.toml`:**
- Build configuration
- SPA routing redirects
- Security headers
- API proxy setup
- Sensitive file blocking

**`serverless.js`:**
- Express app wrapper for Netlify Functions
- Binary support for images
- Serverless HTTP handler

### Deployment Steps

1. **Build:**
   ```bash
   pnpm build
   ```

2. **Deploy to Netlify:**
   - Connect GitHub repository
   - Set build command: `pnpm build`
   - Set publish directory: `dist/spa`
   - Add environment variables

3. **Environment Variables:**
   ```env
   MONGODB_URI=...
   JWT_SECRET=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   CORS_ORIGIN=https://yourdomain.com
   NODE_ENV=production
   ```

### Netlify Functions (Optional)

If using Netlify Functions instead of Express server:

1. Create `netlify/functions/server.js`:
   ```javascript
   import { handler } from "../../serverless.js";
   export { handler };
   ```

2. Update `netlify.toml` redirects to use functions

## Security Headers

All responses include:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

## Rate Limiting Details

### Authentication Endpoints
- **Window:** 15 minutes
- **Limit:** 5 attempts (prod), 20 (dev)
- **Skip Successful:** Yes (doesn't count successful logins)

### Upload Endpoints
- **Window:** 1 hour
- **Limit:** 20 uploads (prod), 100 (dev)
- **Purpose:** Prevent abuse and storage quota exhaustion

### Admin Endpoints
- **Window:** 1 minute
- **Limit:** 30 requests (prod), 100 (dev)
- **Purpose:** Protect admin operations

## Input Validation Examples

### Login
```typescript
POST /api/auth/login
{
  "email": "user@example.com", // Validated: email format, normalized
  "password": "Password123"     // Validated: required, escaped
}
```

### Register
```typescript
POST /api/auth/register
{
  "email": "user@example.com",    // Validated: email, normalized
  "username": "username123",      // Validated: 3-30 chars, alphanumeric
  "password": "Password123"       // Validated: min 8, uppercase, lowercase, number
}
```

### Create Challenge
```typescript
POST /api/admin/challenges
{
  "title": "Summer Challenge",           // Validated: 3-120 chars, escaped
  "description": "Description...",      // Validated: 10-1000 chars, escaped
  "theme": "Summer",                    // Validated: 2-80 chars, escaped
  "startDate": "2024-06-01T00:00:00Z",  // Validated: ISO 8601
  "endDate": "2024-06-30T23:59:59Z"     // Validated: ISO 8601, > startDate
}
```

## XSS Prevention

### Automatic Sanitization
All user input is automatically sanitized:
- Request body
- Query parameters
- Route parameters

### Sanitization Rules
- No HTML tags allowed
- Script tags removed
- Unknown tags stripped
- Recursive object sanitization

## MongoDB Injection Prevention

### Automatic Protection
- Removes `$` operators
- Removes `.` operators
- Prevents NoSQL injection
- Applied to all requests

## Cloudinary Security

### Secure URLs
- All URLs use HTTPS
- Cloudinary secure URLs by default
- Optional signed URLs with expiration

### Access Control
- Configured in Cloudinary dashboard
- IP whitelisting
- Signed URL support
- Metadata encryption

## Testing Security

### Rate Limiting Test
```bash
# Should fail after 5 attempts
for i in {1..6}; do
  curl -X POST http://localhost:8082/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### XSS Test
```bash
# Should be sanitized
curl -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"<script>alert(1)</script>","password":"Test1234"}'
```

### Validation Test
```bash
# Should fail validation
curl -X POST http://localhost:8082/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","username":"ab","password":"weak"}'
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` with specific domains
- [ ] Set strong `JWT_SECRET`
- [ ] Set strong `SELFIE_ENCRYPTION_KEY`
- [ ] Configure Cloudinary security settings
- [ ] Enable HSTS in production
- [ ] Review rate limits for your traffic
- [ ] Test all security middleware
- [ ] Monitor security headers
- [ ] Set up error logging
- [ ] Configure Netlify environment variables

## Security Best Practices

1. **Never expose secrets** in client-side code
2. **Use HTTPS** in production (required for camera)
3. **Rotate secrets** regularly
4. **Monitor rate limits** for abuse
5. **Log security events**
6. **Keep dependencies updated**
7. **Use signed URLs** for sensitive media
8. **Validate all input** server-side
9. **Sanitize all output** to prevent XSS
10. **Use parameterized queries** (Mongoose does this)
