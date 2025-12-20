import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

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

export function TrackingScreen({ route }: Props) {
  const { parcelId, carrierId } = route.params;
  const [location, setLocation] = useState<CarrierLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchLocation = async () => {
    try {
      const data = await api.getCarrierLocation(carrierId);
      setLocation(data);
      setError(null);

      // Centrer la carte sur le livreur
      if (data.latitude && data.longitude && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();

    // Rafraîchir toutes les 15 secondes
    const interval = setInterval(fetchLocation, 15000);

    return () => clearInterval(interval);
  }, [carrierId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement de la position...</Text>
      </View>
    );
  }

  const hasLocation = location?.latitude && location?.longitude;

  return (
    <View style={styles.container}>
      {hasLocation ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.latitude!,
            longitude: location.longitude!,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={{
              latitude: location.latitude!,
              longitude: location.longitude!,
            }}
            title={`Livreur: ${location.carrier.firstName}`}
            description="Position actuelle"
          >
            <View style={styles.markerContainer}>
              <MaterialCommunityIcons name="bike" size={24} color={colors.surface} />
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={styles.noLocationContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={styles.noLocationText}>
            Position du livreur indisponible
          </Text>
        </View>
      )}

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.carrierInfo}>
            <MaterialCommunityIcons name="account-circle" size={40} color={colors.primary} />
            <View style={styles.carrierDetails}>
              <Text variant="titleMedium">{location?.carrier.firstName || 'Livreur'}</Text>
              <Text variant="bodySmall" style={styles.statusText}>
                {hasLocation ? '🟢 Position active' : '🔴 Position indisponible'}
              </Text>
              {location?.lastUpdate && (
                <Text variant="bodySmall" style={styles.lastUpdate}>
                  Dernière mise à jour: {new Date(location.lastUpdate).toLocaleTimeString('fr-FR')}
                </Text>
              )}
            </View>
          </View>

          <Button
            mode="outlined"
            icon="refresh"
            onPress={fetchLocation}
            style={styles.refreshButton}
          >
            Rafraîchir
          </Button>
        </Card.Content>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
  },
  map: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noLocationText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  markerContainer: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  infoCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  carrierDetails: {
    flex: 1,
  },
  statusText: {
    color: colors.onSurfaceVariant,
  },
  lastUpdate: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  refreshButton: {
    marginTop: spacing.md,
  },
  errorCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    color: colors.error,
  },
});