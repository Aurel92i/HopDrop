import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing, sizes, hdColors, borderRadius } from '../../theme';
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

  const statusConfig: Record<MissionStatus, { label: string; color: string; bg: string; icon: string }> = {
    ACCEPTED: { label: t('carrier.missionDetail.toPickup'), color: hdColors.accent, bg: hdColors.accent50, icon: 'package-variant' },
    IN_PROGRESS: { label: t('carrier.missionDetail.inProgress'), color: hdColors.warning, bg: hdColors.warning50, icon: 'bike' },
    PICKED_UP: { label: t('carrier.missionDetail.inDelivery'), color: hdColors.neonGreen, bg: hdColors.neonGreen50, icon: 'package-variant-closed' },
    DELIVERED: { label: t('carrier.missionDetail.delivered'), color: hdColors.neonGreen, bg: hdColors.neonGreen50, icon: 'check-all' },
    CANCELLED: { label: t('carrier.missionDetail.cancelled'), color: hdColors.danger, bg: hdColors.danger50, icon: 'close-circle' },
  };

  const mission = currentMissions.find((m) => m.id === missionId);

  useEffect(() => {
    if (!mission) fetchCurrentMissions();
  }, [missionId]);

  if (!mission) return <LoadingScreen message={t('carrier.missionDetail.loadingMission')} />;

  const status = statusConfig[mission.status];
  const parcel = mission.parcel;

  const handlePickup = async () => {
    Alert.alert(t('carrier.missionDetail.confirmPickupTitle'), t('carrier.missionDetail.confirmPickupMessage'), [
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
          } finally { setIsLoading(false); }
        },
      },
    ]);
  };

  const handleDeliver = async () => {
    Alert.alert(t('carrier.missionDetail.confirmDeliveryTitle'), t('carrier.missionDetail.confirmDeliveryMessage'), [
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
          } finally { setIsLoading(false); }
        },
      },
    ]);
  };

  const handleCancel = async () => {
    Alert.alert(t('carrier.missionDetail.cancelTitle'), t('carrier.missionDetail.cancelMessage'), [
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
          } finally { setIsLoading(false); }
        },
      },
    ]);
  };

  const formatPickupDay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return t('carrier.missionDetail.today');
    if (date.toDateString() === tomorrow.toDateString()) return t('carrier.missionDetail.tomorrow');
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatPickupTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ===== HERO STATUS ===== */}
      <View style={styles.heroCard}>
        <View style={styles.heroPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -20, width: 100, height: 100 }]} />
          <View style={[styles.patternCircle, { bottom: -25, left: -10, width: 70, height: 70 }]} />
        </View>

        <View style={styles.heroContent}>
          <View style={[styles.heroIconBg, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.icon as any} size={28} color={status.color} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>Mission en cours</Text>
            <Text style={[styles.heroStatus, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {parcel && (mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
          <View style={[
            styles.slotRow,
            { backgroundColor: parcel.pickupMode === 'IMMEDIATE' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)' },
          ]}>
            <MaterialCommunityIcons
              name={parcel.pickupMode === 'IMMEDIATE' ? 'lightning-bolt' : 'clock-outline'}
              size={18}
              color={parcel.pickupMode === 'IMMEDIATE' ? hdColors.warning : 'rgba(255,255,255,0.7)'}
            />
            {parcel.pickupMode === 'IMMEDIATE' ? (
              <Text style={[styles.slotText, { color: hdColors.warning }]}>
                {t('carrier.missionDetail.immediatePickup')}
              </Text>
            ) : (
              <Text style={styles.slotText}>
                {formatPickupDay(parcel.pickupSlotStart)}
                {'  '}
                <Text style={styles.slotTime}>
                  {formatPickupTime(parcel.pickupSlotStart)} – {formatPickupTime(parcel.pickupSlotEnd)}
                </Text>
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ===== CODE DE VÉRIFICATION ===== */}
      {parcel && (mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('carrier.missionDetail.codeLabel')}</Text>
          <Text style={styles.codeValue}>{parcel.pickupCode}</Text>
          <View style={styles.codeDivider} />
          <View style={styles.codeBordereau}>
            <MaterialCommunityIcons
              name={parcel.hasShippingLabel ? 'printer-check' : 'printer-alert'}
              size={18}
              color={parcel.hasShippingLabel ? hdColors.neonGreen : hdColors.logoOrange}
            />
            <View style={styles.codeBordereauText}>
              <Text style={[styles.codeBordereauTitle, { color: parcel.hasShippingLabel ? hdColors.neonGreen : hdColors.logoOrange }]}>
                {parcel.hasShippingLabel ? 'Bordereau imprimé par le vendeur' : 'Bordereau à imprimer'}
              </Text>
              {!parcel.hasShippingLabel && (
                <Text style={styles.codeBordereauSub}>
                  Le vendeur n'a pas imprimé le bordereau — vous devrez l'imprimer avant le dépôt.
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ===== NOTE DU VENDEUR ===== */}
      {parcel?.description && (
        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <MaterialCommunityIcons name="note-text-outline" size={18} color={hdColors.logoOrange} />
            <Text style={styles.noteTitle}>{t('carrier.missionDetail.vendorNote')}</Text>
          </View>
          <Text style={styles.noteText}>{parcel.description}</Text>
        </View>
      )}

      {/* ===== ITINÉRAIRE ===== */}
      {parcel && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('carrier.missionDetail.routeSection')}</Text>
          <View style={styles.routeCard}>
            <View style={styles.routeStep}>
              <View style={[styles.routeDot, { backgroundColor: hdColors.accent }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeStepLabel}>{t('carrier.missionDetail.pickupLabel')}</Text>
                {parcel.pickupAddress && (
                  <>
                    <Text style={styles.routeAddress}>{parcel.pickupAddress.street}</Text>
                    <Text style={styles.routeCity}>{parcel.pickupAddress.postalCode} {parcel.pickupAddress.city}</Text>
                  </>
                )}
              </View>
            </View>

            {parcel.pickupInstructions && (
              <View style={styles.instructionsBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={hdColors.accent} />
                <Text style={styles.instructionsText}>{parcel.pickupInstructions}</Text>
              </View>
            )}

            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
              <MaterialCommunityIcons name="arrow-down" size={16} color={hdColors.chromeDark} />
              <View style={styles.routeLine} />
            </View>

            <View style={styles.routeStep}>
              <View style={[styles.routeDot, { backgroundColor: hdColors.neonGreen }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeStepLabel}>{t('carrier.missionDetail.dropoffLabel')}</Text>
                <Text style={styles.routeAddress}>{parcel.dropoffName}</Text>
                {parcel.dropoffAddress && <Text style={styles.routeCity}>{parcel.dropoffAddress}</Text>}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== COLIS ===== */}
      {parcel && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('carrier.missionDetail.parcelSection')}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>{t('carrier.missionDetail.sizeLabel')}</Text>
              <Text style={styles.infoCellValue}>
                {sizes.parcel[parcel.size as keyof typeof sizes.parcel]?.label || parcel.size}
              </Text>
            </View>
            {parcel.itemCategory && (
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>{t('carrier.missionDetail.categoryLabel')}</Text>
                <Text style={styles.infoCellValue}>{parcel.itemCategory}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== VENDEUR ===== */}
      {parcel?.vendor && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('carrier.missionDetail.vendorSection')}</Text>
          <View style={styles.vendorCard}>
            <View style={styles.vendorTop}>
              <View style={styles.vendorAvatar}>
                <MaterialCommunityIcons name="account" size={26} color="white" />
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{parcel.vendor.firstName}</Text>
                <Text style={styles.vendorHint} numberOfLines={2}>{t('carrier.missionDetail.chatHint')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate('Chat', { parcelId: parcel.id })}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chat-outline" size={18} color={hdColors.accent} />
              <Text style={styles.chatBtnText}>{t('carrier.missionDetail.contactVendor')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ===== GAINS ===== */}
      {parcel && (
        <View style={styles.earningsCard}>
          <View>
            <Text style={styles.earningsLabel}>{t('carrier.missionDetail.youEarn')}</Text>
            <Text style={styles.earningsHint}>💡 {t('carrier.home.paidAfterDelivery')}</Text>
          </View>
          <Text style={styles.earningsAmount}>
            {(Number(parcel.price) * 0.9).toFixed(2)} €
          </Text>
        </View>
      )}

      {/* ===== ACTIONS ===== */}
      <View style={styles.actionsContainer}>
        {mission.status === 'ACCEPTED' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: hdColors.accent }]}
            onPress={handlePickup}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="package-variant" size={20} color="white" />
            <Text style={styles.actionBtnText}>
              {isLoading ? t('common.loading') : t('carrier.missionDetail.pickedUpAction')}
            </Text>
          </TouchableOpacity>
        )}

        {mission.status === 'PICKED_UP' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: hdColors.neonGreen }]}
            onPress={handleDeliver}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="check-all" size={20} color="white" />
            <Text style={styles.actionBtnText}>
              {isLoading ? t('common.loading') : t('carrier.missionDetail.deliveredAction')}
            </Text>
          </TouchableOpacity>
        )}

        {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>{t('carrier.missionDetail.cancelMission')}</Text>
          </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.surfaceSecondary,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },

  // HERO
  heroCard: {
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: hdColors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  heroPattern: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  heroIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: { flex: 1 },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
  },
  heroStatus: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
  },

  // CODE
  codeCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: hdColors.textTertiary,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 38,
    fontWeight: '800',
    color: hdColors.accent,
    letterSpacing: 10,
  },
  codeDivider: {
    height: 1,
    backgroundColor: hdColors.border,
    width: '80%',
    marginVertical: 12,
  },
  codeHint: {
    fontSize: 13,
    color: hdColors.textSecondary,
    fontWeight: '500',
  },
  codeBordereau: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  codeBordereauText: {
    alignItems: 'flex-start',
  },
  codeBordereauTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  codeBordereauSub: {
    fontSize: 12,
    color: hdColors.textTertiary,
    marginTop: 3,
    lineHeight: 17,
  },

  // NOTE
  noteCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: hdColors.logoOrange,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: hdColors.logoOrange,
  },
  noteText: {
    fontSize: 14,
    color: hdColors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // SECTIONS
  section: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: hdColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // ITINÉRAIRE
  routeCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  routeInfo: { flex: 1 },
  routeStepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: hdColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.text,
  },
  routeCity: {
    fontSize: 13,
    color: hdColors.textTertiary,
    marginTop: 2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    marginVertical: 10,
    gap: 4,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: hdColors.border,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: hdColors.accent50,
    borderRadius: borderRadius.md,
    padding: 10,
    marginTop: 10,
    marginLeft: 26,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: hdColors.accent,
    lineHeight: 18,
  },

  // COLIS
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCell: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  infoCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: hdColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: hdColors.text,
  },

  // VENDEUR
  vendorCard: {
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  vendorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorInfo: { flex: 1 },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: hdColors.text,
  },
  vendorHint: {
    fontSize: 12,
    color: hdColors.textTertiary,
    marginTop: 2,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: hdColors.accent50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: hdColors.accent,
  },

  // GAINS
  earningsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: hdColors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  earningsHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  earningsAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },

  // ACTIONS
  actionsContainer: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: hdColors.danger,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.danger,
  },
});