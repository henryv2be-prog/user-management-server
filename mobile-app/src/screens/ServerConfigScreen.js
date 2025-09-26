import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/api';

export default function ServerConfigScreen({ onConfigured }) {
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndSaveServerUrl = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    // Clean up the URL
    let cleanUrl = serverUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://' + cleanUrl;
    }
    
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');

    setIsLoading(true);

    try {
      // Test the connection to the server
      const testResponse = await fetch(`${cleanUrl}/api/test`, {
        method: 'GET',
        timeout: 5000,
      });

      if (testResponse.ok) {
        // Save the server URL
        await apiConfig.setServerUrl(cleanUrl);
        Alert.alert(
          'Success', 
          'Server connection successful! You can now log in.',
          [{ text: 'OK', onPress: onConfigured }]
        );
      } else {
        throw new Error('Server responded with error');
      }
    } catch (error) {
      console.error('Server test failed:', error);
      Alert.alert(
        'Connection Failed',
        'Could not connect to the server. Please check the URL and try again.\n\nMake sure the server is running and accessible from your device.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSetup = (url) => {
    setServerUrl(url);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🔐 SimplifiAccess</Text>
          <Text style={styles.subtitle}>Configure Server Connection</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              Enter your SimplifiAccess server URL to get started. This is typically the IP address 
              and port where your server is running.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.20:3000"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={validateAndSaveServerUrl}
            />
          </View>

          <TouchableOpacity
            style={[styles.configButton, isLoading && styles.configButtonDisabled]}
            onPress={validateAndSaveServerUrl}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.configButtonText}>Connect to Server</Text>
            )}
          </TouchableOpacity>

          <View style={styles.quickSetupSection}>
            <Text style={styles.quickSetupTitle}>Quick Setup</Text>
            <Text style={styles.quickSetupDescription}>
              Common server configurations:
            </Text>
            
            <TouchableOpacity
              style={styles.quickSetupButton}
              onPress={() => handleQuickSetup('http://192.168.1.20:3000')}
            >
              <Text style={styles.quickSetupButtonText}>Local Server (192.168.1.20:3000)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickSetupButton}
              onPress={() => handleQuickSetup('http://localhost:3000')}
            >
              <Text style={styles.quickSetupButtonText}>Development Server (localhost:3000)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              • Make sure your server is running{'\n'}
              • Use your computer's IP address (check with 'ipconfig' or 'ifconfig'){'\n'}
              • Ensure port 3000 is accessible{'\n'}
              • Both devices should be on the same network
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  description: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#111827',
    color: '#ffffff',
  },
  configButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  configButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  configButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  quickSetupSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 24,
  },
  quickSetupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  quickSetupDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  quickSetupButton: {
    backgroundColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  quickSetupButtonText: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center',
  },
  helpSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 24,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
