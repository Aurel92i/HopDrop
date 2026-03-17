import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '../../types';
import { hdColors, spacing, borderRadius, sizes } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  showCarrier?: boolean;
}

export function ParcelCard({ parcel, onPress, showCarrier = true }: ParcelCardProps) {
  const { t } = useTranslation();

  const statusConfig: Record<ParcelStatus, { label: string; bg: string; color: string }> = useMemo(() => ({
    PENDING: {
      label: t('status.PENDING'),
      bg: hdColors.titanium,
      color: hdColors.statusPending,
    },
    ACCEPTED: {
      label: t('status.ACCEPTED'),
      bg: hdColors.titanium,
      color: hdColors.neonGreen,
    },
    PACKAGING_CONFIRMED: {
      label: t('status.PACKAGING_CONFIRMED'),
      bg: hdColors.titanium,
      color: hdColors.electricBlue,
    },
    PICKED_UP: {
      label: t('status.PICKED_UP'),
      bg: hdColors.titanium,
      color: hdColors.electricBlue,
    },
    DELIVERED: {
      label: t('status.DELIVERED'),
      bg: hdColors.titanium,
      color: hdColors.neonGreen,
    },
    CANCELLED: {
      label: t('status.CANCELLED'),
      bg: hdColors.titanium,
      color: hdColors.danger,
    },
    EXPIRED: {
      label: t('status.EXPIRED'),
      bg: hdColors.titanium,
      color: hdColors.steel,
    },
  }), [t]);

  const getDisplayStatus = () => {
    const mission = (parcel as any).mission;
    const baseStatus = statusConfig[parcel.status];
    if (parcel.status === 'PICKED_UP' && mission?.deliveredAt) {
      if (mission.clientContestedAt && !mission.clientConfirmedDeliveryAt) {
        return { label: 'Contesté', bg: hdColors.titanium, color: hdColors.danger };
      }
      return { label: 'Déposé', bg: hdColors.titanium, color: hdColors.plasma };
    }
    return baseStatus;
  };

  const status = getDisplayStatus();
  const sizeInfo = sizes.parcel[parcel.size];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === now.toDateString()) {
      return "Auj. " + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Dem. ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.sizeRow}>
            <MaterialCommunityIcons name="package-variant" size={20} color={hdColors.accent} />
            <Text style={styles.sizeLabel}>{sizeInfo.label}</Text>
          </View>
          {/* Badge taille fixe */}
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {parcel.description && (
          <Text style={styles.description} numberOfLines={1}>{parcel.description}</Text>
        )}

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={15} color={hdColors.chromeDark} />
            <Text style={styles.detailText} numberOfLines={1}>{parcel.dropoffName}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-outline" size={15} color={hdColors.chromeDark} />
            <Text style={styles.detailText}>{formatDate(parcel.pickupSlotStart)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{Number(parcel.price).toFixed(2)} €</Text>
          {showCarrier && parcel.assignedCarrier && (
            <View style={styles.carrierTag}>
              <MaterialCommunityIcons name="account" size={15} color={hdColors.accent} />
              <Text style={styles.carrierName}>{parcel.assignedCarrier.firstName}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: hdColors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: hdColors.text,
  },
  // Badge taille fixe — fond sombre métallique
  badge: {
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: hdColors.textSecondary,
    marginBottom: 10,
  },
  details: {
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: hdColors.chromeDark,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: hdColors.border,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: hdColors.accent,
  },
  carrierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carrierName: {
    fontSize: 13,
    fontWeight: '600',
    color: hdColors.accent,
  },
});