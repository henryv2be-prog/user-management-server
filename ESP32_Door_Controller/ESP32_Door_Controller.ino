#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>

// Pin definitions
const int BOOT_BUTTON_PIN = 0;  // GPIO0 (Boot button)
const int RELAY_PIN = 5;        // GPIO5 for relay control
const int LED_PIN = 2;          // GPIO2 for built-in LED (ESP32)
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

// Function declarations
void connectToWiFi(bool restartAPOnFailure = true);
void checkBootButton();
void handleBootButton();
void startAPMode();
void setupConfigWebServer();
void setupNormalWebServer();
void loadConfiguration();
void openDoor();
void closeDoor();
void sendHeartbeat();
void updateStatusLED();

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
  Serial.println("Checking boot button state...");
  checkBootButton();
  
  Serial.println("Configuration status:");
  Serial.println("- apMode: " + String(apMode));
  Serial.println("- isConfigured: " + String(isConfigured));
  Serial.println("- serverURL: " + serverURL);
  Serial.println("- deviceID: " + deviceID);
  
  if (apMode) {
    Serial.println("Starting AP mode (button was pressed)");
    startAPMode();
  } else if (isConfigured) {
    Serial.println("Configuration found, attempting to connect to WiFi...");
    connectToWiFi();
  } else {
    // No configuration, wait for button press
    Serial.println("No configuration found. Press and hold boot button for 3 seconds to enter configuration mode.");
    Serial.println("ESP32 will wait for button press - no AP will start automatically.");
    // Blink LED to indicate waiting for configuration
    for (int i = 0; i < 3; i++) {
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(500);
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(500);
    }
    Serial.println("Setup complete. Waiting for button press...");
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
  Serial.println("Checking boot button state...");
  int buttonState = digitalRead(BOOT_BUTTON_PIN);
  Serial.println("Boot button state: " + String(buttonState) + " (LOW=pressed, HIGH=released)");
  
  // Check if boot button is pressed during startup
  if (buttonState == LOW) {
    Serial.println("✅ Boot button pressed during startup - entering AP mode");
    apMode = true;
  } else {
    Serial.println("❌ Boot button not pressed - will not start AP mode");
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
  Serial.println("=== Starting AP mode for configuration ===");
  
  // Stop any existing WiFi connections
  Serial.println("Disconnecting from any existing WiFi...");
  WiFi.disconnect();
  Serial.println("Setting WiFi mode to OFF...");
  WiFi.mode(WIFI_OFF);
  delay(100);
  
  // Start AP
  Serial.println("Setting WiFi mode to AP...");
  WiFi.mode(WIFI_AP);
  Serial.println("Starting AP with SSID: " + String(AP_SSID));
  bool apStarted = WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  if (apStarted) {
    Serial.println("✅ AP started successfully!");
  } else {
    Serial.println("❌ Failed to start AP!");
  }
  
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
    html += ".container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }";
    html += "h1 { color: #333; text-align: center; }";
    html += "input, button, select { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }";
    html += "button { background: #007bff; color: white; border: none; cursor: pointer; }";
    html += "button:hover { background: #0056b3; }";
    html += "button.secondary { background: #6c757d; }";
    html += "button.secondary:hover { background: #5a6268; }";
    html += ".status { margin: 10px 0; padding: 10px; border-radius: 5px; }";
    html += ".success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }";
    html += ".error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }";
    html += ".wifi-list { max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }";
    html += ".wifi-item { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; }";
    html += ".wifi-item:hover { background: #f8f9fa; }";
    html += ".wifi-item:last-child { border-bottom: none; }";
    html += ".signal-strength { float: right; color: #666; }";
    html += ".loading { text-align: center; color: #666; }";
    html += "</style></head><body>";
    html += "<div class='container'>";
    html += "<h1>🔐 ESP32 Door Configuration</h1>";
    html += "<p>Configure your ESP32 door controller</p>";
    html += "<button onclick='scanWiFi()' class='secondary'>📡 Scan for WiFi Networks</button>";
    html += "<div id='wifiList' class='wifi-list' style='display: none;'></div>";
    html += "<form id='configForm'>";
    html += "<select id='ssid' required>";
    html += "<option value=''>Select WiFi Network...</option>";
    html += "</select>";
    html += "<input type='password' id='password' placeholder='WiFi Password'>";
    html += "<input type='text' id='serverUrl' placeholder='Server URL (e.g., http://192.168.1.100:3000)' required>";
    html += "<input type='text' id='deviceName' placeholder='Device Name (e.g., Main Entrance)' required>";
    html += "<button type='submit'>Configure & Connect</button>";
    html += "</form>";
    html += "<div id='status'></div>";
    html += "<script>";
    html += "function scanWiFi() {";
    html += "  const wifiList = document.getElementById('wifiList');";
    html += "  const ssidSelect = document.getElementById('ssid');";
    html += "  wifiList.innerHTML = '<div class=\"loading\">Scanning for WiFi networks...</div>';";
    html += "  wifiList.style.display = 'block';";
    html += "  fetch('/scan-wifi')";
    html += "    .then(response => response.json())";
    html += "    .then(data => {";
    html += "      wifiList.innerHTML = '';";
    html += "      ssidSelect.innerHTML = '<option value=\"\">Select WiFi Network...</option>';";
    html += "      data.networks.forEach(network => {";
    html += "        const item = document.createElement('div');";
    html += "        item.className = 'wifi-item';";
    html += "        item.innerHTML = network.ssid + '<span class=\"signal-strength\">' + network.rssi + ' dBm</span>';";
    html += "        item.onclick = () => {";
    html += "          ssidSelect.value = network.ssid;";
    html += "          wifiList.style.display = 'none';";
    html += "        };";
    html += "        wifiList.appendChild(item);";
    html += "        const option = document.createElement('option');";
    html += "        option.value = network.ssid;";
    html += "        option.textContent = network.ssid + ' (' + network.rssi + ' dBm)';";
    html += "        ssidSelect.appendChild(option);";
    html += "      });";
    html += "    })";
    html += "    .catch(error => {";
    html += "      wifiList.innerHTML = '<div class=\"error\">Failed to scan WiFi networks</div>';";
    html += "    });";
    html += "}";
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
        deviceID = "ESP32-" + WiFi.macAddress();
        deviceID.replace(":", "");
        preferences.putString("device_id", deviceID);
        
        // Update global variables
        isConfigured = true;
        serverURL = serverUrl;
        deviceName = deviceName;
        
        StaticJsonDocument<200> response;
        response["success"] = true;
        response["message"] = "Configuration saved! Connecting to WiFi...";
        
        String responseStr;
        serializeJson(response, responseStr);
        server.send(200, "application/json", responseStr);
        
        // Start connection process after a short delay
        delay(1000);
        connectToWiFi(true);
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
  
  // WiFi scan endpoint
  server.on("/scan-wifi", HTTP_GET, []() {
    Serial.println("Scanning for WiFi networks...");
    
    int n = WiFi.scanNetworks();
    StaticJsonDocument<1024> doc;
    JsonArray networks = doc.createNestedArray("networks");
    
    for (int i = 0; i < n; i++) {
      JsonObject network = networks.createNestedObject();
      network["ssid"] = WiFi.SSID(i);
      network["rssi"] = WiFi.RSSI(i);
      network["encryption"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "Open" : "Secured";
    }
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
    
    Serial.println("WiFi scan completed. Found " + String(n) + " networks.");
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
  Serial.println("=== Loading configuration from preferences ===");
  
  isConfigured = preferences.getBool("configured", false);
  Serial.println("isConfigured: " + String(isConfigured));
  
  if (isConfigured) {
    serverURL = preferences.getString("server_url", "");
    deviceID = preferences.getString("device_id", "");
    deviceName = preferences.getString("device_name", "");
    
    Serial.println("Configuration loaded:");
    Serial.println("- serverURL: '" + serverURL + "'");
    Serial.println("- deviceID: '" + deviceID + "'");
    Serial.println("- deviceName: '" + deviceName + "'");
  } else {
    Serial.println("No configuration found in preferences");
  }
}

void connectToWiFi(bool restartAPOnFailure) {
  Serial.println("=== connectToWiFi() called ===");
  Serial.println("restartAPOnFailure: " + String(restartAPOnFailure));
  
  if (!isConfigured) {
    Serial.println("ERROR: Not configured, cannot connect to WiFi");
    return;
  }
  
  String ssid = preferences.getString("wifi_ssid", "");
  String password = preferences.getString("wifi_password", "");
  
  Serial.println("Loaded WiFi credentials:");
  Serial.println("- SSID: '" + ssid + "'");
  Serial.println("- Password length: " + String(password.length()));
  
  if (ssid.length() == 0) {
    Serial.println("ERROR: No SSID found in preferences");
    return;
  }
  
  // Stop AP mode if it's running
  if (apMode) {
    Serial.println("Stopping AP mode before connecting to WiFi...");
    WiFi.softAPdisconnect(true);
    delay(2000); // Give time for AP to fully stop
  }
  
  Serial.println("Setting WiFi mode to STA...");
  WiFi.mode(WIFI_STA);
  
  Serial.println("Starting WiFi connection...");
  Serial.println("SSID: " + ssid);
  Serial.println("Password: " + String(password.length() > 0 ? "[HIDDEN]" : "[EMPTY]"));
  
  WiFi.begin(ssid.c_str(), password.c_str());
  
  Serial.println("WiFi.begin() called, waiting for connection...");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Print status every 5 attempts
    if (attempts % 5 == 0) {
      Serial.println();
      Serial.println("Attempt " + String(attempts) + "/20, Status: " + String(WiFi.status()));
    }
  }
  
  Serial.println();
  Serial.println("Connection attempt finished. Final status: " + String(WiFi.status()));
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("Signal strength: ");
    Serial.println(WiFi.RSSI());
    Serial.println("dBm");
    
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
    Serial.println("❌ Failed to connect to WiFi");
    Serial.println("WiFi Status Code: " + String(WiFi.status()));
    Serial.println("Possible reasons:");
    Serial.println("- Wrong SSID or password");
    Serial.println("- Network not available");
    Serial.println("- Signal too weak");
    Serial.println("- Network security issues");
    
    if (restartAPOnFailure) {
      Serial.println("Starting AP mode for reconfiguration...");
      // Return to AP mode for reconfiguration
      startAPMode();
    } else {
      Serial.println("Not restarting AP mode - will retry later");
    }
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
    html += "<p><strong>Status:</strong> ";
    html += (doorOpen ? "🔓 Open" : "🔒 Closed");
    html += "</p>";
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