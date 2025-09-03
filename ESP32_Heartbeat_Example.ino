/*
 * ESP32 Door Controller with Heartbeat
 * 
 * This example shows how to send periodic heartbeats to the server
 * to maintain "Online" status in the door management system.
 * 
 * Required Libraries:
 * - WiFi
 * - HTTPClient
 * - ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* serverURL = "http://YOUR_SERVER_IP:3000";  // Replace with your server IP
const char* esp32IP = "192.168.1.100";  // This ESP32's IP address (as configured in door settings)
const char* esp32MAC = "AA:BB:CC:DD:EE:FF";  // This ESP32's MAC address

// Heartbeat Configuration
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 60000;  // Send heartbeat every 60 seconds

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Send initial heartbeat
  sendHeartbeat();
}

void loop() {
  // Check if it's time to send heartbeat
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
  }
  
  // Your main door controller logic here
  // - Read RFID cards
  // - Control door lock
  // - Handle access requests
  
  delay(100);
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(serverURL) + "/api/doors/heartbeat");
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    DynamicJsonDocument doc(200);
    doc["esp32_ip"] = esp32IP;
    doc["esp32_mac"] = esp32MAC;
    doc["status"] = "online";
    doc["timestamp"] = millis();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send POST request
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Heartbeat sent successfully");
      Serial.println("Response: " + response);
      lastHeartbeat = millis();
    } else {
      Serial.println("Error sending heartbeat: " + String(httpResponseCode));
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected - cannot send heartbeat");
  }
}

// Example access verification function
void verifyAccess(int userId) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(serverURL) + "/api/doors/" + String(getDoorId()) + "/verify-access");
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    DynamicJsonDocument doc(200);
    doc["userId"] = userId;
    doc["secretKey"] = "YOUR_DOOR_SECRET_KEY";  // Get this from door creation
    doc["accessMethod"] = "rfid";
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send POST request
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      
      // Parse response
      DynamicJsonDocument responseDoc(512);
      deserializeJson(responseDoc, response);
      
      bool accessGranted = responseDoc["access_granted"];
      
      if (accessGranted) {
        Serial.println("Access GRANTED");
        unlockDoor();
      } else {
        Serial.println("Access DENIED");
        denyAccess();
      }
    } else {
      Serial.println("Error verifying access: " + String(httpResponseCode));
      denyAccess();  // Fail secure
    }
    
    http.end();
  }
}

// Helper functions (implement based on your hardware)
int getDoorId() {
  // Return the door ID from your server configuration
  return 1;  // Replace with actual door ID
}

void unlockDoor() {
  // Implement your door unlock logic
  Serial.println("🔓 Door unlocked!");
  // digitalWrite(DOOR_LOCK_PIN, HIGH);
  // delay(3000);
  // digitalWrite(DOOR_LOCK_PIN, LOW);
}

void denyAccess() {
  // Implement access denied logic
  Serial.println("🔒 Access denied!");
  // Flash red LED, beep buzzer, etc.
}
