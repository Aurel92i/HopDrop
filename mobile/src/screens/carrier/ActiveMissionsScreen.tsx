import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Button, Chip, Divider, FAB, Portal, Modal, ActivityIndicator, IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { PackagingStatusBadge } from '../../components/common/PackagingStatusBadge';
import { DeliveryDeadlineBadge } from '../../components/common/DeliveryDeadlineBadge';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing, sizes, carriers } from '../../theme';
import { Mission, MissionStatus, Carrier } from '../../types';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';
import { locationService } from '../../services/location';

type ActiveMissionsScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'ActiveMissions'>;
};

const { width: screenWidth } = Dimensions.get('window');

export function ActiveMissionsScreen({ navigation }: ActiveMissionsScreenProps) {
  const { t, language } = useTranslation();
  const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA', pt: 'pt-BR' };

  const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string }> = {
    ACCEPTED: { label: t('carrier.activeMissions.toPickup'), color: colors.primary, icon: 'package-variant' },
    IN_PROGRESS: { label: t('carrier.activeMissions.enRoute'), color: '#F59E0B', icon: 'bike' },
    PICKED_UP: { label: t('carrier.activeMissions.validating'), color: '#8B5CF6', icon: 'clock-check-outline' },
    DELIVERED: { label: t('carrier.activeMissions.delivered'), color: '#10B981', icon: 'check-all' },
    CANCELLED: { label: t('carrier.activeMissions.cancelled'), color: colors.error, icon: 'close-circle' },
  };

  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Modal emballage
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [packagingPhoto, setPackagingPhoto] = useState<string | null>(null);
  const [rawPackagingPhoto, setRawPackagingPhoto] = useState<string | null>(null);

  // 🆕 Modal preuve de dépôt
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryProofPhoto, setDeliveryProofPhoto] = useState<string | null>(null);
  const [rawDeliveryPhoto, setRawDeliveryPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadMissions();

      // Auto-démarrer le tracking si une mission est en cours de trajet
      const autoStartTracking = async () => {
        const { missions: currentData } = await api.getCurrentMissions();
        const hasActiveJourney = currentData.some(
          (m: Mission) => m.status === 'IN_PROGRESS' || (m.status === 'PICKED_UP' && !m.deliveredAt)
        );
        if (hasActiveJourney && !locationService.isTrackingActive()) {
          console.log('🔄 Auto-restart tracking GPS');
          await locationService.startForegroundTracking((loc) => {
            console.log('📍 Position mise à jour:', loc.coords.latitude.toFixed(4), loc.coords.longitude.toFixed(4));
          }, 10000);
        }
      };
      autoStartTracking().catch(console.error);

      // Cleanup : arrêter le tracking quand on quitte l'écran
      return () => {
        // Ne pas arrêter ici si une mission est toujours en cours
        // Le tracking s'arrêtera au dépôt du colis
      };
    }, [])
  );

  const loadMissions = async () => {
    try {
      const { missions: data } = await api.getCurrentMissions();
      setMissions(data);
      if (data.length === 1) {
        setSelectedMission(data[0]);
      }
    } catch (e) {
      console.error('Erreur chargement missions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir Google Maps pour la navigation
  const openGoogleMaps = (latitude: number, longitude: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=bicycling`;
    Linking.openURL(url);
  };

  // Clic sur "Je pars"
  const handleDepart = async (mission: Mission) => {
    setIsActionLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      await api.missionDepart(mission.id, latitude, longitude);
      
      Alert.alert(
        t('carrier.activeMissions.departTitle'),
        t('carrier.activeMissions.departMessage'),
        [{ text: t('common.ok') }]
      );

      await loadMissions();
    // Démarrer le tracking GPS continu
      await locationService.startForegroundTracking((loc) => {
        console.log('📍 Position livreur:', loc.coords.latitude.toFixed(4), loc.coords.longitude.toFixed(4));
      }, 10000);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('carrier.activeMissions.departError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Clic sur "Je suis arrivé"
  const handleArrived = async (mission: Mission) => {
    setIsActionLoading(true);
    try {
      await api.missionArrived(mission.id);
      
      Alert.alert(
        t('carrier.activeMissions.arrivedTitle'),
        t('carrier.activeMissions.arrivedMessage'),
        [{ text: t('common.ok') }]
      );

      await loadMissions();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('carrier.activeMissions.arrivedError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Prendre la photo d'emballage
  const takePackagingPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('carrier.activeMissions.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setRawPackagingPhoto(result.assets[0].uri);
    }
  };

  // Confirmer l'emballage
  const handleConfirmPackaging = async () => {
    if (!selectedMission || !packagingPhoto) return;

    setIsActionLoading(true);
    try {
      await api.confirmPackaging(selectedMission.id, packagingPhoto);

      setShowPackagingModal(false);
      setPackagingPhoto(null);

      Alert.alert(
        t('carrier.activeMissions.packagingConfirmedTitle'),
        t('carrier.activeMissions.packagingConfirmedMessage'),
        [{ text: t('common.ok') }]
      );

      await loadMissions();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('carrier.activeMissions.packagingError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // 🆕 Prendre la photo de preuve de dépôt
  const takeDeliveryProofPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('carrier.activeMissions.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setRawDeliveryPhoto(result.assets[0].uri);
    }
  };

  // 🆕 Confirmer le dépôt avec preuve
  const handleConfirmDelivery = async () => {
    if (!selectedMission || !deliveryProofPhoto) return;

    setIsActionLoading(true);
    try {
      await api.confirmDelivery(selectedMission.id, deliveryProofPhoto);
      
      setShowDeliveryModal(false);
      setDeliveryProofPhoto(null);

      Alert.alert(
        t('carrier.activeMissions.depositConfirmedTitle'),
        t('carrier.activeMissions.depositConfirmedMessage'),
        [{ text: t('carrier.activeMissions.depositConfirmedBtn') }]
      );

      await loadMissions();
      // Arrêter le tracking GPS — le colis est déposé
      await locationService.stopTracking();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('carrier.activeMissions.depositError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Annuler la mission
  const handleCancel = (mission: Mission) => {
    Alert.alert(
      t('carrier.activeMissions.cancelTitle'),
      t('carrier.activeMissions.cancelMessage'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('carrier.activeMissions.cancelYes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelMission(mission.id, t('carrier.activeMissions.cancelReason'));
              await loadMissions();
              await locationService.stopTracking();
              if (missions.length <= 1) {
                navigation.goBack();
              }
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  // Marquer comme récupéré
  const handlePickup = async (mission: Mission) => {
    Alert.alert(
      t('carrier.activeMissions.pickupTitle'),
      t('carrier.activeMissions.pickupMessage'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await api.pickupMission(mission.id);

              Alert.alert(
                t('carrier.activeMissions.pickupSuccessTitle'),
                t('carrier.activeMissions.pickupSuccessMessage').replace('{name}', mission.parcel?.dropoffName || t('carrier.activeMissions.pickupDefaultDest')),
                [{ text: t('carrier.activeMissions.pickupSuccessBtn') }]
              );

              await loadMissions();  
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatETA = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    
    if (diffMins === 0) return 'Arrivée imminente';
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}min`;
  };

  // 🕐 Formatage du jour de récupération
  const formatPickupDay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    } else {
      return date.toLocaleDateString(localeMap[language] || 'fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
    }
  };

  // 🕐 Formatage de l'heure
  const formatPickupTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(localeMap[language] || 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).replace(':', 'h');
  };

  if (isLoading) {
    return <LoadingScreen message={t('carrier.activeMissions.loadingMissions')} />;
  }

  if (missions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="package-variant" size={64} color={colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={styles.emptyText}>
          {t('carrier.activeMissions.noActiveMissions')}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          {t('carrier.activeMissions.backToMap')}
        </Button>
      </View>
    );
  }

  const renderMissionCard = (mission: Mission) => {
    const status = statusConfig[mission.status];
    const isSelected = selectedMission?.id === mission.id;
    const parcel = mission.parcel;
    const hasDeparted = !!mission.departedAt;
    const hasArrived = !!mission.arrivedAt;
    const packagingConfirmed = !!parcel?.packagingConfirmedAt;
    const vendorConfirmed = !!parcel?.vendorPackagingConfirmedAt;
    // Statut dynamique selon l'état du dépôt
    const isDeposited = mission.status === 'PICKED_UP' && !!mission.deliveredAt;
    const isContested = !!(mission as any).clientContestedAt;
    
    let displayStatus = status;
    if (isDeposited && isContested) {
      displayStatus = { label: 'Contesté — Litige ouvert', color: '#EF4444', icon: 'alert-circle' };
    } else if (isDeposited) {
      displayStatus = { label: 'Déposé — Confirmation client requise', color: '#8B5CF6', icon: 'store-check' };
    } else if (mission.status === 'PICKED_UP' && !mission.deliveredAt) {
      displayStatus = { label: 'Récupéré — En route vers le dépôt', color: colors.secondary, icon: 'package-variant-closed' };
    }
    
    // Infos transporteur
    const carrierInfo = parcel?.carrier ? carriers[parcel.carrier as Carrier] : null;
    const sizeInfo = parcel?.size ? sizes.parcel[parcel.size as keyof typeof sizes.parcel] : null;

    return (
      <Card
        key={mission.id}
        style={[styles.missionCard, { borderLeftColor: status.color }]}
        onPress={() => setSelectedMission(mission)}
      >
        <Card.Content>
          {/* Header avec statut et ETA */}
          <View style={styles.missionHeader}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name={displayStatus.icon as any} size={20} color={displayStatus.color} />
              <Text style={[styles.statusText, { color: displayStatus.color }]}>{displayStatus.label}</Text>
            </View>
            
            {mission.status === 'IN_PROGRESS' && mission.estimatedArrival && (
              <Chip icon="clock" compact style={styles.etaChip}>
                ETA: {formatETA(mission.estimatedArrival)}
              </Chip>
            )}
            
            {hasArrived && mission.status !== 'PICKED_UP' && (
              <Chip icon="map-marker-check" compact style={[styles.etaChip, { backgroundColor: '#D1FAE5' }]} textStyle={{ color: '#10B981' }}>
                Arrivé
              </Chip>
            )}
          </View>

          {/* 🕐 CRÉNEAU DE RÉCUPÉRATION - ÉLÉMENT CENTRAL */}
          {parcel && mission.status !== 'PICKED_UP' && (
            <View style={[
              styles.slotBanner,
              parcel.pickupMode === 'IMMEDIATE' ? styles.slotBannerImmediate : styles.slotBannerScheduled
            ]}>
              <MaterialCommunityIcons 
                name={parcel.pickupMode === 'IMMEDIATE' ? 'lightning-bolt' : 'clock-outline'} 
                size={24} 
                color="white" 
              />
              <View style={styles.slotBannerContent}>
                {parcel.pickupMode === 'IMMEDIATE' ? (
                  <>
                    <Text style={styles.slotBannerTitle}>Récupération immédiate</Text>
                    <Text style={styles.slotBannerSubtitle}>Le vendeur vous attend maintenant</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.slotBannerTitle}>
                      {formatPickupDay(parcel.pickupSlotStart)}, {formatPickupTime(parcel.pickupSlotStart)} - {formatPickupTime(parcel.pickupSlotEnd)}
                    </Text>
                    <Text style={styles.slotBannerSubtitle}>Créneau de récupération</Text>
                  </>
                )}
              </View>
            </View>
          )}

          {parcel && (
            <>
              {/* ===== TRANSPORTEUR + TAILLE ===== */}
              <View style={styles.mainInfoRow}>
                {/* Transporteur */}
                <View style={styles.carrierBadge}>
                  <MaterialCommunityIcons 
                    name={carrierInfo?.icon as any || 'package-variant'} 
                    size={22} 
                    color={colors.primary} 
                  />
                  <Text variant="titleMedium" style={styles.carrierName}>
                    {carrierInfo?.label || 'Point relais'}
                  </Text>
                </View>
                
                {/* Taille - CLAIREMENT VISIBLE */}
                <Chip 
                  icon="package-variant" 
                  style={styles.sizeChip}
                  textStyle={styles.sizeChipText}
                >
                  {sizeInfo?.label || parcel.size}
                </Chip>
              </View>

              {/* Catégorie si définie */}
              {parcel.itemCategory && (
                <Text variant="bodySmall" style={styles.categoryText}>
                  {parcel.itemCategory}
                </Text>
              )}

              {/* 🆕 DESTINATION POUR PICKED_UP */}
              {mission.status === 'PICKED_UP' && (
                <View style={styles.destinationBox}>
                  <MaterialCommunityIcons name="store" size={20} color={colors.secondary} />
                  <View style={styles.destinationContent}>
                    <Text variant="labelSmall" style={styles.destinationLabel}>
                      Déposer à : {parcel.dropoffType === 'RELAY_POINT' ? 'Point relais' : parcel.dropoffType === 'POST_OFFICE' ? 'Bureau de poste' : 'Autre'}
                    </Text>
                    <Text variant="titleMedium" style={styles.destinationName}>
                      {parcel.dropoffName}
                    </Text>
                    <Text variant="bodySmall" style={styles.destinationAddress}>
                      {parcel.dropoffAddress}
                    </Text>
                  </View>
                </View>
              )}

              {/* Point de dépôt (seulement si pas PICKED_UP) */}
              {mission.status !== 'PICKED_UP' && (
                <View style={styles.dropoffRow}>
                  <MaterialCommunityIcons name="store" size={16} color={colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.dropoffText}>
                    Déposer à : {parcel.dropoffName}
                  </Text>
                </View>
              )}

              <Divider style={styles.divider} />

              {/* ===== ADRESSE DE RÉCUPÉRATION (masquée si PICKED_UP) ===== */}
              {mission.status !== 'PICKED_UP' && parcel.pickupAddress && (
                <View style={styles.addressSection}>
                  <View style={styles.addressHeader}>
                    <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary} />
                    <Text variant="labelMedium" style={styles.addressLabel}>Récupération</Text>
                  </View>
                  
                  <View style={styles.addressContent}>
                    <View style={styles.addressTextContainer}>
                      <Text variant="bodyMedium" style={styles.addressStreet}>
                        {parcel.pickupAddress.street}
                      </Text>
                      <Text variant="bodySmall" style={styles.addressCity}>
                        {parcel.pickupAddress.postalCode} {parcel.pickupAddress.city}
                      </Text>
                    </View>
                    
                    <Button
                      mode="contained-tonal"
                      compact
                      icon="navigation"
                      onPress={() => openGoogleMaps(
                        parcel.pickupAddress!.latitude,
                        parcel.pickupAddress!.longitude,
                        parcel.pickupAddress!.street
                      )}
                      style={styles.navButton}
                    >
                      Y aller
                    </Button>
                  </View>
                </View>
              )}

              {/* ===== INFORMATIONS COMPLÉMENTAIRES ===== */}
              {parcel.pickupInstructions && mission.status !== 'PICKED_UP' && (
                <View style={styles.instructionsBox}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
                  <View style={styles.instructionsContent}>
                    <Text variant="labelSmall" style={styles.instructionsLabel}>
                      Informations complémentaires
                    </Text>
                    <Text variant="bodyMedium" style={styles.instructionsText}>
                      {parcel.pickupInstructions}
                    </Text>
                  </View>
                </View>
              )}

              {/* ===== VENDEUR ===== */}
              {parcel.vendor && (
                <View style={styles.vendorSection}>
                  <MaterialCommunityIcons name="account" size={18} color={colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.vendorName}>
                    {parcel.vendor.firstName}
                  </Text>
                </View>
              )}

              {/* ===== NOTE POUR LE LIVREUR ===== */}
              {parcel.description && (
                <View style={styles.noteBox}>
                  <MaterialCommunityIcons name="note-text-outline" size={18} color={colors.secondary} />
                  <View style={styles.noteContent}>
                    <Text variant="labelSmall" style={styles.noteLabel}>
                      Note du vendeur
                    </Text>
                    <Text variant="bodyMedium" style={styles.noteText}>
                      {parcel.description}
                    </Text>
                  </View>
                </View>
              )}

              {/* ===== CODE DE VÉRIFICATION ===== */}
              {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && parcel.pickupCode && (
                <View style={styles.codeSection}>
                  <Text variant="bodySmall" style={styles.codeLabel}>Code de vérification</Text>
                  <Text variant="headlineMedium" style={styles.codeValue}>
                    {parcel.pickupCode}
                  </Text>
                </View>
              )}

              {/* Info bordereau */}
              <View style={styles.labelInfo}>
                <MaterialCommunityIcons 
                  name={parcel.hasShippingLabel ? 'check-circle' : 'printer'} 
                  size={16} 
                  color={parcel.hasShippingLabel ? '#10B981' : colors.secondary} 
                />
                <Text variant="bodySmall" style={styles.labelInfoText}>
                  {parcel.hasShippingLabel 
                    ? 'Bordereau déjà imprimé par le vendeur' 
                    : 'Bordereau à imprimer'}
                </Text>
              </View>

              {/* 🆕 PASTILLE STATUT EMBALLAGE */}
              {(packagingConfirmed || vendorConfirmed) && mission.status !== 'PICKED_UP' && (
                <View style={styles.packagingStatusContainer}>
                  <PackagingStatusBadge
                    carrierConfirmed={packagingConfirmed}
                    vendorConfirmed={vendorConfirmed}
                    compact
                  />
                </View>
              )}
            </>
          )}

          {/* 🆕 DÉLAI DE 24H POUR DÉPOSER LE COLIS */}
          {mission.status === 'PICKED_UP' && mission.pickedUpAt && !mission.deliveredAt && (
            <>
              <Divider style={styles.divider} />
              <DeliveryDeadlineBadge
                pickupDeadline={new Date(new Date(mission.pickedUpAt).getTime() + 24 * 60 * 60 * 1000)}
                userType="carrier"
              />
            </>
          )}

          {/* MESSAGE DÉPOSÉ / CONTESTÉ */}
          {mission.status === 'PICKED_UP' && mission.deliveredAt && (
            <>
              <Divider style={styles.divider} />
              {isContested ? (
                <View style={[styles.validationPendingCard, { backgroundColor: '#FEE2E2', borderLeftColor: '#EF4444' }]}>
                  <View style={styles.validationHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                    <Text variant="titleSmall" style={[styles.validationTitle, { color: '#EF4444' }]}>
                      Litige ouvert — Contestation client
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.validationText}>
                    Le client a contesté le dépôt. Motif : {(mission as any).contestReason || 'Non précisé'}
                  </Text>
                  <Text variant="bodySmall" style={styles.validationText}>
                    Vous pouvez répondre à la contestation via le chat ou attendre la décision d'un administrateur.
                    Votre paiement est suspendu jusqu'à résolution.
                  </Text>
                </View>
              ) : (
                <View style={styles.validationPendingCard}>
                  <View style={styles.validationHeader}>
                    <MaterialCommunityIcons name="clock-check-outline" size={24} color="#8B5CF6" />
                    <Text variant="titleSmall" style={styles.validationTitle}>
                      Déposé — En attente de confirmation
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.validationText}>
                    Le colis a été déposé avec succès. Le client doit confirmer la réception pour déclencher votre paiement.
                    Si aucune action sous 12 heures, la livraison sera validée automatiquement.
                  </Text>
                  <View style={styles.validationInfoBox}>
                    <MaterialCommunityIcons name="information-outline" size={16} color="#8B5CF6" />
                    <Text variant="bodySmall" style={styles.validationInfoText}>
                      Vous serez notifié de la confirmation ou d'une éventuelle contestation.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          <Divider style={styles.divider} />

          {/* ===== ACTIONS ===== */}
          <View style={styles.actionsContainer}>
            {/* Bouton Je pars */}
            {mission.status === 'ACCEPTED' && !hasDeparted && (
              <Button
                mode="contained"
                icon="bike"
                onPress={() => handleDepart(mission)}
                loading={isActionLoading}
                style={styles.actionButton}
                buttonColor="#F59E0B"
              >
                Je pars
              </Button>
            )}

            {/* Bouton Je suis arrivé */}
            {(mission.status === 'IN_PROGRESS' || hasDeparted) && !hasArrived && (
              <Button
                mode="contained"
                icon="map-marker-check"
                onPress={() => handleArrived(mission)}
                loading={isActionLoading}
                style={styles.actionButton}
                buttonColor={colors.secondary}
              >
                Je suis arrivé
              </Button>
            )}

            {/* Bouton Confirmation emballage */}
            {hasArrived && !packagingConfirmed && mission.status !== 'PICKED_UP' && (
              <Button
                mode="contained"
                icon="camera"
                onPress={() => {
                  setSelectedMission(mission);
                  setShowPackagingModal(true);
                }}
                style={styles.actionButton}
              >
                Confirmer l'emballage
              </Button>
            )}

            {/* Bouton Colis récupéré */}
            {packagingConfirmed && vendorConfirmed && mission.status !== 'PICKED_UP' && (
              <Button
                mode="contained"
                icon="package-variant-closed"
                onPress={() => handlePickup(mission)}
                loading={isActionLoading}
                style={styles.actionButton}
                buttonColor="#10B981"
              >
                Colis récupéré
              </Button>
            )}

            {/* 🆕 Bouton Colis déposé (seulement si pas encore déposé) */}
            {mission.status === 'PICKED_UP' && !mission.deliveredAt && (
              <Button
                mode="contained"
                icon="check-all"
                onPress={() => {
                  setSelectedMission(mission);
                  setShowDeliveryModal(true);
                }}
                style={styles.actionButton}
                buttonColor={colors.secondary}
              >
                Colis déposé
              </Button>
            )}

            {/* Boutons secondaires */}
            <View style={styles.secondaryActions}>
              <Button
                mode="outlined"
                icon="chat"
                onPress={() => navigation.navigate('Chat', { parcelId: mission.parcelId })}
                compact
                style={styles.secondaryButton}
              >
                Chat
              </Button>

              {(mission.status === 'ACCEPTED' || mission.status === 'IN_PROGRESS') && (
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={() => handleCancel(mission)}
                  compact
                  style={[styles.secondaryButton, styles.cancelButton]}
                  textColor={colors.error}
                >
                  Annuler
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Modal confirmation emballage
  const renderPackagingModal = () => (
    <Portal>
      <Modal
        visible={showPackagingModal && !rawPackagingPhoto}
        onDismiss={() => {
          setShowPackagingModal(false);
          setPackagingPhoto(null);
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          📦 Confirmation d'emballage
        </Text>
        <Text variant="bodySmall" style={styles.modalSubtitle}>
          Prenez une photo du colis emballé pour validation par le client
        </Text>

        {!packagingPhoto ? (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="camera-plus" size={48} color={colors.onSurfaceVariant} />
            <Button mode="contained" icon="camera" onPress={takePackagingPhoto} style={styles.photoButton}>
              Prendre la photo
            </Button>
          </View>
        ) : (
          <View>
            <Image source={{ uri: packagingPhoto }} style={styles.photoPreview} />
            <Button mode="text" onPress={() => setPackagingPhoto(null)}>
              Reprendre la photo
            </Button>
          </View>
        )}

        <View style={styles.modalButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              setShowPackagingModal(false);
              setPackagingPhoto(null);
            }}
            style={styles.modalButton}
          >
            Annuler
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirmPackaging}
            disabled={!packagingPhoto}
            loading={isActionLoading}
            style={styles.modalButton}
          >
            Envoyer
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  // 🆕 Modal preuve de dépôt
  const renderDeliveryProofModal = () => (
    <Portal>
      <Modal
        visible={showDeliveryModal && !rawDeliveryPhoto}
        onDismiss={() => {
          setShowDeliveryModal(false);
          setDeliveryProofPhoto(null);
        }}
        contentContainerStyle={styles.modalContainer}
      >
        {/* Header */}
        <View style={styles.deliveryModalHeader}>
          <View style={styles.deliveryModalIcon}>
            <MaterialCommunityIcons name="package-variant-closed-check" size={32} color={colors.secondary} />
          </View>
          <Text variant="titleLarge" style={styles.modalTitle}>
            Confirmer le dépôt
          </Text>
          {selectedMission?.parcel?.dropoffName && (
            <Text variant="bodyMedium" style={styles.deliveryDropoffName}>
              📍 {selectedMission.parcel.dropoffName}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.modalSubtitle}>
            Prenez en photo le reçu ou ticket de dépôt fourni par le point relais
          </Text>
        </View>

        {/* Zone photo */}
        {!deliveryProofPhoto ? (
          <TouchableOpacity style={styles.deliveryPhotoPlaceholder} onPress={takeDeliveryProofPhoto}>
            <MaterialCommunityIcons name="receipt" size={48} color={colors.secondary} />
            <Text variant="bodyMedium" style={styles.photoPlaceholderText}>
              Appuyez pour prendre une photo
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.deliveryPhotoContainer}>
            <Image source={{ uri: deliveryProofPhoto }} style={styles.deliveryPhotoPreview} />
            <IconButton
              icon="close-circle"
              size={28}
              iconColor={colors.error}
              style={styles.removePhotoBtn}
              onPress={() => setDeliveryProofPhoto(null)}
            />
          </View>
        )}

        {/* Info importante */}
        <View style={styles.deliveryInfoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text variant="bodySmall" style={styles.deliveryInfoText}>
            Le client aura 12 heures pour confirmer la réception. Passé ce délai, la livraison sera automatiquement validée et votre paiement déclenché.
          </Text>
        </View>

        {/* Boutons */}
        <View style={styles.modalButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              setShowDeliveryModal(false);
              setDeliveryProofPhoto(null);
            }}
            style={styles.modalButton}
          >
            Annuler
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirmDelivery}
            disabled={!deliveryProofPhoto}
            loading={isActionLoading}
            style={styles.modalButton}
            buttonColor={colors.secondary}
            icon="check-circle"
          >
            Confirmer
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleMedium" style={styles.title}>
          {missions.length} mission{missions.length > 1 ? 's' : ''} en cours
        </Text>

        {missions.map(renderMissionCard)}
      </ScrollView>

      {renderPackagingModal()}
      {renderDeliveryProofModal()}

      <FAB
        icon="map"
        style={styles.fab}
        onPress={() => navigation.goBack()}
        label={t('carrier.activeMissions.map')}
      />

      <PhotoPreviewModal
        visible={!!rawPackagingPhoto}
        photoUri={rawPackagingPhoto}
        aspectRatio={[4, 3]}
        onValidate={(croppedUri) => {
          setRawPackagingPhoto(null);
          setPackagingPhoto(croppedUri);
        }}
        onRetake={() => setRawPackagingPhoto(null)}
      />

      <PhotoPreviewModal
        visible={!!rawDeliveryPhoto}
        photoUri={rawDeliveryPhoto}
        aspectRatio={[4, 3]}
        onValidate={(croppedUri) => {
          setRawDeliveryPhoto(null);
          setDeliveryProofPhoto(croppedUri);
        }}
        onRetake={() => setRawDeliveryPhoto(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  title: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  missionCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  // 🕐 STYLES CRÉNEAU DE RÉCUPÉRATION
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  slotBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  etaChip: {
    backgroundColor: colors.primaryContainer,
  },
  // ===== TRANSPORTEUR + TAILLE =====
  mainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carrierName: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  sizeChip: {
    backgroundColor: colors.secondaryContainer,
  },
  sizeChipText: {
    fontWeight: '600',
    color: colors.secondary,
  },
  categoryText: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  // 🆕 Destination pour PICKED_UP
  destinationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  destinationContent: {
    flex: 1,
  },
  destinationLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  destinationName: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  destinationAddress: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  dropoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dropoffText: {
    color: colors.onSurfaceVariant,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  // ===== ADRESSE =====
  addressSection: {
    marginBottom: spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  addressLabel: {
    color: colors.onSurfaceVariant,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: 8,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressStreet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  addressCity: {
    color: colors.onSurfaceVariant,
  },
  navButton: {
    marginLeft: spacing.sm,
  },
  // ===== INFORMATIONS COMPLÉMENTAIRES =====
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
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
    marginTop: 2,
  },
  // ===== VENDEUR =====
  vendorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  vendorName: {
    color: colors.onSurface,
  },
  // ===== NOTE DU VENDEUR =====
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  noteContent: {
    flex: 1,
  },
  noteLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  noteText: {
    color: colors.onSurface,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // ===== CODE =====
  codeSection: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  codeLabel: {
    color: colors.onSurfaceVariant,
  },
  codeValue: {
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  // ===== BORDEREAU =====
  labelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  labelInfoText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  // ===== EMBALLAGE =====
  packagingStatusContainer: {
    marginBottom: spacing.sm,
  },
  // 🆕 ===== VALIDATION EN COURS =====
  validationPendingCard: {
    backgroundColor: '#F3E8FF',
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  validationTitle: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  validationText: {
    color: colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  validationInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: spacing.sm,
    borderRadius: 8,
  },
  validationInfoText: {
    flex: 1,
    color: '#6D28D9',
    fontSize: 12,
  },
  // ===== ACTIONS =====
  actionsContainer: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  // ===== MODAL EMBALLAGE =====
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  photoButton: {
    marginTop: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  // 🆕 ===== MODAL DELIVERY PROOF =====
  deliveryModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deliveryModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deliveryDropoffName: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  deliveryPhotoPlaceholder: {
    height: 150,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  photoPlaceholderText: {
    color: colors.secondary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  deliveryPhotoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.md,
  },
  deliveryPhotoPreview: {
    width: '100%',
    height: screenWidth * 0.5,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.surface,
  },
  deliveryInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  deliveryInfoText: {
    flex: 1,
    color: colors.onSurface,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});