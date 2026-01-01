import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Alert, Animated, TouchableOpacity, ScrollView, TextInput, Modal, Platform } from 'react-native';
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

type CarrierHomeScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'CarrierHome'>;
};

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.55;
const BOTTOM_SHEET_MIN_HEIGHT = 0;

// Types affichés par défaut (MR + Vinted lockers uniquement)
const DEFAULT_VISIBLE_TYPES: PickupPointType[] = ['VINTED_LOCKER', 'MONDIAL_RELAY_LOCKER'];

// Filtres recherche
const SEARCH_FILTERS: { type: PickupPointType | 'ALL' | 'LOCKERS'; label: string; icon: string; color: string }[] = [
  { type: 'ALL', label: 'Tous', icon: 'map-marker-multiple', color: colors.primary },
  { type: 'LOCKERS', label: 'Lockers', icon: 'locker', color: '#10B981' },
  { type: 'VINTED_LOCKER', label: 'Vinted Go', icon: 'locker', color: '#09B1BA' },
  { type: 'MONDIAL_RELAY_LOCKER', label: 'MR Locker', icon: 'locker-multiple', color: '#A4195C' },
  { type: 'AMAZON_LOCKER', label: 'Amazon', icon: 'locker', color: '#FF9900' },
  { type: 'INPOST_LOCKER', label: 'InPost', icon: 'locker', color: '#FFCC00' },
  { type: 'MONDIAL_RELAY', label: 'Mondial Relay', icon: 'store', color: '#A4195C' },
  { type: 'LA_POSTE', label: 'La Poste', icon: 'email', color: '#FFD000' },
  { type: 'CHRONOPOST', label: 'Chronopost', icon: 'package-variant-closed', color: '#0096DB' },
  { type: 'VINTED', label: 'Point Vinted', icon: 'hanger', color: '#09B1BA' },
];

const SIZE_LABELS: Record<string, string> = {
  XS: 'Très petit', S: 'Petit', SMALL: 'Petit', M: 'Moyen', MEDIUM: 'Moyen',
  L: 'Grand', LARGE: 'Grand', XL: 'Très grand', XLARGE: 'Très grand',
};

export function CarrierHomeScreen({ navigation }: CarrierHomeScreenProps) {
  const { currentMissions, fetchCurrentMissions } = useMissionStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableParcels, setAvailableParcels] = useState<Parcel[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Cagnotte (connectée à l'API)
  const [earnings, setEarnings] = useState({ today: 0, week: 0, total: 0 });

  // Points visibles (toujours MR + Vinted lockers)
  const visibleTypes = useMemo(() => new Set(DEFAULT_VISIBLE_TYPES), []);

  // Recherche
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<PickupPointType | 'ALL' | 'LOCKERS'>('ALL');
  const [filteredSearchPoints, setFilteredSearchPoints] = useState<PickupPoint[]>(PICKUP_POINTS);
  const [searchSelectedPoints, setSearchSelectedPoints] = useState<PickupPoint[]>([]);

  // Thème jour/nuit
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7;
  });

  // Animations
  const bottomSheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [region, setRegion] = useState<Region>({
    latitude: 48.1113,
    longitude: -1.6800,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  // Points visibles sur la carte
  const mapPoints = useMemo(() => {
    const defaultPoints = PICKUP_POINTS.filter(p => visibleTypes.has(p.type));
    const searchPointIds = new Set(searchSelectedPoints.map(p => p.id));
    return [
      ...defaultPoints.filter(p => !searchPointIds.has(p.id)),
      ...searchSelectedPoints,
    ];
  }, [visibleTypes, searchSelectedPoints]);

  // Animation pulse pour le bouton en ligne
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
          <IconButton icon="account-circle" size={24} onPress={() => navigation.navigate('CarrierProfile')} />
          <IconButton icon="history" size={24} onPress={() => navigation.navigate('CarrierHistory')} />
        </View>
      ),
    });
  }, [navigation]);

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
        Alert.alert('Permission refusée', 'Activez la localisation pour voir les missions proches');
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
      
      // Charger les gains depuis l'API
      try {
        const balance = await api.getCarrierBalance();
        setEarnings({
          today: balance.today || 0,
          week: balance.week || 0,
          total: balance.total || 0,
        });
      } catch (balanceError) {
        console.log('Erreur chargement balance:', balanceError);
      }
    } catch (e) {
      console.log('Pas de profil carrier');
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
      console.error('Erreur:', e);
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
        '✅ Mission acceptée !',
        `Rendez-vous chez ${selectedParcel.vendor?.firstName || 'le vendeur'} pour récupérer le colis.`,
        [
          { text: 'Voir la mission', onPress: () => { fetchCurrentMissions(); navigation.navigate('ActiveMissions'); } },
          { text: 'OK' }
        ]
      );
      if (userLocation) await loadAvailableParcels(userLocation.latitude, userLocation.longitude);
      await fetchCurrentMissions();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'accepter la mission');
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Recherche
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
      `📍 ${point.address}\n🏙️ ${point.city}\n${point.openingHours ? `🕐 ${point.openingHours}` : ''}`,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Y aller', onPress: () => {
          import('react-native').then(({ Linking }) => {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`);
          });
        }},
      ]
    );
  };

  const clearSearchPoints = () => setSearchSelectedPoints([]);

  if (isLoading) return <LoadingScreen message="Chargement..." />;

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
      >
        {/* Colis disponibles */}
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

        {/* Points de collecte (MR + Vinted lockers) */}
        {mapPoints.map((point) => {
          const config = PICKUP_POINT_CONFIG[point.type];
          if (!config) return null;
          const isFromSearch = searchSelectedPoints.some(p => p.id === point.id);
          return (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              title={point.name}
              description={`${point.address}, ${point.city}`}
            >
              <View style={[styles.poiMarker, { backgroundColor: config.color }, isFromSearch && styles.poiMarkerHighlight]}>
                <MaterialCommunityIcons name={config.icon as any} size={14} color="white" />
              </View>
            </Marker>
          );
        })}

        {/* Missions en cours */}
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
              <Text style={styles.onlineTitle}>{isAvailable ? 'En ligne' : 'Hors ligne'}</Text>
              <Text style={styles.onlineSubtitle}>
                {isAvailable ? 'Vous recevez des missions' : 'Activez pour recevoir'}
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

        {/* Card Cagnotte style Uber */}
        <TouchableOpacity 
          style={styles.earningsCard} 
          activeOpacity={0.9}
          onPress={() => {
            Alert.alert(
              '💰 Ma Cagnotte',
              `Total: ${earnings.total.toFixed(2)} €\nAujourd'hui: ${earnings.today.toFixed(2)} €\nCette semaine: ${earnings.week.toFixed(2)} €\n\nLes gains sont crédités après confirmation de livraison.`,
              [
                { text: 'Voir historique', onPress: () => navigation.navigate('CarrierHistory') },
                { text: 'OK' }
              ]
            );
          }}
        >
          <View style={styles.earningsGradient}>
            <View style={styles.earningsLeft}>
              <View style={styles.earningsIconContainer}>
                <MaterialCommunityIcons name="wallet" size={24} color="white" />
              </View>
              <View>
                <Text style={styles.earningsLabel}>Cagnotte</Text>
                <Text style={styles.earningsAmount}>{earnings.total.toFixed(2)} €</Text>
              </View>
            </View>
            <View style={styles.earningsRight}>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Aujourd'hui</Text>
                <Text style={styles.earningsStatValue}>{earnings.today.toFixed(2)} €</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Cette semaine</Text>
                <Text style={styles.earningsStatValue}>{earnings.week.toFixed(2)} €</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Indicateur points recherchés */}
      {searchSelectedPoints.length > 0 && (
        <TouchableOpacity style={styles.searchIndicator} onPress={clearSearchPoints}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color="#10B981" />
          <Text style={styles.searchIndicatorText}>{searchSelectedPoints.length} point{searchSelectedPoints.length > 1 ? 's' : ''} affiché{searchSelectedPoints.length > 1 ? 's' : ''}</Text>
          <MaterialCommunityIcons name="close-circle" size={16} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* ===== BARRE DU BAS PREMIUM ===== */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          {/* Stats cliquables */}
          <View style={styles.statsContainer}>
            {/* Colis disponibles - CLIQUABLE */}
            <TouchableOpacity 
              style={styles.statCard} 
              onPress={() => navigation.navigate('AvailableMissions')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="package-variant" size={22} color={colors.primary} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statNumber}>{availableParcels.length}</Text>
                <Text style={styles.statLabel}>Disponible{availableParcels.length !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>

            {/* Missions en cours */}
            <TouchableOpacity 
              style={styles.statCard} 
              onPress={() => currentMissions.length > 0 && navigation.navigate('ActiveMissions')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: currentMissions.length > 0 ? '#D1FAE5' : '#F3F4F6' }]}>
                <MaterialCommunityIcons name="bike" size={22} color={currentMissions.length > 0 ? '#10B981' : '#9CA3AF'} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statNumber, currentMissions.length === 0 && { color: '#9CA3AF' }]}>{currentMissions.length}</Text>
                <Text style={styles.statLabel}>En cours</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Séparateur vertical */}
          <View style={styles.barDivider} />

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonInner}>
                <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionButtonLabel}>Rechercher</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={centerOnUser}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonInner}>
                <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionButtonLabel}>Position</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ===== MODAL RECHERCHE ===== */}
      <Modal visible={showSearchModal} animationType="slide" transparent onRequestClose={() => setShowSearchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Handle */}
            <View style={styles.modalHandle}><View style={styles.modalHandleBar} /></View>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trouver un point relais</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Nom, ville, adresse..."
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

            <Text style={styles.resultsCount}>{filteredSearchPoints.length} résultat{filteredSearchPoints.length !== 1 ? 's' : ''}</Text>

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

      {/* Bottom Sheet Colis */}
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
                  <Text style={styles.sheetTitle}>Colis disponible</Text>
                  <Text style={styles.sheetSubtitle}>{SIZE_LABELS[selectedParcel.size] || selectedParcel.size} • {selectedParcel.description || 'Pas de description'}</Text>
                </View>
                <TouchableOpacity onPress={closeBottomSheet} style={styles.sheetClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={[styles.slotBanner, selectedParcel.pickupMode === 'IMMEDIATE' ? styles.slotImmediate : styles.slotScheduled]}>
                <MaterialCommunityIcons name={selectedParcel.pickupMode === 'IMMEDIATE' ? 'lightning-bolt' : 'clock-outline'} size={26} color="white" />
                <View style={styles.slotContent}>
                  {selectedParcel.pickupMode === 'IMMEDIATE' ? (
                    <><Text style={styles.slotTitle}>Récupération immédiate</Text><Text style={styles.slotSubtitle}>Le vendeur vous attend</Text></>
                  ) : (
                    <><Text style={styles.slotTitle}>{formatDate(selectedParcel.pickupSlotStart)}</Text><Text style={styles.slotSubtitle}>{formatTime(selectedParcel.pickupSlotStart)} - {formatTime(selectedParcel.pickupSlotEnd)}</Text></>
                  )}
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#DBEAFE' }]}><MaterialCommunityIcons name="account" size={22} color={colors.primary} /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>Vendeur</Text><Text style={styles.infoValue}>{selectedParcel.vendor?.firstName || 'Vendeur'} {selectedParcel.vendor?.lastName?.charAt(0) || ''}.</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#D1FAE5' }]}><MaterialCommunityIcons name="map-marker" size={22} color="#10B981" /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>Récupération</Text><Text style={styles.infoValue}>{selectedParcel.pickupAddress?.street}</Text><Text style={styles.infoValueSub}>{selectedParcel.pickupAddress?.postalCode} {selectedParcel.pickupAddress?.city}</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#FEF3C7' }]}><MaterialCommunityIcons name="store" size={22} color="#F59E0B" /></View>
                <View style={styles.infoText}><Text style={styles.infoLabel}>Dépôt</Text><Text style={styles.infoValue}>{selectedParcel.dropoffName}</Text>{selectedParcel.dropoffAddress && <Text style={styles.infoValueSub}>{selectedParcel.dropoffAddress}</Text>}</View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.priceBox}>
                <View>
                  <Text style={styles.priceLabel}>Votre rémunération</Text>
                  <Text style={styles.priceHint}>💡 Payé après livraison</Text>
                </View>
                <Text style={styles.priceValue}>{typeof selectedParcel.price === 'object' ? (selectedParcel.price as any)?.total?.toFixed(2) : Number(selectedParcel.price).toFixed(2)}€</Text>
              </View>

              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptMission} disabled={isAccepting} activeOpacity={0.8}>
                <View style={styles.acceptBtnGradient}>
                  {isAccepting ? (
                    <Text style={styles.acceptBtnText}>Chargement...</Text>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={22} color="white" />
                      <Text style={styles.acceptBtnText}>Accepter la mission</Text>
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

  // Header
  headerContainer: { position: 'absolute', top: 12, left: 16, right: 16, gap: 12 },
  
  // Card En ligne
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

  // Card Cagnotte
  earningsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  earningsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#2563EB',
    borderRadius: 20,
  },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  earningsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  earningsAmount: { fontSize: 22, fontWeight: '800', color: 'white', marginTop: 2 },
  earningsRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginRight: 8 },
  earningsStat: { alignItems: 'flex-end' },
  earningsStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  earningsStatValue: { fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2 },
  earningsDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Indicateur recherche
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

  // Barre du bas
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 12,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  statsContainer: { flex: 1, flexDirection: 'row', gap: 4 },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
  },
  statIconWrapper: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  statTextContainer: { flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  barDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { alignItems: 'center', gap: 4 },
  actionButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  // Markers
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

  // Modal
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

  // Backdrop & Sheet
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
});