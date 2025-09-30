import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickAccessWidget from '../components/QuickAccessWidget';

export default function HomeScreen({ onLogout, onNavigateToScanner, onQuickAccess }) {
  const handleNFCScan = () => {
    onNavigateToScanner();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: onLogout,
        },
      ]
    );
  };

  const handleViewProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        Alert.alert(
          'User Profile',
          `Name: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nRole: ${user.role}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🔐 SimplifiAccess</Text>
          <Text style={styles.headerSubtitle}>Welcome back!</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>🎉 Login Successful!</Text>
          <Text style={styles.welcomeText}>
            You are now connected to the SimplifiAccess system.
          </Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleNFCScan}>
            <Text style={styles.primaryButtonText}>📱 Scan NFC Tag</Text>
            <Text style={styles.primaryButtonSubtext}>Tap to scan and access door</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewProfile}>
            <Text style={styles.secondaryButtonText}>👤 View Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>🔗</Text>
            <Text style={styles.statusText}>Connected to server</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>👤</Text>
            <Text style={styles.statusText}>User authenticated</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>🔓</Text>
            <Text style={styles.statusText}>Ready for door access</Text>
          </View>
        </View>

        {/* Quick Access Widget */}
        <QuickAccessWidget 
          onQuickScan={onQuickAccess}
          onViewProfile={handleViewProfile}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  primaryButtonSubtext: {
    color: '#d1fae5',
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
