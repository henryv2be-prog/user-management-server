import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ onBack }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    try {
      let doorId;

      // Try to parse as JSON first (for static QR codes)
      try {
        const qrData = JSON.parse(data);
        if (qrData.doorId && qrData.type === 'door_access') {
          doorId = qrData.doorId;
        } else {
          throw new Error('Invalid QR code format');
        }
      } catch (jsonError) {
        // Try to parse as URL (for dynamic QR codes)
        try {
          const url = new URL(data);
          doorId = url.searchParams.get('door');
        } catch (urlError) {
          // Try to parse as simple door ID
          doorId = parseInt(data);
          if (isNaN(doorId)) {
            throw new Error('Invalid QR code: Could not extract door ID');
          }
        }
      }

      if (!doorId) {
        throw new Error('Invalid QR code: No door ID found');
      }

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
          doorId: parseInt(doorId),
          requestType: 'qr_scan',
          qrCodeData: data,
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
              onPress: () => onBack(),
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
                setScanned(false);
                setIsProcessing(false);
              },
            },
            {
              text: 'Cancel',
              onPress: () => onBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process QR code',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
          {
            text: 'Cancel',
            onPress: () => onBack(),
          },
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <Text style={styles.subMessage}>
          Please allow camera access to scan QR codes
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => Camera.requestCameraPermissionsAsync()}>
          <Text style={styles.buttonText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <Camera
        style={styles.scanner}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr', 'pdf417'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          Position the QR code within the frame
        </Text>
        {scanned && (
          <TouchableOpacity style={styles.button} onPress={resetScanner}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
        {isProcessing && (
          <Text style={styles.processingText}>Processing...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#00ff00',
    top: 0,
    left: 0,
  },
  topRight: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    right: 0,
    left: 'auto',
  },
  bottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 4,
    top: 'auto',
    bottom: 0,
  },
  bottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    top: 'auto',
    right: 0,
    left: 'auto',
    bottom: 0,
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  processingText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  subMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
});
