import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, spacing, typography, borderRadius } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
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
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={colors.brand.primary} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings" size={24} color={colors.brand.primary} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle" size={24} color={colors.brand.primary} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle" size={24} color={colors.brand.primary} />
            <Text style={styles.menuText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={colors.danger[600]} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: spacing['5xl'],
    backgroundColor: colors.background.card,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  profileCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    ...shadows.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.base,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primary[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    color: colors.brand.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  menu: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing['2xl'],
    ...shadows.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[700],
  },
  menuText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.light,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger[600],
    ...shadows.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    color: colors.danger[600],
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
});
