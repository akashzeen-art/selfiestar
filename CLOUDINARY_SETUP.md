# Cloudinary Setup Guide

## Overview
The selfie upload system uses Cloudinary free tier for cloud storage. Images are automatically saved to the user's device gallery first, then uploaded to Cloudinary.

## Setup Steps

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account
3. Verify your email

### 2. Get API Credentials
1. Log in to Cloudinary Dashboard
2. Go to **Settings** → **Security**
3. Copy your credentials:
   - **Cloud Name** (e.g., `your-cloud-name`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add to Environment Variables
Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 4. Free Tier Limits
- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Upload size**: 10 MB max per file
- **Formats**: JPG, PNG, GIF, WebP, etc.

## Features

### Automatic Image Optimization
- Images are automatically optimized for web delivery
- Format conversion (WebP when supported)
- Quality optimization (`auto:good`)
- Organized in `selfistar/selfies` folder

### Metadata Encryption
- User metadata (filter, caption, challengeId) is encrypted before storage
- Uses AES-256-GCM encryption
- Stored in Cloudinary's context field

### Image Validation
- **File types**: JPG, JPEG, PNG, WebP only
- **File size**: 5 MB maximum
- **Minimum size**: 1 KB

## API Endpoints

### Upload Selfie
**POST** `/api/selfies/upload`

**Request:**
- `multipart/form-data`
- `image`: Image file (required)
- `caption`: Optional caption
- `isPublic`: Boolean (default: true)
- `filter`: Filter type (none, glow, vintage, bw, smooth)
- `challengeId`: Optional challenge ID

**Response:**
```json
{
  "message": "Selfie uploaded successfully",
  "selfie": {
    "id": "string",
    "userId": "string",
    "imageUrl": "https://res.cloudinary.com/...",
    "score": 85,
    "isPublic": true,
    "caption": "My selfie!",
    "likes": 0,
    "comments": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Frontend Flow

1. **User captures/selects image**
   - Camera capture or file selection
   - Image is processed with filters (if selected)

2. **Save to device gallery** (automatic)
   - Image is saved to device before upload
   - Filename: `selfistar-{timestamp}.jpg`

3. **Upload to Cloudinary**
   - Image is uploaded via FormData
   - Metadata is encrypted and stored
   - Secure URL is returned

4. **Store in MongoDB**
   - Cloudinary URL is stored in `Selfie` model
   - User stats are updated automatically

## Security

### Encryption
- Metadata is encrypted using AES-256-GCM
- Encryption key: `SELFIE_ENCRYPTION_KEY` (64 hex chars)
- IV and auth tag are included in encrypted payload

### Access Control
- Only authenticated users can upload
- Users can only delete their own selfies
- Admins can delete any selfie

### Image Validation
- File type validation (whitelist)
- File size limits (5 MB)
- MIME type checking

## Troubleshooting

### "Cloudinary upload failed"
- Check API credentials in `.env`
- Verify Cloudinary account is active
- Check free tier limits (bandwidth/storage)

### "Invalid file type"
- Only JPG, JPEG, PNG, WebP are allowed
- Check file extension matches MIME type

### "File size exceeds limit"
- Maximum file size: 5 MB
- Compress image before upload if needed

### Images not saving to device
- Check browser permissions for downloads
- Some browsers require user interaction for downloads
- Mobile browsers may handle downloads differently

## Production Considerations

1. **Upgrade to paid tier** if you exceed free limits
2. **CDN**: Cloudinary provides global CDN automatically
3. **Backup**: Consider backing up images to another service
4. **Monitoring**: Monitor bandwidth and storage usage
5. **Rate limiting**: Implement rate limiting for uploads
