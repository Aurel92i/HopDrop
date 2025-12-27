import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { Modal, Portal, Text, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../theme';

interface DeliveryProofModalProps {
  visible: boolean;
  onConfirm: (photoUri: string) => void;
  onDismiss: () => void;
  isLoading?: boolean;
  dropoffName?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export function DeliveryProofModal({
  visible,
  onConfirm,
  onDismiss,
  isLoading = false,
  dropoffName,
}: DeliveryProofModalProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleConfirm = () => {
    if (photoUri) {
      onConfirm(photoUri);
    }
  };

  const handleDismiss = () => {
    setPhotoUri(null);
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
            <MaterialCommunityIcons name="package-variant-closed-check" size={32} color={colors.primary} />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Confirmer le dépôt
          </Text>
          {dropoffName && (
            <Text variant="bodyMedium" style={styles.subtitle}>
              📍 {dropoffName}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.instructions}>
            Prenez en photo le reçu ou ticket de dépôt fourni par le point relais
          </Text>
        </View>

        {/* Zone photo */}
        <View style={styles.photoSection}>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              <IconButton
                icon="close-circle"
                size={28}
                iconColor={colors.error}
                style={styles.removePhotoBtn}
                onPress={() => setPhotoUri(null)}
              />
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="receipt" size={48} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={styles.placeholderText}>
                Photo de la preuve de dépôt
              </Text>
            </View>
          )}
        </View>

        {/* Boutons photo */}
        {!photoUri && (
          <View style={styles.photoButtons}>
            <Button
              mode="contained"
              icon="camera"
              onPress={takePhoto}
              style={styles.photoButton}
            >
              Prendre une photo
            </Button>
            <Button
              mode="outlined"
              icon="image"
              onPress={pickImage}
              style={styles.photoButton}
            >
              Galerie
            </Button>
          </View>
        )}

        {/* Info importante */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            Le client aura 12 heures pour confirmer la réception. Passé ce délai, la livraison sera automatiquement validée.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!photoUri || isLoading}
            loading={isLoading}
            icon="check-circle"
            style={styles.confirmButton}
          >
            Confirmer le dépôt
          </Button>
          <Button
            mode="outlined"
            onPress={handleDismiss}
            disabled={isLoading}
            style={styles.cancelButton}
          >
            Annuler
          </Button>
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
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  instructions: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  photoSection: {
    margin: spacing.lg,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: screenWidth * 0.5,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    height: 150,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  photoButton: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
  },
  infoText: {
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
  cancelButton: {},
});
