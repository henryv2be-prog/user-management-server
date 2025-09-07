@echo off
echo Installing User Management Server as Windows Service...
echo.
echo This will:
echo - Install the server as a Windows service
echo - Start the service automatically
echo - Run the server in the background
echo.
pause
node install-service.js
echo.
echo Installation complete!
echo.
echo You can now:
echo - Use the tray monitor to control the service
echo - The service will start automatically on boot
echo - Check Windows Services to manage the service
echo.
pause