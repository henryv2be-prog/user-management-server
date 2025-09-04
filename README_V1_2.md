# SimplifiAccess v1.2 - Advanced Access Control System

## 🚀 What's New in v1.2

SimplifiAccess v1.2 introduces a comprehensive suite of advanced features for enterprise-grade access control systems, including multi-site management, mesh networking, power monitoring, and much more.

## ✨ Key Features

### 🏢 Multi-Site Management
- **Hierarchical Site Organization**: Manage multiple physical locations from a single system
- **Site-Specific Configuration**: Each site can have its own timezone, settings, and access rules
- **Cross-Site Reporting**: Unified reporting and analytics across all sites
- **Centralized Administration**: Manage all sites from one dashboard

### 🗺️ Advanced Area/Zone Management
- **Hierarchical Areas**: Create nested area structures (Building → Floor → Room)
- **Zone-Based Access Control**: Assign doors and cameras to specific areas
- **Area-Specific Reporting**: Generate reports for specific zones or areas
- **Flexible Organization**: Support for complex facility layouts

### ⚡ Power Monitoring for ESP32
- **Real-Time Power Tracking**: Monitor voltage, current, and power consumption
- **Battery Level Monitoring**: Track battery levels and receive low-battery alerts
- **Temperature Monitoring**: Monitor device temperature for health management
- **Historical Data**: Store and analyze power consumption patterns
- **Automatic Cleanup**: Remove old power data to maintain performance

### 🔐 Enhanced Door Access Control
- **QR Code Access**: Secure, time-limited QR codes for door access
- **NFC Card Support**: Full NFC card reader integration and management
- **Multiple Sensor Types**: Support for DPS, magnetic, reed switch, ultrasonic, and PIR sensors
- **Real-Time Status**: Track door status (open/closed/locked/unlocked) in real-time
- **Emergency Override**: Emergency door override functionality for specific areas

### 📹 Camera Integration
- **IP Camera Management**: Add and configure IP cameras for door monitoring
- **Live Streaming**: Generate live stream URLs for real-time monitoring
- **Snapshot Capture**: Take snapshots for access verification
- **Motion Detection**: Configure motion detection and recording
- **Health Monitoring**: Test camera connections and monitor health

### 📄 Licensing Framework
- **Multi-Tier Licensing**: Trial, Basic, Professional, and Enterprise tiers
- **Feature-Based Access**: Control access to features based on license type
- **Usage Monitoring**: Track usage against license limits
- **Automatic Validation**: Validate licenses and handle expiration
- **Flexible Limits**: Set limits for users, doors, and sites

### 🔄 Offline Fallback System
- **Intelligent Caching**: Cache access rules and user data for offline operation
- **Local Decision Making**: Make access decisions even when offline
- **Automatic Sync**: Sync data when connectivity is restored
- **Cache Management**: Automatic cleanup and management of cached data

### 🌐 ESP32 Mesh Networking
- **Distributed Network**: Create mesh networks of ESP32 devices
- **Automatic Discovery**: Devices automatically discover and join the network
- **Message Routing**: Route messages through the mesh network
- **Health Monitoring**: Monitor network health and statistics
- **Topology Management**: Visualize and manage network topology

### ⚙️ ESP32 Web Server Configuration
- **Direct Device Access**: Configure ESP32 devices directly via web interface
- **WiFi Management**: Set up WiFi connections through the device
- **Server Configuration**: Configure server connections
- **Device Settings**: Manage device-specific settings

## 🛠️ Installation

### Prerequisites
- Node.js 16.0.0 or higher
- SQLite3
- ESP32 devices (for hardware integration)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/simplifiaccess.git
cd simplifiaccess

# Install dependencies
npm install

# Initialize the database
npm run init-db

# Start the server
npm start
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
FRONTEND_URL=http://localhost:3000
```

## 📊 Database Schema

### New Tables in v1.2
- **sites**: Multi-site management
- **areas**: Hierarchical area/zone management
- **power_monitoring**: ESP32 power data
- **door_status**: Real-time door status
- **door_sensors**: Sensor configuration
- **cameras**: Camera management
- **licenses**: Licensing system
- **offline_cache**: Offline data storage

### Enhanced Tables
- **doors**: Added site_id, area_id, access_type, override_enabled, mesh_node_id

## 🔌 API Endpoints

### New API Endpoints
- `GET/POST /api/sites` - Site management
- `GET/POST /api/areas` - Area/zone management
- `GET/POST /api/power-monitoring` - Power data management
- `GET/POST /api/door-status` - Door status management
- `GET/POST /api/cameras` - Camera management
- `GET/POST /api/licenses` - License management
- `GET/POST /api/offline-cache` - Offline cache management

### ESP32 Integration Endpoints
- `POST /api/power-monitoring/esp32/:doorId` - Power data submission
- `POST /api/door-status/esp32/:doorId` - Door status updates
- `POST /api/doors/:id/heartbeat` - Device heartbeat
- `POST /api/doors/:id/access` - Access control (QR/NFC)

## 🧪 Testing

### ESP32 Workflow Testing
```bash
# Run comprehensive ESP32 tests
node test_esp32_workflow.js

# Run specific test suites
npm run test:power-monitoring
npm run test:mesh-networking
npm run test:qr-nfc
```

### Test Coverage
- ✅ Heartbeat system validation
- ✅ Door control functionality
- ✅ Power monitoring accuracy
- ✅ Door status updates
- ✅ Access control methods
- ✅ Sensor integration
- ✅ Mesh networking
- ✅ Offline fallback
- ✅ Web server configuration

## 🔧 Configuration

### ESP32 Device Configuration
1. **WiFi Setup**: Configure WiFi through device web interface
2. **Server Connection**: Set server URL and authentication
3. **Sensor Configuration**: Configure door sensors and access methods
4. **Mesh Network**: Join or create mesh networks

### QR Code Configuration
```javascript
const QRCodeGenerator = require('./utils/qrCodeGenerator');

// Generate access QR code
const accessQR = await QRCodeGenerator.generateAccessQR({
  doorId: 1,
  userId: 'user_001',
  secret: 'secure_secret_key'
});
```

### NFC Configuration
```javascript
const NFCHandler = require('./utils/nfcHandler');

// Initialize NFC handler
const nfc = new NFCHandler();
await nfc.initialize();
await nfc.startReading();
```

## 📈 Performance

### Optimizations in v1.2
- Enhanced database indexing for new tables
- Optimized query performance for large datasets
- Improved memory management for power monitoring data
- Efficient cache management for offline operations

### Recommended Hardware
- **Server**: 4GB RAM, 2 CPU cores minimum
- **ESP32**: ESP32-WROOM-32 or equivalent
- **Sensors**: Compatible with DPS, magnetic, reed switch, ultrasonic, PIR
- **Cameras**: IP cameras with RTSP support

## 🔒 Security

### Security Enhancements
- Secure QR code token validation with time limits
- NFC card data encryption and validation
- License key validation and protection
- Enhanced access control validation
- Secure mesh network communication

### Best Practices
- Use strong JWT secrets
- Regularly update device firmware
- Monitor power consumption for anomalies
- Implement proper access logging
- Use HTTPS in production

## 🚀 Deployment

### Production Deployment
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### Docker Deployment
```bash
# Build Docker image
docker build -t simplifiaccess:v1.2 .

# Run container
docker run -p 3000:3000 -v ./database:/app/database simplifiaccess:v1.2
```

## 📚 Documentation

### API Documentation
- Complete API documentation available at `/api/docs`
- Interactive API testing with Swagger UI
- Example requests and responses

### ESP32 Integration Guide
- Hardware setup instructions
- Firmware configuration
- Network setup and troubleshooting
- Sensor integration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Report issues on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@simplifiaccess.com

## 🔄 Migration from v1.1

### Database Migration
The database will automatically migrate when you start v1.2. No manual migration is required.

### Configuration Changes
- Update your `.env` file with new configuration options
- Review and update ESP32 device configurations
- Test all access methods after upgrade

### Breaking Changes
- None - v1.2 is fully backward compatible with v1.1

---

**SimplifiAccess v1.2** - Advanced access control for the modern world.