@echo off
echo Building Android APK (Simple Method)...
echo.

echo Step 1: Cleaning previous builds...
cd android
if exist "app\build" rmdir /s /q "app\build"
if exist "build" rmdir /s /q "build"

echo Step 2: Building APK with Android Studio...
echo.
echo Please open Android Studio and:
echo 1. Open the 'android' folder in this directory
echo 2. Wait for Gradle sync to complete
echo 3. Go to Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 4. The APK will be created at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo This method avoids the Reanimated build issues!
echo.
pause
