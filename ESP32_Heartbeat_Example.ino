#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/doors/heartbeat";
const int RELAY_PIN = 2; // GPIO pin for door relay
const int LED_PIN = LED_BUILTIN; // Built-in LED

// Device information
const String deviceName = "ESP32-Door-001";
String macAddress = "";
String ipAddress = "";

// Heartbeat configuration
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
    ipAddress = WiFi.localIP().toString();
    Serial.print("IP address: ");
    Serial.println(ipAddress);
    Serial.print("MAC address: ");
    Serial.println(macAddress);
    
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
  // Send heartbeat to server
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Keep LED on when connected
  digitalWrite(LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["mac"] = macAddress;
    doc["ip"] = ipAddress;
    doc["name"] = deviceName;
    doc["status"] = "online";
    doc["lastSeen"] = millis();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Heartbeat sent successfully. Response: " + response);
    } else {
      Serial.println("Error sending heartbeat. HTTP code: " + String(httpResponseCode));
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected, cannot send heartbeat");
  }
}