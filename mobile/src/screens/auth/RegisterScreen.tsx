import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal } from 'react-native';
import { Text, Button, Snackbar, SegmentedButtons, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Logo } from '../../components/common/Logo';
import { FormInput } from '../../components/forms/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { signInWithGoogle, signInWithApple, isAppleAuthAvailable } from '../../services/socialAuth';

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

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });
    } catch (e) {
      // Error handled by store
    }
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
      >
        <View style={styles.header}>
          <Logo size="medium" />
          <Text variant="headlineSmall" style={styles.subtitle}>
            {t('auth.register.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
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

          <View style={styles.roleSection}>
            <Text variant="bodyLarge" style={styles.roleLabel}>
              {t('auth.register.roleLabel')}
            </Text>
            <Controller
              control={control}
              name="role"
              render={({ field: { onChange, value } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={onChange}
                  buttons={[
                    { value: 'VENDOR', label: t('auth.register.roleVendor'), icon: 'package-variant' },
                    { value: 'CARRIER', label: t('auth.register.roleCarrier'), icon: 'bike' },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
          </View>

          <View style={styles.cguRow}>
            <Checkbox
              status={cguAccepted ? 'checked' : 'unchecked'}
              onPress={() => setCguAccepted(!cguAccepted)}
              color={colors.primary}
            />
            <Text variant="bodySmall" style={styles.cguText}>
              {t('auth.register.acceptCgu')}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isBusy || !cguAccepted}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {t('auth.register.submit')}
          </Button>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="bodySmall" style={styles.dividerText}>
              {t('auth.register.orDivider')}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Bouton Apple (iOS uniquement) */}
          {isAppleAuthAvailable() && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={() => handleSocialSignUp('apple')}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.appleButtonText}>
                {socialLoading === 'apple' ? '...' : t('auth.register.continueWithApple')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Bouton Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleSocialSignUp('google')}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>
              {socialLoading === 'google' ? '...' : t('auth.register.continueWithGoogle')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            {t('auth.register.hasAccount')}
          </Text>
          <Button mode="text" onPress={() => navigation.goBack()}>
            {t('auth.register.login')}
          </Button>
        </View>
      </ScrollView>

      {/* Modal de sélection du rôle */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {t('auth.register.selectRoleTitle')}
            </Text>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleRoleSelected('VENDOR')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} />
              <View style={styles.roleOptionText}>
                <Text variant="titleMedium">{t('auth.register.selectRoleVendor')}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {t('auth.register.roleVendor')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleRoleSelected('CARRIER')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bike" size={28} color={colors.secondary} />
              <View style={styles.roleOptionText}>
                <Text variant="titleMedium">{t('auth.register.selectRoleCarrier')}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {t('auth.register.roleCarrier')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <Button
              mode="text"
              onPress={() => {
                setRoleModalVisible(false);
                setPendingSocialProvider(null);
              }}
              style={styles.modalCancel}
            >
              {t('common.cancel')}
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  roleSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  roleLabel: {
    marginBottom: spacing.sm,
    color: colors.onSurface,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  submitButtonContent: {
    paddingVertical: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outline,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.onSurfaceVariant,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: spacing.sm,
    gap: spacing.sm,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.sm,
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerText: {
    color: colors.onSurfaceVariant,
  },
  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  cguText: {
    flex: 1,
    color: colors.onSurfaceVariant,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  roleOptionText: {
    flex: 1,
  },
  modalCancel: {
    marginTop: spacing.sm,
  },
});
