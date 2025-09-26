import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import QRScannerWebScreen from './src/screens/QRScannerWebScreen';
import AccessHistoryScreen from './src/screens/AccessHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ServerConfigScreen from './src/screens/ServerConfigScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasServerConfig, setHasServerConfig] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  useEffect(() => {
    checkServerConfig();
  }, []);

  const checkServerConfig = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem('serverUrl');
      setHasServerConfig(!!storedUrl);
    } catch (error) {
      console.error('Error checking server config:', error);
      setHasServerConfig(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleServerConfigured = () => {
    setHasServerConfig(true);
  };

  if (isLoading || isCheckingConfig) {
    return null; // You can add a loading screen here
  }

  // If no server is configured, show the server config screen
  if (!hasServerConfig) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ServerConfig">
            {(props) => <ServerConfigScreen {...props} onConfigured={handleServerConfigured} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="QRScanner" 
              component={Platform.OS === 'web' ? QRScannerWebScreen : QRScannerScreen} 
            />
            <Stack.Screen name="AccessHistory" component={AccessHistoryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
