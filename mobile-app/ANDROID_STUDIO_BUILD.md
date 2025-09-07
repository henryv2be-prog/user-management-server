# Android Studio Build Guide

## 🚀 Quick APK Build

### Method 1: Command Line (Fastest)
```bash
# In mobile-app directory
cd android
./gradlew assembleDebug
```

The APK will be created at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 2: Android Studio (Recommended)

1. **Open Android Studio**
2. **Open Project**: Navigate to `mobile-app/android` folder
3. **Wait for Gradle Sync** (first time takes a few minutes)
4. **Build APK**:
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Or click the hammer icon in the toolbar
5. **Find APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📱 Install APK

### Option 1: ADB (if you have Android SDK)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Manual Install
1. Copy APK to your Android device
2. Enable "Install from unknown sources" in Android settings
3. Open APK file on device and install

## 🔧 Troubleshooting

### If Gradle Build Fails:
1. **Clean Project**: `Build` → `Clean Project`
2. **Rebuild**: `Build` → `Rebuild Project`
3. **Check Android SDK**: Make sure Android SDK is installed

### If Camera Doesn't Work:
- The APK will have native camera access (no HTTPS needed!)
- Camera permissions are handled by Android system
- Much more reliable than PWA

## ✅ Benefits of APK vs PWA

- ✅ **No HTTPS required** for camera access
- ✅ **Native Android permissions** 
- ✅ **Better performance**
- ✅ **Works offline** (after initial load)
- ✅ **No browser restrictions**

## 🎯 Next Steps

1. Build the APK using either method above
2. Install on your Android device
3. Test camera functionality - it should work perfectly!
4. No more HTTPS headaches! 🎉
