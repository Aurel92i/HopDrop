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
import { useTranslation } from '../../i18n/i18nContext';

type MissionDetailScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'MissionDetail'>;
  route: RouteProp<CarrierStackParamList, 'MissionDetail'>;
};

export function MissionDetailScreen({ navigation, route }: MissionDetailScreenProps) {
  const { missionId } = route.params;
  const { currentMissions, pickupMission, deliverMission, cancelMission, fetchCurrentMissions } = useMissionStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useTranslation();

  const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA', pt: 'pt-BR' };
  const locale = localeMap[language] || 'fr-FR';

  const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string; nextAction?: string }> = {
    ACCEPTED: { label: t('carrier.missionDetail.toPickup'), color: colors.primary, icon: 'package-variant', nextAction: t('carrier.missionDetail.pickupAction') },
    IN_PROGRESS: { label: t('carrier.missionDetail.inProgress'), color: colors.tertiary, icon: 'bike', nextAction: t('carrier.missionDetail.pickupAction') },
    PICKED_UP: { label: t('carrier.missionDetail.inDelivery'), color: colors.secondary, icon: 'package-variant-closed', nextAction: t('carrier.missionDetail.deliverAction') },
    DELIVERED: { label: t('carrier.missionDetail.delivered'), color: '#10B981', icon: 'check-all' },
    CANCELLED: { label: t('carrier.missionDetail.cancelled'), color: colors.error, icon: 'close-circle' },
  };

  const mission = currentMissions.find((m) => m.id === missionId);

  useEffect(() => {
    if (!mission) {
      fetchCurrentMissions();
    }
  }, [missionId]);

  if (!mission) {
    return <LoadingScreen message={t('carrier.missionDetail.loadingMission')} />;
  }

  const status = statusConfig[mission.status];
  const parcel = mission.parcel;

  const handlePickup = async () => {
    Alert.alert(
      t('carrier.missionDetail.confirmPickupTitle'),
      t('carrier.missionDetail.confirmPickupMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setIsLoading(true);
            try {
              await pickupMission(missionId);
              Alert.alert(t('common.success'), t('carrier.missionDetail.pickupSuccess'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
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
      t('carrier.missionDetail.confirmDeliveryTitle'),
      t('carrier.missionDetail.confirmDeliveryMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setIsLoading(true);
            try {
              await deliverMission(missionId);
              Alert.alert(t('common.success'), t('carrier.missionDetail.deliverySuccess'), [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
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
      t('carrier.missionDetail.cancelTitle'),
      t('carrier.missionDetail.cancelMessage'),
      [
        { text: t('carrier.missionDetail.cancelNo'), style: 'cancel' },
        {
          text: t('carrier.missionDetail.cancelYes'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await cancelMission(missionId, t('carrier.missionDetail.cancelledByCarrier'));
              navigation.goBack();
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
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
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 🕐 Formatage du jour de recuperation
  const formatPickupDay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t('carrier.missionDetail.today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('carrier.missionDetail.tomorrow');
    } else {
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
  };

  // 🕐 Formatage de l'heure
  const formatPickupTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).replace(':', 'h');
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

      {/* 🕐 CRENEAU DE RECUPERATION - ELEMENT CENTRAL */}
      {parcel && (mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
        <View style={[
          styles.slotBanner,
          parcel.pickupMode === 'IMMEDIATE' ? styles.slotBannerImmediate : styles.slotBannerScheduled
        ]}>
          <MaterialCommunityIcons
            name={parcel.pickupMode === 'IMMEDIATE' ? 'lightning-bolt' : 'clock-outline'}
            size={28}
            color="white"
          />
          <View style={styles.slotBannerContent}>
            {parcel.pickupMode === 'IMMEDIATE' ? (
              <>
                <Text style={styles.slotBannerTitle}>{t('carrier.missionDetail.immediatePickup')}</Text>
                <Text style={styles.slotBannerSubtitle}>{t('carrier.missionDetail.vendorWaiting')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.slotBannerTitle}>
                  {formatPickupDay(parcel.pickupSlotStart)}
                </Text>
                <Text style={styles.slotBannerTime}>
                  {formatPickupTime(parcel.pickupSlotStart)} - {formatPickupTime(parcel.pickupSlotEnd)}
                </Text>
                <Text style={styles.slotBannerSubtitle}>{t('carrier.missionDetail.pickupSlot')}</Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* Pickup Code */}
      {parcel && (mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
        <Card style={styles.codeCard}>
          <Card.Content style={styles.codeContent}>
            <Text variant="bodyMedium" style={styles.codeLabel}>
              {t('carrier.missionDetail.codeLabel')}
            </Text>
            <Text variant="displaySmall" style={styles.code}>
              {parcel.pickupCode}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Note du vendeur - IMPORTANT pour le livreur */}
      {parcel?.description && (
        <Card style={styles.noteCard}>
          <Card.Content>
            <View style={styles.noteHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={20} color={colors.secondary} />
              <Text variant="titleSmall" style={styles.noteTitle}>
                {t('carrier.missionDetail.vendorNote')}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.noteText}>
              {parcel.description}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Parcel Info */}
      {parcel && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {`\u{1F4E6} ${t('carrier.missionDetail.parcelSection')}`}
            </Text>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>{t('carrier.missionDetail.sizeLabel')}</Text>
              <Text variant="bodyMedium">
                {sizes.parcel[parcel.size as keyof typeof sizes.parcel]?.label || parcel.size}
              </Text>
            </View>

            {parcel.itemCategory && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>{t('carrier.missionDetail.categoryLabel')}</Text>
                <Text variant="bodyMedium">{parcel.itemCategory}</Text>
              </View>
            )}

            {/* Info bordereau */}
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>{t('carrier.missionDetail.labelLabel')}</Text>
              <Text variant="bodyMedium">
                {parcel.hasShippingLabel ? `\u2705 ${t('carrier.missionDetail.labelPrinted')}` : `\u{1F5A8}\uFE0F ${t('carrier.missionDetail.labelToPrint')}`}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Addresses */}
      {parcel && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {`\u{1F4CD} ${t('carrier.missionDetail.routeSection')}`}
            </Text>

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="home" size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>{t('carrier.missionDetail.pickupLabel')}</Text>
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

            {/* Informations complementaires - IMPORTANT pour le livreur */}
            {parcel.pickupInstructions && (
              <View style={styles.instructionsBox}>
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
                <View style={styles.instructionsContent}>
                  <Text variant="labelSmall" style={styles.instructionsLabel}>
                    {t('carrier.missionDetail.additionalInfo')}
                  </Text>
                  <Text variant="bodyMedium" style={styles.instructionsText}>
                    {parcel.pickupInstructions}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.arrowContainer}>
              <MaterialCommunityIcons name="arrow-down" size={24} color={colors.onSurfaceVariant} />
            </View>

            <View style={styles.addressBlock}>
              <MaterialCommunityIcons name="store" size={20} color={colors.secondary} />
              <View style={styles.addressInfo}>
                <Text variant="labelMedium" style={styles.addressLabel}>{t('carrier.missionDetail.dropoffLabel')}</Text>
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
              {`\u{1F464} ${t('carrier.missionDetail.vendorSection')}`}
            </Text>
            <View style={styles.vendorRow}>
              <MaterialCommunityIcons name="account-circle" size={48} color={colors.primary} />
              <View style={styles.vendorInfo}>
                <Text variant="titleMedium">{parcel.vendor.firstName}</Text>
                <Text variant="bodySmall" style={styles.vendorHint}>
                  {t('carrier.missionDetail.chatHint')}
                </Text>
              </View>
            </View>

            {/* Chat Button */}
            <Button
              mode="outlined"
              icon="chat"
              onPress={() => navigation.navigate('Chat', { parcelId: parcel.id })}
              style={styles.chatButton}
            >
              {t('carrier.missionDetail.contactVendor')}
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Earnings */}
      {parcel && (
        <Card style={styles.earningsCard}>
          <Card.Content style={styles.earningsContent}>
            <Text variant="bodyMedium">{t('carrier.missionDetail.youEarn')}</Text>
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
            {t('carrier.missionDetail.pickedUpAction')}
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
            {t('carrier.missionDetail.deliveredAction')}
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
            {t('carrier.missionDetail.cancelMission')}
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
  // 🕐 STYLES CRENEAU DE RECUPERATION
  slotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  slotBannerScheduled: {
    backgroundColor: colors.primary,
  },
  slotBannerImmediate: {
    backgroundColor: '#F59E0B',
  },
  slotBannerContent: {
    flex: 1,
  },
  slotBannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  slotBannerTime: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  slotBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4,
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
  arrowContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorHint: {
    color: colors.onSurfaceVariant,
  },
  chatButton: {
    marginTop: spacing.sm,
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
