# Railway Deployment Guide for SimplifiAccess

This guide will help you deploy your SimplifiAccess server to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **Node.js**: Version 16+ (Railway supports this automatically)

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your repository contains:
- ✅ `package.json` (already configured)
- ✅ `server.js` (your main server file)
- ✅ `railway.json` (Railway configuration)
- ✅ `Procfile` (start command)
- ✅ `.env.production` (production environment template)

### 2. Deploy to Railway

#### Option A: Deploy from GitHub/GitLab (Recommended)

1. **Connect Railway to GitHub**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your SimplifiAccess repository
   - Click "Deploy Now"

2. **Railway will automatically**:
   - Detect it's a Node.js project
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)

#### Option B: Deploy via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize and Deploy**:
   ```bash
   railway init
   railway up
   ```

### 3. Configure Environment Variables

After deployment, configure your environment variables in Railway dashboard:

1. Go to your project in Railway dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add the following variables:

#### Required Variables:
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=admin@simplifiaccess.com
ADMIN_PASSWORD=your-secure-admin-password
FRONTEND_URL=https://your-app-name.railway.app
```

#### Optional Variables (with defaults):
```
PORT=3000
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX_REQUESTS=10
```

### 4. Update Your App URL

1. After deployment, Railway will provide you with a URL like: `https://your-app-name.railway.app`
2. Update the `FRONTEND_URL` environment variable with this URL
3. Update the `ALLOWED_ORIGINS` if you have specific frontend domains

### 5. Database Considerations

**Important**: Railway's file system is ephemeral, meaning your SQLite database will be reset on each deployment.

#### Option A: Use Railway PostgreSQL (Recommended)
1. Add a PostgreSQL service in Railway
2. Update your database configuration to use PostgreSQL instead of SQLite
3. This provides persistent storage

#### Option B: External Database
- Use a service like PlanetScale, Supabase, or AWS RDS
- Update your database connection string

#### Option C: Accept Ephemeral Database
- Your database will reset on each deployment
- Good for development/testing
- Not recommended for production with real data

### 6. Custom Domain (Optional)

1. In Railway dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Update environment variables with your custom domain

### 7. Monitoring and Logs

Railway provides:
- **Real-time logs**: View in Railway dashboard
- **Metrics**: CPU, memory usage
- **Health checks**: Automatic health monitoring via `/api/health`

### 8. Automatic Deployments

Railway automatically redeploys when you push to your connected branch:
- Push to `main` branch → automatic deployment
- Configure branch settings in Railway dashboard

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version compatibility
   - Ensure all dependencies are in `package.json`
   - Check build logs in Railway dashboard

2. **Environment Variables**:
   - Verify all required variables are set
   - Check variable names match exactly (case-sensitive)

3. **Database Issues**:
   - SQLite files are ephemeral on Railway
   - Consider switching to PostgreSQL for persistence

4. **Port Issues**:
   - Railway automatically sets `PORT` environment variable
   - Your app should use `process.env.PORT` (which you already do)

5. **CORS Issues**:
   - Update `FRONTEND_URL` and `ALLOWED_ORIGINS` with your Railway URL
   - Check CORS configuration in `server.js`

### Health Check Endpoints

Your app includes several health check endpoints:
- `/api/health` - Main health check
- `/api/ping` - Simple ping
- `/api/status` - Status information
- `/ping` - Basic ping

## Security Considerations

1. **Change Default Passwords**:
   - Update `ADMIN_PASSWORD` to a strong password
   - Change `JWT_SECRET` to a secure random string

2. **Environment Variables**:
   - Never commit `.env` files to Git
   - Use Railway's environment variable system

3. **HTTPS**:
   - Railway provides HTTPS automatically
   - Update your ESP32 devices to use HTTPS URLs

## Next Steps

1. **Test Your Deployment**:
   - Visit your Railway URL
   - Test API endpoints
   - Verify health checks

2. **Update ESP32 Configuration**:
   - Update ESP32 code to use your Railway URL
   - Ensure HTTPS is enabled

3. **Set Up Monitoring**:
   - Configure alerts in Railway
   - Set up external monitoring if needed

4. **Backup Strategy**:
   - If using PostgreSQL, set up automated backups
   - Export important data regularly

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- SimplifiAccess Issues: Create an issue in your repository

---

Your SimplifiAccess server should now be live on Railway! 🚀