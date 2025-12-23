import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Parcel, ParcelStatus } from '../../types';

type VendorHistoryScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'VendorHistory'>;
};

const statusConfig: Record<ParcelStatus, { label: string; color: string; icon: string }> = {
  PENDING: { label: 'En attente', color: colors.tertiary, icon: 'clock-outline' },
  ACCEPTED: { label: 'Accepté', color: colors.primary, icon: 'check' },
  PICKED_UP: { label: 'Récupéré', color: colors.secondary, icon: 'package-variant' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
  EXPIRED: { label: 'Expiré', color: colors.onSurfaceVariant, icon: 'clock-alert' },
};

interface HistoryParcel extends Parcel {
  hasReview?: boolean;
}

export function VendorHistoryScreen({ navigation }: VendorHistoryScreenProps) {
  const [parcels, setParcels] = useState<HistoryParcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory(1, true);
    }, [])
  );

  const loadHistory = async (pageNum: number, reset: boolean = false) => {
    try {
      const { parcels: newParcels, pagination } = await api.getParcelHistory(pageNum, 10);
      
      if (reset) {
        setParcels(newParcels);
      } else {
        setParcels(prev => [...prev, ...newParcels]);
      }
      
      setPage(pageNum);
      setHasMore(pageNum < pagination.totalPages);
    } catch (e) {
      console.error('Erreur historique:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(1, true);
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      loadHistory(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderParcel = ({ item }: { item: HistoryParcel }) => {
    const status = statusConfig[item.status];

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ParcelDetail', { parcelId: item.id })}
      >
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name={status.icon as any}
                size={20}
                color={status.color}
              />
              <Text variant="labelLarge" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.date}>
              {formatDate(item.updatedAt)}
            </Text>
          </View>

          <Text variant="titleMedium" style={styles.dropoff}>
            → {item.dropoffName}
          </Text>

          {item.description && (
            <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={styles.footer}>
            <Text variant="titleMedium" style={styles.price}>
              {Number(item.price).toFixed(2)} €
            </Text>

            {item.status === 'DELIVERED' && !item.hasReview && (
              <Chip
                icon="star"
                compact
                style={styles.reviewChip}
                textStyle={styles.reviewChipText}
              >
                Laisser un avis
              </Chip>
            )}

            {item.hasReview && (
              <MaterialCommunityIcons name="star-check" size={20} color="#F59E0B" />
            )}
          </View>

          {item.assignedCarrier && (
            <View style={styles.carrierInfo}>
              <MaterialCommunityIcons name="account" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.carrierName}>
                {item.assignedCarrier.firstName}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && parcels.length === 0) {
    return <LoadingScreen message="Chargement de l'historique..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parcels}
        keyExtractor={(item) => item.id}
        renderItem={renderParcel}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="Aucun historique"
            description="Vos colis livrés et annulés apparaîtront ici"
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
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    color: colors.onSurfaceVariant,
  },
  dropoff: {
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: colors.primary,
    fontWeight: '600',
  },
  reviewChip: {
    backgroundColor: colors.secondaryContainer,
  },
  reviewChipText: {
    fontSize: 11,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  carrierName: {
    color: colors.onSurfaceVariant,
  },
});