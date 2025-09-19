# SimplifiAccess Mobile App

A React Native mobile application for SimplifiAccess door control system, built with Expo.

## Features

- **QR Code Scanning**: Scan QR codes to request door access
- **Access History**: View your access history and logs
- **User Authentication**: Secure login with JWT tokens
- **Cross-Platform**: Works on iOS, Android, and Web
- **Real-time Updates**: Live access request status updates

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS development: Xcode
- For Android development: Android Studio

## Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the server URL:**
   - Create a `.env` file in the mobile-app directory
   - Add your server URL:
     ```
     EXPO_PUBLIC_SERVER_URL=http://your-server-ip:3000
     ```

## Development

### Start the development server:
```bash
npm start
```

### Run on specific platforms:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Building for Production

### Android APK
```bash
# Build APK
expo build:android

# Or build locally
expo run:android --variant release
```

### iOS App
```bash
# Build for iOS
expo build:ios

# Or build locally
expo run:ios --configuration Release
```

## Configuration

### Server Configuration
Update the server URL in `src/services/api.js` or set the `EXPO_PUBLIC_SERVER_URL` environment variable.

### Camera Permissions
The app requires camera permissions for QR code scanning. These are automatically requested when needed.

## Troubleshooting

### Common Issues

1. **Camera not working on web:**
   - Use HTTPS or localhost
   - Check browser permissions

2. **QR Code scanning issues:**
   - Ensure good lighting
   - Hold device steady
   - Check QR code quality

3. **Connection issues:**
   - Verify server URL is correct
   - Check network connectivity
   - Ensure server is running

### Debug Mode
Enable debug mode by setting `__DEV__` to true in your environment.

## API Integration

The mobile app communicates with the SimplifiAccess server through REST APIs:

- **Authentication**: `/api/auth/login`
- **Door Access**: `/api/doors/accessible/me`
- **Access Requests**: `/api/access-requests/request`
- **Access History**: `/api/access/history`

## Security

- JWT tokens are stored securely using AsyncStorage
- All API requests include authentication headers
- Automatic token refresh and logout on expiration
- Secure QR code validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details