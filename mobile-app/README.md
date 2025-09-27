# SimplifiAccess Mobile App

A simple mobile app for scanning QR codes to access doors through the SimplifiAccess server.

## Features

- 🔧 **Server Configuration**: Easy setup with server URL validation
- 🔐 **User Authentication**: Login with email/password
- 📱 **QR Code Scanning**: Scan QR codes attached to doors
- 🚪 **Door Access**: Request access to doors via QR code scanning

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Expo CLI (`npm install -g @expo/cli`)
- Android device or emulator

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go app or build for production.

## Building APK

### Method 1: Development Build (Recommended)

```bash
# Install Expo CLI if not already installed
npm install -g @expo/cli

# Build development build
npx expo build:android --type apk
```

### Method 2: Prebuild + Gradle

```bash
# Prebuild the project
npx expo prebuild --platform android --clear

# Build APK
cd android
./gradlew assembleDebug
```

The APK will be created at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Usage

1. **Configure Server**: Enter your SimplifiAccess server URL (e.g., `http://192.168.1.20:3000`)
2. **Login**: Use your credentials (default: `admin@example.com` / `admin123`)
3. **Scan QR Codes**: Tap "Scan QR Code" and point camera at door QR codes

## QR Code Formats

The app supports multiple QR code formats:

- **JSON Format**: `{"doorId": 1, "type": "door_access"}`
- **URL Format**: `https://example.com?door=1`
- **Simple ID**: Just the door ID number

## Troubleshooting

### Build Issues

If you encounter build issues, try:

1. Clear Expo cache: `npx expo start --clear`
2. Clean Gradle: `cd android && ./gradlew clean`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Camera Issues

- Make sure camera permissions are granted
- Ensure you're using a real device (camera doesn't work on simulators)
- Check that the APK is properly signed and installed

## Server Integration

The app integrates with your SimplifiAccess server through these endpoints:

- `GET /api/test` - Server connection test
- `POST /api/auth/login` - User authentication
- `POST /api/access-requests/request` - Door access requests

## License

This project is part of the SimplifiAccess system.
