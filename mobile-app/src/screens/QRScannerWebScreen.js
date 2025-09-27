import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import jsQR from 'jsqr';

const { width, height } = Dimensions.get('window');

export default function QRScannerWebScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualDoorId, setManualDoorId] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    requestCameraPermission();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    console.log('Requesting camera permission...');
    setCameraError(null);
    setHasPermission(null);
    
    try {
      // Check for camera API with better mobile support
      console.log('Navigator:', navigator);
      console.log('MediaDevices:', navigator.mediaDevices);
      console.log('getUserMedia:', navigator.mediaDevices?.getUserMedia);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('Modern camera API not available, checking legacy...');
        
        // Check for legacy camera API
        const legacyGetUserMedia = navigator.getUserMedia || 
                                 navigator.webkitGetUserMedia || 
                                 navigator.mozGetUserMedia || 
                                 navigator.msGetUserMedia;
        
        if (!legacyGetUserMedia) {
          setCameraError('Camera API not supported. Try refreshing the page or using a different browser.');
          setHasPermission(false);
          return;
        }
        
        // Use legacy API
        console.log('Using legacy camera API');
        legacyGetUserMedia.call(navigator, { video: true }, (stream) => {
          console.log('Legacy stream obtained:', stream);
          streamRef.current = stream;
          setHasPermission(true);
          setCameraError(null);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            videoRef.current.onloadedmetadata = () => {
              console.log('Legacy video loaded, starting QR detection');
              detectQRCode();
            };
          }
        }, (error) => {
          console.error('Legacy camera error:', error);
          setHasPermission(false);
          setCameraError(`Camera error: ${error.message}`);
        });
        return;
      }

      console.log('Requesting camera stream...');
      
      // Try different camera constraints for better mobile compatibility
      let stream;
      try {
        // First try with environment facing mode (back camera)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment'
          } 
        });
      } catch (error) {
        console.log('Environment facing mode failed, trying user facing mode:', error);
        try {
          // Try with user facing mode (front camera)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user'
            } 
          });
        } catch (error2) {
          console.log('User facing mode failed, trying basic video:', error2);
          // Try with basic video constraints
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true
          });
        }
      }
      
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      setHasPermission(true);
      setCameraError(null);
      
      // Set up video element
      if (videoRef.current) {
        console.log('Setting up video element...');
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start QR detection when video is ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video loaded, starting QR detection');
          detectQRCode();
        };
        
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          setCameraError('Video playback error: ' + error.message);
        };
      } else {
        console.error('Video ref not available');
        setCameraError('Video element not available');
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setCameraError('Camera constraints cannot be satisfied.');
      } else {
        setCameraError(`Camera error: ${error.message}`);
      }
    }
  };

  const handleBarCodeScanned = async (data) => {
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
                setTimeout(() => {
                  detectQRCode();
                }, 100);
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
              setTimeout(() => {
                detectQRCode();
              }, 100);
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

  const handleManualAccess = async () => {
    if (!manualDoorId.trim()) {
      Alert.alert('Error', 'Please enter a door ID');
      return;
    }

    const doorId = parseInt(manualDoorId.trim());
    if (isNaN(doorId)) {
      Alert.alert('Error', 'Please enter a valid door ID number');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await doorsAPI.requestAccess(doorId, 'manual_input', manualDoorId);
      
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
                setIsProcessing(false);
                setManualDoorId('');
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
      console.error('Manual access error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to request access',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setIsProcessing(false);
              setManualDoorId('');
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
    // Restart QR detection
    setTimeout(() => {
      detectQRCode();
    }, 100);
  };

  // QR code detection using jsQR library
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current || scanned || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Check if video is ready
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Detect QR code using jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        console.log('QR Code detected:', code.data);
        handleBarCodeScanned(code.data);
        return;
      }
    }

    // Continue scanning
    requestAnimationFrame(detectQRCode);
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
        <Ionicons name="camera" size={64} color="#dc3545" />
        <Text style={styles.message}>Camera not available</Text>
        <Text style={styles.subMessage}>
          {cameraError || 'Please allow camera access to scan QR codes'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Try Camera Again</Text>
        </TouchableOpacity>
        
        <View style={styles.divider}>
          <Text style={styles.dividerText}>OR</Text>
        </View>
        
        <TouchableOpacity style={styles.manualButton} onPress={() => setShowManualInput(true)}>
          <Text style={styles.manualButtonText}>Enter Door ID Manually</Text>
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          💡 For QR scanning to work, please use Chrome or Safari and allow camera access
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

      <View style={styles.cameraContainer}>
        <video
          ref={videoRef}
          style={styles.camera}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={styles.hiddenCanvas}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          Position the QR code within the frame
        </Text>
        <TouchableOpacity style={styles.scanButton} onPress={requestCameraPermission}>
          <Text style={styles.scanButtonText}>Start Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={detectQRCode}>
          <Text style={styles.buttonText}>Detect QR Code</Text>
        </TouchableOpacity>
        
        <View style={styles.divider}>
          <Text style={styles.dividerText}>OR</Text>
        </View>
        
        <TouchableOpacity style={styles.manualButton} onPress={() => setShowManualInput(true)}>
          <Text style={styles.manualButtonText}>Enter Door ID Manually</Text>
        </TouchableOpacity>
        
        {scanned && (
          <TouchableOpacity style={styles.button} onPress={resetScanner}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
        {isProcessing && (
          <Text style={styles.processingText}>Processing...</Text>
        )}
      </View>
      
      {/* Manual Input Modal */}
      {showManualInput && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Door ID</Text>
            <Text style={styles.modalSubtitle}>
              Type the door ID number (e.g., 1, 2, 3) to request access
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={manualDoorId}
                onChangeText={setManualDoorId}
                placeholder="Enter door ID..."
                keyboardType="numeric"
                autoFocus
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={handleManualAccess}
                disabled={isProcessing}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {isProcessing ? 'Processing...' : 'Request Access'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  hiddenCanvas: {
    position: 'absolute',
    top: -1000,
    left: -1000,
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
    borderColor: '#36454F',
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
  scanButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#36454F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingText: {
    color: '#36454F',
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
  divider: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#3a3a3a',
    color: 'white',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#555',
  },
  modalButtonPrimary: {
    backgroundColor: '#28a745',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
