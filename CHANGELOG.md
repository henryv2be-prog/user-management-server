# SimplifiAccess Changelog

## [1.2.0] - 2024-01-05

### Major Features Added
- **Multi-Site Management System**
  - Complete site management with hierarchical organization
  - Site-specific door and area management
  - Timezone support for each site
  - Cross-site reporting and analytics

- **Advanced Area/Zone Management**
  - Hierarchical area organization with parent-child relationships
  - Area-specific door and camera assignments
  - Zone-based access control and reporting
  - Nested area structures for complex facilities

- **Power Monitoring for ESP32 Devices**
  - Real-time power consumption tracking
  - Battery level monitoring and alerts
  - Temperature monitoring for device health
  - Power statistics and historical data
  - Automatic cleanup of old power data

- **Enhanced Door Access Control**
  - QR code access with secure token validation
  - NFC card reader integration and management
  - Door Position Sensor (DPS) integration
  - Multiple sensor types: magnetic, reed switch, ultrasonic, PIR
  - Real-time door status tracking (open/closed/locked/unlocked)
  - Emergency door override functionality

- **Camera Integration System**
  - IP camera management and configuration
  - Live stream URL generation
  - Snapshot capture capabilities
  - Motion detection configuration
  - Recording management
  - Camera health monitoring and connection testing

- **Licensing Framework**
  - Multi-tier licensing system (trial, basic, professional, enterprise)
  - Feature-based access control
  - Usage limits and monitoring
  - License validation and status tracking
  - Automatic license expiration handling

- **Offline Fallback System**
  - Intelligent caching for offline operation
  - Local access rule storage
  - Offline access decision making
  - Automatic sync when connectivity restored
  - Cache management and cleanup

- **ESP32 Mesh Networking**
  - Distributed door control network
  - Automatic node discovery and registration
  - Message routing and broadcasting
  - Network topology management
  - Health monitoring and statistics

- **ESP32 Web Server Configuration**
  - Direct device configuration interface
  - WiFi setup and management
  - Server connection configuration
  - Device-specific settings management

### Database Enhancements
- **New Tables Added:**
  - `sites` - Multi-site management
  - `areas` - Hierarchical area/zone management
  - `power_monitoring` - ESP32 power data
  - `door_status` - Real-time door status
  - `door_sensors` - Sensor configuration
  - `cameras` - Camera management
  - `licenses` - Licensing system
  - `offline_cache` - Offline data storage

- **Enhanced Door Table:**
  - Added `site_id` for multi-site support
  - Added `area_id` for zone management
  - Added `access_type` (card, qr, nfc, biometric)
  - Added `override_enabled` for emergency access
  - Added `mesh_node_id` for mesh networking

### API Endpoints Added
- `/api/sites` - Site management
- `/api/areas` - Area/zone management
- `/api/power-monitoring` - Power data management
- `/api/door-status` - Door status management
- `/api/cameras` - Camera management
- `/api/licenses` - License management
- `/api/offline-cache` - Offline cache management

### ESP32 Integration
- **Enhanced Heartbeat System**
  - Extended device information reporting
  - Power monitoring data transmission
  - Temperature and health metrics
  - Mesh network status reporting

- **QR Code Access**
  - Secure token-based access codes
  - Time-limited access validation
  - Multiple QR code types (access, config, user, mesh)

- **NFC Card Support**
  - Card UID validation and lookup
  - Access group association
  - Card data processing and validation

- **Sensor Integration**
  - DPS (Door Position Sensor) support
  - Multiple sensor type compatibility
  - Real-time sensor data processing

### Testing and Quality Assurance
- **Comprehensive ESP32 Test Suite**
  - Automated workflow testing
  - Component integration testing
  - Mesh network testing
  - QR code and NFC testing
  - Power monitoring validation

- **Test Coverage:**
  - Heartbeat system validation
  - Door control functionality
  - Power monitoring accuracy
  - Door status updates
  - Access control methods
  - Sensor integration
  - Mesh networking
  - Offline fallback
  - Web server configuration

### Utility Classes Added
- `QRCodeGenerator` - QR code generation and validation
- `NFCHandler` - NFC card processing and management
- `ESPMeshNetwork` - Mesh network management
- `ESP32TestWorkflow` - Comprehensive testing framework

### Dependencies Added
- `qrcode ^1.5.3` - QR code generation
- `nfc-pcsc ^0.7.0` - NFC card reader support
- `ws ^8.14.2` - WebSocket support for real-time communication
- `node-cron ^3.0.3` - Scheduled task management

### Performance Improvements
- Enhanced database indexing for new tables
- Optimized query performance for large datasets
- Improved memory management for power monitoring data
- Efficient cache management for offline operations

### Security Enhancements
- Secure QR code token validation
- NFC card data encryption
- License key validation and protection
- Enhanced access control validation

---

## [1.1.0] - 2024-01-04

### Added
- **Comprehensive Stress Testing Suite**
  - `stress_test.js` - Configurable load testing for users, doors, and access groups
  - Support for up to 10,000 users, 1,000 doors, 500 access groups
  - Concurrent request handling with performance monitoring
  - Memory usage tracking and detailed reporting
  - API endpoint stress testing with success rate metrics
  - Batch processing with configurable concurrency limits

- **Linux Deployment Automation**
  - `deploy_and_test.sh` - Automated deployment and testing script
  - Automatic Node.js installation detection and setup
  - Server startup and health monitoring
  - System report generation with performance metrics

- **New NPM Scripts**
  - `npm run stress-test-small` - Development testing (100 users, 50 doors, 25 groups)
  - `npm run stress-test-medium` - Production simulation (1,000 users, 100 doors, 50 groups)
  - `npm run stress-test-large` - Maximum capacity test (10,000 users, 1,000 doors, 500 groups)

- **Documentation**
  - `README_STRESS_TEST.md` - Comprehensive stress testing documentation
  - Usage instructions and configuration options
  - Performance benchmarks and troubleshooting guide

### Dependencies
- Added `axios ^1.6.0` for HTTP requests in stress testing

### Technical Details
- Stress test results saved to `./stress_test_results/` with timestamps
- Comprehensive error handling and partial result preservation
- Real-time progress monitoring with batch processing status
- System resource monitoring (CPU, memory, disk usage)

---

## [1.0.0] - 2024-01-03

### Core Features
- **Complete Door Access Control System**
  - User management with role-based access (admin/user)
  - ESP32 integration with real-time heartbeat monitoring
  - Access groups with door linking capabilities
  - Multi-select access group management for users

- **Real-time Monitoring**
  - ESP32 online/offline status with 10-second heartbeat intervals
  - Live dashboard with statistics (users, doors, access groups)
  - Smooth UI updates without loading flicker

- **Professional UI/UX**
  - SimplifiAccess branding with custom logo and favicon
  - Modern, responsive design with intuitive navigation
  - Real-time status indicators (green=online, red=offline)
  - Clean table layouts with proper data formatting

- **Security & Authentication**
  - JWT-based authentication system
  - Secure password hashing with bcrypt
  - Role-based authorization middleware
  - Input validation and sanitization

- **Database Management**
  - SQLite database with proper relationships
  - Junction tables for many-to-many relationships
  - Database initialization and migration support
  - Connection pooling and proper cleanup

### API Endpoints
- `/api/auth/login` - User authentication
- `/api/auth/register` - User registration
- `/api/users` - User management CRUD operations
- `/api/doors` - Door management with ESP32 integration
- `/api/access-groups` - Access group management
- `/api/dashboard/stats` - Dashboard statistics

### ESP32 Integration
- Heartbeat system for real-time status monitoring
- MAC address and IP tracking
- Relay control for door access
- Status updates every 10 seconds

### Technical Stack
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT, bcryptjs
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: express-validator
