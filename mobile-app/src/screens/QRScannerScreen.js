import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { doorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

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

      // Request access
      const response = await doorsAPI.requestAccess(parseInt(doorId), 'qr_scan', data);
      
      if (response.data.access) {
        Alert.alert(
          'Access Granted! ✅',
          response.data.message || 'Door will open shortly...',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Access Denied ❌',
          response.data.message || 'You do not have permission to access this door',
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
              onPress: () => navigation.goBack(),
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
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={64} color="#dc3545" />
        <Text style={styles.message}>Camera permission required</Text>
        <Text style={styles.subMessage}>
          Please allow camera access to scan QR codes
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera Access</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>
          💡 If permission is denied, try refreshing the page or check browser settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <CameraView
        style={styles.scanner}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417'],
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
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
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
    borderColor: '#667eea',
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
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingText: {
    color: '#667eea',
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
  helpText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
