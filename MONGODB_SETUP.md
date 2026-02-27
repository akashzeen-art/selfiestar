# MongoDB Atlas Setup Guide

## Quick Start

1. **Create a MongoDB Atlas Account** (Free Tier)
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for a free account

2. **Create a Cluster**
   - Choose "M0 Free" tier
   - Select your preferred region
   - Wait for cluster creation (~3-5 minutes)

3. **Configure Network Access**
   - Go to "Network Access" in Atlas dashboard
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add specific IP addresses

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Set username and password (save these!)
   - Grant "Atlas Admin" role (or custom role as needed)

5. **Get Connection String**
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., `selfistar`)

6. **Add to .env file**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/selfistar?retryWrites=true&w=majority
   ```

## Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

### Example:
```
mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/selfistar?retryWrites=true&w=majority
```

## Environment Variables

Add to your `.env` file:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/selfistar?retryWrites=true&w=majority
```

## Free Tier Limitations

- **Storage**: 512 MB
- **RAM**: Shared
- **Connection Pool**: Max 10 connections (configured automatically)
- **Timeout**: 5 minutes of inactivity

## Troubleshooting

### "Authentication failed"
- Check username and password in connection string
- Verify database user exists in Atlas
- Ensure password doesn't contain special characters (URL encode if needed)

### "IP not whitelisted"
- Add your IP to Network Access in Atlas
- For development, use 0.0.0.0/0 (allows all IPs)

### "Connection timeout"
- Check your internet connection
- Verify cluster is running in Atlas dashboard
- Check firewall settings

### "ENOTFOUND" error
- Verify cluster hostname in connection string
- Check if cluster is paused (free tier auto-pauses after inactivity)

## Connection Status

The app will automatically:
- Connect on server startup
- Retry failed connections (up to 5 attempts)
- Handle reconnections gracefully
- Log connection status

Check logs for:
- ✅ MongoDB Atlas connected successfully
- ❌ MongoDB connection error (with helpful messages)
