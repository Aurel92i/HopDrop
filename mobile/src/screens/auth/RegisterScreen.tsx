import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Snackbar, SegmentedButtons, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Logo } from '../../components/common/Logo';
import { FormInput } from '../../components/forms/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

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
  const { register, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);

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
            disabled={isLoading || !cguAccepted}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {t('auth.register.submit')}
          </Button>
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
});
