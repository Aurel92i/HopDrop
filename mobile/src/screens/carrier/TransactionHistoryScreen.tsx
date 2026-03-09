// mobile/src/screens/carrier/TransactionHistoryScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CarrierStackParamList } from '../../navigation/types';
import { api, Transaction, CarrierEarnings } from '../../services/api';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

type TransactionHistoryScreenProps = {
  navigation: NativeStackNavigationProp<CarrierStackParamList, 'TransactionHistory'>;
};

type FilterType = 'all' | 'pending' | 'transferred' | 'captured';

interface TipItem {
  id: string;
  amount: number;
  message: string | null;
  createdAt: string;
  vendor?: { firstName: string; lastName: string };
  parcel?: { dropoffName: string };
  _isTip: true;
}

export function TransactionHistoryScreen({ navigation }: TransactionHistoryScreenProps) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const STATUS_CONFIG = {
    PENDING: { label: t('carrier.transactions.statusPending'), color: '#F59E0B', icon: 'clock-outline' },
    CAPTURED: { label: t('carrier.transactions.statusCaptured'), color: '#3B82F6', icon: 'check-circle-outline' },
    TRANSFERRED: { label: t('carrier.transactions.statusPaid'), color: '#10B981', icon: 'bank-transfer' },
    REFUNDED: { label: t('carrier.transactions.statusRefunded'), color: '#EF4444', icon: 'cash-refund' },
    FAILED: { label: t('carrier.transactions.statusFailed'), color: '#EF4444', icon: 'alert-circle-outline' },
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    setPage(1);
    try {
      const [transactionsData, earningsData, tipsData] = await Promise.all([
        api.getTransactionsByRole('payee', 1, 20),
        api.getCarrierBalance().catch(() => null),
        api.getTipsReceived().catch(() => ({ tips: [] })),
      ]);

      setTransactions(transactionsData.transactions || []);
      setHasMore((transactionsData.transactions?.length || 0) >= 20);

      // BUG 6: Store tips as separate items
      const tipItems: TipItem[] = (tipsData.tips || []).map((tip: any) => ({
        ...tip,
        _isTip: true,
      }));
      setTips(tipItems);

      if (earningsData) {
        setEarnings(earningsData);
      }
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await api.getTransactionsByRole('payee', nextPage, 20);

      if (data.transactions?.length > 0) {
        setTransactions(prev => [...prev, ...data.transactions]);
        setPage(nextPage);
        setHasMore(data.transactions.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Erreur chargement plus:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'pending') return tx.status === 'PENDING';
    if (filter === 'transferred') return tx.status === 'TRANSFERRED';
    if (filter === 'captured') return tx.status === 'CAPTURED';
    return true;
  });

  // BUG 6: Merge tips with transactions and sort by date
  const allItems = [
    ...filteredTransactions.map((tx) => ({ ...tx, _isTip: false as const })),
    ...(filter === 'all' ? tips : []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEarningsCard = () => (
    <View style={styles.earningsCard}>
      <View style={styles.earningsHeader}>
        <MaterialCommunityIcons name="wallet" size={24} color="white" />
        <Text style={styles.earningsTitle}>{t('carrier.transactions.myWallet')}</Text>
      </View>

      <Text style={styles.earningsTotal}>
        {earnings?.total?.toFixed(2) || '0.00'} €
      </Text>
      <Text style={styles.earningsSubtitle}>{t('carrier.transactions.totalEarnings')}</Text>

      <Divider style={styles.earningsDivider} />

      <View style={styles.earningsGrid}>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemValue}>{earnings?.today?.toFixed(2) || '0.00'} €</Text>
          <Text style={styles.earningsItemLabel}>{t('carrier.transactions.today')}</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemValue}>{earnings?.week?.toFixed(2) || '0.00'} €</Text>
          <Text style={styles.earningsItemLabel}>{t('carrier.transactions.thisWeek')}</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemValue}>{earnings?.month?.toFixed(2) || '0.00'} €</Text>
          <Text style={styles.earningsItemLabel}>{t('carrier.transactions.thisMonth')}</Text>
        </View>
      </View>

      <View style={styles.earningsFooter}>
        <View style={styles.earningsFooterItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.earningsFooterText}>
            {t('carrier.transactions.pending')}: {earnings?.pending?.toFixed(2) || '0.00'} €
          </Text>
        </View>
        <View style={styles.earningsFooterItem}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
          <Text style={styles.earningsFooterText}>
            {t('carrier.transactions.available')}: {earnings?.available?.toFixed(2) || '0.00'} €
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollableChips
        selected={filter}
        onSelect={setFilter}
        options={[
          { key: 'all', label: t('carrier.transactions.filterAll') },
          { key: 'transferred', label: t('carrier.transactions.filterTransferred') },
          { key: 'captured', label: t('carrier.transactions.filterCaptured') },
          { key: 'pending', label: t('carrier.transactions.filterPending') },
        ]}
      />
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

    return (
      <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: `${status.color}15` }]}>
            <MaterialCommunityIcons
              name={status.icon as any}
              size={24}
              color={status.color}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {item.parcel?.dropoffName || t('carrier.transactions.defaultDelivery')}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.createdAt)} à {formatTime(item.createdAt)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>
            +{Number(item.carrierPayout).toFixed(2)} €
          </Text>
          <Text style={styles.transactionFee}>
            {t('carrier.transactions.commission')}: {Number(item.platformFee).toFixed(2)} €
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // BUG 6: Render tip item
  const renderTip = ({ item }: { item: TipItem }) => (
    <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: '#F59E0B15' }]}>
          <MaterialCommunityIcons name="gift" size={24} color="#F59E0B" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>
            {t('carrier.transactions.tipLabel')}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.createdAt)} {item.vendor ? `- ${item.vendor.firstName}` : ''}
          </Text>
          {item.message ? (
            <Text style={styles.transactionDate} numberOfLines={1}>
              "{item.message}"
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: '#F59E0B' }]}>
          +{Number(item.amount).toFixed(2)} €
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (item._isTip) {
      return renderTip({ item });
    }
    return renderTransaction({ item });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="cash-remove" size={64} color={colors.outline} />
      <Text style={styles.emptyTitle}>{t('carrier.transactions.noTransactions')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('carrier.transactions.noTransactionsDesc')}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('carrier.transactions.loadingTransactions')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allItems}
        keyExtractor={(item) => `${item._isTip ? 'tip' : 'tx'}-${item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <>
            {renderEarningsCard()}
            {renderFilters()}
            {allItems.length > 0 && (
              <Text style={styles.listTitle}>
                {t('carrier.transactions.history')} ({allItems.length})
              </Text>
            )}
          </>
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// Composant pour les filtres scrollables
function ScrollableChips({
  selected,
  onSelect,
  options
}: {
  selected: string;
  onSelect: (value: FilterType) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <View style={styles.chipsRow}>
      {options.map((option) => (
        <Chip
          key={option.key}
          selected={selected === option.key}
          onPress={() => onSelect(option.key as FilterType)}
          style={[
            styles.chip,
            selected === option.key && styles.chipSelected,
          ]}
          textStyle={[
            styles.chipText,
            selected === option.key && styles.chipTextSelected,
          ]}
        >
          {option.label}
        </Chip>
      ))}
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  earningsTotal: {
    fontSize: 42,
    fontWeight: '800',
    color: 'white',
    marginTop: spacing.sm,
  },
  earningsSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  earningsDivider: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.lg,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    alignItems: 'center',
  },
  earningsItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  earningsItemLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  earningsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  earningsFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningsFooterText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // Filters
  filtersContainer: {
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.onSurface,
  },
  chipTextSelected: {
    color: 'white',
  },

  // List
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  transactionFee: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },

  // Footer
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
