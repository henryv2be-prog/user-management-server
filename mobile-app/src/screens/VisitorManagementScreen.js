import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VisitorManagementScreen({ onBack }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    validUntil: '',
  });

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('authToken');

      if (!serverUrl || !token) {
        Alert.alert('Error', 'Server configuration missing');
        return;
      }

      const response = await fetch(`${serverUrl}/api/visitors/user/${await getCurrentUserId()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVisitors(data.visitors || []);
      } else {
        console.error('Failed to load visitors');
      }
    } catch (error) {
      console.error('Error loading visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async () => {
    try {
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${serverUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.user.id;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
    return null;
  };

  const addVisitor = async () => {
    try {
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('authToken');
      const userId = await getCurrentUserId();

      if (!serverUrl || !token || !userId) {
        Alert.alert('Error', 'Missing configuration');
        return;
      }

      const response = await fetch(`${serverUrl}/api/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userId,
          firstName: newVisitor.firstName,
          lastName: newVisitor.lastName,
          email: newVisitor.email || null,
          phone: newVisitor.phone || null,
          validFrom: new Date().toISOString(),
          validUntil: newVisitor.validUntil,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Visitor added successfully');
        setShowAddModal(false);
        setNewVisitor({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          validUntil: '',
        });
        loadVisitors();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to add visitor');
      }
    } catch (error) {
      console.error('Error adding visitor:', error);
      Alert.alert('Error', 'Failed to add visitor');
    }
  };

  const deleteVisitor = async (visitorId) => {
    Alert.alert(
      'Delete Visitor',
      'Are you sure you want to delete this visitor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const serverUrl = await AsyncStorage.getItem('serverUrl');
              const token = await AsyncStorage.getItem('authToken');

              const response = await fetch(`${serverUrl}/api/visitors/${visitorId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Visitor deleted successfully');
                loadVisitors();
              } else {
                Alert.alert('Error', 'Failed to delete visitor');
              }
            } catch (error) {
              console.error('Error deleting visitor:', error);
              Alert.alert('Error', 'Failed to delete visitor');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderVisitor = ({ item }) => (
    <View style={styles.visitorCard}>
      <View style={styles.visitorInfo}>
        <Text style={styles.visitorName}>
          {item.firstName} {item.lastName}
        </Text>
        {item.email && <Text style={styles.visitorEmail}>{item.email}</Text>}
        {item.phone && <Text style={styles.visitorPhone}>{item.phone}</Text>}
        <Text style={styles.visitorValidUntil}>
          Valid until: {formatDate(item.validUntil)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteVisitor(item.id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visitor Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Visitors List */}
      <View style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading visitors...</Text>
        ) : visitors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No visitors yet</Text>
            <Text style={styles.emptySubtext}>Tap + Add to create your first visitor</Text>
          </View>
        ) : (
          <FlatList
            data={visitors}
            renderItem={renderVisitor}
            keyExtractor={(item) => item.id.toString()}
            style={styles.visitorList}
          />
        )}
      </View>

      {/* Add Visitor Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Visitor</Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={newVisitor.firstName}
              onChangeText={(text) => setNewVisitor({ ...newVisitor, firstName: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={newVisitor.lastName}
              onChangeText={(text) => setNewVisitor({ ...newVisitor, lastName: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              value={newVisitor.email}
              onChangeText={(text) => setNewVisitor({ ...newVisitor, email: text })}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={newVisitor.phone}
              onChangeText={(text) => setNewVisitor({ ...newVisitor, phone: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Valid Until (YYYY-MM-DD)"
              value={newVisitor.validUntil}
              onChangeText={(text) => setNewVisitor({ ...newVisitor, validUntil: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addVisitor}
              >
                <Text style={styles.saveButtonText}>Add Visitor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  visitorList: {
    flex: 1,
  },
  visitorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  visitorEmail: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 2,
  },
  visitorPhone: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 2,
  },
  visitorValidUntil: {
    color: '#3b82f6',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: 'white',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
