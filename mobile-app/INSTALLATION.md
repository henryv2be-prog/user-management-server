# SimplifiAccess Mobile App Installation

## PWA Installation (Recommended)

The SimplifiAccess mobile app is now available as a Progressive Web App (PWA) that can be installed directly on your mobile device.

### Quick Start

1. **Start the PWA server:**
   ```bash
   # Option 1: Run the batch file (Windows)
   start-pwa.bat
   
   # Option 2: Run directly with Node.js
   node serve-pwa.js
   ```

2. **Access the app:**
   - Open your mobile browser
   - Navigate to: `http://YOUR_COMPUTER_IP:3001`
   - Replace `YOUR_COMPUTER_IP` with your computer's local IP address

3. **Install the app:**
   - **Android Chrome:** Tap the menu (⋮) → "Add to Home Screen"
   - **iOS Safari:** Tap the share button (□↗) → "Add to Home Screen"

### Features

- ✅ **Installable:** Works like a native app
- ✅ **Offline capable:** Basic functionality works without internet
- ✅ **Camera access:** QR code scanning works
- ✅ **Push notifications:** (Future feature)
- ✅ **Cross-platform:** Works on Android, iOS, and desktop

### Server Requirements

- Node.js installed
- Port 3001 available
- Mobile device on same network as server

### Troubleshooting

**Can't access the app:**
- Make sure your mobile device is on the same WiFi network
- Check that port 3001 is not blocked by firewall
- Try accessing from a computer first: `http://localhost:3001`

**Installation not working:**
- Make sure you're using Chrome (Android) or Safari (iOS)
- Try refreshing the page
- Check that the manifest.json is loading correctly

**Camera permission issues:**
- **First time:** The app will ask for camera permission when you try to scan QR codes
- **Permission denied:** Go to browser settings → Site permissions → Camera → Allow
- **Still not working:** Try the camera test page: `http://YOUR_IP:3001/camera-test.html`
- **HTTPS required:** Some browsers require HTTPS for camera access (use localhost or trusted domains)

## Alternative: APK Build (Advanced)

For a native Android APK, you can use EAS Build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile apk
```

Note: APK builds require Expo account and may have limitations on free tier.

## Development

To modify the app:

1. Make changes to the source code
2. Rebuild the PWA:
   ```bash
   npx expo export --platform web
   ```
3. Restart the server:
   ```bash
   node serve-pwa.js
   ```

## Support

For issues or questions, please check:
- Server logs in the terminal
- Browser developer tools (F12)
- Network connectivity between devices
