# 🔐 Login Won't Work - Troubleshooting Guide

## Quick Diagnosis

### Step 1: Test Server Connection
Visit: `http://YOUR_COMPUTER_IP:3001/server-test.html`

**Expected Results:**
- ✅ "Server connection successful" 
- ✅ "Login endpoint is working"

**If you see errors:**
- ❌ Server connection failed → Main server not running
- ❌ Network error → Firewall or IP address issue

### Step 2: Check Server Status
**Both servers must be running:**

1. **Main Server (Port 3000):** Handles authentication
2. **PWA Server (Port 3001):** Serves the mobile app

## Common Issues & Solutions

### Issue 1: "Network Error" or "Connection Failed"

**Cause:** Main server not running
**Solution:**
```bash
# Start main server
cd user-management-server
node server.js
```

**Verify:** Check `http://localhost:3000` in browser

### Issue 2: "Invalid Credentials" 

**Cause:** Wrong email/password
**Solution:**
- Check your email and password
- Try creating a new user account
- Contact administrator for password reset

### Issue 3: "Server Unreachable"

**Cause:** Wrong IP address or firewall
**Solution:**
- Check your computer's IP address
- Update `mobile-app/src/services/api.js` with correct IP
- Disable firewall temporarily for testing

### Issue 4: "CORS Error"

**Cause:** Cross-origin request blocked
**Solution:**
- Make sure both servers are running
- Check server CORS configuration
- Try refreshing the page

## Step-by-Step Fix

### 1. Start Both Servers
```bash
# Terminal 1: Main server
cd user-management-server
node server.js

# Terminal 2: PWA server  
cd user-management-server/mobile-app
node serve-pwa.js
```

### 2. Test Connection
Visit: `http://YOUR_IP:3001/server-test.html`

### 3. Check IP Address
**Find your computer's IP:**
- Windows: `ipconfig`
- Look for "IPv4 Address" (e.g., 192.168.1.20)

**Update mobile app API:**
Edit `mobile-app/src/services/api.js`:
```javascript
const SERVER_URL = 'http://YOUR_IP:3000';
```

### 4. Test Login
- Go to main app: `http://YOUR_IP:3001`
- Try logging in with your credentials

## Server Status Check

### Check if servers are running:
```bash
# Check port 3000 (main server)
netstat -an | findstr :3000

# Check port 3001 (PWA server)  
netstat -an | findstr :3001
```

**Expected output:**
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING
TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
```

## Quick Test Commands

### Test main server:
```bash
curl http://localhost:3000/api/auth/verify
```

### Test PWA server:
```bash
curl http://localhost:3001
```

## Still Having Issues?

1. **Check browser console** (F12 → Console) for error messages
2. **Try different browser** (Chrome, Safari, Edge)
3. **Restart both servers**
4. **Check firewall settings**
5. **Verify IP address is correct**

## Need Help?

If login still doesn't work:
1. Run the server test page
2. Check browser console for errors
3. Verify both servers are running
4. Check IP address configuration
