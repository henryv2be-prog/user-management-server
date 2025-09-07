import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure your server URL here
const SERVER_URL = 'http://192.168.1.20:3000';

export const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 10000,
});

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
