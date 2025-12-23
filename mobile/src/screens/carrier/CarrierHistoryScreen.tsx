import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { CarrierStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { Mission, MissionStatus } from '../../types';

type CarrierHistoryScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'CarrierHistory'>;
};

const statusConfig: Record<MissionStatus, { label: string; color: string; icon: string }> = {
  ACCEPTED: { label: 'Acceptée', color: colors.primary, icon: 'check' },
  IN_PROGRESS: { label: 'En cours', color: colors.tertiary, icon: 'bike' },
  PICKED_UP: { label: 'Récupéré', color: colors.secondary, icon: 'package-variant' },
  DELIVERED: { label: 'Livrée', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulée', color: colors.error, icon: 'close-circle' },
};

export function CarrierHistoryScreen({ navigation }: CarrierHistoryScreenProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ totalDelivered: 0, totalEarned: 0 });

  useFocusEffect(
    useCallback(() => {
      loadHistory(1, true);
    }, [])
  );

  const loadHistory = async (pageNum: number, reset: boolean = false) => {
    try {
      const { missions: newMissions, pagination } = await api.getMissionHistory(pageNum, 10);
      
      if (reset) {
        setMissions(newMissions);
        // Calculer les stats
        const delivered = newMissions.filter((m: Mission) => m.status === 'DELIVERED');
        setStats({
          totalDelivered: pagination.total,
          totalEarned: delivered.reduce((sum: number, m: Mission) => 
            sum + (m.parcel ? Number(m.parcel.price) * 0.8 : 0), 0
          ),
        });
      } else {
        setMissions(prev => [...prev, ...newMissions]);
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

  const renderMission = ({ item }: { item: Mission }) => {
    const status = statusConfig[item.status];
    const earnings = item.parcel ? Number(item.parcel.price) * 0.8 : 0;

    return (
      <Card style={styles.card}>
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
              {formatDate(item.deliveredAt || item.createdAt)}
            </Text>
          </View>

          {item.parcel && (
            <>
              <Text variant="titleMedium" style={styles.dropoff}>
                → {item.parcel.dropoffName}
              </Text>

              <View style={styles.footer}>
                {item.status === 'DELIVERED' ? (
                  <Text variant="titleMedium" style={styles.earnings}>
                    +{earnings.toFixed(2)} €
                  </Text>
                ) : (
                  <Text variant="bodyMedium" style={styles.cancelled}>
                    Non rémunéré
                  </Text>
                )}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && missions.length === 0) {
    return <LoadingScreen message="Chargement de l'historique..." />;
  }

  return (
    <View style={styles.container}>
      {/* Stats Card */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="package-variant-closed-check" size={24} color={colors.primary} />
            <Text variant="headlineSmall" style={styles.statValue}>{stats.totalDelivered}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Livraisons</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={24} color="#10B981" />
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#10B981' }]}>
              {stats.totalEarned.toFixed(2)} €
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>Gains totaux</Text>
          </View>
        </Card.Content>
      </Card>

      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={renderMission}
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
            description="Vos missions terminées apparaîtront ici"
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
  statsCard: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.onSurface,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.outline,
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
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  earnings: {
    color: '#10B981',
    fontWeight: '600',
  },
  cancelled: {
    color: colors.onSurfaceVariant,
  },
});