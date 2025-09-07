@echo off
echo Fresh Android Build...
echo.

echo Step 1: Cleaning everything...
cd android
if exist "app\build" rmdir /s /q "app\build"
if exist "build" rmdir /s /q "build"
if exist ".gradle" rmdir /s /q ".gradle"

echo Step 2: Fresh build...
echo This will take a few minutes...
.\gradlew assembleDebug

echo.
echo If successful, APK will be at:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
