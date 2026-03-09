import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Modal, Portal, Text, Button } from 'react-native-paper';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

interface PhotoPreviewModalProps {
  visible: boolean;
  photoUri: string | null;
  onValidate: (uri: string) => void;
  onRetake: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function PhotoPreviewModal({ visible, photoUri, onValidate, onRetake }: PhotoPreviewModalProps) {
  const { t } = useTranslation();

  if (!photoUri) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onRetake}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleMedium" style={styles.title}>
          {t('common.photoPreviewTitle')}
        </Text>

        <View style={styles.imageContainer}>
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            icon="check"
            onPress={() => onValidate(photoUri)}
            style={styles.validateButton}
          >
            {t('common.validate')}
          </Button>
          <Button
            mode="outlined"
            icon="camera-retake"
            onPress={onRetake}
          >
            {t('common.retakePhoto')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    height: screenWidth * 0.7,
    borderRadius: 12,
  },
  buttons: {
    gap: spacing.sm,
  },
  validateButton: {
    paddingVertical: spacing.xs,
  },
});
