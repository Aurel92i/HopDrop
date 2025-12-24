import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, Avatar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useParcelStore } from '../../stores/parcelStore';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing, sizes } from '../../theme';
import { ParcelStatus } from '../../types';

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

  useEffect(() => {
    fetchParcel(parcelId);
  }, [parcelId]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      {currentParcel.status === 'ACCEPTED' && (
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
            <Chip icon="package-variant">{sizeInfo.label}</Chip>
          </View>

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Prix
            </Text>
            <Text variant="titleMedium" style={styles.price}>
              {Number(currentParcel.price).toFixed(2)} €
            </Text>
          </View>

          {currentParcel.description && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Description
              </Text>
              <Text variant="bodyMedium">{currentParcel.description}</Text>
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
                  name={star <= currentParcel.reviews[0].rating ? 'star' : 'star-outline'}
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
      {currentParcel.status === 'ACCEPTED' && currentParcel.assignedCarrier && (
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
      {currentParcel.status === 'ACCEPTED' && currentParcel.assignedCarrier && (
        <Button
          mode="outlined"
          icon="chat"
          onPress={() => navigation.navigate('Chat', { parcelId: currentParcel.id })}
          style={styles.chatButton}
        >
          Contacter le livreur
        </Button>
      )}

      {/* Chat Button */}
      {currentParcel.status === 'ACCEPTED' && currentParcel.assignedCarrierId && (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
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
  divider: {
    marginVertical: spacing.md,
  },
  slotEnd: {
    color: colors.onSurfaceVariant,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  carrierInfo: {
    flex: 1,
  },
  carrierPhone: {
    color: colors.onSurfaceVariant,
  },
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