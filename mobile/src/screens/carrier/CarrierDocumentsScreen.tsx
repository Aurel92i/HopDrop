import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, Chip, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';

type DocumentType = 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'KBIS' | 'VEHICLE_REGISTRATION' | 'DRIVING_LICENSE';
type VehicleType = 'NONE' | 'BIKE' | 'SCOOTER' | 'CAR';

interface CarrierDocument {
  type: DocumentType;
  label?: string;
  required: boolean;
  uploaded: boolean;
  status: string | null;
  fileUrl: string | null;
  rejectionReason: string | null;
}

interface CarrierProfileInfo {
  vehicleType: VehicleType;
  hasOwnPrinter: boolean;
  documentsVerified: boolean;
}

// Taille max fichier : 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function CarrierDocumentsScreen() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [profile, setProfile] = useState<CarrierProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<DocumentType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rawDocPhoto, setRawDocPhoto] = useState<{ uri: string; type: DocumentType } | null>(null);

  const documentLabels: Record<DocumentType, { label: string; description: string; icon: string }> = {
    ID_CARD_FRONT: {
      label: t('carrier.documents.idFront'),
      description: t('carrier.documents.idFrontDesc'),
      icon: 'card-account-details',
    },
    ID_CARD_BACK: {
      label: t('carrier.documents.idBack'),
      description: t('carrier.documents.idBackDesc'),
      icon: 'card-account-details-outline',
    },
    DRIVING_LICENSE: {
      label: t('carrier.documents.drivingLicense'),
      description: t('carrier.documents.drivingLicenseDesc'),
      icon: 'card-account-details',
    },
    KBIS: {
      label: t('carrier.documents.kbis'),
      description: t('carrier.documents.kbisDesc'),
      icon: 'file-document',
    },
    VEHICLE_REGISTRATION: {
      label: t('carrier.documents.vehicleReg'),
      description: t('carrier.documents.vehicleRegDesc'),
      icon: 'car',
    },
  };

  const vehicleOptions = [
    { value: 'NONE', label: t('carrier.documents.vehicleNone') },
    { value: 'BIKE', label: t('carrier.documents.vehicleBike') },
    { value: 'SCOOTER', label: t('carrier.documents.vehicleScooter') },
    { value: 'CAR', label: t('carrier.documents.vehicleCar') },
  ];

  const loadDocuments = useCallback(async () => {
    try {
      const result = await api.getCarrierDocuments();
      setDocuments(result.documents);
      setProfile(result.profile);
    } catch (error: any) {
      console.error('Erreur chargement documents:', error);
      Alert.alert(t('common.error'), error.message || t('common.genericError'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handlePickDocument = async (type: DocumentType) => {
    Alert.alert(t('carrier.documents.addDocumentTitle'), t('carrier.documents.addDocumentMessage'), [
      { text: t('carrier.documents.takePhoto'), onPress: () => pickFromCamera(type) },
      { text: t('carrier.documents.chooseFile'), onPress: () => pickFromFiles(type) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const pickFromCamera = async (type: DocumentType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionDenied'), t('carrier.documents.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setRawDocPhoto({ uri: result.assets[0].uri, type });
    }
  };

  const pickFromFiles = async (type: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Vérifier la taille du fichier
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
          Alert.alert(
            t('carrier.documents.fileTooLarge'),
            t('carrier.documents.fileTooLargeDesc').replace('{size}', String(Math.round(fileInfo.size / 1024 / 1024)))
          );
          return;
        }

        const isPdf = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');
        console.log('[SCREEN] Fichier sélectionné:', asset.name, '- MIME:', asset.mimeType, '- PDF:', isPdf);
        await uploadDocument(type, asset.uri, isPdf ? 'pdf' : 'image');
      }
    } catch (error) {
      console.error('Erreur selection fichier:', error);
      Alert.alert(t('common.error'), t('carrier.documents.fileSelectError'));
    }
  };

  const uploadDocument = async (type: DocumentType, fileUri: string, fileType: 'image' | 'pdf') => {
    setIsUploading(type);
    try {
      console.log('[SCREEN] === DEBUT UPLOAD ===');
      console.log('[SCREEN] Type document:', type);
      console.log('[SCREEN] Type fichier:', fileType);
      console.log('[SCREEN] URI:', fileUri.substring(0, 80) + '...');

      // Etape 1 : Lire le fichier en base64
      console.log('[SCREEN] Etape 1: Lecture base64...');
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[SCREEN] Base64 lu - taille:', Math.round(base64.length / 1024), 'KB');

      // Etape 2 : Determiner le type MIME
      let mimeType = 'image/jpeg';
      if (fileType === 'pdf') {
        mimeType = 'application/pdf';
      } else if (fileUri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (fileUri.toLowerCase().includes('.heic')) {
        mimeType = 'image/heic';
      }
      console.log('[SCREEN] MIME type:', mimeType);

      // Etape 3 : Creer le data URI
      const dataUri = `data:${mimeType};base64,${base64}`;

      // Etape 4 : Upload via base64 (UN SEUL appel a /uploads)
      console.log('[SCREEN] Etape 4: Appel api.uploadBase64...');
      const imageUrl = await api.uploadBase64(dataUri);
      console.log('[SCREEN] Upload OK - URL:', imageUrl);

      // Etape 5 : Enregistrer le document (appel a /carrier/documents)
      console.log('[SCREEN] Etape 5: Appel api.saveCarrierDocument...');
      await api.saveCarrierDocument(type, imageUrl);
      console.log('[SCREEN] === UPLOAD TERMINE AVEC SUCCES ===');

      Alert.alert(t('common.success'), t('carrier.documents.uploadSuccess'));
      loadDocuments();
    } catch (error: any) {
      console.error('[SCREEN] === ERREUR UPLOAD ===');
      console.error('[SCREEN] Message:', error.message);
      console.error('[SCREEN] Response status:', error.response?.status);
      console.error('[SCREEN] Response data:', JSON.stringify(error.response?.data));

      let errorMessage = t('carrier.documents.uploadError');
      if (error.response?.status === 413) {
        errorMessage = t('carrier.documents.fileTooLargeServer');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeleteDocument = (type: DocumentType) => {
    Alert.alert(t('carrier.documents.deleteDocumentTitle'), t('carrier.documents.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('carrier.documents.deleteDocument'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCarrierDocument(type);
            loadDocuments();
          } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
          }
        },
      },
    ]);
  };

  const handleVehicleChange = async (value: string) => {
    try {
      await api.updateCarrierDocumentsProfile({ vehicleType: value });
      setProfile((prev) => (prev ? { ...prev, vehicleType: value as VehicleType } : null));
      loadDocuments();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handlePrinterChange = async (value: boolean) => {
    try {
      await api.updateCarrierDocumentsProfile({ hasOwnPrinter: value });
      setProfile((prev) => (prev ? { ...prev, hasOwnPrinter: value } : null));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return colors.primary;
      case 'REJECTED': return colors.error;
      case 'PENDING': return colors.secondary;
      default: return colors.outline;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return t('carrier.documents.statusApproved');
      case 'REJECTED': return t('carrier.documents.statusRejected');
      case 'PENDING': return t('carrier.documents.statusPending');
      default: return t('carrier.documents.statusNotSent');
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return 'check-circle';
      case 'REJECTED': return 'close-circle';
      case 'PENDING': return 'clock-outline';
      default: return 'upload-outline';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Statut general */}
      <Card style={[styles.statusCard, profile?.documentsVerified && styles.statusCardApproved]}>
        <Card.Content style={styles.statusContent}>
          <MaterialCommunityIcons
            name={profile?.documentsVerified ? 'check-circle' : 'information'}
            size={32}
            color={profile?.documentsVerified ? colors.primary : colors.secondary}
          />
          <View style={styles.statusInfo}>
            <Text variant="titleSmall">
              {profile?.documentsVerified ? t('carrier.documents.verifiedTitle') : t('carrier.documents.pendingTitle')}
            </Text>
            <Text variant="bodySmall" style={styles.statusSubtext}>
              {profile?.documentsVerified
                ? t('carrier.documents.verifiedSubtext')
                : t('carrier.documents.pendingSubtext')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Type de vehicule */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('carrier.documents.vehicleType')}</Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            {t('carrier.documents.vehicleQuestion')}
          </Text>
          <View style={styles.vehicleOptions}>
            {vehicleOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.vehicleOption,
                  profile?.vehicleType === option.value && styles.vehicleOptionSelected,
                ]}
                onPress={() => handleVehicleChange(option.value)}
              >
                <Text
                  style={[
                    styles.vehicleOptionText,
                    profile?.vehicleType === option.value && styles.vehicleOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Question imprimante */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.printerRow}>
            <View style={styles.printerInfo}>
              <Text variant="titleSmall">{t('carrier.documents.printerQuestion')}</Text>
              <Text variant="bodySmall" style={styles.printerSubtext}>
                {t('carrier.documents.printerDesc')}
              </Text>
            </View>
            <Switch
              value={profile?.hasOwnPrinter || false}
              onValueChange={handlePrinterChange}
              color={colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Documents */}
      <Text variant="titleMedium" style={styles.documentsTitle}>{t('carrier.documents.requiredDocuments')}</Text>

      {documents.map((doc) => {
        const docInfo = documentLabels[doc.type];
        if (!docInfo) return null;
        const isCurrentlyUploading = isUploading === doc.type;

        return (
          <Card key={doc.type} style={styles.documentCard}>
            <Card.Content>
              <View style={styles.documentHeader}>
                <MaterialCommunityIcons
                  name={docInfo.icon as any}
                  size={28}
                  color={doc.uploaded ? getStatusColor(doc.status) : colors.outline}
                />
                <View style={styles.documentInfo}>
                  <View style={styles.documentTitleRow}>
                    <Text variant="titleSmall">{docInfo.label}</Text>
                    {doc.required && (
                      <Chip compact style={styles.requiredChip} textStyle={styles.requiredChipText}>
                        {t('common.required')}
                      </Chip>
                    )}
                  </View>
                  <Text variant="bodySmall" style={styles.documentDescription}>
                    {docInfo.description}
                  </Text>
                </View>
              </View>

              <View style={styles.documentStatus}>
                <MaterialCommunityIcons
                  name={getStatusIcon(doc.status) as any}
                  size={20}
                  color={getStatusColor(doc.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                  {getStatusLabel(doc.status)}
                </Text>
              </View>

              {doc.status === 'REJECTED' && doc.rejectionReason && (
                <View style={styles.rejectionBox}>
                  <MaterialCommunityIcons name="alert" size={16} color={colors.error} />
                  <Text variant="bodySmall" style={styles.rejectionText}>
                    {doc.rejectionReason}
                  </Text>
                </View>
              )}

              <View style={styles.documentActions}>
                {!doc.uploaded || doc.status === 'REJECTED' ? (
                  <Button
                    mode="contained"
                    icon="upload"
                    onPress={() => handlePickDocument(doc.type)}
                    loading={isCurrentlyUploading}
                    disabled={isCurrentlyUploading}
                    style={styles.uploadButton}
                  >
                    {doc.uploaded ? t('carrier.documents.resendDocument') : t('carrier.documents.addDocument')}
                  </Button>
                ) : (
                  <View style={styles.uploadedActions}>
                    <Button
                      mode="outlined"
                      icon="refresh"
                      onPress={() => handlePickDocument(doc.type)}
                      disabled={isCurrentlyUploading}
                      style={styles.replaceButton}
                    >
                      {t('carrier.documents.replaceDocument')}
                    </Button>
                    {doc.status !== 'APPROVED' && (
                      <Button
                        mode="text"
                        icon="delete"
                        textColor={colors.error}
                        onPress={() => handleDeleteDocument(doc.type)}
                      >
                        {t('carrier.documents.deleteDocument')}
                      </Button>
                    )}
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        );
      })}

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        <Text variant="bodySmall" style={styles.infoText}>
          {t('carrier.documents.verificationInfo')}
        </Text>
      </View>

      <PhotoPreviewModal
        visible={!!rawDocPhoto}
        photoUri={rawDocPhoto?.uri ?? null}
        aspectRatio={[4, 3]}
        onValidate={(croppedUri) => {
          if (rawDocPhoto) {
            uploadDocument(rawDocPhoto.type, croppedUri, 'image');
          }
          setRawDocPhoto(null);
        }}
        onRetake={() => setRawDocPhoto(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.onSurfaceVariant },
  statusCard: { marginBottom: spacing.lg, backgroundColor: colors.secondaryContainer },
  statusCardApproved: { backgroundColor: colors.primaryContainer },
  statusContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusInfo: { flex: 1 },
  statusSubtext: { color: colors.onSurfaceVariant },
  card: { marginBottom: spacing.md, backgroundColor: colors.surface },
  sectionTitle: { marginBottom: spacing.xs },
  sectionSubtitle: { color: colors.onSurfaceVariant, marginBottom: spacing.md },
  vehicleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vehicleOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  vehicleOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  vehicleOptionText: { color: colors.onSurface },
  vehicleOptionTextSelected: { color: colors.primary, fontWeight: '600' },
  printerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  printerInfo: { flex: 1 },
  printerSubtext: { color: colors.onSurfaceVariant },
  documentsTitle: { marginTop: spacing.lg, marginBottom: spacing.md },
  documentCard: { marginBottom: spacing.md, backgroundColor: colors.surface },
  documentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  documentInfo: { flex: 1 },
  documentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  requiredChip: { backgroundColor: colors.errorContainer, height: 28 },
  requiredChipText: { fontSize: 12, color: colors.error, fontWeight: '600' },
  documentDescription: { color: colors.onSurfaceVariant, marginTop: spacing.xs },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  statusText: { fontWeight: '500' },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: 8,
  },
  rejectionText: { flex: 1, color: colors.error },
  documentActions: { marginTop: spacing.md },
  uploadButton: { alignSelf: 'flex-start' },
  uploadedActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  replaceButton: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  infoText: { flex: 1, color: colors.onSurface },
});
