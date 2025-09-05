#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>

// Pin definitions
const int BOOT_BUTTON_PIN = 0;  // GPIO0 (Boot button)
const int RELAY_PIN = 5;        // GPIO5 for relay control
const int LED_PIN = LED_BUILTIN; // Built-in LED
const int STATUS_LED_PIN = 2;   // GPIO2 for status indication

// WiFi AP Configuration
const char* AP_SSID = "ESP32-Door-Config";
const char* AP_PASSWORD = "";  // No password for easy access

// Server configuration (will be set via web interface)
String serverURL = "";
String deviceID = "";
String deviceName = "";

// WiFi credentials storage
Preferences preferences;
WebServer server(80);
HTTPClient http;

// Device state
bool isConfigured = false;
bool doorOpen = false;
bool apMode = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 10000; // 10 seconds

// Button state for AP activation
bool lastButtonState = HIGH;
bool buttonPressed = false;
unsigned long buttonPressTime = 0;
const unsigned long AP_ACTIVATION_TIME = 3000; // Hold for 3 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Initialize relay (door closed)
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Initialize preferences
  preferences.begin("door_config", false);
  
  // Load saved configuration
  loadConfiguration();
  
  // Check if we should start in AP mode
  checkBootButton();
  
  if (apMode) {
    startAPMode();
  } else if (isConfigured) {
    connectToWiFi();
  } else {
    // No configuration, start AP mode
    startAPMode();
  }
}

void loop() {
  // Handle button press for AP activation
  handleBootButton();
  
  if (apMode) {
    // In AP mode, handle web server
    server.handleClient();
  } else if (isConfigured && WiFi.status() == WL_CONNECTED) {
    // Connected to WiFi, handle normal operation
    server.handleClient();
    
    // Send heartbeat to server
    if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
      sendHeartbeat();
      lastHeartbeat = millis();
    }
  } else if (isConfigured) {
    // Try to reconnect to WiFi
    connectToWiFi();
  }
  
  // Update status LED
  updateStatusLED();
}

void checkBootButton() {
  // Check if boot button is pressed during startup
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    Serial.println("Boot button pressed during startup - entering AP mode");
    apMode = true;
  }
}

void handleBootButton() {
  bool currentButtonState = digitalRead(BOOT_BUTTON_PIN);
  
  if (currentButtonState == LOW && lastButtonState == HIGH) {
    // Button just pressed
    buttonPressTime = millis();
    buttonPressed = true;
    Serial.println("Boot button pressed");
  }
  
  if (buttonPressed && currentButtonState == HIGH) {
    // Button released
    buttonPressed = false;
    unsigned long pressDuration = millis() - buttonPressTime;
    
    if (pressDuration >= AP_ACTIVATION_TIME) {
      // Long press - activate AP mode
      Serial.println("Long press detected - activating AP mode");
      startAPMode();
    }
  }
  
  lastButtonState = currentButtonState;
}

void startAPMode() {
  Serial.println("Starting AP mode for configuration");
  
  // Stop any existing WiFi connections
  WiFi.disconnect();
  WiFi.mode(WIFI_OFF);
  delay(100);
  
  // Start AP
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  IPAddress apIP = WiFi.softAPIP();
  Serial.print("AP started with IP: ");
  Serial.println(apIP);
  
  // Setup web server for configuration
  setupConfigWebServer();
  server.begin();
  
  apMode = true;
  
  // Blink LED to indicate AP mode
  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(200);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(200);
  }
}

void setupConfigWebServer() {
  // Root page - WiFi configuration
  server.on("/", []() {
    String html = "<!DOCTYPE html><html><head><title>ESP32 Door Configuration</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }";
    html += ".container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }";
    html += "h1 { color: #333; text-align: center; }";
    html += "input, button { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px; }";
    html += "button { background: #007bff; color: white; border: none; cursor: pointer; }";
    html += "button:hover { background: #0056b3; }";
    html += ".status { margin: 10px 0; padding: 10px; border-radius: 5px; }";
    html += ".success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }";
    html += ".error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }";
    html += "</style></head><body>";
    html += "<div class='container'>";
    html += "<h1>🔐 ESP32 Door Configuration</h1>";
    html += "<p>Configure your ESP32 door controller</p>";
    html += "<form id='configForm'>";
    html += "<input type='text' id='ssid' placeholder='WiFi Network Name (SSID)' required>";
    html += "<input type='password' id='password' placeholder='WiFi Password'>";
    html += "<input type='text' id='serverUrl' placeholder='Server URL (e.g., http://192.168.1.100:3000)' required>";
    html += "<input type='text' id='deviceName' placeholder='Device Name (e.g., Main Entrance)' required>";
    html += "<button type='submit'>Configure & Connect</button>";
    html += "</form>";
    html += "<div id='status'></div>";
    html += "<script>";
    html += "document.getElementById('configForm').addEventListener('submit', function(e) {";
    html += "  e.preventDefault();";
    html += "  const formData = {";
    html += "    ssid: document.getElementById('ssid').value,";
    html += "    password: document.getElementById('password').value,";
    html += "    serverUrl: document.getElementById('serverUrl').value,";
    html += "    deviceName: document.getElementById('deviceName').value";
    html += "  };";
    html += "  fetch('/configure', {";
    html += "    method: 'POST',";
    html += "    headers: {'Content-Type': 'application/json'},";
    html += "    body: JSON.stringify(formData)";
    html += "  }).then(response => response.json())";
    html += "    .then(data => {";
    html += "      const status = document.getElementById('status');";
    html += "      if (data.success) {";
    html += "        status.innerHTML = '<div class=\"status success\">' + data.message + '</div>';";
    html += "        setTimeout(() => { window.location.reload(); }, 3000);";
    html += "      } else {";
    html += "        status.innerHTML = '<div class=\"status error\">' + data.message + '</div>';";
    html += "      }";
    html += "    });";
    html += "});";
    html += "</script>";
    html += "</div></body></html>";
    
    server.send(200, "text/html", html);
  });
  
  // Configuration endpoint
  server.on("/configure", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      StaticJsonDocument<300> doc;
      deserializeJson(doc, server.arg("plain"));
      
      String ssid = doc["ssid"];
      String password = doc["password"];
      String serverUrl = doc["serverUrl"];
      String deviceName = doc["deviceName"];
      
      if (ssid.length() > 0 && serverUrl.length() > 0 && deviceName.length() > 0) {
        // Save configuration
        preferences.putString("wifi_ssid", ssid);
        preferences.putString("wifi_password", password);
        preferences.putString("server_url", serverUrl);
        preferences.putString("device_name", deviceName);
        preferences.putBool("configured", true);
        
        // Generate device ID
        String deviceID = "ESP32-" + WiFi.macAddress();
        deviceID.replace(":", "");
        preferences.putString("device_id", deviceID);
        
        StaticJsonDocument<200> response;
        response["success"] = true;
        response["message"] = "Configuration saved! Connecting to WiFi...";
        
        String responseStr;
        serializeJson(response, responseStr);
        server.send(200, "application/json", responseStr);
        
        // Start connection process
        delay(1000);
        connectToWiFi();
      } else {
        StaticJsonDocument<200> response;
        response["success"] = false;
        response["message"] = "Please fill in all required fields";
        
        String responseStr;
        serializeJson(response, responseStr);
        server.send(400, "application/json", responseStr);
      }
    } else {
      server.send(400, "application/json", "{\"success\": false, \"message\": \"No data received\"}");
    }
  });
  
  // Status endpoint
  server.on("/status", HTTP_GET, []() {
    StaticJsonDocument<200> doc;
    doc["apMode"] = apMode;
    doc["configured"] = isConfigured;
    doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
    doc["deviceID"] = deviceID;
    doc["deviceName"] = deviceName;
    doc["serverURL"] = serverURL;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
}

void loadConfiguration() {
  isConfigured = preferences.getBool("configured", false);
  if (isConfigured) {
    serverURL = preferences.getString("server_url", "");
    deviceID = preferences.getString("device_id", "");
    deviceName = preferences.getString("device_name", "");
  }
}

void connectToWiFi() {
  if (!isConfigured) return;
  
  String ssid = preferences.getString("wifi_ssid", "");
  String password = preferences.getString("wifi_password", "");
  
  if (ssid.length() == 0) return;
  
  Serial.println("Connecting to WiFi: " + ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
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
    
    // Stop AP mode
    WiFi.softAPdisconnect(true);
    apMode = false;
    
    // Setup normal operation web server
    setupNormalWebServer();
    server.begin();
    
    // Blink LED to indicate successful connection
    for (int i = 0; i < 3; i++) {
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(200);
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(200);
    }
  } else {
    Serial.println("Failed to connect to WiFi");
    // Return to AP mode for reconfiguration
    startAPMode();
  }
}

void setupNormalWebServer() {
  // Device discovery endpoint
  server.on("/discover", HTTP_GET, []() {
    StaticJsonDocument<300> doc;
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["name"] = deviceName;
    doc["deviceID"] = deviceID;
    doc["status"] = "online";
    doc["deviceType"] = "ESP32";
    doc["firmware"] = "1.0.0";
    doc["signal"] = WiFi.RSSI();
    doc["lastSeen"] = millis();
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // Door control endpoint (for server commands)
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
  
  // Status endpoint
  server.on("/status", HTTP_GET, []() {
    StaticJsonDocument<200> doc;
    doc["status"] = "online";
    doc["doorOpen"] = doorOpen;
    doc["deviceID"] = deviceID;
    doc["deviceName"] = deviceName;
    doc["uptime"] = millis();
    doc["freeHeap"] = ESP.getFreeHeap();
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });
  
  // Root endpoint - simple status page
  server.on("/", []() {
    String html = "<!DOCTYPE html><html><head><title>ESP32 Door Controller</title></head><body>";
    html += "<h1>🔐 ESP32 Door Controller</h1>";
    html += "<p><strong>Device:</strong> " + deviceName + "</p>";
    html += "<p><strong>ID:</strong> " + deviceID + "</p>";
    html += "<p><strong>IP:</strong> " + WiFi.localIP().toString() + "</p>";
    html += "<p><strong>Status:</strong> " + (doorOpen ? "🔓 Open" : "🔒 Closed") + "</p>";
    html += "<p><strong>Uptime:</strong> " + String(millis() / 1000) + " seconds</p>";
    html += "<p><strong>Free Memory:</strong> " + String(ESP.getFreeHeap()) + " bytes</p>";
    html += "<hr>";
    html += "<p><em>This device is configured and connected to your access control system.</em></p>";
    html += "</body></html>";
    
    server.send(200, "text/html", html);
  });
}

void openDoor() {
  digitalWrite(RELAY_PIN, HIGH);  // Activate relay
  doorOpen = true;
  Serial.println("Door opened via GPIO5");
  
  // Auto-close after 5 seconds
  delay(5000);
  closeDoor();
}

void closeDoor() {
  digitalWrite(RELAY_PIN, LOW);   // Deactivate relay
  doorOpen = false;
  Serial.println("Door closed via GPIO5");
}

void sendHeartbeat() {
  if (serverURL.length() == 0) return;
  
  http.begin(serverURL + "/api/doors/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> doc;
  doc["deviceID"] = deviceID;
  doc["deviceName"] = deviceName;
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = WiFi.macAddress();
  doc["status"] = "online";
  doc["doorOpen"] = doorOpen;
  doc["signal"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["uptime"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Heartbeat sent successfully: " + String(httpResponseCode));
  } else {
    Serial.println("Heartbeat failed: " + String(httpResponseCode));
  }
  
  http.end();
}

void updateStatusLED() {
  if (apMode) {
    // Blink slowly in AP mode
    digitalWrite(STATUS_LED_PIN, (millis() / 1000) % 2);
  } else if (WiFi.status() == WL_CONNECTED) {
    // Solid on when connected
    digitalWrite(STATUS_LED_PIN, HIGH);
  } else {
    // Fast blink when disconnected
    digitalWrite(STATUS_LED_PIN, (millis() / 200) % 2);
  }
}
