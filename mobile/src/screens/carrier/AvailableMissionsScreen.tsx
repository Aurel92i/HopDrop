import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Searchbar, Button, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import { MissionCard } from '../../components/common/MissionCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type AvailableMissionsScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'AvailableMissions'>;
};

export function AvailableMissionsScreen({ navigation }: AvailableMissionsScreenProps) {
  const { availableMissions, isLoading, fetchAvailableMissions, acceptMission } = useMissionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [radius, setRadius] = useState(5);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getLocationAndFetch();
  }, [radius]);

  const getLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour voir les missions proches.');
        // Utiliser Paris par défaut
        setLocation({ latitude: 48.8566, longitude: 2.3522 });
        await fetchAvailableMissions(48.8566, 2.3522, radius);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      await fetchAvailableMissions(loc.coords.latitude, loc.coords.longitude, radius);
    } catch (e) {
      console.error('Erreur localisation:', e);
      // Utiliser Paris par défaut
      setLocation({ latitude: 48.8566, longitude: 2.3522 });
      await fetchAvailableMissions(48.8566, 2.3522, radius);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getLocationAndFetch();
    setRefreshing(false);
  };

  const handleAccept = async (parcelId: string) => {
    Alert.alert(
      'Accepter la mission',
      'Voulez-vous accepter cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              await acceptMission(parcelId);
              Alert.alert('Succès', 'Mission acceptée !');
            } catch (e: any) {
              Alert.alert('Erreur', e.message || 'Impossible d\'accepter la mission');
            }
          },
        },
      ]
    );
  };

  if (isLoading && availableMissions.length === 0) {
    return <LoadingScreen message="Recherche des missions..." />;
  }

  return (
    <View style={styles.container}>
      {/* Filtres */}
      <View style={styles.filterContainer}>
        <Text variant="bodyMedium" style={styles.filterLabel}>Rayon de recherche :</Text>
        <View style={styles.radiusChips}>
          {[3, 5, 10, 20].map((r) => (
            <Chip
              key={r}
              selected={radius === r}
              onPress={() => setRadius(r)}
              style={styles.radiusChip}
            >
              {r} km
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={availableMissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MissionCard
            mission={item}
            onPress={() => handleAccept(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <Text variant="bodySmall" style={styles.resultCount}>
            {availableMissions.length} mission(s) trouvée(s)
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="map-marker-off"
            title="Aucune mission"
            description="Aucune mission disponible dans ce rayon. Essayez d'augmenter le rayon de recherche."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  filterLabel: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  radiusChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radiusChip: {
    backgroundColor: colors.surfaceVariant,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  resultCount: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
});