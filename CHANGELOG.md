# SimplifiAccess Changelog

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
