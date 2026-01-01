import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, List, Switch, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';

export function SettingsScreen() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@hopdrop.fr?subject=Support HopDrop');
  };

  const handleRateApp = () => {
    Alert.alert('Merci !', 'La fonctionnalité sera disponible lors du lancement sur les stores.');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Politique de confidentialité', 'Sera disponible prochainement sur notre site web.');
  };

  const handleTerms = () => {
    Alert.alert('Conditions d\'utilisation', 'Seront disponibles prochainement sur notre site web.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Contactez support@hopdrop.fr pour supprimer votre compte.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Notifications Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        NOTIFICATIONS
      </Text>
      <View style={styles.section}>
        <List.Item
          title="Notifications push"
          description="Recevoir des alertes sur les missions et colis"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} />
          )}
        />
        <Divider />
        <List.Item
          title="Emails"
          description="Recevoir des récapitulatifs par email"
          left={(props) => <List.Icon {...props} icon="email" />}
          right={() => <Switch value={true} disabled />}
        />
      </View>

      {/* Privacy Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        CONFIDENTIALITÉ
      </Text>
      <View style={styles.section}>
        <List.Item
          title="Partage de localisation"
          description="Permettre le suivi en temps réel pour les missions"
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={() => (
            <Switch value={locationSharing} onValueChange={setLocationSharing} />
          )}
        />
        <Divider />
        <List.Item
          title="Politique de confidentialité"
          left={(props) => <List.Icon {...props} icon="shield-lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handlePrivacyPolicy}
        />
        <Divider />
        <List.Item
          title="Conditions d'utilisation"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleTerms}
        />
      </View>

      {/* Support Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        SUPPORT
      </Text>
      <View style={styles.section}>
        <List.Item
          title="Contacter le support"
          description="support@hopdrop.fr"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleContactSupport}
        />
        <Divider />
        <List.Item
          title="Noter l'application"
          description="Donnez-nous 5 étoiles !"
          left={(props) => <List.Icon {...props} icon="star" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleRateApp}
        />
      </View>

      {/* Account Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        COMPTE
      </Text>
      <View style={styles.section}>
        <List.Item
          title="Changer le mot de passe"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
        />
        <Divider />
        <List.Item
          title="Supprimer mon compte"
          titleStyle={{ color: colors.error }}
          left={(props) => <List.Icon {...props} icon="delete" color={colors.error} />}
          onPress={handleDeleteAccount}
        />
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text variant="bodySmall" style={styles.appInfoText}>
          HopDrop v1.0.0
        </Text>
        <Text variant="bodySmall" style={styles.appInfoText}>
          © 2025 HopDrop. Tous droits réservés.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    color: colors.onSurfaceVariant,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  appInfo: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  appInfoText: {
    color: colors.onSurfaceVariant,
  },
});