# Admin Challenge Management API

## Overview
Admin-only APIs for managing challenges with date-based auto-expiration system.

**Base URL:** `/api/admin/challenges`

**Authentication:** All endpoints require:
- `Authorization: Bearer <admin_jwt_token>`
- User must have `role: "admin"`

---

## Endpoints

### 1. Get All Challenges (Admin)
**GET** `/api/admin/challenges`

Get all challenges including expired and upcoming ones.

**Response:**
```json
{
  "challenges": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "theme": "string",
      "banner": "string | null",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.000Z",
      "createdBy": {
        "name": "string",
        "email": "string"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "participants": 42,
      "isActive": true,
      "isExpired": false,
      "isUpcoming": false
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not admin)

---

### 2. Create Challenge
**POST** `/api/admin/challenges`

Create a new challenge.

**Request Body:**
```json
{
  "title": "Summer Selfie Challenge",
  "description": "Show us your best summer vibes!",
  "theme": "Summer",
  "startDate": "2024-06-01T00:00:00.000Z",
  "endDate": "2024-06-30T23:59:59.000Z",
  "banner": "https://example.com/banner.jpg" // optional
}
```

**Validation Rules:**
- `title`: 3-120 characters
- `description`: 10-1000 characters
- `theme`: 2-80 characters
- `startDate`: Valid ISO datetime string
- `endDate`: Valid ISO datetime string, must be after `startDate`
- `banner`: Valid URL (optional)

**Response:**
```json
{
  "message": "Challenge created successfully",
  "challenge": {
    "id": "string",
    "title": "string",
    "description": "string",
    "theme": "string",
    "banner": "string | null",
    "startDate": "2024-06-01T00:00:00.000Z",
    "endDate": "2024-06-30T23:59:59.000Z",
    "createdBy": {
      "name": "string",
      "email": "string"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "isActive": true
  }
}
```

**Status Codes:**
- `201` - Challenge created
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (not admin)

---

### 3. Update Challenge
**PUT** `/api/admin/challenges/:id`

Update an existing challenge (partial update supported).

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "theme": "Updated Theme",
  "startDate": "2024-06-01T00:00:00.000Z",
  "endDate": "2024-07-31T23:59:59.000Z",
  "banner": "https://example.com/new-banner.jpg"
}
```

**Response:**
```json
{
  "message": "Challenge updated successfully",
  "challenge": {
    "id": "string",
    "title": "string",
    "description": "string",
    "theme": "string",
    "banner": "string | null",
    "startDate": "2024-06-01T00:00:00.000Z",
    "endDate": "2024-07-31T23:59:59.000Z",
    "createdBy": {
      "name": "string",
      "email": "string"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z",
    "isActive": true
  }
}
```

**Status Codes:**
- `200` - Challenge updated
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Challenge not found

---

### 4. Delete Challenge
**DELETE** `/api/admin/challenges/:id`

Delete a challenge.

**Response:**
```json
{
  "message": "Challenge deleted successfully",
  "deletedId": "string"
}
```

**Status Codes:**
- `200` - Challenge deleted
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Challenge not found

---

## Date-Based Auto-Expiration System

Challenges automatically expire based on their `endDate`:

- **Active Challenge:** `startDate <= now <= endDate`
- **Expired Challenge:** `endDate < now`
- **Upcoming Challenge:** `startDate > now`

The system uses MongoDB queries to filter challenges by date ranges. The `isActive`, `isExpired`, and `isUpcoming` fields are computed based on the current date.

---

## Public Challenge Endpoint

Regular users can view active challenges via:

**GET** `/api/challenges` (requires authentication)

This endpoint only returns challenges where `isActive === true`, sorted by `endDate` (ending soon first).

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "message": "Error description",
  "error": "Detailed error information" // optional
}
```

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not admin role)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Example Usage

### Create Challenge
```bash
curl -X POST http://localhost:8082/api/admin/challenges \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Winter Wonderland",
    "description": "Share your winter selfies!",
    "theme": "Winter",
    "startDate": "2024-12-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z"
  }'
```

### Get All Challenges
```bash
curl -X GET http://localhost:8082/api/admin/challenges \
  -H "Authorization: Bearer <admin_token>"
```

### Update Challenge
```bash
curl -X PUT http://localhost:8082/api/admin/challenges/<challenge_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Winter Challenge"
  }'
```

### Delete Challenge
```bash
curl -X DELETE http://localhost:8082/api/admin/challenges/<challenge_id> \
  -H "Authorization: Bearer <admin_token>"
```
