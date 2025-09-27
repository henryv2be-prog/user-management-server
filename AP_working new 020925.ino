#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <mbedtls/md.h>

// Pins
#define RELAY_PIN 5

// Wi-Fi AP
const char* AP_SSID = "SecureDoor";
const char* AP_PASS = "ChangeThis123"; // WPA2-PSK

// Relay timing
static const uint32_t RELAY_ON_MS = 1500;
static const uint32_t RELAY_COOLDOWN_MS = 5000;

// NVS
static const char* PREF_NAMESPACE = "door";
static const char* PREF_SECRET_KEY = "secret";

Preferences prefs;
AsyncWebServer server(80);

// State
String sharedSecret;                 // HMAC secret (from NVS)
String lastNonceHex;                 // outstanding nonce (hex)
uint32_t lastNonceExpiresMs = 0;     // nonce expiry time
bool lastNonceUsed = true;           // single-use

bool relayActive = false;
uint32_t relayOffAtMs = 0;
uint32_t lastTriggerAtMs = 0;

// ===== Utils =====
static String bytesToHex(const uint8_t* data, size_t len) {
  static const char* hex = "0123456789abcdef";
  String out; out.reserve(len * 2);
  for (size_t i = 0; i < len; ++i) {
    out += hex[(data[i] >> 4) & 0xF];
    out += hex[data[i] & 0xF];
  }
  return out;
}

static String generateNonceHex(size_t numBytes) {
  String out; out.reserve(numBytes * 2);
  for (size_t i = 0; i < numBytes; ++i) {
    uint8_t b = (uint8_t)(esp_random() & 0xFF);
    static const char* hex = "0123456789abcdef";
    out += hex[(b >> 4) & 0xF];
    out += hex[b & 0xF];
  }
  return out;
}

static String hmacSha256Hex(const String& key, const String& msg) {
  const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  uint8_t out[32];

  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, md, 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char*)key.c_str(), key.length());
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)msg.c_str(), msg.length());
  mbedtls_md_hmac_finish(&ctx, out);
  mbedtls_md_free(&ctx);

  return bytesToHex(out, sizeof(out));
}

static inline String toLowerStr(String s) { s.toLowerCase(); return s; }

// ===== Relay =====
static void triggerRelayIfOk() {
  uint32_t now = millis();
  if (relayActive) return;
  if (now - lastTriggerAtMs < RELAY_COOLDOWN_MS) return;

  relayActive = true;
  relayOffAtMs = now + RELAY_ON_MS;
  lastTriggerAtMs = now;
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("[RELAY] ON");
}

static void handleRelayState() {
  if (relayActive && millis() >= relayOffAtMs) {
    relayActive = false;
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("[RELAY] OFF");
  }
}

// ===== Secret =====
static void loadSecret() {
  prefs.begin(PREF_NAMESPACE, true);
  sharedSecret = prefs.getString(PREF_SECRET_KEY, "");
  prefs.end();
  Serial.printf("[NVS] Loaded secret: %s\n", sharedSecret.length() ? "(set)" : "(not set)");
}

static void saveSecret(const String& s) {
  prefs.begin(PREF_NAMESPACE, false);
  prefs.putString(PREF_SECRET_KEY, s);
  prefs.end();
  sharedSecret = s;
  Serial.println("[NVS] Secret saved");
}

// ===== Handlers =====
static void handleRoot(AsyncWebServerRequest* request) {
  String page = F("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                  "<title>HMAC Door</title><style>body{font-family:sans-serif;margin:1.5rem}input,button{font-size:1.1rem}</style>"
                  "<h1>HMAC Door</h1><p>AP SSID: ");
  page += AP_SSID;
  page += F("</p><p>Secret: ");
  page += sharedSecret.length() ? "SET" : "NOT SET";
  page += F("</p><h3>Set/Update Secret</h3>"
            "<form action='/set_secret' method='POST'>"
            "Secret: <input name='secret' type='password'/> "
            "<button type='submit'>Save</button></form>"
            "<h3>Client</h3><p>Open <a href='/client'>/client</a> to auto-trigger.</p>");
  request->send(200, "text/html", page);
}

static void handleSetSecret(AsyncWebServerRequest* request, bool isPost) {
  String s;
  if (isPost) {
    if (!request->hasParam("secret", true)) { request->send(400, "text/plain", "Missing secret"); return; }
    s = request->getParam("secret", true)->value();
  } else {
    if (!request->hasParam("secret")) { request->send(400, "text/plain", "Missing secret"); return; }
    s = request->getParam("secret")->value();
  }
  s.trim();
  if (s.length() < 8) { request->send(400, "text/plain", "Secret too short (min 8)"); return; }
  saveSecret(s);
  request->redirect("/");
}

static void handleChallenge(AsyncWebServerRequest* request) {
  if (sharedSecret.isEmpty()) { request->send(400, "application/json", "{\"error\":\"secret_not_set\"}"); return; }
  lastNonceHex = generateNonceHex(16);      // 16 bytes -> 32 hex
  lastNonceExpiresMs = millis() + 30000;    // 30s TTL
  lastNonceUsed = false;
  String body = String("{\"nonce\":\"") + lastNonceHex + "\"}";
  request->send(200, "application/json", body);
  Serial.printf("[AUTH] Issued nonce: %s\n", lastNonceHex.c_str());
}

static void handleProve(AsyncWebServerRequest* request, bool isPost) {
  if (sharedSecret.isEmpty()) { request->send(400, "application/json", "{\"ok\":false,\"error\":\"secret_not_set\"}"); return; }

  auto getVal = [&](const char* name)->String {
    if (isPost) {
      return request->hasParam(name, true) ? request->getParam(name, true)->value() : String();
    } else {
      return request->hasParam(name) ? request->getParam(name)->value() : String();
    }
  };

  String nonce = toLowerStr(getVal("nonce"));
  String hmac  = toLowerStr(getVal("hmac"));
  if (nonce.isEmpty() || hmac.isEmpty()) { request->send(400, "application/json", "{\"ok\":false,\"error\":\"missing_params\"}"); return; }
  if (lastNonceUsed || nonce != lastNonceHex || millis() > lastNonceExpiresMs) {
    request->send(400, "application/json", "{\"ok\":false,\"error\":\"invalid_or_expired_nonce\"}");
    return;
  }

  String expected = hmacSha256Hex(sharedSecret, nonce);
  Serial.printf("[AUTH] nonce=%s client=%s expected=%s\n", nonce.c_str(), hmac.c_str(), expected.c_str());

  if (hmac == expected) {
    lastNonceUsed = true;
    triggerRelayIfOk();
    request->send(200, "application/json", "{\"ok\":true}");
    Serial.println("[AUTH] Proof OK -> relay triggered");
  } else {
    request->send(401, "application/json", "{\"ok\":false,\"error\":\"bad_hmac\"}");
    Serial.println("[AUTH] Proof FAILED (bad HMAC)");
  }
}

static void handleClient(AsyncWebServerRequest* req) {
  Serial.println("[CLIENT] Client page requested");
  // Simple, working client
  const char* html =
"<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
"<title>Door Access</title>"
"<style>"
"body{font-family:Arial,sans-serif;margin:20px;background:#f0f0f0}"
".container{max-width:400px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}"
"h1{color:#333;text-align:center}"
".status{background:#e8f4fd;padding:15px;margin:15px 0;border-radius:5px;text-align:center;font-weight:bold}"
".config{background:#f9f9f9;padding:15px;margin:15px 0;border-radius:5px;border:2px dashed #ccc}"
".actions{text-align:center}"
"input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}"
"button{background:#007bff;color:white;border:none;padding:10px 20px;margin:5px;border-radius:5px;cursor:pointer}"
"button:hover{background:#0056b3}"
".success{background:#28a745}"
".secondary{background:#6c757d}"
"</style>"
"<div class='container'>"
"<h1>🚪 Door Access</h1>"
"<div id='status' class='status'>Loading...</div>"
"<div id='config' class='config' style='display:none'>"
"<h3>Set Secret</h3>"
"<input id='secret' type='password' placeholder='Enter secret (min 8 chars)'/>"
"<button onclick='saveSecret()' class='success'>Save</button>"
"<button onclick='clearSecret()' class='secondary'>Clear</button>"
"</div>"
"<div id='actions' class='actions' style='display:none'>"
"<button onclick='triggerDoor()' class='success' style='font-size:18px;padding:15px 30px'>Open Door</button><br><br>"
"<button onclick='showConfig()' class='secondary'>Change Secret</button>"
"</div>"
"</div>"
"<script>"
"// Simple HMAC functions"
"function hex(a){return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}"
"function rotr(n,x){return(x>>>n)|(x<<(32-n))}"
"function encUTF8(s){const out=[];for(let i=0;i<s.length;i++){let c=s.charCodeAt(i);"
" if(c<0x80){out.push(c);}else if(c<0x800){out.push(0xC0|(c>>6),0x80|(c&63));}"
" else if((c&0xFC00)==0xD800 && i+1<s.length && (s.charCodeAt(i+1)&0xFC00)==0xDC00){"
"  const cp=0x10000+((c&0x3FF)<<10)+(s.charCodeAt(++i)&0x3FF);"
"  out.push(0xF0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63));"
" }else{out.push(0xE0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));}} return new Uint8Array(out);}"
"function sha256_bytes(bytes){const K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];"
" let H=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];"
" const l=bytes.length, newLen=((l+9+63)>>6)<<6; const m=new Uint8Array(newLen); m.set(bytes,0); m[l]=0x80;"
" const bitLen=(l*8)>>>0, hi=(l/0x20000000)>>>0; const ml=m.length;"
" m[ml-8]=(hi>>>24)&255; m[ml-7]=(hi>>>16)&255; m[ml-6]=(hi>>>8)&255; m[ml-5]=hi&255;"
" m[ml-4]=(bitLen>>>24)&255; m[ml-3]=(bitLen>>>16)&255; m[ml-2]=(bitLen>>>8)&255; m[ml-1]=bitLen&255;"
" const view=new DataView(m.buffer); const W=new Uint32Array(64);"
" for(let i=0;i<m.length;i+=64){for(let t=0;t<16;t++)W[t]=view.getUint32(i+t*4,false);"
"  for(let t=16;t<64;t++){const s0=rotr(7,W[t-15])^rotr(18,W[t-15])^(W[t-15]>>>3); const s1=rotr(17,W[t-2])^rotr(19,W[t-2])^(W[t-2]>>>10); W[t]=(W[t-16]+s0+W[t-7]+s1)>>>0;}"
"  let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];"
"  for(let t=0;t<64;t++){const S1=rotr(6,e)^rotr(11,e)^rotr(25,e),ch=(e&f)^(~e&g),T1=(h+S1+ch+K[t]+W[t])>>>0; const S0=rotr(2,a)^rotr(13,a)^rotr(22,a),maj=(a&b)^(a&c)^(b&c),T2=(S0+maj)>>>0; h=g; g=f; f=e; e=(d+T1)>>>0; d=c; c=b; b=a; a=(T1+T2)>>>0;}"
"  H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0; H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;}"
" const out=new Uint8Array(32); const dv=new DataView(out.buffer); for(let j=0;j<8;j++) dv.setUint32(j*4,H[j],false); return out;}"
"function hmacSha256Fallback(secret,msg){let k=encUTF8(secret); if(k.length>64) k=sha256_bytes(k);"
" const ipad=new Uint8Array(64), opad=new Uint8Array(64); ipad.fill(0x36); opad.fill(0x5c);"
" for(let i=0;i<k.length;i++){ipad[i]^=k[i]; opad[i]^=k[i];}"
" const inner=sha256_bytes(new Uint8Array([...ipad,...encUTF8(msg)]));"
" const outer=sha256_bytes(new Uint8Array([...opad,...inner]));"
" return hex(outer);}"
"async function hmacSHA256(secret,msg){try{if(window.crypto&&crypto.subtle){"
" const key=await crypto.subtle.importKey('raw', encUTF8(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);"
" const sig=await crypto.subtle.sign('HMAC', key, encUTF8(msg)); return hex(new Uint8Array(sig));}}catch(e){}"
" return hmacSha256Fallback(secret,msg);}"
"// Simple functions"
"function updateStatus(msg){"
" const status=document.getElementById('status');"
" if(status) status.textContent=msg;"
"}"
"function showConfig(){"
" document.getElementById('config').style.display='block';"
" document.getElementById('actions').style.display='none';"
"}"
"async function triggerDoor(){"
" try{"
"  updateStatus('Requesting challenge...');"
"  const r=await fetch('/challenge');"
"  if(!r.ok){updateStatus('Challenge failed'); return}"
"  const {nonce}=await r.json();"
"  updateStatus('Proving identity...');"
"  const secret=localStorage.getItem('door_secret');"
"  const sig=await hmacSHA256(secret, nonce);"
"  const body='nonce='+nonce+'&hmac='+sig;"
"  const p=await fetch('/prove',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});"
"  const result=await p.text();"
"  if(result.includes('\"ok\":true')){"
"   updateStatus('Door opened successfully!');"
"  }else{"
"   updateStatus('Authentication failed');"
"  }"
" }catch(e){updateStatus('Error: ' + e.message)}"
"}"
"function saveSecret(){"
" const v=document.getElementById('secret').value.trim();"
" if(v.length<8){alert('Secret must be at least 8 characters long'); return}"
" localStorage.setItem('door_secret', v);"
" document.getElementById('config').style.display='none';"
" document.getElementById('actions').style.display='block';"
" updateStatus('Secret saved successfully!');"
"}"
"function clearSecret(){"
" localStorage.removeItem('door_secret');"
" document.getElementById('config').style.display='block';"
" document.getElementById('actions').style.display='none';"
" document.getElementById('secret').value='';"
" updateStatus('Secret cleared. Please enter a new one.');"
"}"
"// Simple initialization"
"function init(){"
" const status=document.getElementById('status');"
" const config=document.getElementById('config');"
" const actions=document.getElementById('actions');"
" if(!status||!config||!actions) return;"
" const secret=localStorage.getItem('door_secret');"
" if(!secret){"
"  config.style.display='block';"
"  actions.style.display='none';"
"  status.textContent='Please set your access secret first.';"
" }else{"
"  config.style.display='none';"
"  actions.style.display='block';"
"  status.textContent='Ready to open door';"
" }"
"}"
"// Start immediately"
"init();"
"// Also try when DOM is ready"
"document.addEventListener('DOMContentLoaded', init);"
"// Final fallback"
"setTimeout(init, 1000);"
"</script>";
  req->send(200, "text/html", html);
}

// ===== Door Control Handler =====
void handleDoorControl(AsyncWebServerRequest* request) {
  if (!request->hasParam("plain", true)) {
    request->send(400, "application/json", "{\"success\": false, \"message\": \"No data received\"}");
    return;
  }
  
  String body = request->getParam("plain", true)->value();
  Serial.println("[DOOR] Received: " + body);
  
  // Simple JSON parsing for {"action": "open"} or {"action": "close"}
  if (body.indexOf("\"action\"") >= 0) {
    if (body.indexOf("\"open\"") >= 0) {
      Serial.println("[DOOR] Opening door via GPIO5");
      digitalWrite(RELAY_PIN, HIGH);
      relayActive = true;
      relayOffAtMs = millis() + RELAY_ON_MS;
      request->send(200, "application/json", "{\"success\": true, \"message\": \"Door opened\"}");
    } else if (body.indexOf("\"close\"") >= 0) {
      Serial.println("[DOOR] Closing door via GPIO5");
      digitalWrite(RELAY_PIN, LOW);
      relayActive = false;
      request->send(200, "application/json", "{\"success\": true, \"message\": \"Door closed\"}");
    } else {
      request->send(400, "application/json", "{\"success\": false, \"message\": \"Invalid action\"}");
    }
  } else {
    request->send(400, "application/json", "{\"success\": false, \"message\": \"No action specified\"}");
  }
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("[SETUP] Starting...");

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("[SETUP] Relay pin configured");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("[AP] SSID: "); Serial.println(AP_SSID);
  Serial.print("[AP] IP: "); Serial.println(WiFi.softAPIP());

  loadSecret();
  Serial.println("[SETUP] Secret loaded");

  // CORS
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");
  Serial.println("[SETUP] CORS headers set");

  // OPTIONS handler and 404
  server.onNotFound([](AsyncWebServerRequest* request){
    if (request->method() == HTTP_OPTIONS) request->send(204);
    else request->send(404, "text/plain", "Not found");
  });

  // Routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/set_secret", HTTP_POST, [](AsyncWebServerRequest* r){ handleSetSecret(r, true); });
  server.on("/set_secret", HTTP_GET,  [](AsyncWebServerRequest* r){ handleSetSecret(r, false); });
  server.on("/challenge",  HTTP_GET,  handleChallenge);
  server.on("/prove",      HTTP_POST, [](AsyncWebServerRequest* r){ handleProve(r, true); });
  server.on("/prove",      HTTP_GET,  [](AsyncWebServerRequest* r){ handleProve(r, false); });
  server.on("/client",     HTTP_GET,  handleClient);
  server.on("/door",       HTTP_POST, handleDoorControl);
  Serial.println("[SETUP] Routes configured");

  server.begin();
  Serial.println("[HTTP] Server started");
  Serial.println("[SETUP] Setup complete!");
}

void loop() {
  handleRelayState();
  delay(5);
}