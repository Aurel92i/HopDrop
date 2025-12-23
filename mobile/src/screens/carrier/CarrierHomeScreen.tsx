import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Switch, FAB, IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useMissionStore } from '../../stores/missionStore';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Mission, MissionStatus } from '../../types';
import { locationService } from '../../services/location';

type CarrierHomeScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'CarrierHome'>;
};

const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string }> = {
  ACCEPTED: { label: 'À récupérer', color: colors.primary, icon: 'package-variant' },
  IN_PROGRESS: { label: 'En cours', color: colors.tertiary, icon: 'bike' },
  PICKED_UP: { label: 'À livrer', color: colors.secondary, icon: 'package-variant-closed' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
};

export function CarrierHomeScreen({ navigation }: CarrierHomeScreenProps) {
  const { currentMissions, isLoading, fetchCurrentMissions } = useMissionStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Ajouter le bouton historique dans le header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="history"
          size={24}
          onPress={() => navigation.navigate('CarrierHistory')}
        />
      ),
    });
  }, [navigation]);

   const loadData = async () => {
    await fetchCurrentMissions();
    try {
      const profile = await api.getCarrierProfile();
      setIsAvailable(profile.isAvailable ?? false);
    } catch (e) {
      console.log('Pas de profil carrier');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleTracking = async (value: boolean) => {
    if (value) {
      const success = await locationService.startForegroundTracking((location) => {
        console.log('Position:', location.coords);
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

  const renderMissionItem = ({ item }: { item: Mission }) => {
    const status = statusConfig[item.status];

    return (
      <Card
        style={[styles.missionCard, { borderLeftColor: status.color }]}
        onPress={() => navigation.navigate('MissionDetail', { missionId: item.id })}
      >
        <Card.Content>
          <View style={styles.missionHeader}>
            <View style={styles.missionStatus}>
              <MaterialCommunityIcons name={status.icon as any} size={20} color={status.color} />
              <Text variant="labelLarge" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </View>

          {item.parcel && (
            <>
              <Text variant="bodyMedium" style={styles.dropoffName}>
                → {item.parcel.dropoffName}
              </Text>
              <Text variant="bodySmall" style={styles.description}>
                {item.parcel.description || 'Colis'}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && currentMissions.length === 0) {
    return <LoadingScreen message="Chargement des missions..." />;
  }

  return (
    <View style={styles.container}>
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
                {isTracking ? 'Position partagée avec les clients' : 'Position non partagée'}
              </Text>
            </View>
          </View>
          <Switch value={isTracking} onValueChange={toggleTracking} color={colors.primary} />
        </Card.Content>
      </Card>

      {/* Current Missions */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Mes missions en cours
      </Text>

      <FlatList
        data={currentMissions}
        keyExtractor={(item) => item.id}
        renderItem={renderMissionItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bike"
            title="Aucune mission"
            description="Cherchez des missions disponibles près de vous !"
            actionLabel="Chercher des missions"
            onAction={() => navigation.navigate('AvailableMissions')}
          />
        }
      />

      <FAB
        icon="magnify"
        label="Chercher"
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
    backgroundColor: colors.background,
  },
  statusCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
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
  sectionTitle: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.onSurface,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  missionCard: {
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  missionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dropoffName: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  description: {
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});