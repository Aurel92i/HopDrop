import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, sizes } from '../../theme';

interface MissionCardProps {
  mission: {
    id: string;
    size: string;
    description?: string | null;
    dropoffType: string;
    dropoffName: string;
    pickupSlot: { start: string; end: string };
    price: { total: number; carrierPayout: number };
    distance: number;
    pickupAddress: { 
      city: string; 
      postalCode: string;
      street?: string;
      latitude?: number;
      longitude?: number;
    };
    vendor: { id: string; firstName: string; avatarUrl: string | null };
  };
  onPress: () => void;
}

export function MissionCard({ mission, onPress }: MissionCardProps) {
  const sizeInfo = sizes.parcel[mission.size as keyof typeof sizes.parcel];

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
                {sizeInfo?.label || mission.size}
              </Text>
            </View>
            <Chip mode="flat" style={styles.distanceChip}>
              📍 {mission.distance.toFixed(1)} km
            </Chip>
          </View>

          {mission.description && (
            <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
              {mission.description}
            </Text>
          )}

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="home" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText}>
                {mission.pickupAddress.city} ({mission.pickupAddress.postalCode})
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="store" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                → {mission.dropoffName}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDate(mission.pickupSlot.start)}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View>
              <Text variant="bodySmall" style={styles.payoutLabel}>Vous gagnez</Text>
              <Text variant="titleLarge" style={styles.payout}>
                {mission.price.carrierPayout.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.vendorInfo}>
              <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
              <Text variant="bodySmall" style={styles.vendorName}>
                {mission.vendor.firstName}
              </Text>
            </View>
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
  distanceChip: {
    backgroundColor: colors.secondaryContainer,
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
  payoutLabel: {
    color: colors.onSurfaceVariant,
  },
  payout: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vendorName: {
    color: colors.primary,
  },
});