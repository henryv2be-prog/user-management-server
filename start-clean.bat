@echo off
REM Clean start - kill all node processes and start fresh
echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting User Management System...
start-all-hidden.vbs

echo System started! Check your system tray for the colored "S" icon.
pause

