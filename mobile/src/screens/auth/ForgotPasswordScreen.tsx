import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Logo } from '../../components/common/Logo';
import { FormInput } from '../../components/forms/FormInput';
import { api } from '../../services/api';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing } from '../../theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.forgotPassword(data.email);
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Logo size="medium" />
          <Text variant="headlineSmall" style={styles.successTitle}>
            Email envoyé !
          </Text>
          <Text variant="bodyMedium" style={styles.successText}>
            Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
          >
            Retour à la connexion
          </Button>
        </View>
      </View>
    );
  }

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
            Mot de passe oublié
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            Envoyer le lien
          </Button>
        </View>

        <Button mode="text" onPress={() => navigation.goBack()}>
          Retour à la connexion
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={3000}
        action={{ label: 'OK', onPress: () => setError(null) }}
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
    color: colors.onSurface,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  submitButtonContent: {
    paddingVertical: spacing.sm,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successTitle: {
    marginTop: spacing.lg,
    color: colors.primary,
    textAlign: 'center',
  },
  successText: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginTop: spacing.xl,
  },
});