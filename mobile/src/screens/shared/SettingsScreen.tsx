import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Modal, TouchableOpacity, Platform } from 'react-native';
import { Text, Switch, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation, languageLabels, Language } from '../../i18n/i18nContext';
import { useAuthStore } from '../../stores/authStore';
import { hdColors, spacing, borderRadius } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { api } from '../../services/api';

const QS = Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' });

interface SettingRowProps {
  icon: string;
  title: string;
  desc?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, title, desc, onPress, right, danger }: SettingRowProps) {
  const content = (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconCircle, danger && { backgroundColor: '#FADBD8' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={danger ? '#C0392B' : hdColors.accent} />
      </View>
      <View style={rowStyles.textCol}>
        <Text style={[rowStyles.title, danger && { color: '#C0392B' }]}>{title}</Text>
        {desc && <Text style={rowStyles.desc}>{desc}</Text>}
      </View>
      {right || (onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={hdColors.textTertiary} />)}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: hdColors.accent50, justifyContent: 'center', alignItems: 'center' },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: hdColors.text },
  desc: { fontSize: 12, color: hdColors.textTertiary },
});

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

  const handleDeleteAccount = () => {
    Alert.alert(
      t('shared.settings.deleteAccount'),
      t('shared.settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => Alert.alert(t('common.info'), t('shared.settings.deleteAccountInfo')) },
      ]
    );
  };

  const divider = <View style={styles.divider} />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Langue */}
      <Text style={styles.sectionTitle}>{t('shared.settings.language')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="translate"
          title={t('shared.settings.selectLanguage')}
          desc={languageLabels[language]}
          onPress={() => setShowLanguageModal(true)}
        />
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>{t('shared.settings.notifications')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="bell-outline"
          title={t('shared.settings.pushNotifs')}
          desc={t('shared.settings.pushNotifsDesc')}
          right={<Switch value={notifications} onValueChange={setNotifications} color={hdColors.accent} />}
        />
        {divider}
        <SettingRow
          icon="email-outline"
          title={t('shared.settings.emails')}
          desc={t('shared.settings.emailsDesc')}
          right={<Switch value={true} disabled color={hdColors.accent} />}
        />
      </View>

      {/* Confidentialité */}
      <Text style={styles.sectionTitle}>{t('shared.settings.privacy')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="map-marker-outline"
          title={t('shared.settings.locationSharing')}
          desc={t('shared.settings.locationSharingDesc')}
          right={<Switch value={locationSharing} onValueChange={setLocationSharing} color={hdColors.accent} />}
        />
        {divider}
        <SettingRow icon="file-document-outline" title={t('shared.settings.cgu')} onPress={() => navigation.navigate('Legal', { docType: 'cgu' })} />
        {divider}
        <SettingRow icon="file-document-outline" title={t('shared.settings.cgv')} onPress={() => navigation.navigate('Legal', { docType: 'cgv' })} />
        {divider}
        <SettingRow icon="shield-lock-outline" title={t('shared.settings.privacyPolicy')} onPress={() => navigation.navigate('Legal', { docType: 'confidentialite' })} />
        {divider}
        <SettingRow icon="information-outline" title={t('shared.settings.legalNotices')} onPress={() => navigation.navigate('Legal', { docType: 'mentions' })} />
      </View>

      {/* Support */}
      <Text style={styles.sectionTitle}>{t('shared.settings.support')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="help-circle-outline"
          title={t('shared.settings.contactSupport')}
          desc="support@hopdrop.fr"
          onPress={() => Linking.openURL('mailto:support@hopdrop.fr?subject=Support HopDrop')}
        />
        {divider}
        <SettingRow
          icon="star-outline"
          title={t('shared.settings.rateApp')}
          desc={t('shared.settings.rateAppDesc')}
          onPress={() => Alert.alert(t('common.thanks'), t('shared.settings.rateAppMessage'))}
        />
      </View>

      {/* Compte */}
      <Text style={styles.sectionTitle}>{t('shared.settings.account')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="lock-outline"
          title={t('shared.settings.changePassword')}
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
              outlineColor={hdColors.border}
              activeOutlineColor={hdColors.accent}
            />
            <TextInput
              label={t('shared.settings.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
              outlineColor={hdColors.border}
              activeOutlineColor={hdColors.accent}
            />
            <TextInput
              label={t('shared.settings.confirmNewPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
              outlineColor={hdColors.border}
              activeOutlineColor={hdColors.accent}
            />
            <TouchableOpacity
              style={[styles.passwordButton, isChangingPassword && { opacity: 0.5 }]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              activeOpacity={0.85}
            >
              <Text style={styles.passwordButtonText}>
                {isChangingPassword ? '...' : t('shared.settings.changePasswordBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {divider}
        <SettingRow
          icon="delete-outline"
          title={t('shared.settings.deleteAccount')}
          onPress={handleDeleteAccount}
          danger
        />
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>{t('common.version')}</Text>
        <Text style={styles.appInfoText}>{t('common.copyright')}</Text>
      </View>

      {/* Modal langue */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('shared.settings.selectLanguage')}</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.modalOption, lang === language && styles.modalOptionActive]}
                onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, lang === language && styles.modalOptionTextActive]}>
                  {languageLabels[lang]}
                </Text>
                {lang === language && <MaterialCommunityIcons name="check" size={18} color={hdColors.accent} />}
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
    backgroundColor: hdColors.background,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: hdColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    backgroundColor: hdColors.surface,
    marginHorizontal: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    overflow: 'hidden',
  },
  divider: {
    height: 0.5,
    backgroundColor: hdColors.border,
    marginLeft: 70,
  },

  // Password
  passwordForm: {
    padding: 16,
    paddingTop: 0,
  },
  passwordInput: {
    marginBottom: 10,
    backgroundColor: hdColors.surface,
  },
  passwordButton: {
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  passwordButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // App info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hdColors.text,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: QS,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  modalOptionActive: {
    backgroundColor: hdColors.accent50,
  },
  modalOptionText: {
    fontSize: 16,
    color: hdColors.text,
  },
  modalOptionTextActive: {
    color: hdColors.accent,
    fontWeight: '700',
  },
});