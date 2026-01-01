import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, sizes, carriers } from '../../theme';
import { Mission, MissionStatus, Carrier, Parcel } from '../../types';
import { CarrierPackagingModal } from './CarrierPackagingModal';
import { DeliveryProofModal } from './DeliveryProofModal';

interface CurrentMissionCardProps {
  mission: Mission;
  onPress: () => void;
  onChat: () => void;
  onNavigate?: () => void;
  onDepart?: () => void;
  onArrived?: () => void;
  onConfirmPackaging?: (photoUri: string) => void;
  onPickup?: () => void;
  onDelivery?: (proofUri: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string }> = {
  ACCEPTED: { label: 'À récupérer', color: colors.primary, icon: 'package-variant' },
  IN_PROGRESS: { label: 'En route', color: '#F59E0B', icon: 'bike' },
  PICKED_UP: { label: 'À livrer', color: colors.secondary, icon: 'package-variant-closed' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
};

export function CurrentMissionCard({
  mission,
  onPress,
  onChat,
  onNavigate,
  onDepart,
  onArrived,
  onConfirmPackaging,
  onPickup,
  onDelivery,
  onCancel,
  isLoading,
}: CurrentMissionCardProps) {
  const parcel = mission.parcel;
  if (!parcel) return null;

  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const status = statusConfig[mission.status];
  const sizeInfo = sizes.parcel[parcel.size as keyof typeof sizes.parcel];
  const carrierInfo = carriers[parcel.carrier as Carrier];

  // États d'emballage
  const carrierPackagingConfirmed = !!parcel.packagingConfirmedAt;
  const vendorPackagingConfirmed = !!parcel.vendorPackagingConfirmedAt;
  const packagingFullyConfirmed = carrierPackagingConfirmed && vendorPackagingConfirmed;

  // États de trajet
  const hasDeparted = !!mission.departedAt;
  const hasArrived = !!mission.arrivedAt;

  const openNavigation = () => {
    if (!parcel.pickupAddress) return;

    const { latitude, longitude } = parcel.pickupAddress;
    const address = `${parcel.pickupAddress.street}, ${parcel.pickupAddress.postalCode} ${parcel.pickupAddress.city}`;

    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`,
    });

    if (url) Linking.openURL(url);
  };

  // Gestion de la confirmation d'emballage
  const handleConfirmPackaging = (photoUri: string) => {
    setShowPackagingModal(false);
    onConfirmPackaging?.(photoUri);
  };

  // Gestion de la preuve de dépôt
  const handleDeliveryProof = (proofUri: string) => {
    setShowDeliveryModal(false);
    onDelivery?.(proofUri);
  };

  // Gestion du pickup avec vérification
  const handlePickup = () => {
    if (!packagingFullyConfirmed) {
      Alert.alert(
        'Emballage non confirmé',
        'L\'emballage doit être confirmé par vous ET le client avant de récupérer le colis.',
        [{ text: 'OK' }]
      );
      return;
    }
    onPickup?.();
  };

  // Rendu du bouton d'action principal selon l'état
  const renderMainAction = () => {
    // Status ACCEPTED - non parti
    if (mission.status === 'ACCEPTED' && !hasDeparted) {
      return (
        <Button
          mode="contained"
          onPress={onDepart}
          loading={isLoading}
          icon="bike"
          style={styles.mainActionButton}
          labelStyle={styles.mainActionLabel}
        >
          Je pars
        </Button>
      );
    }

    // Status ACCEPTED ou IN_PROGRESS - parti mais pas arrivé
    if ((mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && hasDeparted && !hasArrived) {
      return (
        <Button
          mode="contained"
          onPress={onArrived}
          loading={isLoading}
          icon="map-marker-check"
          style={[styles.mainActionButton, { backgroundColor: '#F59E0B' }]}
          labelStyle={styles.mainActionLabel}
        >
          Je suis arrivé
        </Button>
      );
    }

    // Status IN_PROGRESS - arrivé, emballage non confirmé par le livreur
    if (mission.status === 'IN_PROGRESS' && hasArrived && !carrierPackagingConfirmed) {
      return (
        <Button
          mode="contained"
          onPress={() => setShowPackagingModal(true)}
          loading={isLoading}
          icon="camera"
          style={[styles.mainActionButton, { backgroundColor: colors.secondary }]}
          labelStyle={styles.mainActionLabel}
        >
          Confirmer l'emballage
        </Button>
      );
    }

    // Status IN_PROGRESS - emballage confirmé des 2 côtés → Récupérer
    if (mission.status === 'IN_PROGRESS' && packagingFullyConfirmed) {
      return (
        <Button
          mode="contained"
          onPress={handlePickup}
          loading={isLoading}
          icon="package-variant"
          style={[styles.mainActionButton, { backgroundColor: '#10B981' }]}
          labelStyle={styles.mainActionLabel}
        >
          Colis récupéré
        </Button>
      );
    }

    // Status PICKED_UP → Déposer
    if (mission.status === 'PICKED_UP') {
      return (
        <Button
          mode="contained"
          onPress={() => setShowDeliveryModal(true)}
          loading={isLoading}
          icon="check-all"
          style={[styles.mainActionButton, { backgroundColor: colors.secondary }]}
          labelStyle={styles.mainActionLabel}
        >
          Colis déposé
        </Button>
      );
    }

    return null;
  };

  // Rendu du statut d'emballage
  const renderPackagingStatus = () => {
    // Seulement afficher si on est arrivé
    if (!hasArrived) return null;

    if (packagingFullyConfirmed) {
      return (
        <View style={styles.packagingSuccess}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
          <Text style={styles.packagingSuccessText}>Emballage confirmé ✓</Text>
        </View>
      );
    }

    if (carrierPackagingConfirmed && !vendorPackagingConfirmed) {
      return (
        <View style={styles.packagingPending}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.tertiary} />
          <Text style={styles.packagingPendingText}>En attente de confirmation client</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Card style={[styles.card, { borderLeftColor: status.color }]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Card.Content>
            {/* Header avec statut et ETA */}
            <View style={styles.header}>
              <View style={styles.statusBadge}>
                <MaterialCommunityIcons name={status.icon as any} size={18} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
              {mission.estimatedArrival && !hasArrived && (
                <Chip icon="clock-outline" style={styles.etaChip} textStyle={styles.etaText}>
                  ETA: {new Date(mission.estimatedArrival).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Chip>
              )}
              {hasArrived && mission.status !== 'PICKED_UP' && (
                <Chip icon="map-marker-check" style={[styles.etaChip, { backgroundColor: '#D1FAE5' }]} textStyle={[styles.etaText, { color: '#10B981' }]}>
                  Arrivé
                </Chip>
              )}
            </View>

            {/* Transporteur + Taille */}
            <View style={styles.mainInfo}>
              <View style={styles.carrierRow}>
                <MaterialCommunityIcons
                  name={carrierInfo?.icon as any || 'package-variant'}
                  size={24}
                  color={colors.primary}
                />
                <Text variant="titleMedium" style={styles.carrierName}>
                  {carrierInfo?.label || 'Point relais'}
                </Text>
              </View>
              <Chip
                icon="package-variant"
                style={styles.sizeChip}
                textStyle={styles.sizeChipText}
              >
                {sizeInfo?.label || parcel.size}
              </Chip>
            </View>

            {/* Catégorie si définie */}
            {parcel.itemCategory && (
              <Text variant="bodySmall" style={styles.category}>
                {parcel.itemCategory}
              </Text>
            )}

            {/* Destination pour PICKED_UP */}
            {mission.status === 'PICKED_UP' && (
              <View style={styles.destinationBox}>
                <MaterialCommunityIcons name="store" size={18} color={colors.secondary} />
                <View style={styles.destinationContent}>
                  <Text variant="labelSmall" style={styles.destinationLabel}>Déposer à : {parcel.dropoffType === 'RELAY_POINT' ? 'Point relais' : parcel.dropoffType === 'POST_OFFICE' ? 'Bureau de poste' : 'Autre'}</Text>
                  <Text variant="bodyMedium" style={styles.destinationName}>{parcel.dropoffName}</Text>
                  <Text variant="bodySmall" style={styles.destinationAddress}>{parcel.dropoffAddress}</Text>
                </View>
              </View>
            )}

            <Divider style={styles.divider} />

            {/* Adresse de récupération (masquée si PICKED_UP) */}
            {mission.status !== 'PICKED_UP' && (
              <View style={styles.addressSection}>
                <View style={styles.addressHeader}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary} />
                  <Text variant="labelMedium" style={styles.addressLabel}>Récupération</Text>
                </View>
                {parcel.pickupAddress && (
                  <View style={styles.addressContent}>
                    <View style={styles.addressTextContainer}>
                      <Text variant="bodyMedium" style={styles.addressStreet}>
                        {parcel.pickupAddress.street}
                      </Text>
                      <Text variant="bodySmall" style={styles.addressCity}>
                        {parcel.pickupAddress.postalCode} {parcel.pickupAddress.city}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
                      <MaterialCommunityIcons name="navigation-variant" size={20} color={colors.primary} />
                      <Text style={styles.navButtonText}>Y aller</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Vendeur */}
            <View style={styles.vendorRow}>
              <MaterialCommunityIcons name="account" size={18} color={colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={styles.vendorName}>
                {parcel.vendor?.firstName || 'Client'}
              </Text>
            </View>

            {/* Note du vendeur */}
            {parcel.description && (
              <View style={styles.noteBox}>
                <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.secondary} />
                <View style={styles.noteContent}>
                  <Text variant="labelSmall" style={styles.noteLabel}>
                    Note du vendeur
                  </Text>
                  <Text variant="bodySmall" style={styles.noteText}>
                    {parcel.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Info bordereau */}
            <View style={styles.labelInfo}>
              <MaterialCommunityIcons
                name={parcel.hasShippingLabel ? 'check-circle' : 'printer'}
                size={16}
                color={parcel.hasShippingLabel ? '#10B981' : colors.secondary}
              />
              <Text variant="bodySmall" style={styles.labelInfoText}>
                {parcel.hasShippingLabel
                  ? 'Bordereau imprimé par le vendeur'
                  : 'Bordereau à imprimer'}
              </Text>
            </View>

            {/* Statut emballage */}
            {renderPackagingStatus()}

            <Divider style={styles.divider} />

            {/* Actions */}
            <View style={styles.actions}>
              {renderMainAction()}

              <View style={styles.secondaryActions}>
                <Button
                  mode="outlined"
                  onPress={onChat}
                  icon="chat"
                  style={styles.secondaryButton}
                  compact
                >
                  Chat
                </Button>

                {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && onCancel && (
                  <Button
                    mode="outlined"
                    onPress={onCancel}
                    icon="close"
                    style={styles.cancelButton}
                    textColor={colors.error}
                    compact
                  >
                    Annuler
                  </Button>
                )}
              </View>
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>

      {/* Modal confirmation emballage */}
      <CarrierPackagingModal
        visible={showPackagingModal}
        onConfirm={handleConfirmPackaging}
        onDismiss={() => setShowPackagingModal(false)}
        isLoading={isLoading}
      />

      {/* Modal preuve de dépôt */}
      <DeliveryProofModal
        visible={showDeliveryModal}
        onConfirm={handleDeliveryProof}
        onDismiss={() => setShowDeliveryModal(false)}
        isLoading={isLoading}
        dropoffName={parcel.dropoffName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  etaChip: {
    backgroundColor: colors.primaryContainer,
    height: 28,
  },
  etaText: {
    fontSize: 12,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carrierName: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  sizeChip: {
    backgroundColor: colors.secondaryContainer,
  },
  sizeChipText: {
    fontWeight: '600',
  },
  category: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  destinationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  destinationContent: {
    flex: 1,
  },
  destinationLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  destinationName: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  destinationAddress: {
    color: colors.onSurfaceVariant,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  addressSection: {
    marginBottom: spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  addressLabel: {
    color: colors.onSurfaceVariant,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: 8,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressStreet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  addressCity: {
    color: colors.onSurfaceVariant,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navButtonText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 12,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  vendorName: {
    color: colors.onSurface,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  noteContent: {
    flex: 1,
  },
  noteLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  noteText: {
    color: colors.onSurface,
    fontStyle: 'italic',
    marginTop: 2,
  },
  labelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  labelInfoText: {
    color: colors.onSurfaceVariant,
  },
  // Emballage status
  packagingSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#D1FAE5',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  packagingSuccessText: {
    color: '#10B981',
    fontWeight: '600',
  },
  packagingPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  packagingPendingText: {
    color: '#D97706',
    fontWeight: '500',
  },
  // Actions
  actions: {
    gap: spacing.sm,
  },
  mainActionButton: {
    paddingVertical: spacing.xs,
  },
  mainActionLabel: {
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.error,
  },
});
