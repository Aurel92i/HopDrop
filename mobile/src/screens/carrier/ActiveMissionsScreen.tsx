import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Image } from 'react-native';
import { Text, Card, Button, Chip, Divider, FAB, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing, sizes } from '../../theme';
import { Mission, MissionStatus } from '../../types';

type ActiveMissionsScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'ActiveMissions'>;
};

const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string }> = {
  ACCEPTED: { label: 'À récupérer', color: colors.primary, icon: 'package-variant' },
  IN_PROGRESS: { label: 'En route', color: colors.tertiary, icon: 'bike' },
  PICKED_UP: { label: 'À livrer', color: colors.secondary, icon: 'package-variant-closed' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
};

export function ActiveMissionsScreen({ navigation }: ActiveMissionsScreenProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [packagingPhoto, setPackagingPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [])
  );

  const loadMissions = async () => {
    try {
      const { missions: data } = await api.getCurrentMissions();
      setMissions(data);
      if (data.length === 1) {
        setSelectedMission(data[0]);
      }
    } catch (e) {
      console.error('Erreur chargement missions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir Google Maps pour la navigation
  const openGoogleMaps = (latitude: number, longitude: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=bicycling`;
    Linking.openURL(url);
  };

  // Clic sur "Je pars"
  const handleDepart = async (mission: Mission) => {
    setIsActionLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      await api.missionDepart(mission.id, latitude, longitude);
      
      Alert.alert(
        '🚴 C\'est parti !',
        'Le client a été notifié de votre départ. Bonne route !',
        [{ text: 'OK' }]
      );
      
      await loadMissions();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de démarrer le trajet');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Clic sur "Je suis arrivé"
  const handleArrived = async (mission: Mission) => {
    setIsActionLoading(true);
    try {
      await api.missionArrived(mission.id);
      
      Alert.alert(
        '📍 Arrivé !',
        'Le client a été notifié de votre arrivée.',
        [{ text: 'OK' }]
      );
      
      await loadMissions();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de signaler l\'arrivée');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Prendre la photo d'emballage
  const takePackagingPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPackagingPhoto(result.assets[0].uri);
    }
  };

  // Confirmer l'emballage
  const handleConfirmPackaging = async () => {
    if (!selectedMission || !packagingPhoto) return;

    setIsActionLoading(true);
    try {
      // TODO: Upload photo et récupérer l'URL
      const photoUrl = packagingPhoto; // Pour le MVP

      await api.confirmPackaging(selectedMission.id, photoUrl);
      
      setShowPackagingModal(false);
      setPackagingPhoto(null);
      
      Alert.alert(
        '📦 Emballage confirmé',
        'En attente de la confirmation du client...',
        [{ text: 'OK' }]
      );
      
      await loadMissions();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de confirmer l\'emballage');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Annuler la mission
  const handleCancel = (mission: Mission) => {
    Alert.alert(
      'Annuler la mission',
      'Êtes-vous sûr de vouloir annuler cette mission ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelMission(mission.id, 'Annulé par le livreur');
              await loadMissions();
              if (missions.length <= 1) {
                navigation.goBack();
              }
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  // Marquer comme récupéré
  const handlePickup = async (mission: Mission) => {
    Alert.alert(
      'Confirmer la récupération',
      'Avez-vous bien récupéré le colis ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            try {
              await api.pickupMission(mission.id);
              await loadMissions();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatETA = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    
    if (diffMins === 0) return 'Arrivée imminente';
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}min`;
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement des missions..." />;
  }

  if (missions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="package-variant" size={64} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={styles.emptyText}>
          Aucune mission en cours
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Retour à la carte
        </Button>
      </View>
    );
  }

  const renderMissionCard = (mission: Mission) => {
    const status = statusConfig[mission.status];
    const isSelected = selectedMission?.id === mission.id;
    const parcel = mission.parcel;
    const hasDeparted = !!mission.departedAt;
    const hasArrived = !!mission.arrivedAt;
    const packagingConfirmed = !!parcel?.packagingConfirmedAt;
    const vendorConfirmed = !!parcel?.vendorPackagingConfirmedAt;

    return (
      <Card
        key={mission.id}
        style={[styles.missionCard, isSelected && styles.missionCardSelected]}
        onPress={() => setSelectedMission(mission)}
      >
        <Card.Content>
          {/* Header avec statut */}
          <View style={styles.missionHeader}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name={status.icon as any} size={20} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            
            {/* ETA si en route */}
            {mission.status === 'IN_PROGRESS' && mission.estimatedArrival && (
              <Chip icon="clock" compact style={styles.etaChip}>
                ETA: {formatETA(mission.estimatedArrival)}
              </Chip>
            )}
          </View>

          {/* Info colis */}
          {parcel && (
            <>
              <View style={styles.parcelInfo}>
                <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
                <View style={styles.parcelDetails}>
                  <Text variant="titleMedium">{parcel.dropoffName}</Text>
                  <Text variant="bodySmall" style={styles.parcelDescription}>
                    {sizes.parcel[parcel.size]?.label} • {parcel.description || 'Colis'}
                  </Text>
                </View>
              </View>

              {/* Adresse de récupération */}
              {parcel.pickupAddress && (
                <View style={styles.addressSection}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={colors.secondary} />
                  <View style={styles.addressInfo}>
                    <Text variant="bodySmall" style={styles.addressLabel}>Récupération</Text>
                    <Text variant="bodyMedium">
                      {parcel.pickupAddress.street}
                    </Text>
                    <Text variant="bodySmall" style={styles.addressCity}>
                      {parcel.pickupAddress.postalCode} {parcel.pickupAddress.city}
                    </Text>
                  </View>
                  
                  {/* Bouton navigation */}
                  <Button
                    mode="contained-tonal"
                    compact
                    icon="navigation"
                    onPress={() => openGoogleMaps(
                      parcel.pickupAddress.latitude,
                      parcel.pickupAddress.longitude,
                      parcel.pickupAddress.street
                    )}
                  >
                    Y aller
                  </Button>
                </View>
              )}

              {/* Info vendeur */}
              {parcel.vendor && (
                <View style={styles.vendorSection}>
                  <MaterialCommunityIcons name="account" size={20} color={colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.vendorName}>
                    {parcel.vendor.firstName}
                  </Text>
                </View>
              )}

              {/* Code de récupération */}
              {mission.status === 'ACCEPTED' && parcel.pickupCode && (
                <View style={styles.codeSection}>
                  <Text variant="bodySmall" style={styles.codeLabel}>Code de vérification</Text>
                  <Text variant="headlineMedium" style={styles.codeValue}>
                    {parcel.pickupCode}
                  </Text>
                </View>
              )}

              {/* Statut emballage */}
              {(packagingConfirmed || vendorConfirmed) && (
                <View style={styles.packagingStatus}>
                  <View style={[
                    styles.packagingBadge,
                    vendorConfirmed ? styles.packagingConfirmed : styles.packagingPending
                  ]}>
                    <MaterialCommunityIcons
                      name={vendorConfirmed ? 'check-circle' : 'clock-outline'}
                      size={16}
                      color={vendorConfirmed ? '#10B981' : '#F59E0B'}
                    />
                    <Text style={[
                      styles.packagingBadgeText,
                      { color: vendorConfirmed ? '#10B981' : '#F59E0B' }
                    ]}>
                      {vendorConfirmed 
                        ? 'Emballage confirmé ✓' 
                        : 'En attente confirmation client'}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          <Divider style={styles.divider} />

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Bouton Je pars */}
            {mission.status === 'ACCEPTED' && !hasDeparted && (
              <Button
                mode="contained"
                icon="bike"
                onPress={() => handleDepart(mission)}
                loading={isActionLoading}
                style={styles.actionButton}
                buttonColor={colors.tertiary}
              >
                Je pars
              </Button>
            )}

            {/* Bouton Je suis arrivé */}
            {(mission.status === 'IN_PROGRESS' || hasDeparted) && !hasArrived && (
              <Button
                mode="contained"
                icon="map-marker-check"
                onPress={() => handleArrived(mission)}
                loading={isActionLoading}
                style={styles.actionButton}
                buttonColor={colors.secondary}
              >
                Je suis arrivé
              </Button>
            )}

            {/* Bouton Confirmation emballage */}
            {hasArrived && !packagingConfirmed && (
              <Button
                mode="contained"
                icon="camera"
                onPress={() => {
                  setSelectedMission(mission);
                  setShowPackagingModal(true);
                }}
                style={styles.actionButton}
              >
                Confirmer l'emballage
              </Button>
            )}

            {/* Bouton Colis récupéré */}
            {packagingConfirmed && vendorConfirmed && mission.status !== 'PICKED_UP' && (
              <Button
                mode="contained"
                icon="package-variant-closed"
                onPress={() => handlePickup(mission)}
                style={styles.actionButton}
                buttonColor="#10B981"
              >
                Colis récupéré
              </Button>
            )}

            {/* Boutons secondaires */}
            <View style={styles.secondaryActions}>
              <Button
                mode="outlined"
                icon="chat"
                onPress={() => navigation.navigate('Chat', { parcelId: mission.parcelId })}
                compact
                style={styles.secondaryButton}
              >
                Chat
              </Button>

              {mission.status === 'ACCEPTED' && (
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={() => handleCancel(mission)}
                  compact
                  style={styles.secondaryButton}
                  textColor={colors.error}
                >
                  Annuler
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Modal confirmation emballage
  const renderPackagingModal = () => (
    <Portal>
      <Modal
        visible={showPackagingModal}
        onDismiss={() => {
          setShowPackagingModal(false);
          setPackagingPhoto(null);
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          📦 Confirmation d'emballage
        </Text>
        <Text variant="bodySmall" style={styles.modalSubtitle}>
          Prenez une photo du colis emballé pour validation par le client
        </Text>

        {!packagingPhoto ? (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="camera-plus" size={48} color={colors.onSurfaceVariant} />
            <Button mode="contained" icon="camera" onPress={takePackagingPhoto} style={styles.photoButton}>
              Prendre la photo
            </Button>
          </View>
        ) : (
          <View>
            <Image source={{ uri: packagingPhoto }} style={styles.photoPreview} />
            <Button mode="text" onPress={() => setPackagingPhoto(null)}>
              Reprendre la photo
            </Button>
          </View>
        )}

        <View style={styles.modalButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              setShowPackagingModal(false);
              setPackagingPhoto(null);
            }}
            style={styles.modalButton}
          >
            Annuler
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirmPackaging}
            disabled={!packagingPhoto}
            loading={isActionLoading}
            style={styles.modalButton}
          >
            Envoyer
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleMedium" style={styles.title}>
          {missions.length} mission{missions.length > 1 ? 's' : ''} en cours
        </Text>

        {missions.map(renderMissionCard)}
      </ScrollView>

      {renderPackagingModal()}

      <FAB
        icon="map"
        style={styles.fab}
        onPress={() => navigation.goBack()}
        label="Carte"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  title: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  missionCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  missionCardSelected: {
    borderColor: colors.primary,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontWeight: '600',
  },
  etaChip: {
    backgroundColor: colors.primaryContainer,
  },
  parcelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  parcelDetails: {
    flex: 1,
  },
  parcelDescription: {
    color: colors.onSurfaceVariant,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  addressCity: {
    color: colors.onSurfaceVariant,
  },
  vendorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  vendorName: {
    color: colors.onSurface,
  },
  codeSection: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  codeLabel: {
    color: colors.onSurfaceVariant,
  },
  codeValue: {
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  packagingStatus: {
    marginBottom: spacing.md,
  },
  packagingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
  },
  packagingPending: {
    backgroundColor: '#FEF3C7',
  },
  packagingConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  packagingBadgeText: {
    fontWeight: '500',
    fontSize: 13,
  },
  divider: {
    marginVertical: spacing.md,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  // Modal styles
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  photoButton: {
    marginTop: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});