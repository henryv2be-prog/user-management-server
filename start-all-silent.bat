@echo off
REM Start server and tray monitor silently
cd /d "C:\Users\henry\OneDrive\Documents\Arduino\user-management-server"

REM Start server in background
start /min "" node server.js

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start tray monitor silently
start-tray-hidden.vbs

