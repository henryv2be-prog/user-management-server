#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
WebServer server(80);
const int RELAY_PIN = 2; // GPIO pin for door relay
const int LED_PIN = LED_BUILTIN; // Built-in LED

// Device information
const String deviceName = "ESP32-Door-001";
const String deviceType = "ESP32";
const String firmwareVersion = "1.0.0";
String macAddress = "";

// Door state
bool doorOpen = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // Get MAC address
  macAddress = WiFi.macAddress();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC address: ");
    Serial.println(macAddress);
    
    // Start web server
    setupWebServer();
    server.begin();
    
    // Blink LED to indicate successful connection
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  } else {
    Serial.println("Failed to connect to WiFi");
    // Blink LED rapidly to indicate error
    for (int i = 0; i < 10; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  }
}

void loop() {
  server.handleClient();
  
  // Send heartbeat to server
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Keep LED on when door is open
  digitalWrite(LED_PIN, doorOpen ? HIGH : LOW);
}

void setupWebServer() {
  // Device discovery endpoint
  server.on("/discover", HTTP_GET, []() {
    StaticJsonDocument<200> doc;
    doc["mac"] = macAddress;
    doc["ip"] = WiFi.localIP().toString();
    doc["name"] = deviceName;
    doc["status"] = "online";
    doc["deviceType"] = deviceType;
    doc["firmware"] = firmwareVersion;
    doc["signal"] = WiFi.RSSI();
    doc["lastSeen"] = millis();
    
    String response;
    serializeJson(doc, response);
    
    server.send(200, "application/json", response);
  });
  
  // Status endpoint
  server.on("/status", HTTP_GET, []() {
    StaticJsonDocument<200> doc;
    doc["status"] = "online";
    doc["doorOpen"] = doorOpen;
    doc["uptime"] = millis();
    doc["freeHeap"] = ESP.getFreeHeap();
    
    String response;
    serializeJson(doc, response);
    
    server.send(200, "application/json", response);
  });
  
  // Door control endpoint
  server.on("/door", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      StaticJsonDocument<100> doc;
      deserializeJson(doc, server.arg("plain"));
      
      if (doc.containsKey("action")) {
        String action = doc["action"];
        
        if (action == "open") {
          openDoor();
          server.send(200, "application/json", "{\"success\": true, \"message\": \"Door opened\"}");
        } else if (action == "close") {
          closeDoor();
          server.send(200, "application/json", "{\"success\": true, \"message\": \"Door closed\"}");
        } else {
          server.send(400, "application/json", "{\"success\": false, \"message\": \"Invalid action\"}");
        }
      } else {
        server.send(400, "application/json", "{\"success\": false, \"message\": \"No action specified\"}");
      }
    } else {
      server.send(400, "application/json", "{\"success\": false, \"message\": \"No data received\"}");
    }
  });
  
  // Root endpoint
  server.on("/", []() {
    String html = "<!DOCTYPE html><html><head><title>ESP32 Door Controller</title></head><body>";
    html += "<h1>ESP32 Door Controller</h1>";
    html += "<p><strong>Device:</strong> " + deviceName + "</p>";
    html += "<p><strong>MAC:</strong> " + macAddress + "</p>";
    html += "<p><strong>IP:</strong> " + WiFi.localIP().toString() + "</p>";
    html += "<p><strong>Status:</strong> " + (doorOpen ? "Open" : "Closed") + "</p>";
    html += "<p><strong>Uptime:</strong> " + String(millis() / 1000) + " seconds</p>";
    html += "<p><strong>Free Heap:</strong> " + String(ESP.getFreeHeap()) + " bytes</p>";
    html += "<h2>Controls</h2>";
    html += "<button onclick=\"controlDoor('open')\">Open Door</button> ";
    html += "<button onclick=\"controlDoor('close')\">Close Door</button>";
    html += "<script>";
    html += "function controlDoor(action) {";
    html += "  fetch('/door', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: action})})";
    html += "    .then(response => response.json())";
    html += "    .then(data => alert(data.message));";
    html += "}";
    html += "</script>";
    html += "</body></html>";
    
    server.send(200, "text/html", html);
  });
}

void openDoor() {
  digitalWrite(RELAY_PIN, HIGH);
  doorOpen = true;
  Serial.println("Door opened");
}

void closeDoor() {
  digitalWrite(RELAY_PIN, LOW);
  doorOpen = false;
  Serial.println("Door closed");
}

void sendHeartbeat() {
  // In a real implementation, this would send a heartbeat to your server
  // For now, we'll just print to serial
  Serial.println("Heartbeat sent");
}
