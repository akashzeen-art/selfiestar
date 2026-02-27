# Admin Access Guide

## How to Access Admin Page

The admin dashboard is available at:
```
http://localhost:8080/admin
```

## Requirements

1. **You must be logged in** - You need a valid JWT token
2. **You must have admin role** - Your user account must have `role: "admin"` in MongoDB

## How to Make a User Admin

### Method 1: Using the Script (Recommended)

1. **Make sure you have a user account** - Register a new user or use an existing one
2. **Run the make-admin script:**

```bash
pnpm tsx scripts/make-admin.ts <your-email>
```

**Example:**
```bash
pnpm tsx scripts/make-admin.ts admin@example.com
```

The script will:
- Connect to MongoDB
- Find the user by email
- Update their role to `admin`
- Display confirmation

### Method 2: Using MongoDB Compass or MongoDB Shell

1. **Connect to your MongoDB Atlas cluster**
2. **Navigate to your database** (default: `selfistar`)
3. **Open the `users` collection**
4. **Find your user document** by email
5. **Update the `role` field** from `"user"` to `"admin"`

**MongoDB Shell Example:**
```javascript
use selfistar
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

**MongoDB Compass:**
- Find the user document
- Click "Edit Document"
- Change `role` from `"user"` to `"admin"`
- Click "Update"

## Accessing Admin Dashboard

1. **Login** with your admin account at `/login`
2. **Navigate to** `/admin` or click the "Admin" link in the navigation (visible only for admin users)
3. **You should see** the admin dashboard with:
   - Summary statistics (users, selfies, challenges, flagged content)
   - User management
   - Challenge management (create, update, delete)
   - Content moderation tools

## Admin Features

### Challenge Management
- **Create Challenge**: Add new challenges with title, description, theme, dates
- **Update Challenge**: Modify existing challenges
- **Delete Challenge**: Remove challenges
- **View All Challenges**: See all challenges (active and expired)

### User Management
- **View All Users**: See all registered users
- **Block/Unblock Users**: Manage user access
- **View User Stats**: See user statistics

### Content Moderation
- **View Flagged Content**: See reported selfies
- **Moderate Content**: Approve or remove content

## Security Notes

- Admin routes are protected by `requireAdmin` middleware
- Only users with `role: "admin"` can access admin endpoints
- Admin API endpoints are prefixed with `/api/admin/*`
- All admin actions require authentication

## Troubleshooting

### "Admin access required" message
- **Check your role**: Make sure your user has `role: "admin"` in MongoDB
- **Re-login**: Logout and login again to refresh your JWT token
- **Check token**: Your JWT token contains your role, so you need to login again after changing role

### "403 Forbidden" error
- Your user account doesn't have admin role
- Run the make-admin script or update MongoDB directly
- Logout and login again to get a new JWT token with updated role

### Admin link not showing in navigation
- Check that you're logged in
- Check that your user has `role: "admin"`
- The admin link only appears for admin users (see `AppLayout.tsx`)
