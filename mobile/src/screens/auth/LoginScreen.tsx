import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Snackbar, TextInput } from 'react-native-paper';
import { useForm } from 'react-hook-form';
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
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (e) {
      // Error handled by store
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const idToken = await signInWithGoogle();
      await socialLogin('google', idToken);
    } catch (e: any) {
      // Ignorer si l'utilisateur a annulé
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
      // Ignorer si l'utilisateur a annulé (code 1001)
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
      >
        <View style={styles.header}>
          <Logo size="large" />
          <Text variant="headlineSmall" style={styles.subtitle}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
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

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
          >
            {t('auth.login.forgotPassword')}
          </Button>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isBusy}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {t('auth.login.submit')}
          </Button>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="bodySmall" style={styles.dividerText}>
              {t('auth.login.orDivider')}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Bouton Apple (iOS uniquement) */}
          {isAppleAuthAvailable() && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.appleButtonText}>
                {socialLoading === 'apple' ? '...' : t('auth.login.continueWithApple')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Bouton Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>
              {socialLoading === 'google' ? '...' : t('auth.login.continueWithGoogle')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            {t('auth.login.noAccount')}
          </Text>
          <Button mode="text" onPress={() => navigation.navigate('Register')}>
            {t('auth.login.register')}
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
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
  },
  footerText: {
    color: colors.onSurfaceVariant,
  },
});
