# Mobile App Integration for Silent Door Access

To achieve truly silent door access without any browser opening, you need to integrate with your mobile app using custom URL schemes.

## Option 1: Custom URL Scheme (Recommended)

### 1. Register Custom URL Scheme
In your mobile app, register a custom URL scheme (e.g., `yourapp://`):

**Android (AndroidManifest.xml):**
```xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="yourapp" />
    </intent-filter>
</activity>
```

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourapp.dooraccess</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>yourapp</string>
        </array>
    </dict>
</array>
```

### 2. Handle URL in Mobile App
When the app receives the URL `yourapp://silent-access?door_id=123`:

```javascript
// Example React Native implementation
import { Linking } from 'react-native';

// Listen for incoming URLs
Linking.addEventListener('url', handleDeepLink);

function handleDeepLink(event) {
  const url = event.url;
  const urlParts = url.split('?');
  const baseUrl = urlParts[0];
  const queryString = urlParts[1];
  
  if (baseUrl === 'yourapp://silent-access') {
    const params = new URLSearchParams(queryString);
    const doorId = params.get('door_id');
    
    if (doorId) {
      // Make silent API call
      makeSilentDoorAccess(doorId);
    }
  }
}

async function makeSilentDoorAccess(doorId) {
  try {
    // Get stored token
    const token = await AsyncStorage.getItem('doorAccessToken');
    
    if (!token) {
      // Show login screen
      showLoginScreen();
      return;
    }
    
    // Make API call
    const response = await fetch(`https://your-server.com/api/silent-access/${doorId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success notification
      showNotification('Door access granted!', 'success');
    } else {
      // Show error notification
      showNotification(result.message, 'error');
    }
    
  } catch (error) {
    console.error('Silent access error:', error);
    showNotification('Access failed', 'error');
  }
}
```

## Option 2: Web-based Silent Access

If you can't modify the mobile app, use the `/silent-api-call` endpoint:

1. Create NFC cards with URL: `https://your-server.com/silent-api-call?door_id=X`
2. This opens a minimal browser window that:
   - Makes the API call silently
   - Closes immediately (within 100ms)
   - Shows no visible content

## Option 3: Background Service

For the most seamless experience, implement a background service in your mobile app that:

1. Listens for NFC scans
2. Automatically makes API calls
3. Shows system notifications
4. Never opens a browser

## API Endpoints

### Silent Access API
- **POST** `/api/silent-access/:doorId`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** 
  ```json
  {
    "success": true,
    "message": "Access granted",
    "doorId": 123,
    "doorName": "Main Entrance",
    "doorLocation": "Building A"
  }
  ```

### Status Check API
- **GET** `/api/silent-access/status`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "loggedIn": true,
    "user": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "accountType": "user"
    }
  }
  ```

## Testing

1. **Test Custom URL Scheme:**
   ```bash
   # Android
   adb shell am start -W -a android.intent.action.VIEW -d "yourapp://silent-access?door_id=123" com.yourapp
   
   # iOS Simulator
   xcrun simctl openurl booted "yourapp://silent-access?door_id=123"
   ```

2. **Test Web-based Silent Access:**
   - Visit `https://your-server.com/silent-api-call?door_id=123`
   - Should close immediately after making API call

## Benefits

- ✅ **No browser opens** with custom URL scheme
- ✅ **Instant access** - just scan and go
- ✅ **Background operation** - works even when app is closed
- ✅ **System notifications** - user gets feedback
- ✅ **Offline capability** - can queue commands when offline