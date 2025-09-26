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
import { colors, shadows, spacing, typography, borderRadius } from '../theme/colors';

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
    return isOnline ? colors.success[600] : colors.danger[600];
  };

  const getStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.first_name || 'User'}!</Text>
        <TouchableOpacity onPress={handleProfile} style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color={colors.text.inverse} />
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
            <Ionicons name="time" size={24} color={colors.brand.primary} />
            <Text style={styles.secondaryButtonText}>Access History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.doorsSection}>
          <Text style={styles.sectionTitle}>Available Doors</Text>
          {doors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home" size={48} color={colors.text.muted} />
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
    backgroundColor: colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing['5xl'],
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[700],
    ...shadows.sm,
  },
  welcomeText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  profileButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  quickActions: {
    marginBottom: spacing['3xl'],
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.background.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brand.primary,
    ...shadows.sm,
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  doorsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing['4xl'],
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyStateText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  doorCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.md,
  },
  doorInfo: {
    flex: 1,
  },
  doorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  doorLocation: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  doorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
});
