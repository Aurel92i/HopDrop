import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { FAB, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { ParcelCard } from '../../components/common/ParcelCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useParcelStore } from '../../stores/parcelStore';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type VendorHomeScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'VendorHome'>;
};

export function VendorHomeScreen({ navigation }: VendorHomeScreenProps) {
  const { parcels, isLoading, fetchParcels } = useParcelStore();
  const [filter, setFilter] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      loadParcels();
    }, [filter])
  );

  const loadParcels = async () => {
    const statusFilter = filter === 'all' ? undefined : filter.toUpperCase();
    await fetchParcels(statusFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParcels();
    setRefreshing(false);
  };

  const filteredParcels = React.useMemo(() => {
    if (filter === 'all') return parcels;
    return parcels.filter((p) => p.status === filter.toUpperCase());
  }, [parcels, filter]);

  if (isLoading && parcels.length === 0) {
    return <LoadingScreen message="Chargement des colis..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'Tous' },
            { value: 'pending', label: 'En attente' },
            { value: 'accepted', label: 'En cours' },
            { value: 'delivered', label: 'Livrés' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={filteredParcels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ParcelCard
            parcel={item}
            onPress={() => navigation.navigate('ParcelDetail', { parcelId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="package-variant"
            title="Aucun colis"
            description="Vous n'avez pas encore de colis. Créez-en un pour commencer !"
            actionLabel="Créer un colis"
            onAction={() => navigation.navigate('CreateParcel')}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateParcel')}
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
  filterContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  segmentedButtons: {
    marginBottom: 0,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});