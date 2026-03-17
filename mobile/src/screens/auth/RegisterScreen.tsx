import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Logo } from '../../components/common/Logo';
import { FormInput } from '../../components/forms/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { hdColors, spacing, borderRadius } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { signInWithGoogle, signInWithApple, isAppleAuthAvailable } from '../../services/socialAuth';

const QS = Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' });

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.enum(['VENDOR', 'CARRIER']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { t } = useTranslation();
  const { register, socialLogin, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<'google' | 'apple' | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'VENDOR',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });
    } catch (e) {}
  };

  const handleSocialSignUp = (provider: 'google' | 'apple') => {
    setPendingSocialProvider(provider);
    setRoleModalVisible(true);
  };

  const handleRoleSelected = async (role: 'VENDOR' | 'CARRIER') => {
    setRoleModalVisible(false);
    const provider = pendingSocialProvider;
    setPendingSocialProvider(null);
    if (!provider) return;

    setSocialLoading(provider);
    try {
      const token = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple();
      await socialLogin(provider, token, role);
    } catch (e: any) {
      const isCancelled = provider === 'google'
        ? e?.code === 'SIGN_IN_CANCELLED'
        : e?.code === 'ERR_REQUEST_CANCELED';
      if (!isCancelled) {
        useAuthStore.setState({ error: e?.message || t('auth.register.socialError') });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const isBusy = isLoading || socialLoading !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Logo size="large" />
          <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Prénom + Nom côte à côte */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <FormInput
                control={control}
                name="firstName"
                label={t('auth.register.firstName')}
                autoCapitalize="words"
                error={errors.firstName ? t('auth.register.firstNameMin') : undefined}
              />
            </View>
            <View style={styles.halfInput}>
              <FormInput
                control={control}
                name="lastName"
                label={t('auth.register.lastName')}
                autoCapitalize="words"
                error={errors.lastName ? t('auth.register.lastNameMin') : undefined}
              />
            </View>
          </View>

          <FormInput
            control={control}
            name="email"
            label={t('auth.register.email')}
            placeholder={t('auth.register.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email ? t('auth.register.emailInvalid') : undefined}
          />

          <FormInput
            control={control}
            name="password"
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            error={errors.password ? t('auth.register.passwordMin') : undefined}
          />

          <FormInput
            control={control}
            name="confirmPassword"
            label={t('auth.register.confirmPassword')}
            secureTextEntry={!showPassword}
            error={errors.confirmPassword ? t('auth.register.passwordMismatch') : undefined}
          />

          {/* Sélecteur de rôle — style cards */}
          <Text style={styles.roleLabel}>{t('auth.register.roleLabel')}</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleCard, value === 'VENDOR' && styles.roleCardActive]}
                  onPress={() => onChange('VENDOR')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIconCircle, value === 'VENDOR' && styles.roleIconCircleActive]}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={22}
                      color={value === 'VENDOR' ? '#FFFFFF' : hdColors.textTertiary}
                    />
                  </View>
                  <Text style={[styles.roleCardText, value === 'VENDOR' && styles.roleCardTextActive]}>
                    {t('auth.register.roleVendor')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleCard, value === 'CARRIER' && styles.roleCardActive]}
                  onPress={() => onChange('CARRIER')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIconCircle, value === 'CARRIER' && styles.roleIconCircleActive]}>
                    <MaterialCommunityIcons
                      name="bike"
                      size={22}
                      color={value === 'CARRIER' ? '#FFFFFF' : hdColors.textTertiary}
                    />
                  </View>
                  <Text style={[styles.roleCardText, value === 'CARRIER' && styles.roleCardTextActive]}>
                    {t('auth.register.roleCarrier')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* CGU */}
          <TouchableOpacity
            style={styles.cguRow}
            onPress={() => setCguAccepted(!cguAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.cguCheck, cguAccepted && styles.cguCheckActive]}>
              {cguAccepted && (
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.cguText}>{t('auth.register.acceptCgu')}</Text>
          </TouchableOpacity>

          {/* Bouton S'inscrire */}
          <TouchableOpacity
            style={[styles.submitButton, (isBusy || !cguAccepted) && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isBusy || !cguAccepted}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? '...' : t('auth.register.submit')}
            </Text>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.register.orDivider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple */}
          {isAppleAuthAvailable() && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={() => handleSocialSignUp('apple')}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="apple" size={22} color="#FFFFFF" />
              <Text style={styles.appleButtonText}>
                {socialLoading === 'apple' ? '...' : t('auth.register.continueWithApple')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleSocialSignUp('google')}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
            <Text style={styles.googleButtonText}>
              {socialLoading === 'google' ? '...' : t('auth.register.continueWithGoogle')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.register.hasAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.register.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal rôle pour social login */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setRoleModalVisible(false); setPendingSocialProvider(null); }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('auth.register.selectRoleTitle')}</Text>

            <TouchableOpacity
              style={styles.modalRoleOption}
              onPress={() => handleRoleSelected('VENDOR')}
              activeOpacity={0.7}
            >
              <View style={[styles.modalRoleIcon, { backgroundColor: hdColors.accent50 }]}>
                <MaterialCommunityIcons name="package-variant" size={24} color={hdColors.accent} />
              </View>
              <View style={styles.modalRoleText}>
                <Text style={styles.modalRoleName}>{t('auth.register.selectRoleVendor')}</Text>
                <Text style={styles.modalRoleDesc}>{t('auth.register.roleVendor')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={hdColors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalRoleOption}
              onPress={() => handleRoleSelected('CARRIER')}
              activeOpacity={0.7}
            >
              <View style={[styles.modalRoleIcon, { backgroundColor: '#E6F7F8' }]}>
                <MaterialCommunityIcons name="bike" size={24} color={hdColors.accent} />
              </View>
              <View style={styles.modalRoleText}>
                <Text style={styles.modalRoleName}>{t('auth.register.selectRoleCarrier')}</Text>
                <Text style={styles.modalRoleDesc}>{t('auth.register.roleCarrier')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={hdColors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => { setRoleModalVisible(false); setPendingSocialProvider(null); }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        style={styles.snackbar}
        action={{ label: t('common.ok'), onPress: clearError }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  subtitle: {
    marginTop: 10,
    color: hdColors.textSecondary,
    fontSize: 17,
    textAlign: 'center',
    fontFamily: QS,
  },

  // Form
  form: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },

  // Role selector cards
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.text,
    marginTop: 16,
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    backgroundColor: hdColors.surface,
    gap: 8,
  },
  roleCardActive: {
    borderColor: hdColors.accent,
    backgroundColor: hdColors.accent50,
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconCircleActive: {
    backgroundColor: hdColors.accent,
  },
  roleCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.textSecondary,
  },
  roleCardTextActive: {
    color: hdColors.accent,
    fontWeight: '700',
  },

  // CGU
  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  cguCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: hdColors.surface,
  },
  cguCheckActive: {
    backgroundColor: hdColors.accent,
    borderColor: hdColors.accent,
  },
  cguText: {
    flex: 1,
    fontSize: 13,
    color: hdColors.textSecondary,
    lineHeight: 18,
  },

  // Submit
  submitButton: {
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: QS,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: hdColors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: hdColors.textTertiary,
    fontSize: 13,
  },

  // Social buttons
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    marginBottom: 10,
    gap: 10,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: hdColors.border,
    gap: 10,
  },
  googleButtonText: {
    color: hdColors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 6,
  },
  footerText: {
    color: hdColors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: hdColors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: hdColors.text,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: QS,
  },
  modalRoleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: hdColors.surfaceSecondary,
    marginBottom: 10,
    gap: 14,
  },
  modalRoleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRoleText: {
    flex: 1,
    gap: 2,
  },
  modalRoleName: {
    fontSize: 16,
    fontWeight: '700',
    color: hdColors.text,
  },
  modalRoleDesc: {
    fontSize: 13,
    color: hdColors.textSecondary,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 15,
    color: hdColors.textTertiary,
    fontWeight: '600',
  },

  // Snackbar
  snackbar: {
    backgroundColor: '#C0392B',
  },
});