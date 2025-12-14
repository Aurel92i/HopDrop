import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Avatar, List, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../../stores/authStore';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text 
            size={80} 
            label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user?.email}
          </Text>
          <Text variant="labelMedium" style={styles.role}>
            {user?.role === 'VENDOR' ? '📦 Vendeur' : user?.role === 'CARRIER' ? '🚴 Livreur' : '📦🚴 Vendeur & Livreur'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard}>
        <List.Item
          title="Mes adresses"
          description="Gérer mes adresses de récupération"
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Addresses')}
        />
        <Divider />
        <List.Item
          title="Paramètres"
          description="Notifications, confidentialité"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
        />
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor={colors.error}
        icon="logout"
      >
        Se déconnecter
      </Button>

      <Text variant="bodySmall" style={styles.version}>
        HopDrop v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    margin: spacing.md,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  name: {
    marginTop: spacing.md,
    color: colors.onSurface,
  },
  email: {
    color: colors.onSurfaceVariant,
  },
  role: {
    marginTop: spacing.xs,
    color: colors.primary,
  },
  menuCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  logoutButton: {
    margin: spacing.md,
    borderColor: colors.error,
  },
  version: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
});