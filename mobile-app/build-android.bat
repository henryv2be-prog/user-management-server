@echo off
echo Building SimplifiAccess Android APK
echo.
echo This script will help you build an APK using Android Studio
echo.
echo Prerequisites:
echo 1. Android Studio installed
echo 2. Android SDK configured
echo 3. Java Development Kit (JDK)
echo.
echo Press any key to continue...
pause

echo.
echo Step 1: Generating Android project...
npx expo prebuild --platform android

echo.
echo Step 2: Opening Android Studio...
echo Please build the APK in Android Studio:
echo 1. Open the 'android' folder in Android Studio
echo 2. Wait for Gradle sync to complete
echo 3. Go to Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 4. Wait for build to complete
echo 5. Find APK in: android/app/build/outputs/apk/release/
echo.

echo Opening Android Studio...
start "" "android"

echo.
echo Build process started!
echo Check Android Studio for build progress.
echo.
pause
