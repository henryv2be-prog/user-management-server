import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function NFCScannerScreen({ onBack, onNavigateToVisitors, pendingTagId, onTagProcessed }) {
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    console.log('NFCScannerScreen mounted, pendingTagId:', pendingTagId);
    
    // Start scanning animation
    startScanAnimation();
    
    // Check if there's a pending tag ID from deep link
    if (pendingTagId) {
      console.log('Processing pending tag ID:', pendingTagId);
      handleNFCTagDetected(pendingTagId);
      if (onTagProcessed) {
        onTagProcessed();
      }
      return;
    }
    
    // Simulate NFC scanning (in a real app, you'd use expo-nfc or similar)
    const scanInterval = setInterval(() => {
      if (isScanning && !isProcessing) {
        // Simulate NFC tag detection
        simulateNFCDetection();
      }
    }, 2000);

    return () => clearInterval(scanInterval);
  }, [isScanning, isProcessing, pendingTagId]);

  const startScanAnimation = () => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
  };

  const simulateNFCDetection = () => {
    // In a real implementation, this would be triggered by actual NFC detection
    // For now, we'll simulate it occasionally
    if (Math.random() < 0.1) { // 10% chance every 2 seconds
      handleNFCTagDetected('simulated-tag-id');
    }
  };

  const handleNFCTagDetected = async (tagId) => {
    if (isProcessing) return;

    setIsScanning(false);
    setIsProcessing(true);
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get server URL and token
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('authToken');

      if (!serverUrl || !token) {
        Alert.alert('Error', 'Server configuration missing');
        return;
      }

      // Request access
      const response = await fetch(`${serverUrl}/api/access-requests/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tagId: tagId,
          requestType: 'nfc_scan',
        }),
      });

      const result = await response.json();

      if (response.ok && result.access) {
        Alert.alert(
          'Access Granted! ✅',
          result.message || 'Door will open shortly...',
          [
            {
              text: 'OK',
              onPress: () => {
                // Automatically resume scanning after successful scan
                setTimeout(() => {
                  setIsScanning(true);
                  setIsProcessing(false);
                }, 1000);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Access Denied ❌',
          result.message || 'You do not have permission to access this door',
          [
            {
              text: 'Try Again',
              onPress: () => {
                // Automatically resume scanning after denied access
                setTimeout(() => {
                  setIsScanning(true);
                  setIsProcessing(false);
                }, 1000);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('NFC scan error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process NFC tag',
        [
          {
            text: 'Try Again',
            onPress: () => {
              // Automatically resume scanning after error
              setTimeout(() => {
                setIsScanning(true);
                setIsProcessing(false);
              }, 1000);
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              onBack(); // This will navigate back to login
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const animatedStyle = {
    opacity: scanAnimation,
    transform: [
      {
        scale: scanAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SimplifiAccess</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scanning Area */}
      <View style={styles.scanningArea}>
        {/* Animated WiFi Icon */}
        <View style={styles.animationContainer}>
          <Animated.View style={[styles.wifiIcon, animatedStyle]}>
            <Text style={styles.wifiSymbol}>📶</Text>
          </Animated.View>
        </View>

        {/* NFC Detection Area */}
        <View style={styles.nfcArea}>
          <View style={styles.nfcFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* Status Text */}
        <View style={styles.statusContainer}>
          {isScanning && !isProcessing && (
            <Text style={styles.scanningText}>Ready to scan</Text>
          )}
          {isProcessing && (
            <Text style={styles.processingText}>Processing...</Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Place your device near an NFC tag
        </Text>
        {onNavigateToVisitors && (
          <TouchableOpacity 
            style={styles.addVisitorButton} 
            onPress={onNavigateToVisitors}
          >
            <Text style={styles.addVisitorButtonText}>+ Add Visitor</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animationContainer: {
    marginBottom: 40,
  },
  wifiIcon: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  wifiSymbol: {
    fontSize: 40,
  },
  nfcArea: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  nfcFrame: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#3b82f6',
    top: 10,
    left: 10,
  },
  topRight: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    right: 10,
    left: 'auto',
  },
  bottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 4,
    top: 'auto',
    bottom: 10,
  },
  bottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    top: 'auto',
    right: 10,
    left: 'auto',
    bottom: 10,
  },
  statusContainer: {
    alignItems: 'center',
  },
  scanningText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '600',
  },
  processingText: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  addVisitorButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  addVisitorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});


