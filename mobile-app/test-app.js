#!/usr/bin/env node

/**
 * Simple test to verify the mobile app structure and dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing SimplifiAccess Mobile App Structure...\n');

// Check if key files exist
const requiredFiles = [
  'App.js',
  'app.json',
  'package.json',
  'src/screens/ServerConfigScreen.js',
  'src/screens/LoginScreen.js',
  'src/screens/HomeScreen.js',
  'src/screens/QRScannerScreen.js',
  'build-android.bat',
  'README.md'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json for required dependencies
console.log('\n📦 Checking Dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'expo',
    'expo-camera',
    'expo-barcode-scanner',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-native-async-storage/async-storage'
  ];

  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}@${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('❌ package.json - ERROR reading file');
  allFilesExist = false;
}

// Check app.json configuration
console.log('\n⚙️  Checking Configuration...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  if (appJson.expo && appJson.expo.name === 'SimplifiAccess') {
    console.log('✅ App name: SimplifiAccess');
  } else {
    console.log('❌ App name not configured correctly');
    allFilesExist = false;
  }

  if (appJson.expo.android && appJson.expo.android.permissions &&
      appJson.expo.android.permissions.includes('CAMERA')) {
    console.log('✅ Camera permission configured');
  } else {
    console.log('❌ Camera permission not configured');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ app.json - ERROR reading file');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Mobile app setup completed successfully!');
  console.log('\n📱 Next steps:');
  console.log('1. Start your SimplifiAccess server');
  console.log('2. Run: npm start');
  console.log('3. Scan QR code with Expo Go app');
  console.log('4. Or build APK with: npx expo build:android --type apk');
} else {
  console.log('❌ Some files or configurations are missing.');
  console.log('Please check the errors above and fix them.');
}

console.log('='.repeat(50));
