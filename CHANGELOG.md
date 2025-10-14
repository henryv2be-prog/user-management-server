# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-10-14

### 🎉 Initial Release - Visitor Management System

This is the first stable release of the User Management Server with comprehensive visitor management capabilities.

### ✨ Features Added

#### Visitor Management System
- **Visitor Creation**: Users can create visitors associated with their profile
- **Password Authentication**: Visitors must use email and password to login
- **Access Event Tracking**: Visitors have limited access events (default: 2)
- **Access Event Consumption**: Each NFC scan uses one access event
- **Access Blocking**: Visitors lose access when they run out of events
- **Event Management**: Hosts can add more access events to visitors

#### Mobile Application
- **NFC Scanner Integration**: Direct navigation to NFC scanning after login
- **Visitor Creation Screen**: Complete form for creating visitors with validation
- **User/Visitor Login Toggle**: Support for both user and visitor authentication
- **Back Button Logout**: Proper logout functionality from NFC scanner
- **Access Event Display**: Shows remaining access events for visitors

#### Server-Side Features
- **JWT Authentication**: Secure token-based authentication for users and visitors
- **Database Migrations**: Automatic schema updates for visitor password and access events
- **Event Logging**: Comprehensive logging of visitor activities
- **Access Control**: Visitors inherit door access from their host user
- **Validation**: Robust input validation for all visitor operations

### 🔧 Technical Improvements

#### Database Schema
- Added `password` column to visitors table
- Added `access_event_limit` and `remaining_access_events` columns
- Automatic migration system for existing databases
- Foreign key relationships for data integrity

#### API Endpoints
- `POST /api/auth/visitor-login` - Visitor authentication
- `POST /api/visitors` - Create new visitors
- `GET /api/visitors/user/:userId` - Get visitors for a user
- `POST /api/visitors/:id/add-events` - Add access events
- `POST /api/visitors/:id/reset-events` - Reset access events

#### Security Features
- Password hashing using bcryptjs
- JWT tokens with expiration
- Role-based access control
- Input validation and sanitization
- SQL injection prevention

### 🐛 Bug Fixes
- Fixed visitor login EventLogger method call
- Fixed visitor access event checking logic
- Fixed back button logout functionality
- Fixed visitor validation rules
- Resolved database migration issues

### 📱 Mobile App Features
- **SimplifiAccess-v9.apk**: Latest release with all visitor features
- **Navigation Flow**: Config → Login → NFC Scanner → Visitor Management
- **Form Validation**: Client-side validation for visitor creation
- **Error Handling**: Proper error messages and user feedback

### 🚀 Deployment
- **Railway Integration**: Automatic deployment from master branch
- **Environment Configuration**: Production-ready configuration
- **Database Management**: SQLite with automatic migrations
- **Logging**: Comprehensive server-side logging

### ⚠️ Known Issues / Outstanding Features

#### Visitor Access Revocation
- **Status**: Outstanding
- **Description**: Currently, visitors lose access when they run out of events, but there's no manual revocation system
- **Impact**: Low - Access events naturally expire, but hosts cannot manually revoke access
- **Future Enhancement**: Add manual access revocation capability

#### Additional Outstanding Items
- Visitor access history/audit trail
- Bulk visitor management
- Visitor notification system
- Advanced access scheduling

### 📋 Installation & Setup

#### Server Requirements
- Node.js 16+
- SQLite3
- Railway account (for deployment)

#### Mobile App Requirements
- Android 7.0+ (API level 24+)
- NFC-enabled device
- Network connectivity

#### Quick Start
1. Clone repository
2. Install dependencies: `npm install`
3. Start server: `npm start`
4. Deploy to Railway
5. Install mobile app APK
6. Configure server URL in app
7. Login and start managing visitors

### 🔗 Dependencies

#### Server Dependencies
- express: Web framework
- sqlite3: Database
- bcryptjs: Password hashing
- jsonwebtoken: JWT authentication
- express-validator: Input validation

#### Mobile Dependencies
- React Native: Mobile framework
- Expo: Development platform
- AsyncStorage: Local storage
- NFC Manager: NFC functionality

### 📄 License
This project is licensed under the MIT License.

---

## Future Releases

### Planned Features (V1.1.0)
- Manual visitor access revocation
- Visitor access history
- Bulk visitor operations
- Advanced scheduling
- Email notifications

### Planned Features (V1.2.0)
- Web dashboard
- Advanced reporting
- Multi-site support
- API rate limiting
- Enhanced security features
