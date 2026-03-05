import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, List, Switch, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';
import { api } from '../../services/api';
import { TextInput } from 'react-native-paper';

export function SettingsScreen() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Impossible de modifier le mot de passe';
      Alert.alert('Erreur', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

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
          right={(props) => <List.Icon {...props} icon={showPasswordForm ? 'chevron-up' : 'chevron-right'} />}
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        />
        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <TextInput
              label="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <TextInput
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <TextInput
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isChangingPassword}
              disabled={isChangingPassword}
              style={styles.passwordButton}
            >
              Modifier le mot de passe
            </Button>
          </View>
        )}


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
  passwordForm: {
    padding: spacing.md,
  },
  passwordInput: {
    marginBottom: spacing.sm,
  },
  passwordButton: {
    marginTop: spacing.sm,
  },
  appInfo: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  appInfoText: {
    color: colors.onSurfaceVariant,
  },
});