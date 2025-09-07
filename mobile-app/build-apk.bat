@echo off
echo Building Android APK...
echo.

echo Step 1: Building APK with Gradle...
cd android
call gradlew assembleDebug
cd ..

echo.
echo Step 2: APK should be created at:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Step 3: Install on device with:
echo adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
