import Constants from 'expo-constants';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getServerUrl = async () => {
  // Check if we have a stored server URL
  try {
    const storedUrl = await AsyncStorage.getItem('serverUrl');
    if (storedUrl) {
      return storedUrl;
    }
  } catch (error) {
    console.error('Error reading stored server URL:', error);
  }

  // Check if we're in development
  if (__DEV__) {
    // Try to auto-detect local server
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && networkState.type === Network.NetworkStateType.WIFI) {
        // Use local IP for development - this should be configured per developer
        const devServerUrl = Constants.manifest?.extra?.devServerUrl || 'http://192.168.1.20:3000';
        return devServerUrl;
      }
    } catch (error) {
      console.error('Error detecting network state:', error);
    }
  }

  // Use environment variable or config
  const productionUrl = Constants.manifest?.extra?.serverUrl || 
                       process.env.REACT_APP_SERVER_URL || 
                       'https://api.simplifiaccess.com';
  
  return productionUrl;
};

// Function to update server URL dynamically
const setServerUrl = async (url) => {
  try {
    await AsyncStorage.setItem('serverUrl', url);
    return true;
  } catch (error) {
    console.error('Error saving server URL:', error);
    return false;
  }
};

// Function to clear stored server URL
const clearServerUrl = async () => {
  try {
    await AsyncStorage.removeItem('serverUrl');
    return true;
  } catch (error) {
    console.error('Error clearing server URL:', error);
    return false;
  }
};

export default { 
  getServerUrl,
  setServerUrl,
  clearServerUrl
};