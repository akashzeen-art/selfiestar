# Admin Account Credentials

## Default Admin Account

**Email:** `admin@selfistar.app`  
**Password:** `Admin123456`

## Login URL

**Admin Login:** http://localhost:8080/admin/login

## Important Security Notes

⚠️ **Change the default password after first login!**

## Creating Additional Admin Accounts

### Option 1: Create New Admin Account
```bash
pnpm tsx scripts/create-admin.ts
```

### Option 2: Create Admin with Custom Credentials
```bash
pnpm tsx scripts/create-admin.ts admin@example.com MySecurePassword123 "Admin Name"
```

### Option 3: Promote Existing User to Admin
```bash
pnpm tsx scripts/make-admin.ts user@example.com
```

## Resetting Admin Password

```bash
pnpm tsx scripts/reset-password.ts admin@selfistar.app NewPassword123
```

## Listing All Users

```bash
pnpm tsx scripts/list-users.ts
```

## Admin Features

Once logged in as admin, you can:
- Manage challenges (Create, Update, Delete)
- View all users
- Moderate content
- Access admin dashboard at `/admin`
