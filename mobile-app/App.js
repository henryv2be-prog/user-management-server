import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import ServerConfigScreen from './src/screens/ServerConfigScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [hasServerConfig, setHasServerConfig] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('authToken');

      setHasServerConfig(!!serverUrl);
      setIsAuthenticated(!!token);

      if (!serverUrl) {
        setCurrentScreen('serverConfig');
      } else if (!token) {
        setCurrentScreen('login');
      } else {
        setCurrentScreen('home');
      }
    } catch (error) {
      console.error('Error checking initial state:', error);
      setCurrentScreen('serverConfig');
    }
  };

  const handleServerConfigured = () => {
    setHasServerConfig(true);
    setCurrentScreen('login');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNavigateToScanner = () => {
    setCurrentScreen('scanner');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (currentScreen === 'serverConfig') {
    return <ServerConfigScreen onConfigured={handleServerConfigured} />;
  }

  if (currentScreen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentScreen === 'scanner') {
    return <QRScannerScreen onBack={handleBackToHome} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <HomeScreen 
        onLogout={handleLogout} 
        onNavigateToScanner={handleNavigateToScanner} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
});
