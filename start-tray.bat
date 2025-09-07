@echo off
echo Starting User Management Server Tray Monitor...
echo.
echo This will show a tray icon to monitor your server.
echo The server is already running as a Windows service.
echo.
cd /d "C:\Users\henry\OneDrive\Documents\Arduino\user-management-server"
npx electron simple-tray.js