@echo off
echo Setting up Tray Monitor to start with Windows...
echo.

REM Get the current directory
set "CURRENT_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

REM Copy the startup script to the startup folder
copy "%CURRENT_DIR%start-tray-hidden.vbs" "%STARTUP_DIR%\User Management Tray.vbs"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully added Tray Monitor to Windows Startup!
    echo.
    echo The tray monitor will now start automatically when you log in.
    echo The server is already running as a Windows service.
    echo.
    echo You can find the startup file in: %STARTUP_DIR%
    echo.
    echo To test it now, run: start-tray-only.bat
) else (
    echo ❌ Failed to add to startup. Please run as Administrator.
)

echo.
pause
