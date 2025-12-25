import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface PackagingConfirmationModalProps {
  visible: boolean;
  photoUrl: string | null;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function PackagingConfirmationModal({
  visible,
  photoUrl,
  onConfirm,
  onReject,
  onDismiss,
  isLoading = false,
}: PackagingConfirmationModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason.trim());
      setRejectReason('');
      setShowRejectForm(false);
    }
  };

  const handleDismiss = () => {
    setShowRejectForm(false);
    setRejectReason('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable={!isLoading}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="package-variant-closed" size={32} color={colors.primary} />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Confirmation d'emballage
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Le livreur a terminé l'emballage de votre colis. Veuillez vérifier et confirmer.
          </Text>
        </View>

        {/* Photo de l'emballage */}
        {photoUrl && (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
            <View style={styles.photoLabel}>
              <MaterialCommunityIcons name="camera" size={16} color={colors.onPrimary} />
              <Text style={styles.photoLabelText}>Photo prise par le livreur</Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text variant="bodySmall" style={styles.instructionsText}>
            Vérifiez que votre article est bien emballé et protégé. Une fois confirmé, le livreur pourra récupérer le colis.
          </Text>
        </View>

        {/* Formulaire de refus */}
        {showRejectForm ? (
          <View style={styles.rejectForm}>
            <Text variant="titleSmall" style={styles.rejectTitle}>
              Pourquoi refusez-vous l'emballage ?
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Ex: L'article n'est pas assez protégé..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              style={styles.rejectInput}
            />
            <View style={styles.rejectButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                style={styles.rejectButton}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                mode="contained"
                onPress={handleReject}
                style={styles.rejectButton}
                buttonColor={colors.error}
                disabled={!rejectReason.trim() || isLoading}
                loading={isLoading}
              >
                Refuser
              </Button>
            </View>
          </View>
        ) : (
          /* Boutons d'action */
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={styles.confirmButton}
              icon="check-circle"
              loading={isLoading}
              disabled={isLoading}
            >
              Confirmer l'emballage
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => setShowRejectForm(true)}
              style={styles.rejectOutlineButton}
              icon="close-circle"
              textColor={colors.error}
              disabled={isLoading}
            >
              Refuser l'emballage
            </Button>
          </View>
        )}

        {/* Note de sécurité */}
        <View style={styles.securityNote}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.secondary} />
          <Text variant="bodySmall" style={styles.securityNoteText}>
            Cette confirmation protège les deux parties en cas de litige.
          </Text>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: 16,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  photoContainer: {
    margin: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  photo: {
    width: '100%',
    height: screenWidth * 0.6,
  },
  photoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
  },
  photoLabelText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
  },
  instructionsText: {
    flex: 1,
    color: colors.onSurface,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmButton: {
    paddingVertical: spacing.xs,
  },
  rejectOutlineButton: {
    borderColor: colors.error,
  },
  rejectForm: {
    padding: spacing.lg,
  },
  rejectTitle: {
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  rejectInput: {
    marginBottom: spacing.md,
  },
  rejectButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rejectButton: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  securityNoteText: {
    color: colors.onSurfaceVariant,
  },
});