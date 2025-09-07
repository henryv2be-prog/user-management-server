@echo off
echo Removing User Management Server Tray Monitor from Windows Startup...
echo.

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_FILE=%STARTUP_DIR%\User Management Tray Monitor.bat"

if exist "%STARTUP_FILE%" (
    del "%STARTUP_FILE%"
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Successfully removed from Windows Startup!
        echo The tray monitor will no longer start automatically.
    ) else (
        echo ❌ Failed to remove from startup.
    )
) else (
    echo ℹ️  Tray monitor was not found in startup folder.
)

echo.
pause


