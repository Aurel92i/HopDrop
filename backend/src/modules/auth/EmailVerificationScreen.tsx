import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function EmailVerificationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, checkAuth } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Envoyer le code automatiquement à l'ouverture
  useEffect(() => {
    handleResend(true);
  }, []);

  // Countdown pour le cooldown de renvoi
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleCodeChange = (text: string, index: number) => {
    // Ne garder que les chiffres
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Passer au champ suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Si tous les champs sont remplis, vérifier automatiquement
    if (digit && index === 5) {
      const fullCode = [...newCode.slice(0, 5), digit].join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) {
      Alert.alert('Erreur', 'Entrez le code à 6 chiffres');
      return;
    }

    setIsVerifying(true);
    try {
      await api.verifyEmail(codeToVerify);

      // Rafraîchir les données utilisateur
      await checkAuth();

      Alert.alert(
        'Email vérifié !',
        'Votre adresse email a été vérifiée avec succès.',
        [{ text: 'Continuer', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Code incorrect';
      Alert.alert('Erreur', message);
      // Vider les champs
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (silent: boolean = false) => {
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      await api.sendVerificationCode();
      setCooldown(60); // 60 secondes de cooldown
      if (!silent) {
        Alert.alert('Code envoyé', `Un nouveau code a été envoyé à ${user?.email}`);
      }
    } catch (error: any) {
      if (!silent) {
        const message = error.response?.data?.error || error.message || 'Erreur envoi';
        Alert.alert('Erreur', message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Icône */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={64} color={colors.primary} />
        </View>

        {/* Titre */}
        <Text variant="headlineSmall" style={styles.title}>
          Vérifiez votre email
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Un code à 6 chiffres a été envoyé à
        </Text>
        <Text variant="titleMedium" style={styles.email}>
          {user?.email}
        </Text>

        {/* Champs du code */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : {},
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Bouton vérifier */}
        <Button
          mode="contained"
          onPress={() => handleVerify()}
          loading={isVerifying}
          disabled={isVerifying || code.join('').length !== 6}
          style={styles.verifyButton}
          icon="check-circle"
        >
          Vérifier
        </Button>

        {/* Renvoyer le code */}
        <View style={styles.resendContainer}>
          <Text variant="bodySmall" style={styles.resendText}>
            Vous n'avez pas reçu le code ?
          </Text>
          <Button
            mode="text"
            onPress={() => handleResend(false)}
            disabled={cooldown > 0 || isResending}
            loading={isResending}
            compact
          >
            {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Renvoyer le code'}
          </Button>
        </View>

        {/* Bouton Plus tard */}
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.laterButton}
          textColor={colors.onSurfaceVariant}
        >
          Plus tard
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  email: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  verifyButton: {
    width: '100%',
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resendText: {
    color: colors.onSurfaceVariant,
  },
  laterButton: {
    marginTop: spacing.sm,
  },
});
