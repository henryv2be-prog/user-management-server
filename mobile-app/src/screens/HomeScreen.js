import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { doorsAPI } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [doors, setDoors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDoors();
  }, []);

  const loadDoors = async () => {
    try {
      const response = await doorsAPI.getDoors();
      setDoors(response.data.doors || []);
    } catch (error) {
      console.error('Failed to load doors:', error);
      Alert.alert('Error', 'Failed to load doors. Make sure you have access to any doors.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDoors();
    setRefreshing(false);
  };

  const handleQRScan = () => {
    navigation.navigate('QRScanner');
  };

  const handleAccessHistory = () => {
    navigation.navigate('AccessHistory');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? '#28a745' : '#dc3545';
  };

  const getStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.first_name || 'User'}!</Text>
        <TouchableOpacity onPress={handleProfile} style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color="#667eea" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleQRScan}>
            <Ionicons name="qr-code" size={24} color="white" />
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleAccessHistory}>
            <Ionicons name="time" size={24} color="#667eea" />
            <Text style={styles.secondaryButtonText}>Access History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.doorsSection}>
          <Text style={styles.sectionTitle}>Available Doors</Text>
          {doors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No doors available</Text>
            </View>
          ) : (
            doors.map((door) => (
              <View key={door.id} style={styles.doorCard}>
                <View style={styles.doorInfo}>
                  <Text style={styles.doorName}>{door.name}</Text>
                  <Text style={styles.doorLocation}>{door.location || 'No location'}</Text>
                </View>
                <View style={styles.doorStatus}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(door.isOnline) }
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {getStatusText(door.isOnline)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickActions: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  doorsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  doorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doorInfo: {
    flex: 1,
  },
  doorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  doorLocation: {
    fontSize: 14,
    color: '#666',
  },
  doorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
});
