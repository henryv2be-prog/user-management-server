# 🔐 ESP32 Door Controller Setup Guide

## Overview

This guide will help you set up ESP32 devices as door controllers for the SimplifiAccess system. The ESP32 will work exactly as you described:

1. **Initial State**: No AP running until boot button is pressed
2. **Configuration Mode**: Boot button activates WiFi AP (no password)
3. **Admin Setup**: Connect to ESP32 AP → configure WiFi credentials
4. **Internet Connection**: ESP32 connects to router, disconnects its own AP
5. **Server Integration**: Server discovers and configures ESP32 as door
6. **User Access**: QR code → server website → Access Granted/Denied → door opens

## 📋 Hardware Requirements

### ESP32 Board
- Any ESP32 development board (ESP32-WROOM-32, ESP32-DevKitC, etc.)
- **GPIO5**: Connected to relay control pin
- **GPIO0**: Boot button (built-in)
- **GPIO2**: Status LED (optional)
- **Built-in LED**: For visual feedback

### Relay Module
- 5V or 3.3V relay module
- **Control Pin**: Connect to GPIO5
- **VCC**: Connect to 3.3V or 5V (depending on relay)
- **GND**: Connect to ground
- **NO/NC**: Connect to door lock mechanism

### Power Supply
- 5V power adapter (2A recommended)
- USB cable for programming and power

## 🔧 Software Setup

### 1. Install Arduino IDE
1. Download Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
2. Install ESP32 board package:
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to Tools → Board → Boards Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems"

### 2. Install Required Libraries
In Arduino IDE, go to Tools → Manage Libraries and install:
- **ArduinoJson** by Benoit Blanchon
- **WebServer** (usually included with ESP32 package)

### 3. Upload the Code
1. Open `ESP32_Door_Controller.ino` in Arduino IDE
2. Select your ESP32 board:
   - Tools → Board → ESP32 Arduino → "ESP32 Dev Module"
3. Select the correct COM port
4. Click Upload

## 🚀 Initial Setup Process

### Step 1: First Boot
1. **Power on** the ESP32
2. **Press and hold** the boot button (GPIO0) for **3 seconds**
3. **Release** the button
4. The ESP32 will start its configuration AP

### Step 2: Connect to ESP32
1. On your phone/computer, look for WiFi network: **"ESP32-Door-Config"**
2. **Connect** to this network (no password required)
3. Open a web browser and go to: **http://192.168.4.1**

### Step 3: Configure WiFi
1. You'll see the SimplifiAccess configuration page
2. Fill in the form:
   - **WiFi Network Name**: Your router's SSID
   - **WiFi Password**: Your router's password
   - **Server URL**: Your server's address (e.g., `http://192.168.1.100:3000`)
   - **Device Name**: Give it a name (e.g., "Main Entrance")
3. Click **"Configure & Connect"**

### Step 4: ESP32 Connects
1. ESP32 will attempt to connect to your WiFi
2. If successful, it will disconnect its own AP
3. The device is now ready for server discovery

## 🔍 Server Integration

### Step 1: Discover ESP32
1. Go to your SimplifiAccess web interface
2. Navigate to **"ESP32 Discovery"** tab
3. Click **"Scan for ESP32s"**
4. Your configured ESP32 should appear in the list

### Step 2: Configure as Door
1. Click **"Configure"** next to your ESP32
2. Fill in the door details:
   - **Door Name**: e.g., "Main Entrance"
   - **Location**: e.g., "Building A, Floor 1"
   - **Description**: Optional description
3. Click **"Save Configuration"**
4. The ESP32 is now registered as a door in your system

## 📱 User Access Flow

### Step 1: Generate QR Code
1. Use the **QR Code Generator** (`QR_Code_Generator.html`)
2. Select your server URL and door
3. Choose access type:
   - **Access Request**: User scans QR → gets Access Granted/Denied
   - **Direct Access**: Admin use, opens door immediately
4. Set expiry time (optional)
5. Generate and download QR code

### Step 2: User Scans QR Code
1. User scans QR code with their phone
2. Phone opens browser to server's access page
3. Server processes the request
4. User sees "Access Granted" or "Access Denied"
5. If granted, server sends open command to ESP32
6. ESP32 triggers GPIO5 → relay opens door

## 🔧 Technical Details

### ESP32 Pinout
```
GPIO0  → Boot Button (built-in)
GPIO2  → Status LED (optional)
GPIO5  → Relay Control
3.3V   → Relay VCC
GND    → Relay GND
```

### API Endpoints
The ESP32 exposes these endpoints:

#### Discovery
- **GET** `/discover` - Device information for discovery
- **GET** `/status` - Current device status

#### Door Control
- **POST** `/door` - Control door (open/close)
  ```json
  {
    "action": "open"  // or "close"
  }
  ```

#### Configuration
- **GET** `/` - Configuration web interface
- **POST** `/configure` - Save WiFi and server settings

### Server Communication
- **Heartbeat**: ESP32 sends status every 10 seconds to `/api/doors/heartbeat`
- **Door Control**: Server sends commands to ESP32's `/door` endpoint
- **Discovery**: Server scans for ESP32s on `/discover` endpoint

## 🛠️ Troubleshooting

### ESP32 Won't Start AP Mode
- **Problem**: Pressing boot button doesn't activate AP
- **Solution**: 
  - Hold button for full 3 seconds
  - Check if button is working (try multiple times)
  - Power cycle the device

### Can't Connect to Configuration AP
- **Problem**: "ESP32-Door-Config" network not visible
- **Solution**:
  - Make sure you held boot button for 3 seconds
  - Check if ESP32 is powered on
  - Try restarting your phone's WiFi

### WiFi Connection Fails
- **Problem**: ESP32 can't connect to your router
- **Solution**:
  - Double-check WiFi credentials
  - Ensure router is 2.4GHz (ESP32 doesn't support 5GHz)
  - Check if router has MAC filtering enabled
  - Try moving ESP32 closer to router

### Server Can't Find ESP32
- **Problem**: ESP32 doesn't appear in discovery
- **Solution**:
  - Check if ESP32 is connected to WiFi (status LED should be solid)
  - Verify server URL is correct
  - Check if ESP32 and server are on same network
  - Try restarting ESP32

### Door Won't Open
- **Problem**: Access granted but door doesn't open
- **Solution**:
  - Check GPIO5 connection to relay
  - Verify relay is working (test with multimeter)
  - Check door lock mechanism
  - Verify ESP32 is online (green status in dashboard)

### QR Code Not Working
- **Problem**: Scanning QR code shows error
- **Solution**:
  - Check server URL in QR code generator
  - Ensure server is running and accessible
  - Verify door ID is correct
  - Check if QR code has expired

## 📊 Status Indicators

### LED Patterns
- **Fast Blink**: WiFi connection failed, trying to reconnect
- **Slow Blink**: In AP mode (configuration mode)
- **Solid On**: Connected to WiFi and ready
- **Off**: No power or major error

### Web Interface Status
- **Green Dot**: Door online and responding
- **Red Dot**: Door offline or not responding
- **Yellow Dot**: Door discovered but not configured

## 🔒 Security Considerations

### Current Implementation
- ESP32 AP has no password (for easy setup)
- Configuration web interface has no authentication
- Access requests are granted to all (for testing)

### Production Recommendations
- Add password to ESP32 AP
- Implement user authentication for access requests
- Use HTTPS for all communications
- Add encryption for sensitive data
- Implement proper access control based on user permissions

## 📈 Next Steps

1. **Test the complete flow** with a real door lock
2. **Generate QR codes** for different doors
3. **Test access requests** from mobile devices
4. **Monitor door status** in the dashboard
5. **Set up multiple doors** for a complete system

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all connections are secure
3. Check the Serial Monitor in Arduino IDE for error messages
4. Ensure all software versions are up to date
5. Test with a simple LED first before connecting to a real door lock

---

**Happy Building! 🚀**

Your ESP32 door controller is now ready to provide secure, convenient access control for your SimplifiAccess system.
