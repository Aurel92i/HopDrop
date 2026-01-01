import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface DeliveryDeadlineBadgeProps {
  // Deadline pour déposer le colis (livreur - 24H)
  pickupDeadline?: Date;

  // Deadline pour confirmer le dépôt (vendeur - 12H)
  confirmationDeadline?: Date;

  // Type d'utilisateur
  userType: 'carrier' | 'vendor';
}

export function DeliveryDeadlineBadge({
  pickupDeadline,
  confirmationDeadline,
  userType
}: DeliveryDeadlineBadgeProps) {
  const [now, setNow] = useState(new Date());

  // Mettre à jour l'heure actuelle toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const calculateTimeRemaining = (deadline: Date) => {
    const msRemaining = deadline.getTime() - now.getTime();

    if (msRemaining <= 0) {
      return { hours: 0, minutes: 0, isExpired: true };
    }

    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return { hours: hoursRemaining, minutes: minutesRemaining, isExpired: false };
  };

  const getProgressColor = (hours: number, totalHours: number) => {
    const percentage = (hours / totalHours) * 100;

    if (percentage > 50) return '#10B981'; // Vert
    if (percentage > 25) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  // Livreur : afficher le délai de 24H pour déposer
  if (userType === 'carrier' && pickupDeadline) {
    const { hours, minutes, isExpired } = calculateTimeRemaining(pickupDeadline);
    const totalHours = 24;
    const progress = Math.max(0, Math.min(1, (hours + minutes / 60) / totalHours));
    const color = getProgressColor(hours, totalHours);

    return (
      <View style={[styles.container, isExpired && styles.expiredContainer]}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="clock-alert-outline"
            size={20}
            color={isExpired ? '#EF4444' : color}
          />
          <Text variant="labelMedium" style={[styles.title, { color: isExpired ? '#EF4444' : color }]}>
            {isExpired ? 'Délai dépassé !' : 'Temps pour déposer le colis'}
          </Text>
        </View>

        <ProgressBar
          progress={isExpired ? 0 : progress}
          color={color}
          style={styles.progressBar}
        />

        <View style={styles.timeContainer}>
          <Text variant="titleLarge" style={[styles.timeText, { color }]}>
            {isExpired ? '0h 0m' : `${hours}h ${minutes}m`}
          </Text>
          <Text variant="bodySmall" style={styles.subText}>
            {isExpired
              ? 'Veuillez déposer le colis au plus vite'
              : 'restantes pour déposer au point relais'}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            Vous avez 24 heures après la récupération pour déposer le colis. Prenez une photo du reçu de dépôt.
          </Text>
        </View>
      </View>
    );
  }

  // Vendeur : afficher le délai de 12H pour confirmer
  if (userType === 'vendor' && confirmationDeadline) {
    const { hours, minutes, isExpired } = calculateTimeRemaining(confirmationDeadline);
    const totalHours = 12;
    const progress = Math.max(0, Math.min(1, (hours + minutes / 60) / totalHours));
    const color = getProgressColor(hours, totalHours);

    return (
      <View style={[styles.container, isExpired && styles.autoConfirmedContainer]}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={isExpired ? 'check-decagram' : 'timer-sand'}
            size={20}
            color={isExpired ? '#10B981' : color}
          />
          <Text variant="labelMedium" style={[styles.title, { color: isExpired ? '#10B981' : color }]}>
            {isExpired ? 'Confirmé automatiquement' : 'Temps pour confirmer la réception'}
          </Text>
        </View>

        {!isExpired && (
          <>
            <ProgressBar
              progress={progress}
              color={color}
              style={styles.progressBar}
            />

            <View style={styles.timeContainer}>
              <Text variant="titleLarge" style={[styles.timeText, { color }]}>
                {hours}h {minutes}m
              </Text>
              <Text variant="bodySmall" style={styles.subText}>
                restantes pour confirmer
              </Text>
            </View>
          </>
        )}

        <View style={[styles.infoBox, isExpired && styles.autoConfirmedInfoBox]}>
          <MaterialCommunityIcons
            name={isExpired ? 'shield-check' : 'information-outline'}
            size={16}
            color={isExpired ? '#10B981' : colors.primary}
          />
          <Text variant="bodySmall" style={styles.infoText}>
            {isExpired
              ? 'Le délai de 12h est écoulé. La livraison a été validée automatiquement et le paiement du livreur a été déclenché.'
              : 'Vous avez 12 heures pour confirmer que vous avez reçu la notification de dépôt du transporteur. Sinon, la livraison sera validée automatiquement.'}
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.sm,
  },
  expiredContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  autoConfirmedContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  timeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  timeText: {
    fontWeight: 'bold',
  },
  subText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
  },
  autoConfirmedInfoBox: {
    backgroundColor: '#D1FAE5',
  },
  infoText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 16,
  },
});
