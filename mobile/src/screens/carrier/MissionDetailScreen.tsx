import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing, sizes } from '../../theme';
import { Mission, MissionStatus } from '../../types';

type MissionDetailScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'MissionDetail'>;
  route: RouteProp<CarrierStackParamList, 'MissionDetail'>;
};

const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string; nextAction?: string }> = {
  ACCEPTED: { label: 'À récupérer', color: colors.primary, icon: 'package-variant', nextAction: 'Marquer comme récupéré' },
  IN_PROGRESS: { label: 'En cours', color: colors.tertiary, icon: 'bike', nextAction: 'Marquer comme récupéré' },
  PICKED_UP: { label: 'En livraison', color: colors.secondary, icon: 'package-variant-closed', nextAction: 'Marquer comme livré' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
};

export function MissionDetailScreen({ navigation, route }: MissionDetailScreenProps) {
  const { missionId } = route.params;
  const { currentMissions, pickupMission, deliverMission, cancelMission, fetchCurrentMissions } = useMissionStore();
  const [isLoading, setIsLoading] = useState(false);

  const mission = currentMissions.find((m) => m.id === missionId);

  useEffect(() => {
    if (!mission) {
      fetchCurrentMissions();
    }
  }, [missionId]);

  if (!mission) {
    return <LoadingScreen message="Chargement de la mission..." />;
  }

  const status = statusConfig[mission.status];
  const parcel = mission.parcel;

  const handlePickup = async () => {
    Alert.alert(
      'Confirmer la récupération',
      'Avez-vous bien récupéré le colis auprès du vendeur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setIsLoading(true);
            try {
              await pickupMission(missionId);
              Alert.alert('Succès', 'Colis marqué comme récupéré !');
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeliver = async () => {
    Alert.alert(
      'Confirmer la livraison',
      'Avez-vous bien déposé le colis au point de dépôt ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deliverMission(missionId);
              Alert.alert('Succès', 'Livraison effectuée ! Votre paiement sera bientôt disponible.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Annuler la mission',
      'Êtes-vous sûr de vouloir annuler cette mission ? Cela peut affecter votre réputation.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await cancelMission(missionId, 'Annulé par le livreur');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

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
          </View>
        </Card.Content>
      </Card>

      {/* Pickup Code */}
      {parcel && (mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
        <Card style={styles.codeCard}>
          <Card.Content style={styles.codeContent}>
            <Text variant="bodyMedium" style={styles.codeLabel}>
              Code à demander au vendeur :
            </Text>
            <Text variant="displaySmall" style={styles.code}>
              {parcel.pickupCode}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Parcel Info */}
      {parcel && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📦 Colis
            </Text>
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Taille</Text>
              <Text variant="bodyMedium">
                {sizes.parcel[parcel.size as keyof typeof sizes.parcel]?.label || parcel.size}
              </Text>
            </View>

            {parcel.description && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>Description</Text>
                <Text variant="bodyMedium">{parcel.description}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Addresses */}
      {parcel && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📍 Itinéraire
            </Text>

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="home" size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>Récupération</Text>
                {parcel.pickupAddress && (
                  <>
                    <Text variant="bodyMedium">
                      {parcel.pickupAddress.street}
                    </Text>
                    <Text variant="bodySmall" style={styles.addressText}>
                      {parcel.pickupAddress.postalCode} {parcel.pickupAddress.city}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.arrowContainer}>
              <MaterialCommunityIcons name="arrow-down" size={24} color={colors.onSurfaceVariant} />
            </View>

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="store" size={20} color={colors.secondary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>Dépôt</Text>
                <Text variant="bodyMedium">{parcel.dropoffName}</Text>
                <Text variant="bodySmall" style={styles.addressText}>
                  {parcel.dropoffAddress}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Vendor Info */}
      {parcel?.vendor && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              👤 Vendeur
            </Text>
            <View style={styles.vendorRow}>
              <MaterialCommunityIcons name="account-circle" size={48} color={colors.primary} />
              <View style={styles.vendorInfo}>
                <Text variant="titleMedium">{parcel.vendor.firstName}</Text>
                {parcel.vendor.phone && (
                  <Text variant="bodySmall" style={styles.vendorPhone}>
                    📞 {parcel.vendor.phone}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Earnings */}
      {parcel && (
        <Card style={styles.earningsCard}>
          <Card.Content style={styles.earningsContent}>
            <Text variant="bodyMedium">Vous gagnez</Text>
            <Text variant="headlineMedium" style={styles.earningsAmount}>
              {(Number(parcel.price) * 0.8).toFixed(2)} €
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {mission.status === 'ACCEPTED' && (
          <Button
            mode="contained"
            onPress={handlePickup}
            loading={isLoading}
            disabled={isLoading}
            icon="package-variant"
            style={styles.actionButton}
          >
            J'ai récupéré le colis
          </Button>
        )}

        {mission.status === 'PICKED_UP' && (
          <Button
            mode="contained"
            onPress={handleDeliver}
            loading={isLoading}
            disabled={isLoading}
            icon="check-all"
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          >
            J'ai déposé le colis
          </Button>
        )}

        {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            disabled={isLoading}
            textColor={colors.error}
            style={styles.cancelButton}
          >
            Annuler la mission
          </Button>
        )}
      </View>
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
  arrowContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorPhone: {
    color: colors.onSurfaceVariant,
  },
  earningsCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.secondaryContainer,
  },
  earningsContent: {
    alignItems: 'center',
  },
  earningsAmount: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  cancelButton: {
    borderColor: colors.error,
  },
});