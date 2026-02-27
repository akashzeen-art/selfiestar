# Leaderboard API Documentation

## Overview
Optimized leaderboard API using MongoDB aggregation pipeline with low-memory caching. Ranks users based on `totalScore` and `totalSelfies`.

## Endpoints

### 1. Get Full Leaderboard
**GET** `/api/leaderboard`

Returns top 100 users ranked by totalScore, then totalSelfies.

**Authentication:** Required

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "string",
      "username": "string",
      "profileImage": null,
      "totalScore": 1250,
      "totalSelfies": 15,
      "averageScore": 83.3
    }
  ],
  "cached": false
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### 2. Get Top N Users
**GET** `/api/leaderboard/top?limit=10`

Returns top N users (max 100).

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 10, max: 100)

**Authentication:** Required

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "string",
      "username": "string",
      "profileImage": null,
      "totalScore": 1250,
      "totalSelfies": 15,
      "averageScore": 83.3
    }
  ],
  "cached": false
}
```

**Example:**
```bash
GET /api/leaderboard/top?limit=20
```

---

### 3. Get Current User's Rank
**GET** `/api/leaderboard/me`

Returns the current authenticated user's rank and stats.

**Authentication:** Required

**Response:**
```json
{
  "rank": 42,
  "entry": {
    "rank": 42,
    "userId": "string",
    "username": "string",
    "totalScore": 850,
    "totalSelfies": 10,
    "averageScore": 85.0
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - User not found in leaderboard

---

## Ranking Algorithm

Users are ranked by:
1. **Primary:** `totalScore` (descending)
2. **Secondary:** `totalSelfies` (descending)

**Average Score Calculation:**
```
averageScore = totalScore / totalSelfies (if totalSelfies > 0)
```

## Performance Optimizations

### 1. MongoDB Aggregation Pipeline
- Single database query
- Server-side sorting and ranking
- Efficient filtering (blocked users, admins)
- Limit applied at database level

### 2. Low-Memory Caching
- **Cache Size:** 1 entry (leaderboard data only)
- **TTL:** 30 seconds
- **Memory:** ~10-50KB per cached entry
- **Auto-cleanup:** Expired entries removed every minute

### 3. Cache Invalidation
Cache is automatically cleared when:
- New selfie is uploaded
- Selfie is deleted
- User stats are updated

### 4. Indexes Used
- `totalScore` (descending)
- `totalSelfies` (descending)
- `isBlocked` (for filtering)
- `role` (for filtering)

## Aggregation Pipeline Stages

```javascript
[
  // 1. Filter blocked users and admins
  { $match: { isBlocked: false, role: "user" } },
  
  // 2. Calculate average score
  { $addFields: { averageScore: ... } },
  
  // 3. Sort by totalScore, then totalSelfies
  { $sort: { totalScore: -1, totalSelfies: -1 } },
  
  // 4. Add rank numbers
  { $group: { ... } },
  
  // 5. Format response
  { $project: { ... } },
  
  // 6. Limit to top 100
  { $limit: 100 }
]
```

## Caching Strategy

### Cache Keys
- `leaderboard:all` - Full leaderboard
- `leaderboard:top:{limit}` - Top N users
- `leaderboard:rank:{userId}` - User's rank

### Cache TTL
- **Default:** 30 seconds
- **Reason:** Balance between freshness and performance
- **Auto-invalidation:** On data changes

### Memory Usage
- **Per Entry:** ~10-50KB (depends on number of users)
- **Max Entries:** 1 (configurable)
- **Total Memory:** <100KB typically

## Example Usage

### Get Full Leaderboard
```typescript
const response = await fetch('/api/leaderboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { leaderboard, cached } = await response.json();
```

### Get Top 10
```typescript
const response = await fetch('/api/leaderboard/top?limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { leaderboard } = await response.json();
```

### Get My Rank
```typescript
const response = await fetch('/api/leaderboard/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { rank, entry } = await response.json();
```

## Performance Metrics

### Without Cache
- **Query Time:** 50-200ms (depends on user count)
- **Database Load:** 1 aggregation query
- **Memory:** Minimal (query result only)

### With Cache
- **Response Time:** <1ms (in-memory lookup)
- **Database Load:** 0 queries
- **Memory:** ~10-50KB cached data

## Scalability

### Current Limits
- **Max Users in Leaderboard:** 100
- **Cache Size:** 1 entry
- **TTL:** 30 seconds

### For Larger Scale
1. **Increase Cache TTL:** 60-120 seconds
2. **Pagination:** Add `?page=1&limit=50`
3. **Redis Cache:** Replace in-memory cache
4. **Materialized View:** Pre-compute leaderboard
5. **Background Job:** Update leaderboard every minute

## Error Handling

All endpoints return standard error responses:

```json
{
  "message": "Error description"
}
```

**Common Errors:**
- `401` - Missing or invalid authentication token
- `404` - User not found (for `/me` endpoint)
- `500` - Server error
