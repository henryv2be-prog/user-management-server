import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/api';

// Create axios instance without baseURL initially
export const api = axios.create({
  timeout: 10000,
});

// Function to update axios baseURL
const updateApiBaseUrl = async () => {
  const serverUrl = await apiConfig.getServerUrl();
  api.defaults.baseURL = `${serverUrl}/api`;
  return serverUrl;
};

// Initialize API base URL
updateApiBaseUrl();

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      await AsyncStorage.removeItem('authToken');
      // You might want to trigger a logout action here
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verify: () => api.get('/auth/verify'),
};

export const doorsAPI = {
  getDoors: () => api.get('/doors/accessible/me'),
  getDoor: (id) => api.get(`/doors/${id}`),
  requestAccess: (doorId, requestType = 'qr_scan', qrCodeData = null) => 
    api.post('/access-requests/request', { doorId, requestType, qrCodeData }),
};

export const accessAPI = {
  getHistory: () => api.get('/access/history'),
  requestAccess: (doorId, accessType = 'request') => 
    api.post('/doors/access/request', { doorId, accessType }),
};
