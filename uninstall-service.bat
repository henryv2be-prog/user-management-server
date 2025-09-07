@echo off
echo Uninstalling User Management Server Windows Service...
echo.
echo This will:
echo - Stop the service
echo - Remove the service from Windows
echo - Clean up service files
echo.
pause
node uninstall-service.js
echo.
echo Uninstallation complete!
echo.
pause