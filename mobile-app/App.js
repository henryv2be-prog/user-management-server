import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// Import screens
import ServerConfigScreen from './src/screens/ServerConfigScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import NFCScannerScreen from './src/screens/NFCScannerScreen';
import VisitorManagementScreen from './src/screens/VisitorManagementScreen';
import QuickAccessWidget from './src/components/QuickAccessWidget';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [hasServerConfig, setHasServerConfig] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkInitialState();
    handleDeepLink();
  }, []);

  const handleDeepLink = async () => {
    const url = await Linking.getInitialURL();
    if (url) {
      handleUrl(url);
    }
    
    // Listen for incoming links when app is already open
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription?.remove();
  };

  const handleUrl = (url) => {
    if (url.includes('scan')) {
      // If user is authenticated, go directly to NFC scanner
      if (isAuthenticated) {
        setCurrentScreen('nfcScanner');
      }
    }
  };

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
        setCurrentScreen('nfcScanner');
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
    setCurrentScreen('nfcScanner');
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
    setCurrentScreen('nfcScanner');
  };

  const handleQuickAccess = () => {
    setCurrentScreen('nfcScanner');
  };

  const handleNavigateToVisitors = () => {
    setCurrentScreen('visitorManagement');
  };

  const handleBackToScanner = () => {
    setCurrentScreen('nfcScanner');
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

  if (currentScreen === 'nfcScanner') {
    return <NFCScannerScreen onBack={handleBackToHome} onNavigateToVisitors={handleNavigateToVisitors} />;
  }

  if (currentScreen === 'visitorManagement') {
    return <VisitorManagementScreen onBack={handleBackToScanner} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <HomeScreen 
        onLogout={handleLogout} 
        onNavigateToScanner={handleNavigateToScanner}
        onQuickAccess={handleQuickAccess}
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
