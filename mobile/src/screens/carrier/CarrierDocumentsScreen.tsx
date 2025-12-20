import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, Chip, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { api } from '../../services/api';
import { colors, spacing } from '../../theme';

type DocumentType = 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'KBIS' | 'VEHICLE_REGISTRATION';
type VehicleType = 'NONE' | 'BIKE' | 'SCOOTER' | 'CAR';

interface CarrierDocument {
  type: DocumentType;
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

const documentLabels: Record<DocumentType, { label: string; description: string; icon: string }> = {
  ID_CARD_FRONT: {
    label: "Pièce d'identité (Recto)",
    description: "Carte d'identité ou permis - face avant",
    icon: 'card-account-details',
  },
  ID_CARD_BACK: {
    label: "Pièce d'identité (Verso)",
    description: "Carte d'identité ou permis - face arrière",
    icon: 'card-account-details-outline',
  },
  KBIS: {
    label: 'Extrait Kbis',
    description: "Document d'immatriculation entreprise",
    icon: 'file-document',
  },
  VEHICLE_REGISTRATION: {
    label: 'Carte grise',
    description: "Certificat d'immatriculation véhicule",
    icon: 'car',
  },
};

const vehicleOptions = [
  { value: 'NONE', label: 'Aucun' },
  { value: 'BIKE', label: 'Vélo' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'CAR', label: 'Voiture' },
];

export function CarrierDocumentsScreen() {
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [profile, setProfile] = useState<CarrierProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<DocumentType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const result = await api.getCarrierDocuments();
      setDocuments(result.documents);
      setProfile(result.profile);
    } catch (error: any) {
      console.error('Erreur chargement documents:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les documents');
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
    Alert.alert('Ajouter un document', 'Comment souhaitez-vous ajouter ce document ?', [
      { text: 'Prendre une photo', onPress: () => pickFromCamera(type) },
      { text: 'Choisir un fichier', onPress: () => pickFromFiles(type) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const pickFromCamera = async (type: DocumentType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission refusée', "Vous devez autoriser l'accès à la caméra");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadDocument(type, result.assets[0].uri);
    }
  };

  const pickFromFiles = async (type: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection fichier:', error);
    }
  };

 const uploadDocument = async (type: DocumentType, fileUri: string) => {
  setIsUploading(type);
  try {
    // 1. Upload le fichier sur Cloudinary
    const { url } = await api.uploadFile(fileUri, 'carrier-documents');
    
    // 2. Enregistrer l'URL dans la base de données
    await api.uploadCarrierDocument(type, url);
    
    Alert.alert('Succès', 'Document envoyé ! Il sera vérifié sous 24-48h.');
    loadDocuments();
  } catch (error: any) {
    console.error('Erreur upload:', error);
    Alert.alert('Erreur', error.message || "Impossible d'envoyer le document");
  } finally {
    setIsUploading(null);
  }
};

  const handleDeleteDocument = (type: DocumentType) => {
    Alert.alert('Supprimer le document', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCarrierDocument(type);
            loadDocuments();
          } catch (error: any) {
            Alert.alert('Erreur', error.message);
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
      Alert.alert('Erreur', error.message);
    }
  };

  const handlePrinterChange = async (value: boolean) => {
    try {
      await api.updateCarrierDocumentsProfile({ hasOwnPrinter: value });
      setProfile((prev) => (prev ? { ...prev, hasOwnPrinter: value } : null));
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
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
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      case 'PENDING': return 'En attente';
      default: return 'Non fourni';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'APPROVED': return 'check-circle';
      case 'REJECTED': return 'close-circle';
      case 'PENDING': return 'clock-outline';
      default: return 'upload';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const allRequiredApproved = documents.filter((d) => d.required).every((d) => d.status === 'APPROVED');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Statut global */}
      <Card style={[styles.statusCard, allRequiredApproved && styles.statusCardApproved]}>
        <Card.Content style={styles.statusContent}>
          <MaterialCommunityIcons
            name={allRequiredApproved ? 'shield-check' : 'shield-alert'}
            size={40}
            color={allRequiredApproved ? colors.primary : colors.secondary}
          />
          <View style={styles.statusInfo}>
            <Text variant="titleMedium">
              {allRequiredApproved ? 'Profil vérifié ✓' : 'Vérification en cours'}
            </Text>
            <Text variant="bodySmall" style={styles.statusSubtext}>
              {allRequiredApproved
                ? 'Vous pouvez accepter des missions'
                : 'Complétez vos documents pour commencer'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Type de véhicule */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>🚗 Type de véhicule</Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            Comment effectuez-vous vos livraisons ?
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
              <Text variant="titleSmall">🖨️ Possédez-vous une imprimante ?</Text>
              <Text variant="bodySmall" style={styles.printerSubtext}>
                Pour imprimer les bordereaux des clients
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
      <Text variant="titleMedium" style={styles.documentsTitle}>📄 Documents requis</Text>

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
                        Requis
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
                    {doc.uploaded ? 'Renvoyer' : 'Ajouter'}
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
                      Remplacer
                    </Button>
                    {doc.status !== 'APPROVED' && (
                      <Button
                        mode="text"
                        icon="delete"
                        textColor={colors.error}
                        onPress={() => handleDeleteDocument(doc.type)}
                      >
                        Supprimer
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
          Vos documents seront vérifiés sous 24 à 48 heures.
        </Text>
      </View>
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
  requiredChip: { backgroundColor: colors.errorContainer, height: 24 },
  requiredChipText: { fontSize: 10, color: colors.error },
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