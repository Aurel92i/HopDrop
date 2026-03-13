import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { Text, Switch, IconButton, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Parcel } from '../../types';
import { PICKUP_POINTS, PICKUP_POINT_CONFIG, PickupPoint, PickupPointType } from '../../data/pickupPoints';
import { useTranslation, languageLabels, Language } from '../../i18n/i18nContext';

type CarrierHomeScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'CarrierHome'>;
};

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.55;
const BOTTOM_SHEET_MIN_HEIGHT = 0;

const DEFAULT_VISIBLE_TYPES: PickupPointType[] = ['VINTED_LOCKER', 'MONDIAL_RELAY_LOCKER'];

export function CarrierHomeScreen({ navigation }: CarrierHomeScreenProps) {
  const { t, language, setLanguage } = useTranslation();
  const { currentMissions, fetchCurrentMissions } = useMissionStore();

  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableParcels, setAvailableParcels] = useState<Parcel[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Cagnotte
  const [earnings, setEarnings] = useState({ today: 0, week: 0, total: 0 });
  const [stripeConfigured, setStripeConfigured] = useState(true);

  // État pour le hint Stripe
  const [stripeHintShown, setStripeHintShown] = useState(false);

  const visibleTypes = useMemo(() => new Set(DEFAULT_VISIBLE_TYPES), []);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<PickupPointType | 'ALL' | 'LOCKERS'>('ALL');
  const [filteredSearchPoints, setFilteredSearchPoints] = useState<PickupPoint[]>(PICKUP_POINTS);
  const [searchSelectedPoints, setSearchSelectedPoints] = useState<PickupPoint[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7;
  });

  const bottomSheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [region, setRegion] = useState<Region>({
    latitude: 48.1113,
    longitude: -1.6800,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const SEARCH_FILTERS = useMemo(() => [
    { type: 'ALL' as const, label: t('carrier.home.all'), icon: 'map-marker-multiple', color: colors.primary },
    { type: 'LOCKERS' as const, label: t('carrier.home.lockers'), icon: 'locker', color: '#10B981' },
    { type: 'VINTED_LOCKER' as PickupPointType, label: 'Vinted Go', icon: 'locker', color: '#09B1BA' },
    { type: 'MONDIAL_RELAY_LOCKER' as PickupPointType, label: 'MR Locker', icon: 'locker-multiple', color: '#A4195C' },
    { type: 'AMAZON_LOCKER' as PickupPointType, label: 'Amazon', icon: 'locker', color: '#FF9900' },
    { type: 'INPOST_LOCKER' as PickupPointType, label: 'InPost', icon: 'locker', color: '#FFCC00' },
    { type: 'MONDIAL_RELAY' as PickupPointType, label: 'Mondial Relay', icon: 'store', color: '#A4195C' },
    { type: 'LA_POSTE' as PickupPointType, label: 'La Poste', icon: 'email', color: '#FFD000' },
    { type: 'CHRONOPOST' as PickupPointType, label: 'Chronopost', icon: 'package-variant-closed', color: '#0096DB' },
    { type: 'VINTED' as PickupPointType, label: 'Point Vinted', icon: 'hanger', color: '#09B1BA' },
  ], [t]);

  const SIZE_LABELS = useMemo((): Record<string, string> => ({
    XS: t('carrier.home.sizeXS'), S: t('carrier.home.sizeS'), SMALL: t('carrier.home.sizeS'),
    M: t('carrier.home.sizeM'), MEDIUM: t('carrier.home.sizeM'),
    L: t('carrier.home.sizeL'), LARGE: t('carrier.home.sizeL'),
    XL: t('carrier.home.sizeXL'), XLARGE: t('carrier.home.sizeXL'),
  }), [t]);

  const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA', pt: 'pt-PT' };
  const currentLocale = LOCALE_MAP[language] || 'fr-FR';

  const showLanguagePicker = () => setShowLanguageModal(true);

  const mapPoints = useMemo(() => {
    const defaultPoints = PICKUP_POINTS.filter(p => visibleTypes.has(p.type));
    const searchPointIds = new Set(searchSelectedPoints.map(p => p.id));
    return [
      ...defaultPoints.filter(p => !searchPointIds.has(p.id)),
      ...searchSelectedPoints,
    ];
  }, [visibleTypes, searchSelectedPoints]);

  useEffect(() => {
    if (isAvailable) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isAvailable]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (userLocation) {
        loadAvailableParcels(userLocation.latitude, userLocation.longitude);
      }
    }, [userLocation])
  );

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    const checkDayNight = () => {
      const hour = new Date().getHours();
      setIsDarkMode(hour >= 20 || hour < 7);
    };
    const interval = setInterval(checkDayNight, 60000);
    return () => clearInterval(interval);
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="translate" size={24} onPress={showLanguagePicker} />
          <IconButton icon="account-circle" size={24} onPress={() => navigation.navigate('CarrierProfile')} />
          <IconButton icon="history" size={24} onPress={() => navigation.navigate('CarrierHistory')} />
        </View>
      ),
    });
  }, [navigation, language]);

  const openBottomSheet = () => {
    Animated.parallel([
      Animated.spring(bottomSheetAnim, { toValue: BOTTOM_SHEET_MAX_HEIGHT, useNativeDriver: false, friction: 8 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const closeBottomSheet = () => {
    Animated.parallel([
      Animated.spring(bottomSheetAnim, { toValue: BOTTOM_SHEET_MIN_HEIGHT, useNativeDriver: false, friction: 8 }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setSelectedParcel(null));
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('carrier.home.locationDenied'), t('carrier.home.locationDeniedDesc'));
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      loadAvailableParcels(latitude, longitude);
    } catch (error) {
      console.error('Erreur localisation:', error);
    }
  };

  const loadData = async () => {
    await fetchCurrentMissions();
    try {
      const profile = await api.getCarrierProfile();
      setIsAvailable(profile.isAvailable ?? false);

      const balance = await api.getCarrierBalance();
      setEarnings({
        today: balance.today || 0,
        week: balance.week || 0,
        total: balance.total || 0,
      });

      const connectStatus = await api.getConnectStatus();
      setStripeConfigured(connectStatus.hasAccount && connectStatus.status === 'ACTIVE');
    } catch (e) {
      console.log('Erreur chargement profil/balance/stripe:', e);
    }
    setIsLoading(false);
  };

  const loadAvailableParcels = async (latitude: number, longitude: number) => {
    try {
      const { missions } = await api.getAvailableMissions(latitude, longitude, 10);
      setAvailableParcels(missions || []);
    } catch (e) {
      console.error('Erreur chargement missions:', e);
    }
  };

  const toggleAvailability = async () => {
    try {
      const newValue = !isAvailable;
      await api.updateAvailability(newValue);
      setIsAvailable(newValue);
    } catch (e) {
      console.error('Erreur toggle availability:', e);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    }
  };

  const handleMarkerPress = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    openBottomSheet();
    if (mapRef.current && parcel.pickupAddress) {
      mapRef.current.animateToRegion({
        latitude: parcel.pickupAddress.latitude,
        longitude: parcel.pickupAddress.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    }
  };

  const handleAcceptMission = async () => {
    if (!selectedParcel) return;
    setIsAccepting(true);
    try {
      await api.acceptMission(selectedParcel.id);
      closeBottomSheet();
      Alert.alert(
        `\u2705 ${t('carrier.home.missionAcceptedTitle')}`,
        t('carrier.home.missionAcceptedMessage').replace('{vendorName}', selectedParcel.vendor?.firstName || t('carrier.home.vendorLabel')),
        [
          { text: t('carrier.home.viewMission'), onPress: () => { fetchCurrentMissions(); navigation.navigate('ActiveMissions'); } },
          { text: t('common.ok') }
        ]
      );
      if (userLocation) await loadAvailableParcels(userLocation.latitude, userLocation.longitude);
      await fetchCurrentMissions();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('carrier.availableMissions.acceptError'));
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return t('carrier.missionDetail.today');
    if (date.toDateString() === tomorrow.toDateString()) return t('carrier.missionDetail.tomorrow');
    return date.toLocaleDateString(currentLocale, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applySearchFilters(query, searchFilter);
  };

  const handleSearchFilterChange = (filter: PickupPointType | 'ALL' | 'LOCKERS') => {
    setSearchFilter(filter);
    applySearchFilters(searchQuery, filter);
  };

  const applySearchFilters = (query: string, filter: PickupPointType | 'ALL' | 'LOCKERS') => {
    let results = PICKUP_POINTS;
    if (filter === 'LOCKERS') results = results.filter(p => p.isLocker === true);
    else if (filter !== 'ALL') results = results.filter(p => p.type === filter);
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.city.toLowerCase().includes(lowerQuery) ||
        p.address.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredSearchPoints(results);
  };

  const handleSelectSearchPoint = (point: PickupPoint) => {
    setSearchSelectedPoints(prev => prev.find(p => p.id === point.id) ? prev : [...prev, point]);
    setShowSearchModal(false);
    mapRef.current?.animateToRegion({
      latitude: point.latitude,
      longitude: point.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 500);
    Alert.alert(
      point.name,
      `\ud83d\udccd ${point.address}\n\ud83c\udfd9\ufe0f ${point.city}\n${point.openingHours ? `\ud83d\udd50 ${point.openingHours}` : ''}`,
      [
        { text: t('common.ok'), style: 'cancel' },
        { text: t('carrier.home.goThere'), onPress: () => {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`);
        }},
      ]
    );
  };

  const clearSearchPoints = () => setSearchSelectedPoints([]);

  // Gestion du petit indicateur Stripe
  const handleStripeTap = () => {
    if (stripeHintShown) {
      navigation.navigate('CarrierDocuments'); // ← change ici si tu as un lien direct Stripe
    } else {
      setStripeHintShown(true);
      Alert.alert(
        'Configurer Stripe',
        'Pour recevoir vos paiements, vous devez compléter votre compte Stripe Connect.\n\nCela prend seulement quelques minutes.',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Configurer maintenant',
            onPress: () => navigation.navigate('CarrierDocuments'),
          },
        ]
      );
    }
  };

  if (isLoading) return <LoadingScreen message={t('common.loading')} />;

  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
  ];

  return (
    <View style={styles.container}>
      {/* CARTE */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
        customMapStyle={isDarkMode ? darkMapStyle : undefined}
        onPress={() => selectedParcel && closeBottomSheet()}
AIzaSyDPGWjWiTpS52Td4gIWedEPOXqoWqQVwpA
        APIKey=""
      >
        {availableParcels.map((parcel: any) => (
          parcel.pickupAddress && (
            <Marker
              key={parcel.id}
              coordinate={{ latitude: parcel.pickupAddress.latitude, longitude: parcel.pickupAddress.longitude }}
              onPress={() => handleMarkerPress(parcel)}
            >
              <View style={[styles.parcelMarker, selectedParcel?.id === parcel.id && styles.parcelMarkerSelected]}>
                <MaterialCommunityIcons name="package-variant" size={20} color="white" />
              </View>
            </Marker>
          )
        ))}

        {mapPoints.map((point) => {
          const config = PICKUP_POINT_CONFIG[point.type];
          if (!config) return null;
          const isFromSearch = searchSelectedPoints.some(p => p.id === point.id);
          return (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              onPress={() => handleSelectSearchPoint(point)}
            >
              <View style={[styles.poiMarker, { backgroundColor: config.color }, isFromSearch && styles.poiMarkerHighlight]}>
                <MaterialCommunityIcons name={config.icon as any} size={14} color="white" />
              </View>
            </Marker>
          );
        })}

        {currentMissions.map((mission) => (
          mission.parcel?.pickupAddress && (
            <Marker
              key={`mission-${mission.id}`}
              coordinate={{ latitude: mission.parcel.pickupAddress.latitude, longitude: mission.parcel.pickupAddress.longitude }}
              onPress={() => navigation.navigate('MissionDetail', { missionId: mission.id })}
            >
              <View style={styles.missionMarker}>
                <MaterialCommunityIcons name="bike" size={16} color="white" />
              </View>
            </Marker>
          )
        ))}
      </MapView>

      {/* ===== HEADER CARDS ===== */}
      <View style={styles.headerContainer}>
        {/* Card En ligne */}
        <View style={styles.onlineCard}>
          <View style={styles.onlineLeft}>
            <Animated.View style={[
              styles.onlineDot,
              isAvailable && styles.onlineDotActive,
              isAvailable && { transform: [{ scale: pulseAnim }] }
            ]} />
            <View>
              <Text style={styles.onlineTitle}>{isAvailable ? t('carrier.home.online') : t('carrier.home.offline')}</Text>
              <Text style={styles.onlineSubtitle}>
                {isAvailable ? t('carrier.home.receivingMissions') : t('carrier.home.activateToReceive')}
              </Text>
            </View>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            color="#10B981"
            style={styles.onlineSwitch}
          />
        </View>

        {/* Conteneur pour aligner pill + indicateur Stripe à droite */}
        <View style={styles.balanceRow}>
          {/* Pill cagnotte (solde + œil) */}
          <View style={styles.earningsPill}>
            <TouchableOpacity
              style={styles.earningsPillLeft}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TransactionHistory')}
            >
              <Text style={styles.earningsPillAmount}>
                {showEarnings ? `${earnings.total.toFixed(2)} €` : '••••'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEarnings(!showEarnings)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.earningsPillEye}
            >
              <MaterialCommunityIcons
                name={showEarnings ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={showEarnings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
              />
            </TouchableOpacity>
          </View>

          {/* Indicateur Stripe aligné à droite du cadre pill (pas dedans) */}
          {!stripeConfigured && (
            <TouchableOpacity
              style={styles.stripeSideIndicator}
              onPress={handleStripeTap}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="information-outline" size={20} color="#f59e0b" />
              <Text style={styles.stripeSideText}>Stripe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Indicateur points recherchés */}
      {searchSelectedPoints.length > 0 && (
        <TouchableOpacity style={styles.searchIndicator} onPress={clearSearchPoints}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color="#10B981" />
          <Text style={styles.searchIndicatorText}>
            {searchSelectedPoints.length > 1
              ? t('carrier.home.pointsDisplayed').replace('{count}', String(searchSelectedPoints.length))
              : t('carrier.home.pointDisplayed').replace('{count}', String(searchSelectedPoints.length))}
          </Text>
          <MaterialCommunityIcons name="close-circle" size={16} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Modal langue */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableOpacity style={styles.langModalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('shared.settings.selectLanguage')}</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.langModalOption}
                onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
              >
                <Text style={[styles.langModalOptionText, lang === language && { color: colors.primary, fontWeight: '700' }]}>
                  {languageLabels[lang]}{lang === language ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Barre du bas */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity
            style={styles.barItem}
            onPress={() => navigation.navigate('AvailableMissions')}
            activeOpacity={0.7}
          >
            <View style={[styles.barIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              {availableParcels.length > 0 && (
                <View style={styles.barBadge}>
                  <Text style={styles.barBadgeText}>{availableParcels.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.barItemLabel} numberOfLines={1}>{t('carrier.home.availableLabel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.barItem}
            onPress={() => currentMissions.length > 0 && navigation.navigate('ActiveMissions')}
            activeOpacity={0.7}
          >
            <View style={[styles.barIconCircle, { backgroundColor: currentMissions.length > 0 ? '#D1FAE5' : '#F3F4F6' }]}>
              <MaterialCommunityIcons name="bike" size={20} color={currentMissions.length > 0 ? '#10B981' : '#9CA3AF'} />
              {currentMissions.length > 0 && (
                <View style={[styles.barBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.barBadgeText}>{currentMissions.length}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.barItemLabel, currentMissions.length === 0 && { color: '#9CA3AF' }]} numberOfLines={1}>{t('carrier.home.inProgress')}</Text>
          </TouchableOpacity>

          <View style={styles.barDivider} />

          <TouchableOpacity
            style={styles.barItem}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.barIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
            </View>
            <Text style={styles.barItemLabel} numberOfLines={1}>{t('carrier.home.searchLabel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.barItem}
            onPress={centerOnUser}
            activeOpacity={0.7}
          >
            <View style={[styles.barIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
            </View>
            <Text style={styles.barItemLabel} numberOfLines={1}>Position</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal recherche */}
      <Modal visible={showSearchModal} animationType="slide" transparent onRequestClose={() => setShowSearchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle}><View style={styles.modalHandleBar} /></View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('carrier.home.findRelayPoint')}</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('carrier.home.searchPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.searchFilters} contentContainerStyle={styles.searchFiltersContent}>
              {SEARCH_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.type}
                  style={[styles.searchFilterChip, searchFilter === filter.type && { backgroundColor: filter.color }]}
                  onPress={() => handleSearchFilterChange(filter.type)}
                >
                  <MaterialCommunityIcons name={filter.icon as any} size={16} color={searchFilter === filter.type ? 'white' : filter.color} />
                  <Text style={[styles.searchFilterText, searchFilter === filter.type && { color: 'white' }]}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.resultsCount}>
              {filteredSearchPoints.length !== 1
                ? t('carrier.home.resultCountPlural').replace('{count}', String(filteredSearchPoints.length))
                : t('carrier.home.resultCount').replace('{count}', String(filteredSearchPoints.length))}
            </Text>

            <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
              {filteredSearchPoints.map((point) => {
                const config = PICKUP_POINT_CONFIG[point.type];
                return (
                  <TouchableOpacity key={point.id} style={styles.resultItem} onPress={() => handleSelectSearchPoint(point)} activeOpacity={0.7}>
                    <View style={[styles.resultIcon, { backgroundColor: config.color }]}>
                      <MaterialCommunityIcons name={config.icon as any} size={20} color="white" />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>{point.name}</Text>
                      <Text style={styles.resultAddress} numberOfLines={1}>{point.address}</Text>
                      <View style={styles.resultMeta}>
                        <Text style={styles.resultCity}>{point.city}</Text>
                        {point.isLocker && (
                          <View style={styles.badge24}>
                            <MaterialCommunityIcons name="clock-outline" size={10} color="#10B981" />
                            <Text style={styles.badge24Text}>24/7</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.resultArrow}>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Backdrop */}
      {selectedParcel && (
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }]} pointerEvents="auto">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeBottomSheet} />
        </Animated.View>
      )}

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: bottomSheetAnim }]}>
        {selectedParcel && (
          <>
            <View style={styles.sheetHandle}><View style={styles.handleBar} /></View>
            <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetBadge}>
                  <MaterialCommunityIcons name="package-variant" size={22} color="white" />
                </View>
                <View style={styles.sheetHeaderText}>
                  <Text style={styles.sheetTitle}>{t('carrier.home.availableParcel')}</Text>
                  <Text style={styles.sheetSubtitle}>{SIZE_LABELS[selectedParcel.size] || selectedParcel.size} {'\u2022'} {selectedParcel.description || t('carrier.home.noDescription')}</Text>
                </View>
                <TouchableOpacity onPress={closeBottomSheet} style={styles.sheetClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={[styles.slotBanner, selectedParcel.pickupMode === 'IMMEDIATE' ? styles.slotImmediate : styles.slotScheduled]}>
                <MaterialCommunityIcons name={selectedParcel.pickupMode === 'IMMEDIATE' ? 'lightning-bolt' : 'clock-outline'} size={26} color="white" />
                <View style={styles.slotContent}>
                  {selectedParcel.pickupMode === 'IMMEDIATE' ? (
                    <><Text style={styles.slotTitle}>{t('carrier.missionDetail.immediatePickup')}</Text><Text style={styles.slotSubtitle}>{t('carrier.missionDetail.vendorWaiting')}</Text></>
                  ) : (
                    <><Text style={styles.slotTitle}>{formatDate(selectedParcel.pickupSlotStart)}</Text><Text style={styles.slotSubtitle}>{formatTime(selectedParcel.pickupSlotStart)} - {formatTime(selectedParcel.pickupSlotEnd)}</Text></>
                  )}
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#DBEAFE' }]}><MaterialCommunityIcons name="account" size={22} color={colors.primary} /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>{t('carrier.home.vendorLabel')}</Text><Text style={styles.infoValue}>{selectedParcel.vendor?.firstName || t('carrier.home.vendorLabel')} {selectedParcel.vendor?.lastName?.charAt(0) || ''}.</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#D1FAE5' }]}><MaterialCommunityIcons name="map-marker" size={22} color="#10B981" /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>{t('carrier.home.pickupLabel')}</Text><Text style={styles.infoValue}>{selectedParcel.pickupAddress?.street}</Text><Text style={styles.infoValueSub}>{selectedParcel.pickupAddress?.postalCode} {selectedParcel.pickupAddress?.city}</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#FEF3C7' }]}><MaterialCommunityIcons name="store" size={22} color="#F59E0B" /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>{t('carrier.home.dropoffLabel')}</Text><Text style={styles.infoValue}>{selectedParcel.dropoffName}</Text>{selectedParcel.dropoffAddress && <Text style={styles.infoValueSub}>{selectedParcel.dropoffAddress}</Text>}</View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.priceBox}>
                <View>
                  <Text style={styles.priceLabel}>{t('carrier.home.yourEarnings')}</Text>
                  <Text style={styles.priceHint}>{'\ud83d\udca1'} {t('carrier.home.paidAfterDelivery')}</Text>
                </View>
                <Text style={styles.priceValue}>{typeof selectedParcel.price === 'object' ? (selectedParcel.price as any)?.total?.toFixed(2) : Number(selectedParcel.price).toFixed(2)}€</Text>
              </View>

              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptMission} disabled={isAccepting} activeOpacity={0.8}>
                <View style={styles.acceptBtnGradient}>
                  {isAccepting ? (
                    <Text style={styles.acceptBtnText}>{t('common.loading')}</Text>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={22} color="white" />
                      <Text style={styles.acceptBtnText}>{t('carrier.missions.accept')}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  map: { width, height },

  headerContainer: { position: 'absolute', top: 12, left: 16, right: 16, gap: 12 },

  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  onlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB' },
  onlineDotActive: { backgroundColor: '#10B981' },
  onlineTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  onlineSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  onlineSwitch: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] },

  // NOUVEAU : conteneur qui aligne pill + Stripe à droite
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  earningsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  earningsPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsPillAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  earningsPillEye: {
    padding: 10,
    marginLeft: 8,
  },

  // Indicateur Stripe aligné à droite du pill (en dehors du cadre)
  stripeSideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    marginLeft: 12, // espace par rapport au pill
  },
  stripeSideText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
  },

  searchIndicator: {
    position: 'absolute',
    top: 200,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  searchIndicatorText: { fontSize: 13, fontWeight: '500', color: '#10B981' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  barItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  barIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  barBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  barBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
  },
  barItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  barDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  parcelMarker: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'white',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  parcelMarkerSelected: { backgroundColor: '#10B981', transform: [{ scale: 1.15 }] },
  poiMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  poiMarkerHighlight: { borderColor: '#10B981', borderWidth: 3, transform: [{ scale: 1.25 }] },
  missionMarker: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'white',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: height * 0.85,
    paddingTop: 8,
  },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  modalHandleBar: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  modalClose: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 52,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
  searchFilters: { marginTop: 16, maxHeight: 48 },
  searchFiltersContent: { paddingHorizontal: 24, gap: 8 },
  searchFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  searchFilterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  resultsCount: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  resultsList: { flex: 1, paddingHorizontal: 24 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, marginLeft: 14 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  resultAddress: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  resultCity: { fontSize: 12, color: '#9CA3AF' },
  badge24: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  badge24Text: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  resultArrow: { padding: 4 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 24 },
    }),
    overflow: 'hidden',
  },
  sheetHandle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  sheetContent: { flex: 1, paddingHorizontal: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  sheetBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  sheetHeaderText: { flex: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  sheetSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  sheetClose: { padding: 4 },
  slotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginVertical: 12,
    gap: 14,
  },
  slotScheduled: { backgroundColor: colors.primary },
  slotImmediate: { backgroundColor: '#F59E0B' },
  slotContent: { flex: 1 },
  slotTitle: { fontSize: 16, fontWeight: '700', color: 'white' },
  slotSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  divider: { marginVertical: 14, backgroundColor: '#F3F4F6', height: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  infoIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 3 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  infoValueSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 18,
    borderRadius: 16,
    marginBottom: 18,
  },
  priceLabel: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  priceHint: { fontSize: 12, color: '#10B981', marginTop: 3 },
  priceValue: { fontSize: 32, fontWeight: '800', color: '#065F46' },
  acceptBtn: { borderRadius: 16, overflow: 'hidden' },
  acceptBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 16,
  },
  acceptBtnText: { fontSize: 17, fontWeight: '700', color: 'white' },

  langModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  langModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '80%', maxWidth: 320 },
  langModalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  langModalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  langModalOptionText: { fontSize: 16, color: '#374151', textAlign: 'center' },
});