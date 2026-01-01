import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface PackagingStatusBadgeProps {
  carrierConfirmed: boolean;
  vendorConfirmed: boolean;
  compact?: boolean;
}

export function PackagingStatusBadge({
  carrierConfirmed,
  vendorConfirmed,
  compact = false
}: PackagingStatusBadgeProps) {
  const bothConfirmed = carrierConfirmed && vendorConfirmed;

  if (compact) {
    // Version compacte - affiche juste un indicateur global
    if (!carrierConfirmed && !vendorConfirmed) return null;

    return (
      <View style={[
        styles.compactContainer,
        bothConfirmed ? styles.bothConfirmedBg : styles.partialConfirmedBg
      ]}>
        <MaterialCommunityIcons
          name={bothConfirmed ? "check-all" : "check"}
          size={16}
          color={bothConfirmed ? "#10B981" : "#F59E0B"}
        />
        <Text style={[
          styles.compactText,
          { color: bothConfirmed ? "#10B981" : "#F59E0B" }
        ]}>
          {bothConfirmed ? "Emballage validé" : "Validation en cours"}
        </Text>
      </View>
    );
  }

  // Version complète - affiche les deux badges
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primary} />
        <Text variant="labelMedium" style={styles.title}>
          État de l'emballage
        </Text>
      </View>

      <View style={styles.badgesContainer}>
        {/* Badge livreur */}
        <View style={[
          styles.badge,
          carrierConfirmed ? styles.confirmedBadge : styles.pendingBadge
        ]}>
          <View style={styles.badgeContent}>
            <MaterialCommunityIcons
              name={carrierConfirmed ? "check-circle" : "clock-outline"}
              size={18}
              color={carrierConfirmed ? "#10B981" : "#6B7280"}
            />
            <Text style={[
              styles.badgeText,
              { color: carrierConfirmed ? "#10B981" : "#6B7280" }
            ]}>
              Livreur
            </Text>
          </View>
          {carrierConfirmed && (
            <MaterialCommunityIcons name="check" size={18} color="#10B981" />
          )}
        </View>

        {/* Badge vendeur */}
        <View style={[
          styles.badge,
          vendorConfirmed ? styles.confirmedBadge : styles.pendingBadge
        ]}>
          <View style={styles.badgeContent}>
            <MaterialCommunityIcons
              name={vendorConfirmed ? "check-circle" : "clock-outline"}
              size={18}
              color={vendorConfirmed ? "#10B981" : "#6B7280"}
            />
            <Text style={[
              styles.badgeText,
              { color: vendorConfirmed ? "#10B981" : "#6B7280" }
            ]}>
              Vendeur
            </Text>
          </View>
          {vendorConfirmed && (
            <MaterialCommunityIcons name="check" size={18} color="#10B981" />
          )}
        </View>
      </View>

      {/* Message de confirmation totale */}
      {bothConfirmed && (
        <View style={styles.successMessage}>
          <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
          <Text style={styles.successText}>
            Emballage confirmé des deux côtés
          </Text>
        </View>
      )}

      {/* Message en attente */}
      {!bothConfirmed && carrierConfirmed && (
        <View style={styles.waitingMessage}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#F59E0B" />
          <Text style={styles.waitingText}>
            En attente de la validation du vendeur
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  bothConfirmedBg: {
    backgroundColor: '#D1FAE5',
  },
  partialConfirmedBg: {
    backgroundColor: '#FEF3C7',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  badgesContainer: {
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  confirmedBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  pendingBadge: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  successText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  waitingText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
  },
});
