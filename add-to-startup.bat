@echo off
echo Adding User Management Server Tray Monitor to Windows Startup...
echo.

REM Get the current directory
set "CURRENT_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

REM Copy the startup script to the startup folder
copy "%CURRENT_DIR%startup-tray.bat" "%STARTUP_DIR%\User Management Tray Monitor.bat"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully added to Windows Startup!
    echo.
    echo The tray monitor will now start automatically when Windows boots.
    echo You can find it in: %STARTUP_DIR%
    echo.
    echo To remove from startup, delete: "%STARTUP_DIR%\User Management Tray Monitor.bat"
) else (
    echo ❌ Failed to add to startup. Please run as Administrator.
)

echo.
pause


