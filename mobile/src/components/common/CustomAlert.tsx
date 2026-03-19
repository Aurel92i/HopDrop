import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hdColors, borderRadius } from '../../theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const alertConfig: Record<AlertType, { icon: string; color: string; bg: string }> = {
  success: { icon: 'check-circle', color: '#2ECC71', bg: '#EAFAF1' },
  error: { icon: 'alert-circle', color: hdColors.danger, bg: hdColors.danger50 },
  warning: { icon: 'alert', color: '#F59E0B', bg: '#FEF9E7' },
  info: { icon: 'information', color: hdColors.accent, bg: hdColors.accent50 },
};

export function CustomAlert({ visible, type = 'info', title, message, buttons, onDismiss }: CustomAlertProps) {
  const config = alertConfig[type];

  const defaultButtons: AlertButton[] = buttons || [{ text: 'OK', style: 'primary', onPress: onDismiss }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icône */}
          <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
            <MaterialCommunityIcons name={config.icon as any} size={36} color={config.color} />
          </View>

          {/* Titre */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Boutons */}
          <View style={styles.buttonsContainer}>
            {defaultButtons.map((btn, index) => {
              const isPrimary = btn.style === 'primary' || (!btn.style && index === 0);
              const isDanger = btn.style === 'danger';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isPrimary && styles.buttonPrimary,
                    isDanger && styles.buttonDanger,
                    !isPrimary && !isDanger && styles.buttonSecondary,
                  ]}
                  onPress={btn.onPress || onDismiss}
                  activeOpacity={0.85}
                >
                  <Text style={[
                    styles.buttonText,
                    isPrimary && styles.buttonTextPrimary,
                    isDanger && styles.buttonTextDanger,
                    !isPrimary && !isDanger && styles.buttonTextSecondary,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: hdColors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
  },
  message: {
    fontSize: 14,
    color: hdColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 8,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: hdColors.accent,
  },
  buttonSecondary: {
    backgroundColor: hdColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: hdColors.border,
  },
  buttonDanger: {
    backgroundColor: hdColors.danger50,
    borderWidth: 1,
    borderColor: hdColors.danger,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: hdColors.text,
  },
  buttonTextDanger: {
    color: hdColors.danger,
  },
});