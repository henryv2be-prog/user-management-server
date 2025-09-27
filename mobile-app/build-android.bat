@echo off
echo 🔨 Building SimplifiAccess Android APK...
echo.

echo 🧹 Cleaning previous builds...
call npx expo install --fix
if errorlevel 1 echo Install step completed

echo.
echo 🏗️  Prebuilding project...
call npx expo prebuild --platform android --clear

echo.
echo 📱 Building APK...
cd android
call .\gradlew assembleDebug

echo.
echo ✅ APK built successfully!
echo 📍 Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 📱 To install on device:
echo    adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 🔧 Or manually copy the APK to your device and install it.
echo.
pause
