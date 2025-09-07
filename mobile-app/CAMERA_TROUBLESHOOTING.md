# 📷 Camera Permission Troubleshooting

## Quick Fixes

### 1. **Allow Camera Permission**
When you first try to scan a QR code, your browser will ask for camera permission:
- **Android Chrome:** Tap "Allow" when prompted
- **iOS Safari:** Tap "Allow" when prompted

### 2. **If Permission Was Denied**
**Android Chrome:**
1. Tap the lock icon in the address bar
2. Tap "Permissions" 
3. Set "Camera" to "Allow"
4. Refresh the page

**iOS Safari:**
1. Go to Settings → Safari → Camera
2. Make sure it's set to "Allow"
3. Or go to Settings → Privacy & Security → Camera
4. Enable camera access for Safari

### 3. **Test Camera Functionality**
Visit the camera test page: `http://YOUR_COMPUTER_IP:3001/camera-test.html`

This page will:
- ✅ Test if camera API is supported
- ✅ Request camera permission
- ✅ Show live camera feed
- ✅ Help diagnose issues

### 4. **Common Issues & Solutions**

**"Camera permission denied"**
- Solution: Follow steps 1-2 above
- Alternative: Try opening in incognito/private mode

**"No camera found"**
- Check if another app is using the camera
- Close other camera apps
- Restart the browser

**"Camera API not supported"**
- Use Chrome (Android) or Safari (iOS)
- Update your browser
- Some browsers don't support camera in PWA mode

**"HTTPS required"**
- Use `localhost` instead of IP address
- Or set up HTTPS for your server
- Some browsers require secure context for camera

### 5. **Browser-Specific Notes**

**Chrome (Android):**
- ✅ Full camera support
- ✅ PWA installation works
- ✅ Camera permissions work well

**Safari (iOS):**
- ✅ Full camera support
- ✅ PWA installation works
- ⚠️ May need to enable camera in Settings

**Firefox:**
- ⚠️ Limited PWA support
- ⚠️ Camera may not work in PWA mode
- 💡 Try regular browser mode

**Edge:**
- ✅ Good PWA support
- ✅ Camera should work
- 💡 Similar to Chrome

### 6. **Still Having Issues?**

1. **Try the camera test page first**
2. **Check browser console for errors** (F12 → Console)
3. **Try a different browser**
4. **Restart the PWA server**
5. **Clear browser cache and cookies**

### 7. **Alternative: Use Regular Browser**
If PWA camera doesn't work:
1. Open the app in regular browser mode
2. Camera should work normally
3. You can still bookmark it to home screen

## Need Help?

If camera still doesn't work:
1. Check the camera test page results
2. Try different browsers
3. Check if camera works in other web apps
4. Consider using the native APK build instead
