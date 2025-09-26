import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accessAPI } from '../services/api';
import { colors, shadows, spacing, typography, borderRadius } from '../theme/colors';

export default function AccessHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await accessAPI.getHistory();
      setHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load access history:', error);
      Alert.alert('Error', 'Failed to load access history');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusIcon = (granted) => {
    return granted ? 'checkmark-circle' : 'close-circle';
  };

  const getStatusColor = (granted) => {
    return granted ? colors.success[600] : colors.danger[600];
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <View style={styles.doorInfo}>
          <Text style={styles.doorName}>{item.door_name || 'Unknown Door'}</Text>
          <Text style={styles.doorLocation}>{item.door_location || ''}</Text>
        </View>
        <Ionicons
          name={getStatusIcon(item.access_granted)}
          size={24}
          color={getStatusColor(item.access_granted)}
        />
      </View>
      
      <View style={styles.historyDetails}>
        <Text style={styles.timestamp}>
          {formatDate(item.timestamp)}
        </Text>
        {item.access_reason && (
          <Text style={styles.reason}>{item.access_reason}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Access History</Text>
        <View style={styles.placeholder} />
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No access history</Text>
          <Text style={styles.emptyStateSubtext}>
            Your door access attempts will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#36454F',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doorInfo: {
    flex: 1,
  },
  doorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  doorLocation: {
    fontSize: 14,
    color: '#666',
  },
  historyDetails: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
