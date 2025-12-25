import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, Divider, Avatar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { PackagingConfirmationModal } from '../../components/vendor/PackagingConfirmationModal';
import { useParcelStore } from '../../stores/parcelStore';
import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing, sizes, carriers } from '../../theme';
import { ParcelStatus, Carrier } from '../../types';

type ParcelDetailScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'ParcelDetail'>;
  route: RouteProp<VendorStackParamList, 'ParcelDetail'>;
};

const statusConfig: Record<ParcelStatus, { label: string; color: string; icon: string }> = {
  PENDING: { label: "En attente d'un livreur", color: colors.tertiary, icon: 'clock-outline' },
  ACCEPTED: { label: 'Livreur trouvé', color: colors.primary, icon: 'check-circle-outline' },
  PICKED_UP: { label: 'Colis récupéré', color: colors.secondary, icon: 'package-variant' },
  DELIVERED: { label: 'Livré avec succès', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle-outline' },
  EXPIRED: { label: 'Expiré', color: colors.onSurfaceVariant, icon: 'timer-off-outline' },
};

export function ParcelDetailScreen({ navigation, route }: ParcelDetailScreenProps) {
  const { parcelId } = route.params;
  const { currentParcel, isLoading, fetchParcel, cancelParcel } = useParcelStore();
  
  // États pour la confirmation d'emballage
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [packagingPhotoUrl, setPackagingPhotoUrl] = useState<string | null>(null);
  const [isPackagingLoading, setIsPackagingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Charger le colis au focus
  useFocusEffect(
    useCallback(() => {
      fetchParcel(parcelId);
    }, [parcelId])
  );

  // Vérifier si on doit afficher le modal de confirmation
  useEffect(() => {
    if (currentParcel) {
      // Si le livreur a confirmé mais pas le vendeur
      if (
        currentParcel.packagingConfirmedAt && 
        !currentParcel.vendorPackagingConfirmedAt &&
        currentParcel.packagingPhotoUrl
      ) {
        setPackagingPhotoUrl(currentParcel.packagingPhotoUrl);
        setShowPackagingModal(true);
      }
    }
  }, [currentParcel]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParcel(parcelId);
    setRefreshing(false);
  };

  // Confirmer l'emballage
  const handleConfirmPackaging = async () => {
    setIsPackagingLoading(true);
    try {
      await api.vendorConfirmPackaging(parcelId);
      
      setShowPackagingModal(false);
      
      Alert.alert(
        '✅ Emballage confirmé !',
        'Le livreur peut maintenant récupérer votre colis.',
        [{ text: 'OK' }]
      );
      
      // Rafraîchir les données
      await fetchParcel(parcelId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de confirmer l\'emballage');
    } finally {
      setIsPackagingLoading(false);
    }
  };

  // Refuser l'emballage
  const handleRejectPackaging = async (reason: string) => {
    setIsPackagingLoading(true);
    try {
      await api.vendorRejectPackaging(parcelId, reason);
      
      setShowPackagingModal(false);
      
      Alert.alert(
        '❌ Emballage refusé',
        'Le livreur a été notifié et doit recommencer l\'emballage.',
        [{ text: 'OK' }]
      );
      
      // Rafraîchir les données
      await fetchParcel(parcelId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de refuser l\'emballage');
    } finally {
      setIsPackagingLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler le colis',
      'Êtes-vous sûr de vouloir annuler ce colis ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelParcel(parcelId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erreur', "Impossible d'annuler le colis");
            }
          },
        },
      ]
    );
  };

  if (isLoading || !currentParcel) {
    return <LoadingScreen message="Chargement du colis..." />;
  }

  const status = statusConfig[currentParcel.status];
  const sizeInfo = sizes.parcel[currentParcel.size];
  const carrierInfo = carriers[currentParcel.carrier as Carrier];

  // États de l'emballage
  const carrierConfirmed = !!currentParcel.packagingConfirmedAt;
  const vendorConfirmed = !!currentParcel.vendorPackagingConfirmedAt;
  const packagingFullyConfirmed = carrierConfirmed && vendorConfirmed;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Card */}
        <Card style={[styles.statusCard, { borderLeftColor: status.color }]}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons name={status.icon as any} size={32} color={status.color} />
            <View style={styles.statusTextContainer}>
              <Text variant="titleMedium" style={{ color: status.color }}>
                {status.label}
              </Text>
              {currentParcel.status === 'PENDING' && (
                <Text variant="bodySmall" style={styles.statusHint}>
                  Un livreur proche acceptera bientôt votre colis
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Pickup Code */}
        {currentParcel.status === 'ACCEPTED' && !packagingFullyConfirmed && (
          <Card style={styles.codeCard}>
            <Card.Content style={styles.codeContent}>
              <Text variant="bodyMedium" style={styles.codeLabel}>
                Code de vérification à donner au livreur :
              </Text>
              <Text variant="displaySmall" style={styles.code}>
                {currentParcel.pickupCode}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* ===== STATUT EMBALLAGE ===== */}
        {currentParcel.status === 'ACCEPTED' && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📦 Statut de l'emballage
              </Text>

              {/* Étapes */}
              <View style={styles.packagingSteps}>
                {/* Étape 1: Livreur */}
                <View style={styles.packagingStep}>
                  <View style={[
                    styles.stepCircle,
                    carrierConfirmed ? styles.stepCircleCompleted : styles.stepCirclePending
                  ]}>
                    <MaterialCommunityIcons 
                      name={carrierConfirmed ? 'check' : 'clock-outline'} 
                      size={20} 
                      color={carrierConfirmed ? colors.onPrimary : colors.onSurfaceVariant} 
                    />
                  </View>
                  <View style={styles.stepContent}>
                    <Text variant="bodyMedium" style={styles.stepTitle}>
                      Confirmation livreur
                    </Text>
                    <Text variant="bodySmall" style={styles.stepSubtitle}>
                      {carrierConfirmed ? '✅ Emballage confirmé' : '⏳ En attente'}
                    </Text>
                  </View>
                </View>

                {/* Ligne de connexion */}
                <View style={[
                  styles.stepLine,
                  carrierConfirmed ? styles.stepLineCompleted : styles.stepLinePending
                ]} />

                {/* Étape 2: Vendeur */}
                <View style={styles.packagingStep}>
                  <View style={[
                    styles.stepCircle,
                    vendorConfirmed ? styles.stepCircleCompleted : 
                    carrierConfirmed ? styles.stepCircleActive : styles.stepCirclePending
                  ]}>
                    <MaterialCommunityIcons 
                      name={vendorConfirmed ? 'check' : carrierConfirmed ? 'account-check' : 'clock-outline'} 
                      size={20} 
                      color={vendorConfirmed || carrierConfirmed ? colors.onPrimary : colors.onSurfaceVariant} 
                    />
                  </View>
                  <View style={styles.stepContent}>
                    <Text variant="bodyMedium" style={styles.stepTitle}>
                      Votre confirmation
                    </Text>
                    <Text variant="bodySmall" style={styles.stepSubtitle}>
                      {vendorConfirmed ? '✅ Confirmé' : 
                       carrierConfirmed ? '⚡ Action requise' : '⏳ En attente du livreur'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bouton de confirmation si nécessaire */}
              {carrierConfirmed && !vendorConfirmed && (
                <Button
                  mode="contained"
                  onPress={() => setShowPackagingModal(true)}
                  icon="check-circle"
                  style={styles.confirmPackagingButton}
                >
                  Confirmer l'emballage
                </Button>
              )}

              {/* Message de succès */}
              {packagingFullyConfirmed && (
                <View style={styles.packagingSuccess}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                  <Text variant="bodyMedium" style={styles.packagingSuccessText}>
                    Emballage confirmé par les deux parties !
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Parcel Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📦 Informations du colis
            </Text>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Taille
              </Text>
              <Chip icon="package-variant">{sizeInfo?.label}</Chip>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Prix
              </Text>
              <Text variant="titleMedium" style={styles.price}>
                {Number(currentParcel.price).toFixed(2)} €
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Transporteur
              </Text>
              <View style={styles.carrierBadge}>
                <MaterialCommunityIcons 
                  name={carrierInfo?.icon as any || 'package-variant'} 
                  size={18} 
                  color={colors.primary} 
                />
                <Text variant="bodyMedium">{carrierInfo?.label || 'Autre'}</Text>
              </View>
            </View>

            {currentParcel.itemCategory && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Catégorie
                </Text>
                <Text variant="bodyMedium">{currentParcel.itemCategory}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Addresses */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📍 Adresses
            </Text>

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="home" size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>
                  Récupération
                </Text>
                {currentParcel.pickupAddress && (
                  <Text variant="bodyMedium">
                    {currentParcel.pickupAddress.street}, {currentParcel.pickupAddress.postalCode}{' '}
                    {currentParcel.pickupAddress.city}
                  </Text>
                )}
              </View>
            </View>

            {/* Informations complémentaires */}
            {currentParcel.pickupInstructions && (
              <View style={styles.instructionsBox}>
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
                <View style={styles.instructionsContent}>
                  <Text variant="labelSmall" style={styles.instructionsLabel}>
                    Informations complémentaires
                  </Text>
                  <Text variant="bodyMedium" style={styles.instructionsText}>
                    {currentParcel.pickupInstructions}
                  </Text>
                </View>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="store" size={20} color={colors.secondary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>
                  Dépôt
                </Text>
                <Text variant="bodyMedium">{currentParcel.dropoffName}</Text>
                <Text variant="bodySmall" style={styles.addressText}>
                  {currentParcel.dropoffAddress}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Time Slot */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🕐 Créneau de récupération
            </Text>
            <Text variant="bodyMedium">{formatDate(currentParcel.pickupSlotStart)}</Text>
            <Text variant="bodySmall" style={styles.slotEnd}>
              jusqu'à{' '}
              {new Date(currentParcel.pickupSlotEnd).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Card.Content>
        </Card>

        {/* Note pour le livreur */}
        {currentParcel.description && (
          <Card style={styles.noteCard}>
            <Card.Content>
              <View style={styles.noteHeader}>
                <MaterialCommunityIcons name="note-text-outline" size={20} color={colors.secondary} />
                <Text variant="titleSmall" style={styles.noteTitle}>
                  Note pour le livreur
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.noteText}>
                {currentParcel.description}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Carrier Info */}
        {currentParcel.assignedCarrier && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                🚴 Livreur
              </Text>
              <View style={styles.carrierRow}>
                {currentParcel.assignedCarrier.avatarUrl ? (
                  <Avatar.Image 
                    size={48} 
                    source={{ uri: currentParcel.assignedCarrier.avatarUrl }} 
                  />
                ) : (
                  <MaterialCommunityIcons name="account-circle" size={48} color={colors.primary} />
                )}
                <View style={styles.carrierInfo}>
                  <Text variant="titleMedium">
                    {currentParcel.assignedCarrier.firstName} {currentParcel.assignedCarrier.lastName}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Review Section */}
        {currentParcel.status === 'DELIVERED' && currentParcel.reviews && currentParcel.reviews.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                ⭐ Votre avis
              </Text>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons
                    key={star}
                    name={star <= currentParcel.reviews![0].rating ? 'star' : 'star-outline'}
                    size={24}
                    color="#F59E0B"
                  />
                ))}
              </View>
              {currentParcel.reviews[0].comment && (
                <Text variant="bodyMedium" style={styles.reviewComment}>
                  "{currentParcel.reviews[0].comment}"
                </Text>
              )}
              <Text variant="bodySmall" style={styles.reviewDate}>
                Laissé le {new Date(currentParcel.reviews[0].createdAt).toLocaleDateString('fr-FR')}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Tracking Button */}
        {(currentParcel.status === 'ACCEPTED' || currentParcel.status === 'PICKED_UP') && currentParcel.assignedCarrier && (
          <Button
            mode="contained"
            icon="map-marker"
            onPress={() =>
              navigation.navigate('Tracking', {
                parcelId: currentParcel.id,
                carrierId: currentParcel.assignedCarrier!.id,
              })
            }
            style={styles.trackingButton}
          >
            Suivre le livreur
          </Button>
        )}

        {/* Chat Button */}
        {(currentParcel.status === 'ACCEPTED' || currentParcel.status === 'PICKED_UP') && currentParcel.assignedCarrier && (
          <Button
            mode="outlined"
            icon="chat"
            onPress={() => navigation.navigate('Chat', { parcelId: currentParcel.id })}
            style={styles.chatButton}
          >
            Contacter le livreur
          </Button>
        )}

        {/* Review Button */}
        {currentParcel.status === 'DELIVERED' && (
          <Button
            mode="contained"
            icon="star"
            onPress={() =>
              navigation.navigate('Review', {
                parcelId: currentParcel.id,
                carrierName: currentParcel.assignedCarrier?.firstName,
                dropoffName: currentParcel.dropoffName,
              })
            }
            style={styles.reviewButton}
            buttonColor="#F59E0B"
          >
            Laisser un avis
          </Button>
        )}

        {/* Actions */}
        {currentParcel.status === 'PENDING' && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
            textColor={colors.error}
          >
            Annuler le colis
          </Button>
        )}
      </ScrollView>

      {/* Modal de confirmation d'emballage */}
      <PackagingConfirmationModal
        visible={showPackagingModal}
        photoUrl={packagingPhotoUrl}
        onConfirm={handleConfirmPackaging}
        onReject={handleRejectPackaging}
        onDismiss={() => setShowPackagingModal(false)}
        isLoading={isPackagingLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  statusCard: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusHint: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  codeCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primaryContainer,
  },
  codeContent: {
    alignItems: 'center',
  },
  codeLabel: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  code: {
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  // ===== PACKAGING STEPS =====
  packagingSteps: {
    marginBottom: spacing.md,
  },
  packagingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCirclePending: {
    backgroundColor: colors.surfaceVariant,
  },
  stepCircleActive: {
    backgroundColor: colors.tertiary,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  stepSubtitle: {
    color: colors.onSurfaceVariant,
  },
  stepLine: {
    width: 2,
    height: 24,
    marginLeft: 19,
    marginVertical: spacing.xs,
  },
  stepLinePending: {
    backgroundColor: colors.surfaceVariant,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  confirmPackagingButton: {
    marginTop: spacing.sm,
  },
  packagingSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#D1FAE5',
    padding: spacing.md,
    borderRadius: 8,
  },
  packagingSuccessText: {
    color: '#10B981',
    fontWeight: '500',
  },
  // ===== INFO ROWS =====
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.onSurfaceVariant,
  },
  price: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // ===== ADDRESSES =====
  addressBlock: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  addressText: {
    color: colors.onSurfaceVariant,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginLeft: spacing.xl + spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  instructionsText: {
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  slotEnd: {
    color: colors.onSurfaceVariant,
  },
  // ===== NOTE =====
  noteCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.secondaryContainer,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  noteText: {
    color: colors.onSurface,
    fontStyle: 'italic',
  },
  // ===== CARRIER =====
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  carrierInfo: {
    flex: 1,
  },
  // ===== BUTTONS =====
  trackingButton: {
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  chatButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.md,
    borderColor: colors.error,
  },
  reviewButton: {
    marginBottom: spacing.md,
  },
  // ===== REVIEWS =====
  reviewStars: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  reviewComment: {
    fontStyle: 'italic',
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  reviewDate: {
    color: colors.onSurfaceVariant,
  },
});