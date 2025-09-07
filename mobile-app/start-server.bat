@echo off
echo Starting SimplifiAccess PWA Server...
echo.
echo The app will be available at: http://localhost:3001
echo Camera test page: http://localhost:3001/camera-test.html
echo.
echo To install on mobile:
echo 1. Find your computer's IP address
echo 2. Open http://YOUR_IP:3001 on your mobile device
echo 3. On Android Chrome: Tap menu > "Add to Home Screen"
echo 4. On iOS Safari: Tap share > "Add to Home Screen"
echo.
echo Press Ctrl+C to stop the server
echo.
node serve-pwa.js
pause
