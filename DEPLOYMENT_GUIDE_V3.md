# SimplifiAccess v3.0.0 Deployment Guide

## 🚨 CRITICAL: Required Environment Variables

Before deploying v3.0.0, you MUST set these environment variables in Railway:

### 1. Generate a Secure JWT Secret

Run this command to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Required Environment Variables

```env
# CRITICAL - Must be set before deployment
JWT_SECRET=<your-generated-64-character-secret>
NODE_ENV=production

# Database
DB_PATH=/app/database/users.db

# Admin credentials (change these!)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-password>
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User

# Frontend URL (update with your domain)
FRONTEND_URL=https://app.yourdomain.com

# Railway-specific
PORT=3000
RENDER_EXTERNAL_URL=https://your-app.up.railway.app
```

### 3. Optional but Recommended

```env
# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=<another-generated-secret>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Database Pool
DB_POOL_MAX_CONNECTIONS=10
DB_POOL_IDLE_TIMEOUT=60000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 🚀 Deployment Steps

1. **Set Environment Variables in Railway**
   - Go to your Railway project
   - Navigate to Variables tab
   - Add all required environment variables
   - **IMPORTANT**: JWT_SECRET must be at least 32 characters

2. **Deploy the Code**
   - The push to master branch should trigger automatic deployment
   - Monitor the deployment logs for any errors

3. **Verify Deployment**
   - Check the deployment logs for "Server running on port 3000"
   - Visit `https://your-app.up.railway.app/api/health`
   - Should return: `{"status":"healthy","timestamp":"...","uptime":...}`

4. **Post-Deployment Tasks**
   - Change the default admin password immediately
   - Test HTTPS enforcement is working
   - Verify ESP32 devices can connect

## ⚠️ Breaking Changes from v2

1. **JWT_SECRET is now required** - The app will NOT start without it
2. **Database queries are now async** - May affect custom scripts
3. **Error response format changed** - Update any client code that parses errors

## 🔍 Troubleshooting

### App Won't Start
- Check if JWT_SECRET is set and at least 32 characters
- Verify NODE_ENV is set to "production"
- Check deployment logs for specific error messages

### Database Errors
- The database will be automatically migrated on first run
- Indexes will be created for better performance
- If issues persist, check DB_PATH is writable

### ESP32 Connection Issues
- Verify the heartbeat endpoint is accessible
- Check that input validation isn't rejecting valid data
- Monitor logs for validation errors

### Mobile App Can't Connect
- Update the mobile app with the new server URL configuration
- Ensure CORS settings include your mobile app domain
- Check that FRONTEND_URL is properly set

## 📊 Monitoring

Monitor these endpoints for health:
- `/api/health` - Overall system health
- `/api/ping` - Simple availability check
- `/api/status` - Detailed status information

## 🔒 Security Notes

1. The new version enforces HTTPS in production
2. All ESP32 inputs are now validated
3. Database connections use pooling for better security
4. Access control now uses mutex to prevent race conditions

## 📞 Support

If you encounter issues:
1. Check the deployment logs first
2. Verify all required environment variables are set
3. Ensure the database has proper permissions
4. Review the breaking changes section

Remember to update your monitoring and alerting to account for the new error format!