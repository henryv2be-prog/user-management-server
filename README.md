# User Management Server

A modern, secure Linux-based cloud web server for user management with a beautiful web interface.

## Features

- 🔐 **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- 👥 **User Management**: Create, read, update, and delete users with role-based access control
- 🎨 **Modern UI**: Responsive web interface with beautiful design
- 🛡️ **Security**: Rate limiting, CORS protection, input validation, and audit logging
- 📊 **Dashboard**: User statistics and overview for administrators
- 🔑 **Role-based Access**: Admin, Moderator, and User roles with hierarchical permissions
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Linux Mint** (or any Linux distribution)

## Installation on Linux Mint

### 1. Install Node.js

```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```

### 2. Clone or Download the Project

```bash
# If you have git installed
git clone <your-repository-url>
cd user-management-server

# Or download and extract the files to a directory
mkdir user-management-server
cd user-management-server
# Copy all project files here
```

### 3. Install Dependencies

```bash
# Install all required packages
npm install
```

### 4. Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
```

Update the following important settings in `.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_PATH=./data/users.db

# JWT Configuration (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Security Configuration
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3000,http://your-domain.com

# Admin User (created on first run)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

### 5. Create Data Directory

```bash
# Create directory for database
mkdir -p data
```

### 6. Start the Server

#### Development Mode
```bash
# Start with auto-reload for development
npm run dev
```

#### Production Mode
```bash
# Start the server
npm start
```

### 7. Access the Application

Open your web browser and navigate to:
- **Web Interface**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## Default Login Credentials

On first run, the system creates a default admin user:
- **Email**: admin@example.com (or as configured in .env)
- **Password**: admin123456 (or as configured in .env)

**⚠️ IMPORTANT**: Change the default password immediately after first login!

## Production Deployment

### 1. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start server.js --name "user-management"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 2. Configure Nginx (Optional)

```bash
# Install Nginx
sudo apt install nginx

# Create configuration file
sudo nano /etc/nginx/sites-available/user-management
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/user-management /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify token

### User Management Endpoints

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/stats/overview` - Get user statistics (admin only)

### Example API Usage

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123456"}'

# Get users (with token)
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Tokens**: Secure authentication tokens
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for protection
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## File Structure

```
user-management-server/
├── public/                 # Web interface files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── app.js            # Frontend JavaScript
├── routes/                # API route handlers
│   ├── auth.js           # Authentication routes
│   └── users.js          # User management routes
├── middleware/            # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── validation.js     # Input validation
├── database/              # Database related files
│   ├── init.js           # Database initialization
│   └── models.js         # Data models
├── data/                  # Database files (created automatically)
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
├── env.example           # Environment variables example
└── README.md            # This file
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using port 3000
   sudo lsof -i :3000
   
   # Kill the process
   sudo kill -9 PID
   ```

2. **Permission denied for database**:
   ```bash
   # Fix permissions
   chmod 755 data/
   chmod 644 data/users.db
   ```

3. **Node.js version too old**:
   ```bash
   # Install Node.js from NodeSource
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Logs

```bash
# View PM2 logs
pm2 logs user-management

# View system logs
sudo journalctl -u nginx
```

## Backup and Maintenance

### Database Backup

```bash
# Create backup
cp data/users.db data/users.db.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp data/users.db.backup.YYYYMMDD_HHMMSS data/users.db
```

### Updates

```bash
# Stop the application
pm2 stop user-management

# Update dependencies
npm update

# Restart the application
pm2 start user-management
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all dependencies are properly installed
4. Verify environment configuration

## License

MIT License - feel free to use and modify as needed.
