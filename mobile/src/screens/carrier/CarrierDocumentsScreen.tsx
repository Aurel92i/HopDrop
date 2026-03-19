import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Text, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { api } from '../../services/api';
import { hdColors, spacing, borderRadius } from '../../theme';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const VEHICLE_ICONS: Record<string, string> = {
  NONE: 'walk',
  BIKE: 'bike',
  SCOOTER: 'motorbike',
  CAR: 'car',
};

export function CarrierDocumentsScreen() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [profile, setProfile] = useState<CarrierProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<DocumentType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rawDocPhoto, setRawDocPhoto] = useState<{ uri: string; type: DocumentType } | null>(null);

  const [stripeStatus, setStripeStatus] = useState<{
    hasAccount: boolean;
    status?: 'PENDING' | 'ACTIVE' | 'RESTRICTED' | null;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

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

  // ─── Data Loading ───────────────────────────────────────────────

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

  const loadStripeStatus = useCallback(async () => {
    try {
      const status = await api.getConnectStatus();
      setStripeStatus(status);
    } catch (error) {
      console.log('Erreur chargement statut Stripe:', error);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStripeStatus();
  }, [loadDocuments, loadStripeStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
    loadStripeStatus();
  };

  // ─── Stripe ─────────────────────────────────────────────────────

  const handleSetupStripe = async () => {
    setStripeLoading(true);
    try {
      if (!stripeStatus?.hasAccount) {
        await api.createConnectAccount();
      }
      const { url } = await api.getConnectOnboardingLink();
      await Linking.openURL(url);
      setTimeout(() => loadStripeStatus(), 2000);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message);
    } finally {
      setStripeLoading(false);
    }
  };

  // ─── Document Picking ───────────────────────────────────────────

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
      mediaTypes: ['images'],
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
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
          Alert.alert(
            t('carrier.documents.fileTooLarge'),
            t('carrier.documents.fileTooLargeDesc').replace('{size}', String(Math.round(fileInfo.size / 1024 / 1024)))
          );
          return;
        }
        const isPdf = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');
        await uploadDocument(type, asset.uri, isPdf ? 'pdf' : 'image');
      }
    } catch (error) {
      console.error('Erreur selection fichier:', error);
      Alert.alert(t('common.error'), t('carrier.documents.fileSelectError'));
    }
  };

  // ─── Upload ─────────────────────────────────────────────────────

  const uploadDocument = async (type: DocumentType, fileUri: string, fileType: 'image' | 'pdf') => {
    setIsUploading(type);
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let mimeType = 'image/jpeg';
      if (fileType === 'pdf') {
        mimeType = 'application/pdf';
      } else if (fileUri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (fileUri.toLowerCase().includes('.heic')) {
        mimeType = 'image/heic';
      }

      const dataUri = `data:${mimeType};base64,${base64}`;
      const imageUrl = await api.uploadBase64(dataUri);
      await api.saveCarrierDocument(type, imageUrl);

      Alert.alert(t('common.success'), t('carrier.documents.uploadSuccess'));
      loadDocuments();
    } catch (error: any) {
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

  // ─── Actions ────────────────────────────────────────────────────

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

  // ─── Helpers ────────────────────────────────────────────────────

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return hdColors.neonGreen;
      case 'REJECTED': return hdColors.danger;
      case 'PENDING': return hdColors.warning;
      default: return hdColors.chromeDark;
    }
  };

  const getStatusBg = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return hdColors.success50;
      case 'REJECTED': return hdColors.danger50;
      case 'PENDING': return hdColors.warning50;
      default: return hdColors.surfaceSecondary;
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

  // Progression documents
  const totalRequired = documents.filter((d) => d.required).length;
  const uploadedRequired = documents.filter((d) => d.required && d.uploaded).length;
  const progressPercent = totalRequired > 0 ? (uploadedRequired / totalRequired) * 100 : 0;

  // ─── Loading ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconBg}>
          <MaterialCommunityIcons name="file-document-outline" size={28} color={hdColors.accent} />
        </View>
        <ActivityIndicator size="large" color={hdColors.accent} style={{ marginTop: spacing.md }} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={hdColors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Statut Général ── */}
      <View style={[styles.heroCard, profile?.documentsVerified && styles.heroCardVerified]}>
        {/* Motifs géométriques */}
        <View style={[styles.patternCircle, { top: -20, right: -20 }]} />
        <View style={[styles.patternCircle, { bottom: -15, left: -15, width: 80, height: 80 }]} />

        <View style={styles.heroContent}>
          <View style={styles.heroIconBg}>
            <MaterialCommunityIcons
              name={profile?.documentsVerified ? 'shield-check' : 'file-document-edit-outline'}
              size={26}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroLabel}>
              {profile?.documentsVerified ? 'DOSSIER COMPLET' : 'DOSSIER EN COURS'}
            </Text>
            <Text style={styles.heroTitle}>
              {profile?.documentsVerified
                ? t('carrier.documents.verifiedTitle')
                : t('carrier.documents.pendingTitle')}
            </Text>
            <Text style={styles.heroSubtext}>
              {profile?.documentsVerified
                ? t('carrier.documents.verifiedSubtext')
                : t('carrier.documents.pendingSubtext')}
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        {!profile?.documentsVerified && totalRequired > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {uploadedRequired}/{totalRequired} documents envoyés
            </Text>
          </View>
        )}
      </View>

      {/* ── Type de véhicule ── */}
      <View style={styles.hdCard}>
        <Text style={styles.sectionLabel}>VÉHICULE</Text>
        <Text style={styles.hdSectionTitle}>{t('carrier.documents.vehicleType')}</Text>
        <Text style={styles.sectionSubtitle}>{t('carrier.documents.vehicleQuestion')}</Text>

        <View style={styles.vehicleGrid}>
          {vehicleOptions.map((option) => {
            const isSelected = profile?.vehicleType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.vehicleChip, isSelected && styles.vehicleChipSelected]}
                onPress={() => handleVehicleChange(option.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.vehicleIconBg, isSelected && styles.vehicleIconBgSelected]}>
                  <MaterialCommunityIcons
                    name={VEHICLE_ICONS[option.value] as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : hdColors.accent}
                  />
                </View>
                <Text style={[styles.vehicleChipText, isSelected && styles.vehicleChipTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Question imprimante ── */}
      <View style={styles.hdCard}>
        <View style={styles.printerRow}>
          <View style={styles.printerIconBg}>
            <MaterialCommunityIcons name="printer" size={22} color={hdColors.accent} />
          </View>
          <View style={styles.printerInfo}>
            <Text style={styles.printerTitle}>{t('carrier.documents.printerQuestion')}</Text>
            <Text style={styles.printerSubtext}>{t('carrier.documents.printerDesc')}</Text>
          </View>
          <Switch
            value={profile?.hasOwnPrinter || false}
            onValueChange={handlePrinterChange}
            color={hdColors.neonGreen}
          />
        </View>
      </View>

      {/* ── Stripe Connect ── */}
      <View style={styles.hdCard}>
        <Text style={styles.sectionLabel}>PAIEMENTS</Text>
        <View style={styles.stripeHeader}>
          <View style={[
            styles.stripeIconBg,
            stripeStatus?.status === 'ACTIVE' && styles.stripeIconBgActive,
          ]}>
            <MaterialCommunityIcons
              name={stripeStatus?.status === 'ACTIVE' ? 'check-bold' : 'credit-card-outline'}
              size={22}
              color={stripeStatus?.status === 'ACTIVE' ? '#FFFFFF' : hdColors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hdSectionTitle}>Configurer mes paiements</Text>
            <Text style={styles.sectionSubtitle}>
              {stripeStatus?.status === 'ACTIVE'
                ? 'Paiements activés — vous recevrez vos gains'
                : 'Recevez vos gains de livraison'}
            </Text>
          </View>
        </View>

        {!stripeStatus || !stripeStatus.hasAccount ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSetupStripe}
            disabled={stripeLoading}
            activeOpacity={0.8}
          >
            {stripeLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="credit-card-plus-outline" size={20} color="#FFFFFF" />
                <Text style={styles.ctaButtonText}>Configurer Stripe</Text>
              </>
            )}
          </TouchableOpacity>
        ) : stripeStatus.status === 'ACTIVE' ? (
          <View style={styles.stripeActiveBadge}>
            <MaterialCommunityIcons name="check-circle" size={18} color={hdColors.neonGreen} />
            <Text style={styles.stripeActiveText}>Paiements activés</Text>
          </View>
        ) : (
          <View>
            <View style={styles.stripePendingBadge}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={hdColors.warning} />
              <Text style={styles.stripePendingText}>Vérification en cours</Text>
            </View>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSetupStripe}
              disabled={stripeLoading}
              activeOpacity={0.8}
            >
              {stripeLoading ? (
                <ActivityIndicator size="small" color={hdColors.accent} />
              ) : (
                <>
                  <MaterialCommunityIcons name="open-in-new" size={18} color={hdColors.accent} />
                  <Text style={styles.secondaryButtonText}>Compléter la vérification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Documents requis ── */}
      <Text style={styles.sectionLabel2}>DOCUMENTS REQUIS</Text>

      {documents.map((doc) => {
        const docInfo = documentLabels[doc.type];
        if (!docInfo) return null;
        const isCurrentlyUploading = isUploading === doc.type;
        const statusColor = getStatusColor(doc.status);
        const statusBg = getStatusBg(doc.status);

        return (
          <View key={doc.type} style={styles.hdCard}>
            {/* En-tête document */}
            <View style={styles.docHeader}>
              <View style={[styles.docIconBg, { backgroundColor: doc.uploaded ? statusBg : hdColors.accent50 }]}>
                <MaterialCommunityIcons
                  name={docInfo.icon as any}
                  size={22}
                  color={doc.uploaded ? statusColor : hdColors.accent}
                />
              </View>
              <View style={styles.docInfo}>
                <View style={styles.docTitleRow}>
                  <Text style={styles.docTitle}>{docInfo.label}</Text>
                  {doc.required && (
                    <View style={styles.requiredPill}>
                      <Text style={styles.requiredPillText}>{t('common.required')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.docDescription}>{docInfo.description}</Text>
              </View>
            </View>

            {/* Statut */}
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <MaterialCommunityIcons
                name={getStatusIcon(doc.status) as any}
                size={16}
                color={statusColor}
              />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {getStatusLabel(doc.status)}
              </Text>
            </View>

            {/* Raison de rejet */}
            {doc.status === 'REJECTED' && doc.rejectionReason && (
              <View style={styles.rejectionBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={hdColors.danger} />
                <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.docActions}>
              {!doc.uploaded || doc.status === 'REJECTED' ? (
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => handlePickDocument(doc.type)}
                  disabled={isCurrentlyUploading}
                  activeOpacity={0.8}
                >
                  {isCurrentlyUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="upload" size={18} color="#FFFFFF" />
                      <Text style={styles.ctaButtonText}>
                        {doc.uploaded ? t('carrier.documents.resendDocument') : t('carrier.documents.addDocument')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.uploadedActions}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => handlePickDocument(doc.type)}
                    disabled={isCurrentlyUploading}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="refresh" size={18} color={hdColors.accent} />
                    <Text style={styles.secondaryButtonText}>{t('carrier.documents.replaceDocument')}</Text>
                  </TouchableOpacity>
                  {doc.status !== 'APPROVED' && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteDocument(doc.type)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color={hdColors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* ── Info box ── */}
      <View style={styles.infoBox}>
        <View style={styles.infoIconBg}>
          <MaterialCommunityIcons name="information-outline" size={18} color={hdColors.accent} />
        </View>
        <Text style={styles.infoText}>{t('carrier.documents.verificationInfo')}</Text>
      </View>

      <View style={{ height: spacing.xxl }} />

      {/* ── Photo Preview Modal ── */}
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

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },
  content: {
    padding: spacing.lg,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: hdColors.background,
  },
  loadingIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: hdColors.textTertiary,
    fontSize: 14,
  },

  // Hero Card
  heroCard: {
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  heroCardVerified: {
    backgroundColor: hdColors.neonGreen,
  },
  patternCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
    textAlign: 'right',
  },

  // hdCard
  hdCard: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    padding: 20,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: hdColors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  sectionLabel2: {
    fontSize: 11,
    fontWeight: '700',
    color: hdColors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  hdSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hdColors.accent,
    ...Platform.select({
      ios: { fontFamily: 'Quicksand-Bold' },
      android: { fontFamily: 'Quicksand_700Bold' },
    }),
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: hdColors.textTertiary,
    marginBottom: spacing.md,
  },

  // Vehicle chips
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    backgroundColor: hdColors.surface,
  },
  vehicleChipSelected: {
    borderColor: hdColors.accent,
    backgroundColor: hdColors.accent50,
  },
  vehicleIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIconBgSelected: {
    backgroundColor: hdColors.accent,
  },
  vehicleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.text,
  },
  vehicleChipTextSelected: {
    color: hdColors.accent,
    fontWeight: '700',
  },

  // Printer
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  printerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerInfo: {
    flex: 1,
  },
  printerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: hdColors.text,
  },
  printerSubtext: {
    fontSize: 13,
    color: hdColors.textTertiary,
    marginTop: 2,
  },

  // Stripe
  stripeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stripeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripeIconBgActive: {
    backgroundColor: hdColors.neonGreen,
  },
  stripeActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: hdColors.success50,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stripeActiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.neonGreen,
  },
  stripePendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: hdColors.warning50,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  stripePendingText: {
    fontSize: 14,
    fontWeight: '500',
    color: hdColors.warning,
  },

  // Document cards
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  docIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: hdColors.text,
  },
  docDescription: {
    fontSize: 13,
    color: hdColors.textTertiary,
    marginTop: 2,
  },
  requiredPill: {
    backgroundColor: hdColors.cta,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requiredPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Rejection
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: hdColors.danger50,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: hdColors.danger,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: hdColors.danger,
    fontWeight: '500',
  },

  // Actions
  docActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: hdColors.border,
  },
  uploadedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Buttons
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    backgroundColor: hdColors.surface,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.accent,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: hdColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: hdColors.accent50,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: hdColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: hdColors.textSecondary,
    lineHeight: 18,
  },
});
