# SimplifiAccess Mobile App

A React Native mobile app for door access control using QR code scanning.

## Features

- **User Authentication**: Secure login with JWT tokens
- **QR Code Scanning**: Scan QR codes to request door access
- **Door Status**: View available doors and their online/offline status
- **Access History**: View your access history
- **Profile Management**: View and manage your profile

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   ```bash
   npm run ios     # For iOS
   npm run android # For Android
   npm run web     # For web (testing)
   ```

## Configuration

### Server URL

Update the server URL in `src/services/api.js`:

```javascript
const SERVER_URL = 'http://YOUR_SERVER_IP:3000';
```

Replace `YOUR_SERVER_IP` with your actual server IP address.

### QR Code Formats

The app supports two QR code formats:

1. **JSON Format (Static)**: Contains door information directly
   ```json
   {
     "doorId": 1,
     "doorName": "Main Entrance",
     "location": "Building A",
     "esp32Ip": "192.168.1.100",
     "serverUrl": "http://192.168.1.20:3000",
     "type": "door_access"
   }
   ```

2. **URL Format (Dynamic)**: Contains server URL with parameters
   ```
   http://192.168.1.20:3000/access?door=1&type=request&t=1234567890&e=1234567890
   ```

## Usage

### For Users

1. **Login**: Enter your email and password
2. **Scan QR Code**: Use the "Scan QR Code" button to scan door QR codes
3. **View Doors**: See available doors and their status
4. **Access History**: Check your access history

### For Administrators

1. **Generate QR Codes**: Use the web-based QR generator (`QR_Code_Generator.html`)
2. **Choose Format**: Select JSON format for static QR codes or URL format for dynamic ones
3. **Print QR Codes**: Download and print QR codes for doors

## API Endpoints

The app communicates with these server endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/auth/verify` - Token verification
- `GET /api/doors/accessible/me` - Get accessible doors for user
- `POST /api/doors/access/request` - Request door access

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**: Enable camera permissions in device settings
2. **Network Connection**: Ensure the mobile device can reach the server
3. **QR Code Not Recognized**: Try generating QR codes in JSON format
4. **Authentication Failed**: Check server URL and user credentials

### Debug Mode

Enable debug logging by setting `console.log` statements in the code or using React Native Debugger.

## Development

### Project Structure

```
src/
├── context/
│   └── AuthContext.js      # Authentication context
├── screens/
│   ├── LoginScreen.js      # Login screen
│   ├── HomeScreen.js       # Main dashboard
│   ├── QRScannerScreen.js  # QR code scanner
│   ├── AccessHistoryScreen.js # Access history
│   └── ProfileScreen.js    # User profile
└── services/
    └── api.js              # API service layer
```

### Adding New Features

1. Create new screens in `src/screens/`
2. Add API endpoints in `src/services/api.js`
3. Update navigation in `App.js`
4. Test on both iOS and Android platforms

## Security Notes

- Tokens are stored securely using Expo SecureStore
- All API communication uses HTTPS in production
- QR codes contain minimal sensitive information
- Access permissions are verified server-side

## Support

For issues or questions, check the server logs and ensure all components are properly configured.