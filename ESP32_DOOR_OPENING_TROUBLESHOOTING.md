# ESP32 Door Opening Troubleshooting Guide

## Issue: Access Granted but Door Doesn't Open

When you scan your card, you get "Access Granted" but the ESP32 doesn't receive the command to open the door.

## System Flow Analysis

The system works as follows:
1. **Card Scan** → ESP32 sends access request to `/api/doors/access/request`
2. **Access Check** → Server verifies permissions and grants access
3. **Command Creation** → Server creates door command in `door_commands` table
4. **ESP32 Polling** → ESP32 polls `/api/doors/commands/:doorId` to get commands
5. **Command Execution** → ESP32 receives command and opens door

## Debugging Steps

### 1. Check Server Logs
Look for these log messages in Railway:
```
🚪 Storing door open command for door X (Door Name)
🚪 Door ESP32 IP: X.X.X.X, MAC: XX:XX:XX:XX:XX:XX
✅ Door commands table verified/created
Door command stored successfully
```

### 2. Test ESP32 Communication
Use the test script to debug:
```bash
node test-esp32-communication.js <door_id>
```

This will:
- Check door info and existing commands
- Test ESP32 polling endpoint
- Create a test command
- Verify command delivery

### 3. Check Debug Endpoint
Visit: `https://your-railway-app.railway.app/api/doors/debug/commands/<door_id>`

This shows:
- Door information (IP, MAC, online status)
- All commands (pending and executed)
- Command summary

### 4. Verify ESP32 Polling
Check if ESP32 is polling the correct endpoint:
```
GET https://your-railway-app.railway.app/api/doors/commands/<door_id>
```

Expected response:
```json
{
  "success": true,
  "commands": [
    {
      "id": 1,
      "command": "open",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Common Issues & Solutions

### Issue 1: Wrong Door ID
**Problem**: ESP32 is polling with wrong door ID
**Solution**: 
- Check door ID in admin panel
- Verify ESP32 is using correct door ID in polling URL
- Use debug endpoint to confirm door ID

### Issue 2: ESP32 Not Polling
**Problem**: ESP32 stopped polling or never started
**Solution**:
- Check ESP32 code for polling loop
- Verify ESP32 is sending heartbeats
- Check ESP32 network connectivity

### Issue 3: Commands Not Created
**Problem**: Access granted but no command in database
**Solution**:
- Check server logs for command creation errors
- Verify `door_commands` table exists
- Check database permissions

### Issue 4: Commands Created but Not Retrieved
**Problem**: Commands exist but ESP32 doesn't get them
**Solution**:
- Verify ESP32 polling URL matches door ID
- Check if commands are marked as executed too quickly
- Verify ESP32 polling frequency

## ESP32 Code Requirements

Your ESP32 should:

1. **Send Heartbeats**:
```cpp
// Send heartbeat every 30 seconds
void sendHeartbeat() {
  HTTPClient http;
  http.begin("https://your-railway-app.railway.app/api/doors/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  String json = "{";
  json += "\"deviceID\":\"" + String(ESP.getChipId()) + "\",";
  json += "\"deviceName\":\"Door Controller\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"mac\":\"" + WiFi.macAddress() + "\",";
  json += "\"status\":\"online\"";
  json += "}";
  
  int httpResponseCode = http.POST(json);
  http.end();
}
```

2. **Poll for Commands**:
```cpp
// Poll for commands every 2 seconds
void pollForCommands() {
  HTTPClient http;
  String url = "https://your-railway-app.railway.app/api/doors/commands/" + String(DOOR_ID);
  http.begin(url);
  
  int httpResponseCode = http.GET();
  if (httpResponseCode == 200) {
    String response = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    if (doc["success"] == true) {
      JsonArray commands = doc["commands"];
      for (JsonObject cmd : commands) {
        String command = cmd["command"];
        if (command == "open") {
          openDoor();
        }
      }
    }
  }
  http.end();
}
```

## Testing Commands

### Manual Command Creation
Create a test command manually:
```bash
curl -X POST https://your-railway-app.railway.app/api/doors/access/request \
  -H "Content-Type: application/json" \
  -d '{
    "doorId": 1,
    "userId": 1,
    "userName": "Test User",
    "reason": "Manual test"
  }'
```

### Check Command Status
```bash
curl https://your-railway-app.railway.app/api/doors/debug/commands/1
```

## Next Steps

1. **Run the test script** to identify the issue
2. **Check Railway logs** for detailed error messages
3. **Verify ESP32 polling** is working correctly
4. **Confirm door ID** matches between ESP32 and server
5. **Test manual command creation** to isolate the issue

The debugging tools will help pinpoint exactly where the communication is failing!