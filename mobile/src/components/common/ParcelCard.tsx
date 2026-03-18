import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '../../types';
import { hdColors, borderRadius, sizes } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  showCarrier?: boolean;
}

export function ParcelCard({ parcel, onPress, showCarrier = true }: ParcelCardProps) {
  const { t } = useTranslation();

  const statusConfig: Record<ParcelStatus, { label: string; color: string }> = useMemo(() => ({
    PENDING: { label: t('status.PENDING'), color: '#F59E0B' },
    ACCEPTED: { label: t('status.ACCEPTED'), color: hdColors.neonGreen },
    PACKAGING_CONFIRMED: { label: t('status.PACKAGING_CONFIRMED'), color: hdColors.electricBlue },
    PICKED_UP: { label: t('status.PICKED_UP'), color: hdColors.electricBlue },
    DELIVERED: { label: t('status.DELIVERED'), color: hdColors.neonGreen },
    CANCELLED: { label: t('status.CANCELLED'), color: hdColors.danger },
    EXPIRED: { label: t('status.EXPIRED'), color: hdColors.steel },
  }), [t]);

  const getDisplayStatus = () => {
    const mission = (parcel as any).mission;
    const baseStatus = statusConfig[parcel.status];
    if (parcel.status === 'PICKED_UP' && mission?.deliveredAt) {
      if (mission.clientContestedAt && !mission.clientConfirmedDeliveryAt) {
        return { label: 'Contesté', color: hdColors.danger };
      }
      return { label: 'Déposé', color: hdColors.plasma };
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardOuter}>
        <View style={styles.card}>
          {/* Motif subtil */}
          <View style={styles.patternContainer}>
            <View style={[styles.patternCircle, { top: -15, right: -15, width: 80, height: 80 }]} />
            <View style={[styles.patternCircle, { bottom: -20, left: -10, width: 60, height: 60 }]} />
            <View style={[styles.patternLine, { top: 30, right: 40 }]} />
            <View style={[styles.patternLine, { bottom: 25, left: 60, width: 30 }]} />
            <View style={[styles.patternDot, { top: 18, right: 70 }]} />
            <View style={[styles.patternDot, { bottom: 40, right: 30 }]} />
            <View style={[styles.patternDot, { top: 50, left: 20 }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.sizeRow}>
              <View style={styles.sizeIconBg}>
                <MaterialCommunityIcons name="package-variant" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.sizeLabel}>{sizeInfo.label}</Text>
            </View>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: status.color }]} />
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Description */}
          {parcel.description && (
            <Text style={styles.description} numberOfLines={1}>{parcel.description}</Text>
          )}

          {/* Détails */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="rgba(255,255,255,0.45)" />
              <Text style={styles.detailText} numberOfLines={1}>{parcel.dropoffName}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color="rgba(255,255,255,0.45)" />
              <Text style={styles.detailText}>{formatDate(parcel.pickupSlotStart)}</Text>
            </View>
          </View>

          {/* Séparateur */}
          <View style={styles.separator} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.price}>{Number(parcel.price).toFixed(2)} €</Text>
            {showCarrier && parcel.assignedCarrier && (
              <View style={styles.carrierTag}>
                <MaterialCommunityIcons name="account" size={14} color={hdColors.chrome} />
                <Text style={styles.carrierName}>{parcel.assignedCarrier.firstName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginBottom: 12,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#0d2c54',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0d2c54',
  },

  // Motif
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  patternLine: {
    position: 'absolute',
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ rotate: '35deg' }],
  },
  patternDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Description
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },

  // Details
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
    color: 'rgba(255,255,255,0.45)',
    flex: 1,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  carrierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  carrierName: {
    fontSize: 13,
    fontWeight: '600',
    color: hdColors.chrome,
  },
});