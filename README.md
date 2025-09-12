# SimplifiAccess

**Smart Access Control System with ESP32 Integration**

SimplifiAccess is a comprehensive, IoT-based access control system that simplifies secure door management through ESP32 controllers. Built for modern facilities requiring reliable, scalable, and user-friendly access control solutions.

## 🚀 Key Features

- **🔐 Smart Access Control**: ESP32-powered door controllers with real-time monitoring
- **👥 Advanced User Management**: Role-based access control with admin and user roles
- **🚪 Door Management**: Real-time door status monitoring, lock control, and position sensing
- **🛡️ Access Groups**: Flexible permission management for different areas and time schedules
- **📱 Modern Web Interface**: Responsive, intuitive dashboard for all management tasks
- **🔍 ESP32 Discovery**: Automatic network scanning and device configuration
- **📊 Real-time Monitoring**: Live door status, access events, and system health
- **🔒 Enterprise Security**: JWT authentication, password hashing, rate limiting, and audit logs
- **⚡ Production Ready**: PM2 process management, Nginx configuration, and scalable architecture

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm
- Linux environment
- ESP32 devices (for door controllers)

### Installation

1. **Clone the SimplifiAccess repository:**
   ```bash
   git clone https://github.com/simplifiaccess/simplifiaccess.git
   cd simplifiaccess
   ```

2. **Run the automated installer:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Access the SimplifiAccess Dashboard:**
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

## 📁 Project Structure

```
simplifiaccess/
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
│   ├── index.html       # SimplifiAccess Dashboard
│   ├── app.js           # Frontend JavaScript
│   └── styles.css       # Modern UI styling
├── ESP32_Door_Controller/
│   └── ESP32_Door_Controller.ino  # ESP32 firmware
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
├── ecosystem.config.js  # PM2 configuration
├── install.sh           # Automated installer
└── env.example          # Environment variables template
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile

### User Management (Admin only)
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Door Management
- `GET /api/doors` - Get all doors
- `POST /api/doors` - Create new door
- `PUT /api/doors/:id` - Update door
- `DELETE /api/doors/:id` - Delete door
- `POST /api/doors/:id/control` - Control door lock

### Access Groups
- `GET /api/access-groups` - Get all access groups
- `POST /api/access-groups` - Create access group
- `PUT /api/access-groups/:id` - Update access group
- `DELETE /api/access-groups/:id` - Delete access group

### ESP32 Discovery
- `POST /api/esp32/scan` - Scan for ESP32 devices
- `GET /api/esp32/discovered` - Get discovered devices

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

## 🏢 Use Cases

- **Office Buildings**: Secure access to different floors and departments
- **Educational Institutions**: Campus-wide access control for students and staff
- **Healthcare Facilities**: Restricted access to sensitive areas
- **Manufacturing Plants**: Zone-based access control for safety and security
- **Residential Complexes**: Smart building access management

## 🤝 Contributing

We welcome contributions to SimplifiAccess! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

SimplifiAccess is open source and available under the [MIT License](LICENSE).

## 🆘 Support

- 📧 **Email**: support@simplifiaccess.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/simplifiaccess/simplifiaccess/issues)
- 📖 **Documentation**: [docs.simplifiaccess.com](https://docs.simplifiaccess.com)
- 💬 **Community**: [Discord Server](https://discord.gg/simplifiaccess)

---

<div align="center">
  <strong>SimplifiAccess - Simplifying Smart Access Control</strong><br>
  Made with ❤️ by the SimplifiAccess Team
</div>
