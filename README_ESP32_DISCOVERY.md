# ESP32 Discovery Feature

This feature allows you to scan your network for ESP32 devices and easily configure them as doors in your access control system.

## Features

- **Network Scanning**: Automatically discover ESP32 devices on your local network
- **Device Information**: View MAC address, IP address, signal strength, and status
- **Easy Configuration**: Configure discovered devices as doors with just a few clicks
- **Bulk Operations**: Add multiple ESP32 devices as doors at once
- **Connection Testing**: Test connectivity to ESP32 devices before configuration

## How to Use

### 1. Access the ESP32 Discovery Page

1. Log in to your access control system as an administrator
2. Click on "ESP32 Discovery" in the navigation menu
3. You'll see the discovery interface with a "Scan for ESP32s" button

### 2. Scan for ESP32 Devices

1. Click the "Scan for ESP32s" button
2. The system will scan your network for ESP32 devices
3. Wait for the scan to complete (usually takes 2-3 seconds)
4. Discovered devices will appear as cards showing:
   - Device name
   - MAC address
   - IP address
   - Signal strength
   - Last seen timestamp
   - Online/offline status

### 3. Configure Individual ESP32 Devices

1. Click the "Configure" button on any discovered ESP32 device
2. Fill in the configuration form:
   - **Door Name**: Give your door a descriptive name
   - **Location**: Specify where the door is located
   - **IP Address**: The ESP32's IP address (pre-filled)
   - **Access Group**: Select which access group this door belongs to
3. Click "Add as Door" to save the configuration

### 4. Bulk Configuration

1. After scanning, if multiple devices are found, you'll see an "Add All to Doors" button
2. Click this button to add all discovered ESP32 devices as doors at once
3. They'll be configured with default names and the first available access group

### 5. Test ESP32 Connections

1. Click the "Test" button on any discovered ESP32 device
2. This will test the connection to the ESP32's web interface
3. A success message indicates the device is responding properly

## ESP32 Setup

To make your ESP32 devices discoverable, upload the provided Arduino code (`ESP32_Discovery_Example.ino`) to your ESP32:

### Required Libraries

Install these libraries in the Arduino IDE:
- `WiFi` (built-in)
- `WebServer` (built-in)
- `ArduinoJson` (install from Library Manager)

### Configuration

1. Open `ESP32_Discovery_Example.ino` in Arduino IDE
2. Update the WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Upload the code to your ESP32
4. The ESP32 will:
   - Connect to your WiFi network
   - Start a web server on port 80
   - Blink the LED to indicate successful connection
   - Be discoverable by the access control system

### ESP32 Web Interface

Once connected, you can access the ESP32's web interface by visiting its IP address in a browser. The interface shows:
- Device information
- Current door status
- Manual door controls
- System status

## API Endpoints

The ESP32 Discovery feature uses these API endpoints:

### POST /api/doors/discover
Scans the network for ESP32 devices and returns discovered devices.

**Response:**
```json
{
  "message": "ESP32 discovery completed",
  "devices": [
    {
      "mac": "AA:BB:CC:DD:EE:01",
      "ip": "192.168.1.100",
      "name": "ESP32-001",
      "status": "discovered",
      "signal": -45,
      "lastSeen": "2024-01-01T12:00:00.000Z",
      "deviceType": "ESP32",
      "firmware": "1.0.0"
    }
  ],
  "count": 1
}
```

## Troubleshooting

### ESP32 Not Discovered

1. **Check WiFi Connection**: Ensure the ESP32 is connected to the same network as your server
2. **Check IP Address**: Verify the ESP32 has a valid IP address
3. **Check Web Server**: Try accessing the ESP32's IP address directly in a browser
4. **Check Firewall**: Ensure your server can access devices on the local network

### Connection Test Fails

1. **Check ESP32 Status**: Verify the ESP32 is running and connected
2. **Check IP Address**: Ensure the IP address is correct
3. **Check Network**: Verify there are no network connectivity issues
4. **Check ESP32 Code**: Ensure the ESP32 is running the correct code with web server enabled

### Configuration Fails

1. **Check Access Groups**: Ensure you have at least one access group created
2. **Check Permissions**: Verify you're logged in as an administrator
3. **Check Network**: Ensure the server can reach the ESP32 device
4. **Check Database**: Verify the database is accessible and writable

## Security Considerations

- The ESP32 Discovery feature is only available to administrators
- ESP32 devices should be on a secure, isolated network
- Consider using WPA3 encryption for your WiFi network
- Regularly update ESP32 firmware to patch security vulnerabilities
- Use strong, unique passwords for your WiFi network

## Future Enhancements

- Real-time network scanning (currently uses mock data)
- Automatic ESP32 firmware updates
- Advanced device filtering and search
- Device health monitoring
- Automatic IP address assignment
- Integration with network management tools
