import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import { Text, Card, Switch, FAB, IconButton, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Parcel } from '../../types';
import { locationService } from '../../services/location';

type CarrierHomeScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'CarrierHome'>;
};

const { width, height } = Dimensions.get('window');

// Points d'intérêt statiques pour le MVP (à remplacer par une API)
const POINTS_OF_INTEREST = [
  { id: 'locker1', type: 'locker', name: 'Locker Amazon', latitude: 48.1180, longitude: -1.5280 },
  { id: 'locker2', type: 'locker', name: 'Relais Colis', latitude: 48.1220, longitude: -1.5350 },
  { id: 'post1', type: 'post', name: 'La Poste Acigné', latitude: 48.1350, longitude: -1.5400 },
  { id: 'post2', type: 'post', name: 'La Poste Noyal', latitude: 48.1170, longitude: -1.5200 },
];

export function CarrierHomeScreen({ navigation }: CarrierHomeScreenProps) {
  const { currentMissions, fetchCurrentMissions } = useMissionStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableParcels, setAvailableParcels] = useState<Parcel[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 48.1173,
    longitude: -1.5234,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    getUserLocation();
  }, []);

  // Header avec boutons
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="account-circle"
            size={24}
            onPress={() => navigation.navigate('CarrierProfile')}
          />
          <IconButton
            icon="history"
            size={24}
            onPress={() => navigation.navigate('CarrierHistory')}
          />
        </View>
      ),
    });
  }, [navigation]);

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
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Charger les colis disponibles autour de cette position
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

  const toggleTracking = async (value: boolean) => {
    if (value) {
      const success = await locationService.startForegroundTracking((location) => {
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        // Mettre à jour la position sur le serveur
        api.updateLocation(latitude, longitude);
      });
      setIsTracking(success);
    } else {
      await locationService.stopTracking();
      setIsTracking(false);
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
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'locker': return '#8B5CF6'; // Violet
      case 'post': return '#F59E0B'; // Orange
      default: return colors.primary;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'locker': return 'locker';
      case 'post': return 'email';
      default: return 'package-variant';
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <View style={styles.container}>
      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
      >
      {/* Marqueurs des colis disponibles */}
        {availableParcels.map((parcel: any) => (
          parcel.pickupAddress && (
            <Marker
              key={parcel.id}
              coordinate={{
                latitude: parcel.pickupAddress.latitude,
                longitude: parcel.pickupAddress.longitude,
              }}
            >
              <View style={styles.parcelMarker}>
                <MaterialCommunityIcons name="package-variant" size={24} color="white" />
              </View>
              <Callout onPress={() => navigation.navigate('AvailableMissions')}>
                <View style={styles.callout}>
                  <Text variant="titleSmall" style={styles.calloutTitle}>
                    {parcel.dropoffName}
                  </Text>
                  <Text variant="bodySmall" style={styles.calloutSubtitle}>
                    {parcel.size} • {parcel.price?.total?.toFixed(2) || Number(parcel.price).toFixed(2)}€
                  </Text>
                  <Text variant="bodySmall" style={styles.calloutAddress}>
                    📍 {parcel.pickupAddress.city}
                  </Text>
                  <Text variant="bodySmall" style={styles.calloutHint}>
                    Appuyez pour voir les détails
                  </Text>
                </View>
              </Callout>
            </Marker>
          )
        ))}

        {/* Marqueurs des points d'intérêt */}
        {POINTS_OF_INTEREST.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{
              latitude: poi.latitude,
              longitude: poi.longitude,
            }}
          >
            <View style={[styles.poiMarker, { backgroundColor: getMarkerColor(poi.type) }]}>
              <MaterialCommunityIcons 
                name={getMarkerIcon(poi.type) as any} 
                size={18} 
                color="white" 
              />
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text variant="titleSmall">{poi.name}</Text>
                <Text variant="bodySmall" style={styles.calloutSubtitle}>
                  {poi.type === 'locker' ? 'Point relais' : 'Bureau de poste'}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Marqueurs des missions en cours */}
        {currentMissions.map((mission) => (
          mission.parcel?.pickupAddress && (
            <Marker
              key={`mission-${mission.id}`}
              coordinate={{
                latitude: mission.parcel.pickupAddress.latitude,
                longitude: mission.parcel.pickupAddress.longitude,
              }}
            >
              <View style={styles.missionMarker}>
                <MaterialCommunityIcons name="bike" size={20} color="white" />
              </View>
              <Callout onPress={() => navigation.navigate('MissionDetail', { missionId: mission.id })}>
                <View style={styles.callout}>
                  <Text variant="titleSmall" style={styles.calloutTitle}>
                    Mission en cours
                  </Text>
                  <Text variant="bodySmall">
                    → {mission.parcel.dropoffName}
                  </Text>
                </View>
              </Callout>
            </Marker>
          )
        ))}
      </MapView>

      {/* Overlay: Cards de statut */}
      <View style={styles.overlay}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <View style={styles.statusInfo}>
              <Text variant="titleMedium">Disponibilité</Text>
              <Text variant="bodySmall" style={styles.statusHint}>
                {isAvailable ? 'Vous recevez des notifications' : 'Activez pour recevoir des missions'}
              </Text>
            </View>
            <Switch value={isAvailable} onValueChange={toggleAvailability} color={colors.primary} />
          </Card.Content>
        </Card>

        {/* Tracking Card */}
        <Card style={styles.trackingCard}>
          <Card.Content style={styles.trackingContent}>
            <View style={styles.trackingInfo}>
              <MaterialCommunityIcons
                name={isTracking ? 'map-marker' : 'map-marker-off'}
                size={24}
                color={isTracking ? colors.primary : colors.onSurfaceVariant}
              />
              <View style={styles.trackingText}>
                <Text variant="titleSmall">Partage de position</Text>
                <Text variant="bodySmall" style={styles.trackingDescription}>
                  {isTracking ? 'Position partagée' : 'Position non partagée'}
                </Text>
              </View>
            </View>
            <Switch value={isTracking} onValueChange={toggleTracking} color={colors.primary} />
          </Card.Content>
        </Card>
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <Chip icon="package-variant" compact style={styles.legendChip} textStyle={styles.legendText}>
          Colis
        </Chip>
        <Chip icon="locker" compact style={[styles.legendChip, { backgroundColor: '#8B5CF6' }]} textStyle={styles.legendText}>
          Relais
        </Chip>
        <Chip icon="email" compact style={[styles.legendChip, { backgroundColor: '#F59E0B' }]} textStyle={styles.legendText}>
          Poste
        </Chip>
      </View>

      {/* Bouton centrer sur moi */}
      <FAB
        icon="crosshairs-gps"
        style={styles.centerFab}
        onPress={centerOnUser}
        size="small"
        color={colors.primary}
        mode="flat"
      />

      {/* Missions en cours badge */}
{currentMissions.length > 0 && (
  <Card 
    style={styles.missionsCard} 
    onPress={() => navigation.navigate('ActiveMissions')}
  >
    <Card.Content style={styles.missionsContent}>
      <MaterialCommunityIcons name="bike" size={24} color={colors.primary} />
      <View style={styles.missionsInfo}>
        <Text variant="titleSmall">{currentMissions.length} mission(s) en cours</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
    </Card.Content>
  </Card>
)}

      {/* FAB Liste */}
      <FAB
        icon="format-list-bulleted"
        label="Liste"
        style={styles.fab}
        onPress={() => navigation.navigate('AvailableMissions')}
        color={colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  statusCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  statusHint: {
    color: colors.onSurfaceVariant,
  },
  trackingCard: {
    backgroundColor: colors.surface,
    elevation: 4,
  },
  trackingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  trackingText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trackingDescription: {
    color: colors.onSurfaceVariant,
  },
  parcelMarker: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  poiMarker: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  missionMarker: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  callout: {
    padding: spacing.sm,
    minWidth: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
  },
  calloutSubtitle: {
    color: colors.onSurfaceVariant,
  },
  calloutHint: {
    color: colors.primary,
    marginTop: spacing.xs,
  },
  legend: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendChip: {
    backgroundColor: colors.primary,
  },
  legendText: {
    color: 'white',
    fontSize: 10,
  },
  centerFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 170,
    backgroundColor: colors.surface,
  },
  missionsCard: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  missionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missionsInfo: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  calloutAddress: {
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
});