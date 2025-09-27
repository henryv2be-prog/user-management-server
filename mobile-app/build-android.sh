#!/bin/bash

echo "🔨 Building SimplifiAccess Android APK..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npx expo install --fix || echo "Install step completed"

# Prebuild the project
echo "🏗️  Prebuilding project..."
npx expo prebuild --platform android --clear

# Build the APK
echo "📱 Building APK..."
cd android
./gradlew assembleDebug

echo ""
echo "✅ APK built successfully!"
echo "📍 Location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📱 To install on device:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "🔧 Or manually copy the APK to your device and install it."
