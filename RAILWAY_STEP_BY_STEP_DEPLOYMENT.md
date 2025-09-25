# Railway Deployment Step-by-Step Guide for SimplifiAccess v3.0.0

## Prerequisites
- A Railway account (sign up at https://railway.app if you don't have one)
- The code has already been pushed to your GitHub repository

## Step 1: Generate Your Security Secrets

First, let's generate the required secrets. Open a terminal on your computer and run:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output (it will look like `JWT_SECRET=abc123...`). Save this somewhere safe - you'll need it soon.

## Step 2: Create a New Railway Project (If you don't have one)

1. Go to https://railway.app and log in
2. Click the **"New Project"** button
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if you haven't already
5. Search for and select your repository: `user-management-server`
6. Railway will automatically detect it's a Node.js app

## Step 3: Configure Environment Variables (CRITICAL!)

This is the most important step. Your app WILL NOT START without these variables.

1. In your Railway project, click on your service (it might be called `user-management-server`)
2. Click on the **"Variables"** tab
3. Click **"RAW Editor"** button (easier to add multiple variables)
4. Copy and paste this template, replacing the placeholder values:

```env
# REQUIRED - Your app won't start without these
JWT_SECRET=paste-your-generated-secret-here
NODE_ENV=production
PORT=${{PORT}}
DB_PATH=/app/database/users.db

# Admin Account (CHANGE THESE!)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=changeThisPassword123!
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User

# Your Domain (update these)
FRONTEND_URL=https://your-frontend-domain.com
RENDER_EXTERNAL_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Security Settings
BCRYPT_ROUNDS=12
SESSION_SECRET=generate-another-secret-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Database Pool
DB_POOL_MAX_CONNECTIONS=10
DB_POOL_IDLE_TIMEOUT=60000
```

5. Replace the placeholder values:
   - `paste-your-generated-secret-here` - Use the JWT_SECRET you generated in Step 1
   - `admin@yourdomain.com` - Your admin email
   - `changeThisPassword123!` - A secure admin password
   - `https://your-frontend-domain.com` - Your frontend URL (or use * for testing)
   - `generate-another-secret-here` - Generate another secret using the same command

6. Click **"Update Variables"**

## Step 4: Deploy the Application

1. After setting the variables, Railway should automatically start deploying
2. Click on the **"Deployments"** tab to watch the progress
3. Look for these key messages in the logs:
   ```
   ✅ Database initialization completed
   🚀 Server running on port 3000
   ```

4. If you see an error about JWT_SECRET, double-check your environment variables

## Step 5: Generate a Public Domain

1. In your Railway service, go to the **"Settings"** tab
2. Under "Networking", click **"Generate Domain"**
3. Railway will give you a URL like: `your-app-name.up.railway.app`
4. Copy this URL - this is your API endpoint

## Step 6: Verify Your Deployment

1. Open your browser and go to:
   ```
   https://your-app-name.up.railway.app/api/health
   ```

2. You should see something like:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "uptime": 30.5,
     "memory": {...},
     "version": "v18.17.0"
   }
   ```

3. If you get an error or the page doesn't load, check the deployment logs

## Step 7: Test the Admin Login

1. Go to: `https://your-app-name.up.railway.app`
2. You should see the SimplifiAccess login page
3. Log in with:
   - Email: The ADMIN_EMAIL you set
   - Password: The ADMIN_PASSWORD you set

4. **IMPORTANT**: Change the admin password immediately after first login!

## Step 8: Configure Your ESP32 Devices

Update your ESP32 devices with the new server URL:
1. The server URL is: `https://your-app-name.up.railway.app`
2. Update the ESP32 configuration through its web interface

## Step 9: Update Mobile App Configuration

If using the mobile app:
1. Open the app
2. Go to Settings
3. Update the server URL to: `https://your-app-name.up.railway.app`

## Troubleshooting Common Issues

### "JWT_SECRET must be set and at least 32 characters long"
- You forgot to set the JWT_SECRET environment variable
- Or the secret is too short (needs 32+ characters)

### "Cannot connect to database"
- Check that DB_PATH is set to `/app/database/users.db`
- The database will be created automatically on first run

### "Server not responding"
- Check the Deployments tab for errors
- Verify all required environment variables are set
- Make sure the deployment status shows "Active"

### "CORS error" from frontend
- Update FRONTEND_URL to match your actual frontend domain
- Or set it to * for testing (not recommended for production)

## Quick Checklist

- [ ] Generated a 64-character JWT_SECRET
- [ ] Set all required environment variables in Railway
- [ ] Deployment shows as "Active" 
- [ ] Health check endpoint responds
- [ ] Can log in with admin credentials
- [ ] Changed default admin password
- [ ] Updated ESP32 devices with new URL
- [ ] Updated mobile app with new URL

## Need More Help?

1. Check the deployment logs in Railway (Deployments tab)
2. Look for error messages in red
3. Verify environment variables are set correctly
4. The health check endpoint (`/api/health`) is your friend

## Security Reminder

After deployment:
1. Change the default admin password immediately
2. Keep your JWT_SECRET safe and never share it
3. Regularly update your dependencies
4. Monitor your application logs for suspicious activity

That's it! Your SimplifiAccess v3.0.0 should now be running on Railway with all security improvements.