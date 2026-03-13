import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Chip, Divider, Avatar, Portal, Modal, TextInput, ProgressBar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { PackagingStatusBadge } from '../../components/common/PackagingStatusBadge';
import { DeliveryDeadlineBadge } from '../../components/common/DeliveryDeadlineBadge';
import { useParcelStore } from '../../stores/parcelStore';
import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing, sizes } from '../../theme';
import { ParcelStatus } from '../../types';
import { useTranslation } from '../../i18n/i18nContext';

type ParcelDetailScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'ParcelDetail'>;
  route: RouteProp<VendorStackParamList, 'ParcelDetail'>;
};

const { width: screenWidth } = Dimensions.get('window');

// Types pour le statut de livraison
interface DeliveryStatus {
  status: 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'CONTESTED' | 'AUTO_CONFIRMED';
  deliveredAt: string | null;
  proofUrl: string | null;
  confirmationDeadline: string | null;
  hoursRemaining: number | null;
  clientConfirmedAt: string | null;
  contestedAt: string | null;
  contestReason: string | null;
  autoConfirmed: boolean;
}

export function ParcelDetailScreen({ navigation, route }: ParcelDetailScreenProps) {
  const { parcelId } = route.params;
  const { currentParcel, isLoading, fetchParcel, cancelParcel } = useParcelStore();
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Statuts de base du colis (moved inside component for translation)
  const statusConfig = useMemo<Record<ParcelStatus, { label: string; color: string; icon: string }>>(() => ({
    PENDING: { label: t('vendor.parcelDetail.waitingCarrier'), color: colors.tertiary, icon: 'clock-outline' },
    ACCEPTED: { label: t('vendor.parcelDetail.carrierFound'), color: colors.primary, icon: 'check-circle-outline' },
    PACKAGING_CONFIRMED: { label: t('vendor.parcelDetail.packagingValidated'), color: '#3B82F6', icon: 'package-check' },
    PICKED_UP: { label: t('vendor.parcelDetail.parcelPickedUp'), color: colors.secondary, icon: 'package-variant' },
    DELIVERED: { label: t('vendor.parcelDetail.deliveredSuccess'), color: '#10B981', icon: 'check-all' },
    CANCELLED: { label: t('status.CANCELLED'), color: colors.error, icon: 'close-circle-outline' },
    EXPIRED: { label: t('status.EXPIRED'), color: colors.onSurfaceVariant, icon: 'timer-off-outline' },
  }), [t]);

  // État pour le statut de livraison
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  // Modal de confirmation dépôt
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showContestForm, setShowContestForm] = useState(false);
  const [contestReason, setContestReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // États pour la note et le commentaire (optionnels)
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  // Modal de confirmation emballage
  const [showPackagingModal, setShowPackagingModal] = useState(false);

  // États pour le pourboire
  const [hasTip, setHasTip] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isSendingTip, setIsSendingTip] = useState(false);

  // Charger le colis
  useEffect(() => {
    fetchParcel(parcelId);
  }, [parcelId]);

  // Charger le statut de livraison quand le colis est PICKED_UP ou DELIVERED
  // ET rafraîchir régulièrement pour détecter le dépôt
  useFocusEffect(
    useCallback(() => {
      if (currentParcel && (currentParcel.status === 'PICKED_UP' || currentParcel.status === 'DELIVERED')) {
        console.log('🔍 Écran focus - Status colis:', currentParcel.status);
        fetchDeliveryStatus();

        // Vérifier si un pourboire existe déjà
        if (currentParcel.status === 'DELIVERED') {
          checkTipStatus();
        }

        // Rafraîchir toutes les 5 secondes pour détecter rapidement le dépôt
        const interval = setInterval(() => {
          console.log('🔄 Rafraîchissement auto du statut de livraison');
          fetchDeliveryStatus();
        }, 5000);

        return () => clearInterval(interval);
      }
    }, [currentParcel?.status, parcelId])
  );

  // Vérifier si le colis a déjà un pourboire
  const checkTipStatus = async () => {
    try {
      const tip = await api.getTipByParcel(parcelId);
      setHasTip(!!tip);
    } catch {
      setHasTip(false);
    }
  };

  const fetchDeliveryStatus = async () => {
    try {
      setIsLoadingDelivery(true);
      const status = await api.getDeliveryStatus(parcelId);
      console.log('📦 Statut de livraison reçu:', status);
      setDeliveryStatus(status);

      // N'ouvrir le modal automatiquement que si pas déjà ouvert
      if (status.status === 'AWAITING_CONFIRMATION' && !showConfirmModal) {
        console.log('🔔 Ouverture automatique du modal de confirmation');
        setShowConfirmModal(true);
      }
    } catch (error: any) {
      console.log('❌ Erreur récupération statut de livraison:', error?.message || error);
      console.log('❌ Détails erreur:', JSON.stringify(error?.response?.data || error, null, 2));
      console.log('❌ Status code:', error?.response?.status);
      // Pas de statut de livraison encore
      setDeliveryStatus(null);
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  // Confirmer la livraison
  const handleConfirmDelivery = async () => {
    setIsActionLoading(true);
    try {
      // Envoyer rating et comment s'ils sont fournis
      const ratingToSend = rating > 0 ? rating : undefined;
      const commentToSend = comment.trim() || undefined;

      await api.clientConfirmDelivery(parcelId, ratingToSend, commentToSend);

      Alert.alert(
        t('vendor.parcelDetail.deliveryConfirmedTitle'),
        t('vendor.parcelDetail.deliveryConfirmedMessage'),
        [{ text: t('common.ok') }]
      );

      // Réinitialiser les états
      setShowConfirmModal(false);
      setRating(0);
      setComment('');
      fetchParcel(parcelId);
      fetchDeliveryStatus();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('vendor.parcelDetail.confirmDeliveryError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Contester la livraison
  const handleContestDelivery = async () => {
    if (!contestReason.trim()) {
      Alert.alert(t('common.error'), t('vendor.parcelDetail.contestReasonRequired'));
      return;
    }

    setIsActionLoading(true);
    try {
      await api.clientContestDelivery(parcelId, contestReason.trim());

      Alert.alert(
        t('vendor.parcelDetail.contestRegisteredTitle'),
        t('vendor.parcelDetail.contestRegisteredMessage'),
        [{ text: t('common.ok') }]
      );

      setShowConfirmModal(false);
      setShowContestForm(false);
      setContestReason('');
      fetchDeliveryStatus();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('vendor.parcelDetail.contestError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirmer l'emballage (vendeur)
  const handleConfirmPackaging = async () => {
    setIsActionLoading(true);
    try {
      await api.vendorConfirmPackaging(parcelId);

      Alert.alert(
        t('vendor.parcelDetail.packagingConfirmedTitle'),
        t('vendor.parcelDetail.packagingConfirmedMessage'),
        [{ text: t('common.ok') }]
      );

      setShowPackagingModal(false);
      fetchParcel(parcelId);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('vendor.parcelDetail.packagingConfirmError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Refuser l'emballage (vendeur)
  const handleRejectPackaging = () => {
    Alert.prompt(
      t('vendor.parcelDetail.rejectPackagingTitle'),
      t('vendor.parcelDetail.rejectPackagingPrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vendor.parcelDetail.rejectPackagingBtn'),
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert(t('common.error'), t('vendor.parcelDetail.rejectPackagingReasonRequired'));
              return;
            }

            setIsActionLoading(true);
            try {
              await api.vendorRejectPackaging(parcelId, reason.trim());

              Alert.alert(
                t('vendor.parcelDetail.packagingRejectedTitle'),
                t('vendor.parcelDetail.packagingRejectedMessage'),
                [{ text: t('common.ok') }]
              );

              setShowPackagingModal(false);
              fetchParcel(parcelId);
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('vendor.parcelDetail.packagingRejectError'));
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleCancel = () => {
    Alert.alert(
      t('vendor.parcelDetail.confirmCancelTitle'),
      t('vendor.parcelDetail.confirmCancelMessage'),
      [
        { text: t('vendor.parcelDetail.cancelNo'), style: 'cancel' },
        {
          text: t('vendor.parcelDetail.cancelYes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelParcel(parcelId);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('common.error'), t('vendor.parcelDetail.cancelError'));
            }
          },
        },
      ]
    );
  };

  // Envoyer un pourboire via Stripe Payment Sheet
  const handleSendTip = async () => {
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), t('vendor.parcelDetail.tipInvalidAmount'));
      return;
    }

    if (amount > 50) {
      Alert.alert(t('common.error'), t('vendor.parcelDetail.tipMaxExceeded'));
      return;
    }

    setIsSendingTip(true);
    try {
      // 1. Creer le tip + PaymentIntent backend
      const { clientSecret, tip } = await api.createTip(parcelId, amount, tipMessage || undefined);

      // 2. Initialiser le Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'HopDrop',
        style: 'automatic',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Presenter le Payment Sheet
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === 'Canceled') {
          return; // User canceled
        }
        throw new Error(payError.message);
      }

      // 4. Confirmer et transferer au livreur
      try {
        await api.confirmTip(tip.id);
      } catch (e) {
        console.log('Tip confirm fallback:', e);
      }

      const carrierName = tip.carrier?.firstName || currentParcel?.assignedCarrier?.firstName || t('vendor.parcelDetail.carrier');

      Alert.alert(
        t('vendor.parcelDetail.tipSentTitle'),
        t('vendor.parcelDetail.tipSentMessage')
          .replace('{amount}', amount.toFixed(2))
          .replace('{carrierName}', carrierName),
        [{ text: t('common.ok') }]
      );

      setShowTipModal(false);
      setTipAmount('');
      setTipMessage('');
      setHasTip(true);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('vendor.parcelDetail.tipSendError'));
    } finally {
      setIsSendingTip(false);
    }
  };

  if (isLoading || !currentParcel) {
    return <LoadingScreen message={t('vendor.parcelDetail.loadingParcel')} />;
  }

  // Déterminer le statut affiché
  const getDisplayStatus = () => {
    // BUG 4: Si le livreur est arrivé (mission.arrivedAt set, mais pas encore PICKED_UP)
    if ((currentParcel as any).mission?.arrivedAt &&
        currentParcel.status !== 'PICKED_UP' &&
        currentParcel.status !== 'DELIVERED' &&
        currentParcel.status !== 'CANCELLED') {
      return {
        label: t('vendor.parcelDetail.driverArrived'),
        color: '#FF9800',
        icon: 'map-marker-check',
        hint: t('vendor.parcelDetail.driverArrivedHint'),
      };
    }

    // Si on a un statut de livraison
    if (deliveryStatus) {
      if (deliveryStatus.status === 'AWAITING_CONFIRMATION') {
        return {
          label: t('vendor.parcelDetail.validationInProgress'),
          color: '#8B5CF6', // Violet
          icon: 'clock-check-outline',
          hint: t('vendor.parcelDetail.parcelDeposited'),
        };
      }
      if (deliveryStatus.status === 'CONTESTED') {
        return {
          label: t('vendor.parcelDetail.deliveryContested'),
          color: colors.error,
          icon: 'alert-circle',
          hint: t('vendor.parcelDetail.contestedHint'),
        };
      }
      if (deliveryStatus.status === 'CONFIRMED' || deliveryStatus.status === 'AUTO_CONFIRMED') {
        return {
          ...statusConfig['DELIVERED'],
          hint: deliveryStatus.autoConfirmed ? t('vendor.parcelDetail.autoConfirmed') : t('vendor.parcelDetail.confirmedByYou'),
        };
      }
    }

    // Statut par défaut
    const baseStatus = statusConfig[currentParcel.status];
    return {
      ...baseStatus,
      hint: currentParcel.status === 'PENDING'
        ? t('vendor.parcelDetail.pendingHint')
        : undefined,
    };
  };

  const displayStatus = getDisplayStatus();
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

  // Rendu du modal de confirmation
  const renderConfirmationModal = () => {
    if (!deliveryStatus || deliveryStatus.status !== 'AWAITING_CONFIRMATION') return null;

    const progress = deliveryStatus.hoursRemaining !== null ? deliveryStatus.hoursRemaining / 12 : 1;
    const hoursRemaining = deliveryStatus.hoursRemaining || 0;

    return (
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <MaterialCommunityIcons name="package-variant-closed-check" size={32} color="#10B981" />
            </View>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('vendor.parcelDetail.parcelDepositedModal')}
            </Text>
            <Text variant="bodyMedium" style={styles.modalDropoff}>
              {currentParcel.dropoffName}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <View style={styles.timerHeader}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.tertiary} />
              <Text variant="bodyMedium" style={styles.timerText}>
                {t('vendor.parcelDetail.timeRemainingToConfirm')}
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={hoursRemaining > 12 ? '#10B981' : hoursRemaining > 6 ? colors.tertiary : colors.error}
              style={styles.progressBar}
            />
            <Text variant="titleMedium" style={[
              styles.hoursText,
              { color: hoursRemaining > 12 ? '#10B981' : hoursRemaining > 6 ? colors.tertiary : colors.error }
            ]}>
              {t('vendor.parcelDetail.hoursRemaining').replace('{hours}', String(hoursRemaining))}
            </Text>
            <Text variant="bodySmall" style={styles.autoConfirmText}>
              {t('vendor.parcelDetail.autoConfirmNotice')}
            </Text>
          </View>

          {/* Photo preuve */}
          <View style={styles.proofSection}>
            <Text variant="labelMedium" style={styles.proofLabel}>
              {t('vendor.parcelDetail.deliveryProofLabel')}
            </Text>
            {deliveryStatus.proofUrl ? (
              <Image
                source={{ uri: deliveryStatus.proofUrl }}
                style={styles.proofImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.proofPlaceholder}>
                <MaterialCommunityIcons name="image-off" size={48} color={colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.proofPlaceholderText}>
                  {t('vendor.parcelDetail.photoNotAvailable')}
                </Text>
              </View>
            )}
          </View>

          {/* Section notation (optionnelle) */}
          {!showContestForm && (
            <View style={styles.ratingSection}>
              <Text variant="titleSmall" style={styles.ratingTitle}>
                {t('vendor.parcelDetail.rateCarrierOptional')}
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <MaterialCommunityIcons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? '#FFC107' : colors.onSurfaceVariant}
                      style={styles.starIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <TextInput
                  mode="outlined"
                  placeholder={t('vendor.parcelDetail.addCommentOptional')}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={2}
                  style={styles.commentInput}
                />
              )}
            </View>
          )}

          {/* Formulaire de contestation */}
          {showContestForm ? (
            <View style={styles.contestForm}>
              <Text variant="titleSmall" style={styles.contestTitle}>
                {t('vendor.parcelDetail.contestQuestion')}
              </Text>
              <TextInput
                mode="outlined"
                placeholder={t('vendor.parcelDetail.contestPlaceholder')}
                value={contestReason}
                onChangeText={setContestReason}
                multiline
                numberOfLines={3}
                style={styles.contestInput}
              />
              <View style={styles.contestButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowContestForm(false);
                    setContestReason('');
                  }}
                  style={styles.contestButton}
                  disabled={isActionLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleContestDelivery}
                  style={styles.contestButton}
                  buttonColor={colors.error}
                  disabled={!contestReason.trim() || isActionLoading}
                  loading={isActionLoading}
                >
                  {t('vendor.parcelDetail.contestBtn')}
                </Button>
              </View>
            </View>
          ) : (
            /* Boutons d'action */
            <View style={styles.modalActions}>
              <Button
                mode="contained"
                onPress={handleConfirmDelivery}
                style={styles.confirmButton}
                icon="check-circle"
                loading={isActionLoading}
                disabled={isActionLoading}
                buttonColor="#10B981"
              >
                {t('vendor.parcelDetail.confirmReception')}
              </Button>

              <Button
                mode="outlined"
                onPress={() => setShowContestForm(true)}
                style={styles.contestOutlineButton}
                icon="alert-circle"
                textColor={colors.error}
                disabled={isActionLoading}
              >
                {t('vendor.parcelDetail.contestDelivery')}
              </Button>
            </View>
          )}

          {/* Note */}
          <View style={styles.modalNote}>
            <MaterialCommunityIcons name="shield-check" size={16} color={colors.secondary} />
            <Text variant="bodySmall" style={styles.modalNoteText}>
              {t('vendor.parcelDetail.confirmNote')}
            </Text>
          </View>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Card */}
      <Card style={[styles.statusCard, { borderLeftColor: displayStatus.color }]}>
        <Card.Content style={styles.statusContent}>
          <MaterialCommunityIcons name={displayStatus.icon as any} size={32} color={displayStatus.color} />
          <View style={styles.statusTextContainer}>
            <Text variant="titleMedium" style={{ color: displayStatus.color }}>
              {displayStatus.label}
            </Text>
            {displayStatus.hint && (
              <Text variant="bodySmall" style={styles.statusHint}>
                {displayStatus.hint}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* DÉLAI DE 24H POUR CONFIRMER LE DÉPÔT */}
      {deliveryStatus?.status === 'AWAITING_CONFIRMATION' && deliveryStatus.confirmationDeadline && (
        <Card style={styles.confirmationCard}>
          <Card.Content>
            <DeliveryDeadlineBadge
              confirmationDeadline={new Date(deliveryStatus.confirmationDeadline)}
              userType="vendor"
            />
            <Button
              mode="contained"
              onPress={() => setShowConfirmModal(true)}
              style={styles.openModalButton}
              buttonColor="#8B5CF6"
              icon="eye-check"
            >
              {t('vendor.parcelDetail.viewAndConfirm')}
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Pickup Code */}
      {currentParcel.status === 'ACCEPTED' && (
        <Card style={styles.codeCard}>
          <Card.Content style={styles.codeContent}>
            <Text variant="bodyMedium" style={styles.codeLabel}>
              {t('vendor.parcelDetail.verificationCode')}
            </Text>
            <Text variant="displaySmall" style={styles.code}>
              {currentParcel.pickupCode}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* PASTILLE DE CONFIRMATION D'EMBALLAGE */}
      {currentParcel.status === 'ACCEPTED' && (currentParcel.packagingConfirmedAt || currentParcel.vendorPackagingConfirmedAt) && (
        <Card style={styles.packagingStatusCard}>
          <Card.Content>
            <PackagingStatusBadge
              carrierConfirmed={!!currentParcel.packagingConfirmedAt}
              vendorConfirmed={!!currentParcel.vendorPackagingConfirmedAt}
            />

            {/* Bouton de validation si le livreur a confirmé mais pas le vendeur */}
            {currentParcel.packagingConfirmedAt && !currentParcel.vendorPackagingConfirmedAt && (
              <Button
                mode="contained"
                onPress={() => setShowPackagingModal(true)}
                style={styles.validatePackagingButton}
                icon="eye-check"
                buttonColor={colors.primary}
              >
                {t('vendor.parcelDetail.validatePackaging')}
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Info dépôt si déposé */}
      {deliveryStatus?.status === 'AWAITING_CONFIRMATION' && deliveryStatus.deliveredAt && (
        <Card style={styles.depositInfoCard}>
          <Card.Content>
            <View style={styles.depositHeader}>
              <MaterialCommunityIcons name="store-check" size={20} color="#8B5CF6" />
              <Text variant="titleSmall" style={styles.depositTitle}>
                {t('vendor.parcelDetail.depositedOn').replace('{date}', formatDate(deliveryStatus.deliveredAt))}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.depositText}>
              {t('vendor.parcelDetail.depositNotice')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Parcel Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('vendor.parcelDetail.parcelInfoTitle')}
          </Text>

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              {t('vendor.parcelDetail.sizeLabel')}
            </Text>
            <Chip icon="package-variant">{sizeInfo.label}</Chip>
          </View>

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              {t('vendor.parcelDetail.priceLabel')}
            </Text>
            <Text variant="titleMedium" style={styles.price}>
              {Number(currentParcel.price).toFixed(2)} €
            </Text>
          </View>

          {currentParcel.description && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                {t('vendor.parcelDetail.descriptionLabel')}
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
            {t('vendor.parcelDetail.addressesTitle')}
          </Text>

          <View style={styles.addressBlock}>
            <MaterialCommunityIcons name="home" size={20} color={colors.primary} />
            <View style={styles.addressInfo}>
              <Text variant="labelMedium" style={styles.addressLabel}>
                {t('vendor.parcelDetail.pickupLabel')}
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
                {t('vendor.parcelDetail.dropoffLabel')}
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
            {t('vendor.parcelDetail.pickupSlotTitle')}
          </Text>
          <Text variant="bodyMedium">{formatDate(currentParcel.pickupSlotStart)}</Text>
          <Text variant="bodySmall" style={styles.slotEnd}>
            {t('vendor.parcelDetail.until')}{' '}
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
              {t('vendor.parcelDetail.carrierTitle')}
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
              {t('vendor.parcelDetail.yourReviewTitle')}
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
              {t('vendor.parcelDetail.reviewLeftOn').replace('{date}', new Date(currentParcel.reviews[0].createdAt).toLocaleDateString('fr-FR'))}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Tracking Button - Afficher pour ACCEPTED et PICKED_UP */}
      {(currentParcel.status === 'ACCEPTED' || currentParcel.status === 'PICKED_UP') &&
       currentParcel.assignedCarrier &&
       !deliveryStatus?.status?.includes('CONFIRM') && (
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
          {t('vendor.parcelDetail.trackCarrier')}
        </Button>
      )}

      {/* Chat Button */}
      {(currentParcel.status === 'ACCEPTED' || currentParcel.status === 'PICKED_UP') &&
       currentParcel.assignedCarrier && (
        <Button
          mode="outlined"
          icon="chat"
          onPress={() => navigation.navigate('Chat', { parcelId: currentParcel.id })}
          style={styles.chatButton}
        >
          {t('vendor.parcelDetail.contactCarrier')}
        </Button>
      )}

      {/* Review Button */}
      {(currentParcel.status === 'DELIVERED' || deliveryStatus?.status === 'CONFIRMED' || deliveryStatus?.status === 'AUTO_CONFIRMED') && (
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
          {t('vendor.parcelDetail.leaveReview')}
        </Button>
      )}

      {/* Tip Button - Pourboire */}
      {(currentParcel.status === 'DELIVERED' || deliveryStatus?.status === 'CONFIRMED' || deliveryStatus?.status === 'AUTO_CONFIRMED') && !hasTip && (
        <Button
          mode="contained"
          icon="cash"
          onPress={() => setShowTipModal(true)}
          style={styles.tipButton}
          buttonColor="#10B981"
        >
          {t('vendor.parcelDetail.leaveTip')}
        </Button>
      )}

      {/* Affichage si pourboire déjà donné */}
      {hasTip && (
        <Card style={styles.tipGivenCard}>
          <Card.Content style={styles.tipGivenContent}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
            <Text variant="bodyMedium" style={styles.tipGivenText}>
              {t('vendor.parcelDetail.tipSentBadge')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      {currentParcel.status === 'PENDING' && (
        <Button
          mode="outlined"
          onPress={handleCancel}
          style={styles.cancelButton}
          textColor={colors.error}
        >
          {t('vendor.parcelDetail.cancelParcel')}
        </Button>
      )}

      {/* Modal de confirmation dépôt */}
      {renderConfirmationModal()}

      {/* Modal de confirmation emballage */}
      <Portal>
        <Modal
          visible={showPackagingModal}
          onDismiss={() => setShowPackagingModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.packagingModalHeader}>
            <MaterialCommunityIcons name="package-variant-closed" size={32} color={colors.primary} />
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('vendor.parcelDetail.packagingValidationTitle')}
            </Text>
            <Text variant="bodySmall" style={styles.modalSubtitle}>
              {t('vendor.parcelDetail.packagingValidationSubtitle')}
            </Text>
          </View>

          {/* Photo de l'emballage */}
          {currentParcel.packagingPhotoUrl && (
            <View style={styles.packagingPhotoSection}>
              <Image
                source={{ uri: currentParcel.packagingPhotoUrl }}
                style={styles.packagingPhoto}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.packagingModalActions}>
            <Button
              mode="contained"
              onPress={handleConfirmPackaging}
              style={styles.confirmPackagingButton}
              icon="check-circle"
              loading={isActionLoading}
              disabled={isActionLoading}
              buttonColor="#10B981"
            >
              {t('vendor.parcelDetail.validatePackaging')}
            </Button>

            <Button
              mode="outlined"
              onPress={handleRejectPackaging}
              style={styles.rejectPackagingButton}
              icon="close-circle"
              textColor={colors.error}
              disabled={isActionLoading}
            >
              {t('vendor.parcelDetail.rejectPackaging')}
            </Button>
          </View>

          {/* Info */}
          <View style={styles.packagingInfoBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
            <Text variant="bodySmall" style={styles.packagingInfoText}>
              {t('vendor.parcelDetail.packagingInfoText')}
            </Text>
          </View>
        </Modal>
      </Portal>

      {/* Modal de pourboire */}
      <Portal>
        <Modal
          visible={showTipModal}
          onDismiss={() => setShowTipModal(false)}
          contentContainerStyle={styles.tipModalContainer}
        >
          <View style={styles.tipModalContent}>
            <View style={styles.tipModalHeader}>
              <View style={styles.tipModalIconContainer}>
                <MaterialCommunityIcons name="hand-coin" size={32} color="#10B981" />
              </View>
              <Text variant="headlineSmall" style={styles.tipModalTitle}>
                {t('vendor.parcelDetail.tipModalTitle')}
              </Text>
              <Text variant="bodySmall" style={styles.tipModalSubtitle}>
                {t('vendor.parcelDetail.tipModalSubtitle')}
              </Text>
            </View>

            {currentParcel.assignedCarrier && (
              <View style={styles.tipCarrierInfo}>
                <MaterialCommunityIcons name="account" size={20} color={colors.secondary} />
                <Text variant="bodyMedium">
                  {t('vendor.parcelDetail.tipCarrierLabel').replace('{name}', `${currentParcel.assignedCarrier.firstName} ${currentParcel.assignedCarrier.lastName}`)}
                </Text>
              </View>
            )}

            <View style={styles.tipParcelInfo}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              <Text variant="bodyMedium">
                {t('vendor.parcelDetail.tipDeliveryTo').replace('{dropoff}', currentParcel.dropoffName)}
              </Text>
            </View>

            <TextInput
              label={t('vendor.parcelDetail.tipAmountLabel')}
              value={tipAmount}
              onChangeText={setTipAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.tipInput}
              placeholder={t('vendor.parcelDetail.tipAmountPlaceholder')}
              left={<TextInput.Icon icon="cash" />}
            />

            <Text variant="bodySmall" style={styles.tipHelpText}>
              {t('vendor.parcelDetail.tipMaxAmount')}
            </Text>

            <TextInput
              label={t('vendor.parcelDetail.tipMessageLabel')}
              value={tipMessage}
              onChangeText={setTipMessage}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.tipInput}
              placeholder={t('vendor.parcelDetail.tipMessagePlaceholder')}
              left={<TextInput.Icon icon="message-text" />}
            />

            <View style={styles.tipModalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowTipModal(false)}
                style={styles.tipModalButton}
                disabled={isSendingTip}
              >
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSendTip}
                style={styles.tipModalButton}
                buttonColor="#10B981"
                loading={isSendingTip}
                disabled={isSendingTip || !tipAmount}
              >
                {t('common.send')}
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
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
  statusHint: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  // Card de confirmation
  confirmationCard: {
    marginBottom: spacing.md,
  },
  openModalButton: {
    marginTop: spacing.md,
  },
  // Dépôt info
  depositInfoCard: {
    marginBottom: spacing.md,
    backgroundColor: '#F3E8FF',
  },
  depositHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  depositTitle: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  depositText: {
    color: colors.onSurfaceVariant,
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
  // Modal de confirmation
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalDropoff: {
    color: '#8B5CF6',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  timerSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  timerText: {
    color: colors.onSurfaceVariant,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  hoursText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  autoConfirmText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 12,
  },
  proofSection: {
    margin: spacing.lg,
  },
  proofLabel: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  proofImage: {
    width: '100%',
    height: screenWidth * 0.5,
    borderRadius: 12,
  },
  proofPlaceholder: {
    width: '100%',
    height: screenWidth * 0.5,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proofPlaceholderText: {
    color: colors.onSurfaceVariant,
  },
  ratingSection: {
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
  },
  ratingTitle: {
    color: colors.onSurface,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  starIcon: {
    padding: spacing.xs,
  },
  commentInput: {
    marginTop: spacing.sm,
  },
  modalActions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmButton: {
    paddingVertical: spacing.xs,
  },
  contestOutlineButton: {
    borderColor: colors.error,
  },
  contestForm: {
    padding: spacing.lg,
  },
  contestTitle: {
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  contestInput: {
    marginBottom: spacing.md,
  },
  contestButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contestButton: {
    flex: 1,
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalNoteText: {
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  // ===== CARTE STATUT EMBALLAGE =====
  packagingStatusCard: {
    marginBottom: spacing.md,
  },
  validatePackagingButton: {
    marginTop: spacing.md,
  },
  // ===== MODAL EMBALLAGE =====
  packagingModalHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  packagingPhotoSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  packagingPhoto: {
    width: '100%',
    height: screenWidth * 0.6,
  },
  packagingModalActions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmPackagingButton: {
    paddingVertical: spacing.xs,
  },
  rejectPackagingButton: {
    borderColor: colors.error,
  },
  packagingInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  packagingInfoText: {
    flex: 1,
    color: colors.onSurfaceVariant,
  },
  // ===== STYLES POURBOIRE =====
  tipButton: {
    marginBottom: spacing.md,
  },
  tipGivenCard: {
    marginBottom: spacing.md,
    backgroundColor: '#D1FAE5',
  },
  tipGivenContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipGivenText: {
    flex: 1,
    color: '#065F46',
  },
  tipModalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 16,
    maxHeight: '85%',
  },
  tipModalContent: {
    padding: spacing.lg,
  },
  tipModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tipModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tipModalTitle: {
    color: colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tipModalSubtitle: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tipCarrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 8,
  },
  tipParcelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
  },
  tipInput: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  tipHelpText: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  tipModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tipModalButton: {
    flex: 1,
  },
});
