# ESP32 Door Controller - Complete Setup Guide

## Overview

This guide explains how to set up and configure the ESP32 door controller to work with your SimplifiAccess cloud server. The system allows users to scan QR codes or NFC tags at doors, which sends access requests to the server for verification. If authorized, the server commands the ESP32 to open the door.

## System Architecture

```
User (Mobile App) → QR/NFC Scan → Server → Access Verification → ESP32 → Door Opens
```

## Prerequisites

- ESP32 development board
- Relay module connected to GPIO5
- WiFi network
- SimplifiAccess server deployed (e.g., on Railway)
- Arduino IDE with ESP32 board support

## Step 1: ESP32 Hardware Setup

1. Connect relay module to ESP32:
   - VCC → 3.3V or 5V (depending on relay)
   - GND → GND
   - IN → GPIO5
   - Connect door lock/strike to relay output

2. Optional: Connect status LED to GPIO2

## Step 2: Upload ESP32 Firmware

1. Open `ESP32_Door_Controller.ino` in Arduino IDE
2. Install required libraries:
   - ArduinoJson
   - WiFi (built-in)
   - WebServer (built-in)
   - HTTPClient (built-in)
3. Upload the code to your ESP32

## Step 3: Initial ESP32 Configuration

1. **Enter Configuration Mode:**
   - Press and hold the BOOT button on ESP32 for 3 seconds
   - ESP32 will create a WiFi access point named "ESP32-Door-Config"

2. **Connect to ESP32:**
   - On your phone/computer, connect to "ESP32-Door-Config" WiFi
   - Open browser and go to `192.168.4.1`

3. **Configure ESP32:**
   - Click "Scan for WiFi Networks"
   - Select your WiFi network
   - Enter WiFi password
   - Enter your server URL (e.g., `https://your-app.railway.app`)
   - Enter a device name (e.g., "Main Entrance")
   - Click "Configure & Connect"

4. **Verify Connection:**
   - ESP32 will connect to WiFi and start sending heartbeats
   - Status LED will be solid when connected

## Step 4: Server-Side Setup

1. **Login as Admin:**
   ```bash
   # Default credentials
   Email: admin@example.com
   Password: admin123
   ```

2. **Discover ESP32 Devices:**
   - Go to Admin Dashboard → Door Controllers
   - Click "Scan for Controllers"
   - Your ESP32 should appear in the discovered devices list

3. **Register the Door:**
   - Click "Add as Door" next to your discovered ESP32
   - Enter door details:
     - Name: "Main Entrance"
     - Location: "Building A, Floor 1"
   - Click "Register Door"

4. **Configure Access Groups:**
   - Go to Access Groups
   - Create or select an access group
   - Add the new door to the access group
   - Add users who should have access

## Step 5: Generate QR Code/NFC Data

1. **Generate Static QR Code:**
   - Go to Doors → Select your door
   - Click "Generate QR Code"
   - Print and display the QR code at the door

2. **QR Code Content Format:**
   ```json
   {
     "doorId": 1,
     "doorName": "Main Entrance",
     "location": "Building A",
     "serverUrl": "https://your-app.railway.app",
     "type": "door_access"
   }
   ```

## Step 6: Mobile App Usage

1. **User Scans QR Code:**
   - Mobile app reads door information
   - Sends access request to server with user credentials

2. **Server Processes Request:**
   ```javascript
   POST /api/doors/access/request
   {
     "doorId": 1,
     "userId": 123,
     "userName": "John Doe",
     "reason": "QR code scan"
   }
   ```

3. **Access Flow:**
   - Server checks if user has access via access groups
   - If authorized, server sends open command to ESP32
   - ESP32 activates relay on GPIO5 for 5 seconds
   - Door opens

## API Endpoints

### ESP32 Endpoints

- `GET /` - Status page
- `GET /discover` - Device information
- `POST /door` - Door control (open/close)
- `GET /status` - Current status

### Server Endpoints

- `POST /api/doors/heartbeat` - ESP32 heartbeat
- `POST /api/doors/discover` - Find ESP32 devices
- `POST /api/doors/auto-register/:deviceID` - Register ESP32
- `POST /api/doors/access/request` - Process access request
- `POST /api/doors/:id/control` - Direct door control (admin)

## Heartbeat System

ESP32 sends heartbeats every 10 seconds:
```json
{
  "deviceID": "ESP32-AABBCCDDEEFF",
  "deviceName": "Main Entrance",
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF",
  "status": "online",
  "doorOpen": false,
  "signal": -45,
  "freeHeap": 150000,
  "uptime": 3600000,
  "firmware": "1.0.0",
  "deviceType": "ESP32"
}
```

## Troubleshooting

### ESP32 Not Connecting to WiFi
- Verify WiFi credentials
- Check signal strength
- Ensure server URL is correct (include http:// or https://)

### ESP32 Not Discovered
- Verify ESP32 is sending heartbeats (check Serial Monitor)
- Ensure server is receiving heartbeats (check logs)
- Wait at least 30 seconds after ESP32 connects

### Door Not Opening
- Check relay wiring
- Verify ESP32 is online in dashboard
- Check user has access permissions
- Monitor server logs for errors

### Reset ESP32 Configuration
- Hold BOOT button for 3 seconds to re-enter AP mode
- Reconfigure WiFi and server settings

## Security Considerations

1. **Network Security:**
   - Use HTTPS for server communication
   - Secure WiFi network with WPA2/WPA3
   - Consider network isolation for IoT devices

2. **Access Control:**
   - Regularly review access groups
   - Remove access for terminated users
   - Monitor access logs

3. **Physical Security:**
   - Secure ESP32 in tamper-proof enclosure
   - Protect wiring from tampering
   - Have manual override for emergencies

## Testing the Complete Flow

Run the test script to verify everything is working:
```bash
node test_complete_flow.js
```

This will:
1. Simulate ESP32 heartbeat
2. Show discovery process
3. Test access request flow
4. Verify door control

## Support

For issues or questions:
1. Check ESP32 Serial Monitor for debugging
2. Review server logs for errors
3. Ensure all components are properly connected
4. Verify network connectivity