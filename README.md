# User Management Server

A Linux-based cloud web server for user management with a complete web interface.

## Features

- **User Authentication**: Secure login with JWT tokens
- **User Management**: Create, read, update, and delete users
- **Role-Based Access Control**: Admin, moderator, and user roles
- **Password Management**: Secure password hashing with bcrypt
- **Web Interface**: Modern, responsive web UI
- **Database**: SQLite database with proper schema
- **Security**: Rate limiting, CORS, input validation
- **Production Ready**: PM2 process management, Nginx configuration

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm
- Linux environment

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/henryv2be-prog/user-management-server.git
   cd user-management-server
   ```

2. **Run the automated installer:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Access the web interface:**
   - Open your browser to `http://localhost:3000`
   - Login with default admin credentials:
     - Email: `admin@example.com`
     - Password: `admin123456`

### Manual Installation

If you prefer manual installation:

```bash
# Install dependencies
npm install

# Set up environment
cp env.example .env

# Initialize database
node database/init.js

# Start the server
npm start
```

## Project Structure

```
user-management-server/
├── database/
│   ├── init.js          # Database initialization
│   └── models.js        # User model and database operations
├── middleware/
│   ├── auth.js          # Authentication middleware
│   └── validation.js    # Input validation middleware
├── routes/
│   ├── auth.js          # Authentication routes
│   └── users.js         # User management routes
├── public/
│   ├── index.html       # Web interface
│   ├── app.js           # Frontend JavaScript
│   └── styles.css       # Styling
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
├── ecosystem.config.js  # PM2 configuration
├── install.sh           # Automated installer
└── env.example          # Environment variables template
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile

### User Management (Admin only)
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Health Check
- `GET /api/health` - Server health status

## Environment Variables

Create a `.env` file based on `env.example`:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./database/users.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Nginx (Optional)

Create an Nginx configuration file:

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

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Sanitizes and validates all inputs
- **CORS Protection**: Configurable cross-origin resource sharing
- **Role-Based Access**: Hierarchical permission system

## Default Admin Account

After first installation, you can login with:
- **Email**: `admin@example.com`
- **Password**: `admin123456`

**⚠️ Important**: Change the default password immediately after first login!

## Troubleshooting

### Common Issues

1. **Database not found**: Run `node database/init.js` to initialize
2. **Permission denied**: Make sure `install.sh` is executable (`chmod +x install.sh`)
3. **Port already in use**: Change the PORT in `.env` file
4. **Login not working**: Check if database was initialized with default admin user

### Logs

- **Development**: Logs are displayed in the console
- **Production**: Use `pm2 logs` to view application logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please create an issue in the GitHub repository.
