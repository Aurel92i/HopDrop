import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '../../types';
import { colors, spacing, sizes } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  showCarrier?: boolean;
}

export function ParcelCard({ parcel, onPress, showCarrier = true }: ParcelCardProps) {
  const { t } = useTranslation();

  const statusConfig: Record<ParcelStatus, { label: string; color: string; icon: string }> = useMemo(() => ({
    PENDING: { label: t('status.PENDING'), color: colors.tertiary, icon: 'clock-outline' },
    ACCEPTED: { label: t('status.ACCEPTED'), color: colors.primary, icon: 'check-circle-outline' },
    PACKAGING_CONFIRMED: { label: t('status.PACKAGING_CONFIRMED'), color: '#3B82F6', icon: 'package-check' },
    PICKED_UP: { label: t('status.PICKED_UP'), color: colors.secondary, icon: 'package-variant' },
    DELIVERED: { label: t('status.DELIVERED'), color: '#10B981', icon: 'check-all' },
    CANCELLED: { label: t('status.CANCELLED'), color: colors.error, icon: 'close-circle-outline' },
    EXPIRED: { label: t('status.EXPIRED'), color: colors.onSurfaceVariant, icon: 'timer-off-outline' },
  }), [t]);

  // Déterminer le statut affiché (peut différer du statut en base)
  const getDisplayStatus = () => {
    const mission = (parcel as any).mission;
    const baseStatus = statusConfig[parcel.status];

    // Si le colis est PICKED_UP et que la mission a un deliveredAt → Déposé
    if (parcel.status === 'PICKED_UP' && mission?.deliveredAt) {
      if (mission.clientContestedAt && !mission.clientConfirmedDeliveryAt) {
        return { label: 'Contesté', color: '#EF4444', icon: 'alert-circle' };
      }
      return { label: 'Déposé — À confirmer', color: '#8B5CF6', icon: 'store-check' };
    }

    return baseStatus;
  };

  const status = getDisplayStatus();
  const sizeInfo = sizes.parcel[parcel.size];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.sizeContainer}>
              <MaterialCommunityIcons
                name="package-variant"
                size={24}
                color={colors.primary}
              />
              <Text variant="titleMedium" style={styles.sizeLabel}>
                {sizeInfo.label}
              </Text>
            </View>
            <Chip
              mode="flat"
              icon={() => (
                <MaterialCommunityIcons name={status.icon as any} size={16} color={status.color} />
              )}
              style={[styles.statusChip, { backgroundColor: `${status.color}20` }]}
              textStyle={{ color: status.color, fontSize: 12 }}
            >
              {status.label}
            </Chip>
          </View>

          {parcel.description && (
            <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
              {parcel.description}
            </Text>
          )}

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                {parcel.dropoffName}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDate(parcel.pickupSlotStart)}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text variant="titleMedium" style={styles.price}>
              {Number(parcel.price).toFixed(2)} €
            </Text>

            {showCarrier && parcel.assignedCarrier && (
              <View style={styles.carrierInfo}>
                <MaterialCommunityIcons name="account" size={16} color={colors.primary} />
                <Text variant="bodySmall" style={styles.carrierName}>
                  {parcel.assignedCarrier.firstName}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sizeLabel: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  statusChip: {
    height: 28,
  },
  description: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  details: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  price: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  carrierName: {
    color: colors.primary,
  },
});
