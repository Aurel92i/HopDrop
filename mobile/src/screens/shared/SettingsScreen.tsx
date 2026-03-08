import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Modal, TouchableOpacity } from 'react-native';
import { Text, List, Switch, Divider, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation, languageLabels, Language } from '../../i18n/i18nContext';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { api } from '../../services/api';

export function SettingsScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { t, language, setLanguage } = useTranslation();
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('shared.settings.passwordFieldsRequired'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('shared.settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('shared.settings.passwordMismatch'));
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert(t('common.success'), t('shared.settings.passwordChanged'));
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.error || t('shared.settings.passwordError');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@hopdrop.fr?subject=Support HopDrop');
  };

  const handleRateApp = () => {
    Alert.alert(t('common.thanks'), t('shared.settings.rateAppMessage'));
  };

  const showLanguagePicker = () => {
    setShowLanguageModal(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('shared.settings.deleteAccount'),
      t('shared.settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('common.info'), t('shared.settings.deleteAccountInfo'));
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Language Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('shared.settings.language')}
      </Text>
      <View style={styles.section}>
        <List.Item
          title={t('shared.settings.selectLanguage')}
          description={languageLabels[language]}
          left={(props) => <List.Icon {...props} icon="translate" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={showLanguagePicker}
        />
      </View>

      {/* Notifications Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('shared.settings.notifications')}
      </Text>
      <View style={styles.section}>
        <List.Item
          title={t('shared.settings.pushNotifs')}
          description={t('shared.settings.pushNotifsDesc')}
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} />
          )}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.emails')}
          description={t('shared.settings.emailsDesc')}
          left={(props) => <List.Icon {...props} icon="email" />}
          right={() => <Switch value={true} disabled />}
        />
      </View>

      {/* Privacy Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('shared.settings.privacy')}
      </Text>
      <View style={styles.section}>
        <List.Item
          title={t('shared.settings.locationSharing')}
          description={t('shared.settings.locationSharingDesc')}
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={() => (
            <Switch value={locationSharing} onValueChange={setLocationSharing} />
          )}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.cgu')}
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Legal', { docType: 'cgu' })}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.cgv')}
          left={(props) => <List.Icon {...props} icon="file-document-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Legal', { docType: 'cgv' })}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.privacyPolicy')}
          left={(props) => <List.Icon {...props} icon="shield-lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Legal', { docType: 'confidentialite' })}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.legalNotices')}
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Legal', { docType: 'mentions' })}
        />
      </View>

      {/* Support Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('shared.settings.support')}
      </Text>
      <View style={styles.section}>
        <List.Item
          title={t('shared.settings.contactSupport')}
          description="support@hopdrop.fr"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleContactSupport}
        />
        <Divider />
        <List.Item
          title={t('shared.settings.rateApp')}
          description={t('shared.settings.rateAppDesc')}
          left={(props) => <List.Icon {...props} icon="star" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleRateApp}
        />
      </View>

      {/* Account Section */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('shared.settings.account')}
      </Text>
      <View style={styles.section}>
        <List.Item
          title={t('shared.settings.changePassword')}
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon={showPasswordForm ? 'chevron-up' : 'chevron-right'} />}
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        />
        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <TextInput
              label={t('shared.settings.currentPassword')}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <TextInput
              label={t('shared.settings.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <TextInput
              label={t('shared.settings.confirmNewPassword')}
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
              {t('shared.settings.changePasswordBtn')}
            </Button>
          </View>
        )}
        <Divider />
        <List.Item
          title={t('shared.settings.deleteAccount')}
          titleStyle={{ color: colors.error }}
          left={(props) => <List.Icon {...props} icon="delete" color={colors.error} />}
          onPress={handleDeleteAccount}
        />
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text variant="bodySmall" style={styles.appInfoText}>
          {t('common.version')}
        </Text>
        <Text variant="bodySmall" style={styles.appInfoText}>
          {t('common.copyright')}
        </Text>
      </View>

      {/* Modal sélection de langue */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableOpacity style={styles.langModalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('shared.settings.selectLanguage')}</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.langModalOption}
                onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
              >
                <Text style={[styles.langModalOptionText, lang === language && { color: colors.primary, fontWeight: '700' }]}>
                  {languageLabels[lang]}{lang === language ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  langModalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  langModalOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
});