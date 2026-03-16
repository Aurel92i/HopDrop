import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, Snackbar, TextInput } from 'react-native-paper';
import { useForm } from 'react-hook-form';
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

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { t } = useTranslation();
  const { login, socialLogin, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (e) {}
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const idToken = await signInWithGoogle();
      await socialLogin('google', idToken);
    } catch (e: any) {
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        useAuthStore.setState({ error: e?.message || t('auth.login.socialError') });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const identityToken = await signInWithApple();
      await socialLogin('apple', identityToken);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        useAuthStore.setState({ error: e?.message || t('auth.login.socialError') });
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
        {/* Logo */}
        <View style={styles.header}>
          <Logo size="large" />
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.formCard}>
          <FormInput
            control={control}
            name="email"
            label={t('auth.login.email')}
            placeholder={t('auth.login.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email ? t('auth.login.emailInvalid') : undefined}
          />
          <FormInput
            control={control}
            name="password"
            label={t('auth.login.password')}
            placeholder={t('auth.login.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            error={errors.password ? t('auth.login.passwordRequired') : undefined}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isBusy && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? '...' : t('auth.login.submit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Séparateur */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.login.orDivider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
        <View style={styles.socialContainer}>
          {isAppleAuthAvailable() && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="apple" size={22} color="#FFFFFF" />
              <Text style={styles.appleButtonText}>
                {socialLoading === 'apple' ? '...' : t('auth.login.continueWithApple')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
            <Text style={styles.googleButtonText}>
              {socialLoading === 'google' ? '...' : t('auth.login.continueWithGoogle')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.login.noAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.login.register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    marginTop: 12,
    color: hdColors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: hdColors.border,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  forgotText: {
    color: hdColors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  socialContainer: {
    gap: 10,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
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
  snackbar: {
    backgroundColor: hdColors.danger,
  },
});