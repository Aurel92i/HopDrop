import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import polyline from '@mapbox/polyline';

import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { hdColors, borderRadius } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<VendorStackParamList, 'Tracking'>;

interface CarrierLocation {
  latitude: number | null;
  longitude: number | null;
  lastUpdate: string | null;
  carrier: {
    firstName: string;
    avatarUrl: string | null;
  };
}

interface RouteInfo {
  coordinates: { latitude: number; longitude: number }[];
  duration: string;
  durationSeconds: number;
  distance: string;
}

export function TrackingScreen({ route, navigation }: Props) {
  const { parcelId, carrierId } = route.params;
  const { t } = useTranslation();
  const [location, setLocation] = useState<CarrierLocation | null>(null);
  const [parcel, setParcel] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Charger les infos du colis (pour la destination)
  const loadParcel = useCallback(async () => {
    try {
      const data = await api.getParcel(parcelId);
      console.log('=== PARCEL DATA ===', JSON.stringify(data?.pickupAddress || data?.parcel?.pickupAddress || 'NO PICKUP ADDRESS'));
      setParcel(data?.parcel || data);
    } catch (e) {
      console.error('Erreur chargement colis:', e);
    }
  }, [parcelId]);

  // Récupérer la position du livreur
  const fetchLocation = useCallback(async () => {
    try {
      const data = await api.getCarrierLocation(carrierId);
      setLocation(data);
      setError(null);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [carrierId]);

  // Récupérer le tracé + ETA via Google Directions
  const fetchRoute = useCallback(async (
    carrierLat: number,
    carrierLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${carrierLat},${carrierLng}&destination=${destLat},${destLng}&mode=driving&language=fr&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log('=== DIRECTIONS ===', data.status, data.error_message, data.routes?.length);  

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // Décoder la polyline
        const points = polyline.decode(route.overview_polyline.points);
        const coordinates = points.map((point: number[]) => ({
          latitude: point[0],
          longitude: point[1],
        }));

        setRouteInfo({
          coordinates,
          duration: leg.duration.text,
          durationSeconds: leg.duration.value,
          distance: leg.distance.text,
        });
      }
    } catch (e) {
      console.error('Erreur Google Directions:', e);
    }
  }, []);

  // Initialisation
  useEffect(() => {
    loadParcel();
    fetchLocation();
  }, []);

  // Refresh toutes les 10 secondes
  useEffect(() => {
    const interval = setInterval(async () => {
      const loc = await fetchLocation();
      if (loc?.latitude && loc?.longitude && parcel?.pickupAddress) {
        const destLat = parcel.pickupAddress.latitude;
        const destLng = parcel.pickupAddress.longitude;
        if (destLat && destLng) {
          fetchRoute(loc.latitude, loc.longitude, destLat, destLng);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [parcel, fetchLocation, fetchRoute]);

  // Premier tracé quand on a les deux positions
  useEffect(() => {
    console.log('=== TRACKING DEBUG ===');
    console.log('Location:', location?.latitude, location?.longitude);
    console.log('Parcel:', parcel?.pickupAddress);
    if (location?.latitude && location?.longitude && parcel?.pickupAddress) {
      const destLat = parcel.pickupAddress.latitude;
      const destLng = parcel.pickupAddress.longitude;
      console.log('Dest:', destLat, destLng);
      if (destLat && destLng) {
        fetchRoute(location.latitude, location.longitude, destLat, destLng);

        // Fit map to show both points
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: destLat, longitude: destLng },
            ],
            {
              edgePadding: { top: 120, right: 60, bottom: 250, left: 60 },
              animated: true,
            }
          );
        }
      }
    }
  }, [location?.latitude, location?.longitude, parcel?.pickupAddress]);

  // Format ETA
  const formatEta = (seconds: number): string => {
    if (seconds < 60) return '< 1 min';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    return `${hours}h${remainMinutes > 0 ? ` ${remainMinutes}min` : ''}`;
  };

  const getEtaLabel = (): string => {
    if (!routeInfo) return '';
    if (routeInfo.durationSeconds < 300) return 'Arrivée imminente';
    return `Arrivée dans ${formatEta(routeInfo.durationSeconds)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={hdColors.accent} />
        <Text style={styles.loadingText}>{t('vendor.tracking.loadingPosition')}</Text>
      </View>
    );
  }

  const hasLocation = location?.latitude && location?.longitude;
  const destCoord = parcel?.pickupAddress ? {
    latitude: parcel.pickupAddress.latitude,
    longitude: parcel.pickupAddress.longitude,
  } : null;

  return (
    <View style={styles.container}>
      {hasLocation ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={{
            latitude: location.latitude!,
            longitude: location.longitude!,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Tracé du trajet */}
          {routeInfo && routeInfo.coordinates.length > 0 && (
            <Polyline
              coordinates={routeInfo.coordinates}
              strokeColor={hdColors.accent}
              strokeWidth={5}
              lineDashPattern={undefined}
            />
          )}

          {/* Marker livreur */}
          <Marker
            coordinate={{
              latitude: location.latitude!,
              longitude: location.longitude!,
            }}
            title={location.carrier.firstName}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.carrierMarker}>
              {location.carrier.avatarUrl ? (
                <Image
                  source={{ uri: location.carrier.avatarUrl }}
                  style={styles.carrierMarkerImage}
                />
              ) : (
                <MaterialCommunityIcons name="bike" size={20} color="#FFFFFF" />
              )}
            </View>
          </Marker>

          {/* Marker destination */}
          {destCoord && destCoord.latitude && destCoord.longitude && (
            <Marker
              coordinate={destCoord}
              title="Point de récupération"
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.destMarker}>
                <MaterialCommunityIcons name="map-marker" size={32} color={hdColors.cta} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.noLocationContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color={hdColors.textTertiary} />
          <Text style={styles.noLocationText}>
            {t('vendor.tracking.positionUnavailable')}
          </Text>
        </View>
      )}

      {/* ETA Badge en haut */}
      {routeInfo && (
        <View style={styles.etaBadge}>
          <View style={styles.etaIconBg}>
            <MaterialCommunityIcons
              name={routeInfo.durationSeconds < 300 ? 'check-circle' : 'clock-fast'}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.etaTextCol}>
            <Text style={styles.etaLabel}>{getEtaLabel()}</Text>
            <Text style={styles.etaDistance}>{routeInfo.distance}</Text>
          </View>
        </View>
      )}

      {/* Info Card en bas */}
      <View style={styles.infoCard}>
        <View style={styles.cardHandle} />

        <View style={styles.carrierRow}>
          {location?.carrier.avatarUrl ? (
            <Image source={{ uri: location.carrier.avatarUrl }} style={styles.carrierAvatar} />
          ) : (
            <View style={styles.carrierAvatarFallback}>
              <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
            </View>
          )}

          <View style={styles.carrierInfo}>
            <Text style={styles.carrierName}>
              {location?.carrier.firstName || t('vendor.tracking.carrierLabel')}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: hasLocation ? hdColors.neonGreen : hdColors.steel }]} />
              <Text style={styles.statusText}>
                {hasLocation ? t('vendor.tracking.positionActive') : t('vendor.tracking.positionInactive')}
              </Text>
            </View>
            {location?.lastUpdate && (
              <Text style={styles.lastUpdate}>
                Mis à jour à {new Date(location.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          {/* ETA compact */}
          {routeInfo && (
            <View style={styles.etaCompact}>
              <Text style={styles.etaCompactTime}>{formatEta(routeInfo.durationSeconds)}</Text>
              <Text style={styles.etaCompactLabel}>ETA</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              const loc = await fetchLocation();
              if (loc?.latitude && loc?.longitude && destCoord?.latitude && destCoord?.longitude) {
                fetchRoute(loc.latitude, loc.longitude, destCoord.latitude, destCoord.longitude);
                mapRef.current?.fitToCoordinates(
                  [
                    { latitude: loc.latitude, longitude: loc.longitude },
                    destCoord,
                  ],
                  { edgePadding: { top: 120, right: 60, bottom: 250, left: 60 }, animated: true }
                );
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={hdColors.accent} />
            <Text style={styles.actionText}>Rafraîchir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => navigation.navigate('Chat', { parcelId })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chat-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionTextPrimary}>Contacter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Erreur */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={hdColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: hdColors.textTertiary,
    fontSize: 14,
  },
  map: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  noLocationText: {
    color: hdColors.textTertiary,
    textAlign: 'center',
    fontSize: 15,
  },

  // Carrier marker
  carrierMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 6 },
    }),
  },
  carrierMarkerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  // Destination marker
  destMarker: {
    alignItems: 'center',
  },

  // ETA Badge top
  etaBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    padding: 12,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  etaIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaTextCol: {
    flex: 1,
    gap: 1,
  },
  etaLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  etaDistance: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  // Info Card bottom
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: hdColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  cardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: hdColors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Carrier row
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  carrierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: hdColors.accent,
  },
  carrierAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carrierInfo: {
    flex: 1,
    gap: 2,
  },
  carrierName: {
    fontSize: 17,
    fontWeight: '700',
    color: hdColors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },
  lastUpdate: {
    fontSize: 11,
    color: hdColors.textTertiary,
  },

  // ETA compact (dans la card)
  etaCompact: {
    alignItems: 'center',
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  etaCompactTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  etaCompactLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: hdColors.accent,
    borderColor: hdColors.accent,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.accent,
  },
  actionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Error
  errorBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 70,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: hdColors.danger50,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: hdColors.danger,
    flex: 1,
  },
});