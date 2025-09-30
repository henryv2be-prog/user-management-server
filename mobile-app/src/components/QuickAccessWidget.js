import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function QuickAccessWidget({ onQuickScan, onViewProfile }) {
  return (
    <View style={styles.widgetContainer}>
      <Text style={styles.widgetTitle}>Quick Access</Text>
      
      <TouchableOpacity style={styles.widgetButton} onPress={onQuickScan}>
        <Text style={styles.widgetButtonText}>📱 Scan NFC</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.widgetSecondaryButton} onPress={onViewProfile}>
        <Text style={styles.widgetSecondaryText}>👤 Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
    textAlign: 'center',
  },
  widgetButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  widgetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  widgetSecondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  widgetSecondaryText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '500',
  },
});

