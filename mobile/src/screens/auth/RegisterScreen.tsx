import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Snackbar, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Logo } from '../../components/common/Logo';
import { FormInput } from '../../components/forms/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing } from '../../theme';

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.enum(['VENDOR', 'CARRIER', 'BOTH']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

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
            Créer un compte
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <FormInput
                control={control}
                name="firstName"
                label="Prénom"
                autoCapitalize="words"
                error={errors.firstName?.message}
              />
            </View>
            <View style={styles.halfInput}>
              <FormInput
                control={control}
                name="lastName"
                label="Nom"
                autoCapitalize="words"
                error={errors.lastName?.message}
              />
            </View>
          </View>

          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />

          <FormInput
            control={control}
            name="password"
            label="Mot de passe"
            placeholder="Minimum 8 caractères"
            secureTextEntry={!showPassword}
            error={errors.password?.message}
          />

          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirmer le mot de passe"
            secureTextEntry={!showPassword}
            error={errors.confirmPassword?.message}
          />

          <View style={styles.roleSection}>
            <Text variant="bodyLarge" style={styles.roleLabel}>
              Je souhaite :
            </Text>
            <Controller
              control={control}
              name="role"
              render={({ field: { onChange, value } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={onChange}
                  buttons={[
                    { value: 'VENDOR', label: 'Envoyer', icon: 'package-variant' },
                    { value: 'CARRIER', label: 'Livrer', icon: 'bike' },
                    { value: 'BOTH', label: 'Les deux', icon: 'swap-horizontal' },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            S'inscrire
          </Button>
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            Déjà un compte ?
          </Text>
          <Button mode="text" onPress={() => navigation.goBack()}>
            Se connecter
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{ label: 'OK', onPress: clearError }}
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
});