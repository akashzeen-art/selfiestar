# Default Account Credentials

## Quick Setup

Run this command to create both admin and user accounts:

```bash
pnpm tsx scripts/setup-accounts.ts
```

This will create:
- **Admin Account** with default credentials
- **User Account** with default credentials

---

## Default Credentials

### 🔐 Admin Account

**Email:** `admin@selfistar.app`  
**Password:** `Admin123456`  
**Role:** `admin`  
**Login URL:** http://localhost:8080/login  
**Redirects to:** http://localhost:8080/admin

### 👤 User Account

**Email:** `user@selfistar.app`  
**Password:** `User123456`  
**Role:** `user`  
**Login URL:** http://localhost:8080/login  
**Redirects to:** http://localhost:8080/dashboard

---

## Custom Credentials

You can create accounts with custom credentials:

```bash
pnpm tsx scripts/setup-accounts.ts \
  admin@example.com AdminPass123 "Admin Name" \
  user@example.com UserPass123 "User Name"
```

**Arguments:**
1. Admin Email
2. Admin Password
3. Admin Name (optional)
4. User Email
5. User Password
6. User Name (optional)

---

## Single Login System

Both admin and user accounts use the **same login page**:

**Login URL:** http://localhost:8080/login

After login, users are automatically redirected based on their role:
- **Admin** → `/admin` (Admin Dashboard)
- **User** → `/dashboard` (User Dashboard)

---

## Security Notes

⚠️ **IMPORTANT:** Change the default passwords after first login!

### Change Admin Password

```bash
pnpm tsx scripts/reset-password.ts admin@selfistar.app NewPassword123
```

### Change User Password

```bash
pnpm tsx scripts/reset-password.ts user@selfistar.app NewPassword123
```

---

## Other Useful Scripts

### List All Users

```bash
pnpm tsx scripts/list-users.ts
```

### Create Admin Only

```bash
pnpm tsx scripts/create-admin.ts
```

### Promote User to Admin

```bash
pnpm tsx scripts/make-admin.ts user@example.com
```

---

## Account Features

### Admin Account Can:
- Access admin dashboard at `/admin`
- Manage challenges (Create, Update, Delete)
- View and manage all users
- Block/unblock users
- Promote users to admin
- View all selfies and content

### User Account Can:
- Access user dashboard at `/dashboard`
- View active challenges
- Upload selfies
- View leaderboard
- Participate in challenges

---

## Troubleshooting

### Account Already Exists

If an account already exists, the script will:
- **Admin:** Update password if provided, or skip if unchanged
- **User:** Update password if provided, or skip if unchanged

### Can't Login

1. **Check MongoDB connection:**
   ```bash
   # Verify .env file has correct MONGODB_URI
   ```

2. **Verify account exists:**
   ```bash
   pnpm tsx scripts/list-users.ts
   ```

3. **Reset password:**
   ```bash
   pnpm tsx scripts/reset-password.ts <email> <new-password>
   ```

### Wrong Redirect After Login

- **Admin redirected to `/dashboard`:** User role is not set to "admin"
  - Fix: `pnpm tsx scripts/make-admin.ts <email>`
  
- **User redirected to `/admin`:** User role is set to "admin" instead of "user"
  - Fix: Update role in MongoDB or create new user account

---

## Quick Reference

| Account | Email | Password | Role | Redirect |
|---------|-------|----------|------|----------|
| Admin | `admin@selfistar.app` | `Admin123456` | `admin` | `/admin` |
| User | `user@selfistar.app` | `User123456` | `user` | `/dashboard` |
