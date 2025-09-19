# SimplifiAccess

**Smart Access Control System with ESP32 Integration**

SimplifiAccess is a comprehensive, IoT-based access control system that simplifies secure door management through ESP32 controllers. Built for modern facilities requiring reliable, scalable, and user-friendly access control solutions.

## 🚀 Key Features

- **🔐 Smart Access Control**: ESP32-powered door controllers with real-time monitoring
- **👥 Advanced User Management**: Role-based access control with admin and user roles
- **🚪 Door Management**: Real-time door status monitoring, lock control, and position sensing
- **🛡️ Access Groups**: Flexible permission management for different areas and time schedules
- **📱 Modern Web Interface**: Responsive, intuitive dashboard for all management tasks
- **📱 Mobile App**: React Native mobile app for QR code scanning and access requests
- **🔍 ESP32 Discovery**: Automatic network scanning and device configuration
- **📊 Real-time Monitoring**: Live door status, access events, and system health
- **🔒 Enterprise Security**: JWT authentication, password hashing, rate limiting, and audit logs
- **⚡ Production Ready**: PM2 process management, Nginx configuration, and scalable architecture

## 🏗️ Architecture

```
SimplifiAccess/
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication & validation
│   ├── database/          # SQLite database models
│   └── utils/             # Utilities (error handling, security, cache)
├── public/                # Web frontend
│   ├── css/              # Optimized CSS
│   ├── js/               # Modular JavaScript
│   └── index.html        # Main dashboard
├── mobile-app/            # React Native mobile app
│   ├── src/              # Source code
│   └── android/          # Android build files
└── ESP32_Door_Controller/ # Arduino firmware
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm
- Linux environment
- ESP32 devices (for door controllers)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/simplifiaccess/simplifiaccess.git
   cd simplifiaccess
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database:**
   ```bash
   node database/init.js
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Access the dashboard:**
   - Open your browser to `http://localhost:3000`
   - Login with default admin credentials:
     - Email: `admin@example.com`
     - Password: `admin123456`

## 📱 Mobile App

### Setup Mobile App

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure server URL:**
   ```bash
   echo "EXPO_PUBLIC_SERVER_URL=http://your-server-ip:3000" > .env
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

### Building Mobile App

```bash
# Android APK
expo build:android

# iOS App
expo build:ios
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

## 🔧 Configuration

### Environment Variables

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

### ESP32 Configuration

1. Upload the firmware from `ESP32_Door_Controller/` to your ESP32 device
2. Connect to the ESP32's WiFi network
3. Configure the server URL and device settings
4. Use the web interface to discover and add the device

## 🛡️ Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Sanitizes and validates all inputs
- **CORS Protection**: Configurable cross-origin resource sharing
- **Role-Based Access**: Hierarchical permission system
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based protection

## 📊 Performance Features

- **In-Memory Caching**: Redis-like caching with TTL
- **Database Optimization**: Indexed queries and connection pooling
- **Compression**: Gzip compression for responses
- **CDN Ready**: Static asset optimization
- **Lazy Loading**: On-demand resource loading
- **Connection Pooling**: Efficient database connections

## 🚀 Production Deployment

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

### Using Docker

```bash
# Build Docker image
docker build -t simplifiaccess .

# Run container
docker run -p 3000:3000 -e NODE_ENV=production simplifiaccess
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

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --grep "auth"
```

## 📈 Monitoring

- **Health Checks**: Built-in health monitoring
- **Logging**: Comprehensive logging system
- **Metrics**: Performance and usage metrics
- **Alerts**: Automated alerting system

## 🤝 Contributing

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