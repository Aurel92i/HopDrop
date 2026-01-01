import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../theme';

interface PackagingConfirmationModalProps {
  visible: boolean;
  onConfirm: (photoUri: string) => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function PackagingConfirmationModal({
  visible,
  onConfirm,
  onDismiss,
  isLoading = false,
}: PackagingConfirmationModalProps) {
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

  const handleConfirm = () => {
    if (photoUri) {
      onConfirm(photoUri);
      setPhotoUri(null);
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
            <MaterialCommunityIcons name="package-variant-closed" size={32} color={colors.primary} />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Confirmation d'emballage
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Prenez une photo du colis emballé pour validation par le client
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
              <View style={styles.photoLabel}>
                <MaterialCommunityIcons name="camera-check" size={16} color={colors.onPrimary} />
                <Text style={styles.photoLabelText}>Photo prête à envoyer</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={takePhoto}>
              <MaterialCommunityIcons name="camera-plus" size={48} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.placeholderText}>
                Appuyez pour prendre une photo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text variant="bodySmall" style={styles.instructionsText}>
            Assurez-vous que l'article est bien visible et correctement emballé. Le client devra confirmer avant que vous puissiez récupérer le colis.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!photoUri ? (
            <Button
              mode="contained"
              onPress={takePhoto}
              icon="camera"
              style={styles.cameraButton}
            >
              Prendre une photo
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleConfirm}
              disabled={isLoading}
              loading={isLoading}
              icon="check-circle"
              style={styles.confirmButton}
            >
              Envoyer au client
            </Button>
          )}

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

// Styles

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
    height: screenWidth * 0.6,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.surface,
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
  photoPlaceholder: {
    height: 180,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.primary,
    marginTop: spacing.sm,
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
  cameraButton: {
    paddingVertical: spacing.xs,
  },
  confirmButton: {
    paddingVertical: spacing.xs,
  },
  cancelButton: {},
});
