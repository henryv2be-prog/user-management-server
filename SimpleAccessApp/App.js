import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import axios from 'axios';

// Configure API
const API_BASE = 'http://192.168.1.20:3001/api';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'home', 'qr', 'nfc'

  // Login function
  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password,
      });

      if (response.data.token) {
        setUser(response.data.user);
        setIsLoggedIn(true);
        setCurrentScreen('home');
        Alert.alert('Success', 'Logged in successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
      console.error('Login error:', error);
    }
  };

  // QR Code scan handler
  const handleQRScan = (e) => {
    const data = e.data;
    console.log('QR Code scanned:', data);
    
    // Try to extract door ID from QR data
    let doorId;
    try {
      // Try JSON format first
      const qrData = JSON.parse(data);
      doorId = qrData.doorId;
    } catch {
      // Try simple number
      doorId = parseInt(data);
    }

    if (doorId) {
      requestAccess(doorId, 'qr_scan', data);
    } else {
      Alert.alert('Error', 'Invalid QR code format');
    }
  };

  // NFC scan handler
  const handleNFCScan = async () => {
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      const tag = await NfcManager.getTag();
      
      // Extract data from NFC tag
      let cardData = '';
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (const record of tag.ndefMessage) {
          if (record.typeNameFormat === Ndef.TNF_WELL_KNOWN && record.type === Ndef.RTD_TEXT) {
            const textDecoder = new TextDecoder();
            cardData = textDecoder.decode(record.payload);
            break;
          }
        }
      }

      if (cardData) {
        // Try to extract door ID
        let doorId;
        try {
          const cardInfo = JSON.parse(cardData);
          doorId = cardInfo.doorId;
        } catch {
          doorId = parseInt(cardData);
        }

        if (doorId) {
          requestAccess(doorId, 'nfc_scan', cardData);
        } else {
          Alert.alert('Error', 'Invalid NFC card format');
        }
      } else {
        Alert.alert('Error', 'No data found on NFC card');
      }
    } catch (error) {
      Alert.alert('Error', 'NFC scan failed: ' + error.message);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  // Request access to door
  const requestAccess = async (doorId, type, data) => {
    try {
      const response = await axios.post(`${API_BASE}/access-requests/request`, {
        doorId: parseInt(doorId),
        requestType: type,
        qrCodeData: data,
      }, {
        headers: {
          'Authorization': `Bearer ${user?.token || 'test-token'}`,
        },
      });

      if (response.data.access) {
        Alert.alert('Access Granted! ✅', response.data.message || 'Door will open shortly...');
      } else {
        Alert.alert('Access Denied ❌', response.data.message || 'You do not have permission to access this door');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request access: ' + (error.response?.data?.message || error.message));
      console.error('Access request error:', error);
    }
  };

  // Logout function
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentScreen('login');
    setEmail('');
    setPassword('');
  };

  // Login Screen
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginContainer}>
          <Text style={styles.title}>Simple Access App</Text>
          <Text style={styles.subtitle}>Login to continue</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Home Screen
  if (currentScreen === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.homeContainer}>
          <Text style={styles.title}>Welcome, {user?.firstName || 'User'}!</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setCurrentScreen('qr')}
          >
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleNFCScan}
          >
            <Text style={styles.buttonText}>Scan NFC Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // QR Scanner Screen
  if (currentScreen === 'qr') {
    return (
      <View style={styles.container}>
        <QRCodeScanner
          onRead={handleQRScan}
          topContent={
            <Text style={styles.centerText}>
              Scan a QR code to request door access
            </Text>
          }
          bottomContent={
            <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('home')}>
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          }
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    height: 50,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerText: {
    flex: 1,
    fontSize: 18,
    padding: 32,
    color: '#777',
    textAlign: 'center',
  },
});

export default App;

