import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, Portal, Modal, TextInput, Button } from 'react-native-paper';
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
  PACKAGING_CONFIRMED: { label: 'Emballage validé', color: '#3B82F6', icon: 'package-check' },
  PICKED_UP: { label: 'Récupéré', color: colors.secondary, icon: 'package-variant' },
  DELIVERED: { label: 'Livré', color: '#10B981', icon: 'check-all' },
  CANCELLED: { label: 'Annulé', color: colors.error, icon: 'close-circle' },
  EXPIRED: { label: 'Expiré', color: colors.onSurfaceVariant, icon: 'clock-alert' },
};

interface HistoryParcel extends Parcel {
  hasReview?: boolean;
  hasTip?: boolean;
}

export function VendorHistoryScreen({ navigation }: VendorHistoryScreenProps) {
  const [parcels, setParcels] = useState<HistoryParcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // États pour le modal de pourboire
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedParcelForTip, setSelectedParcelForTip] = useState<HistoryParcel | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isSendingTip, setIsSendingTip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory(1, true);
    }, [])
  );

  const loadHistory = async (pageNum: number, reset: boolean = false) => {
    try {
      const { parcels: newParcels, pagination } = await api.getParcelHistory(pageNum, 10);

      // Vérifier pour chaque colis s'il a un pourboire
      const parcelsWithTipStatus = await Promise.all(
        newParcels.map(async (parcel) => {
          if (parcel.status === 'DELIVERED') {
            try {
              const tip = await api.getTipByParcel(parcel.id);
              return { ...parcel, hasTip: !!tip };
            } catch {
              return { ...parcel, hasTip: false };
            }
          }
          return { ...parcel, hasTip: false };
        })
      );

      if (reset) {
        setParcels(parcelsWithTipStatus);
      } else {
        setParcels(prev => [...prev, ...parcelsWithTipStatus]);
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

  const handleOpenTipModal = (parcel: HistoryParcel) => {
    setSelectedParcelForTip(parcel);
    setTipAmount('');
    setTipMessage('');
    setShowTipModal(true);
  };

  const handleSendTip = async () => {
    if (!selectedParcelForTip) return;

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (amount > 50) {
      Alert.alert('Erreur', 'Le pourboire ne peut pas dépasser 50€');
      return;
    }

    setIsSendingTip(true);
    try {
      await api.createTip(selectedParcelForTip.id, amount, tipMessage || undefined);

      Alert.alert(
        '✅ Pourboire envoyé !',
        `Merci d'avoir laissé ${amount.toFixed(2)}€ de pourboire au livreur !`,
        [{ text: 'OK' }]
      );

      setShowTipModal(false);
      setSelectedParcelForTip(null);
      setTipAmount('');
      setTipMessage('');

      // Marquer le colis comme ayant un pourboire
      setParcels(parcels.map(p =>
        p.id === selectedParcelForTip.id ? { ...p, hasTip: true } : p
      ));
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le pourboire');
    } finally {
      setIsSendingTip(false);
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

            <View style={styles.actionsRow}>
              {item.status === 'DELIVERED' && !item.hasReview && (
                <Chip
                  icon="star"
                  compact
                  style={styles.reviewChip}
                  textStyle={styles.reviewChipText}
                  onPress={() => navigation.navigate('Review', {
                    parcelId: item.id,
                    carrierName: item.assignedCarrier?.firstName,
                    dropoffName: item.dropoffName,
                  })}
                >
                  Laisser un avis
                </Chip>
              )}

              {item.hasReview && item.reviews && item.reviews[0] && (
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons
                      key={star}
                      name={star <= item.reviews[0].rating ? 'star' : 'star-outline'}
                      size={16}
                      color="#F59E0B"
                    />
                  ))}
                </View>
              )}

              {item.status === 'DELIVERED' && !item.hasTip && (
                <Chip
                  icon="cash"
                  compact
                  style={styles.tipChip}
                  textStyle={styles.tipChipText}
                  onPress={() => handleOpenTipModal(item)}
                >
                  Pourboire
                </Chip>
              )}

              {item.hasTip && (
                <Chip
                  icon="check-circle"
                  compact
                  style={styles.tipGivenChip}
                  textStyle={styles.tipGivenChipText}
                  disabled
                >
                  Pourboire donné
                </Chip>
              )}
            </View>
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

      <Portal>
        <Modal
          visible={showTipModal}
          onDismiss={() => setShowTipModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Laisser un pourboire
            </Text>

            {selectedParcelForTip && (
              <View style={styles.modalParcelInfo}>
                <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
                <Text variant="bodyMedium">
                  Livraison vers {selectedParcelForTip.dropoffName}
                </Text>
              </View>
            )}

            {selectedParcelForTip?.assignedCarrier && (
              <View style={styles.modalCarrierInfo}>
                <MaterialCommunityIcons name="account" size={20} color={colors.secondary} />
                <Text variant="bodyMedium">
                  Livreur: {selectedParcelForTip.assignedCarrier.firstName}
                </Text>
              </View>
            )}

            <TextInput
              label="Montant (€)"
              value={tipAmount}
              onChangeText={setTipAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              placeholder="Ex: 5.00"
              left={<TextInput.Icon icon="cash" />}
            />

            <Text variant="bodySmall" style={styles.helpText}>
              Montant maximum: 50€
            </Text>

            <TextInput
              label="Message (optionnel)"
              value={tipMessage}
              onChangeText={setTipMessage}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Merci pour la livraison !"
              left={<TextInput.Icon icon="message-text" />}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowTipModal(false)}
                style={styles.modalButton}
                disabled={isSendingTip}
              >
                Annuler
              </Button>
              <Button
                mode="contained"
                onPress={handleSendTip}
                style={styles.modalButton}
                loading={isSendingTip}
                disabled={isSendingTip || !tipAmount}
              >
                Envoyer
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
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
  starsRow: {
    flexDirection: 'row',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tipChip: {
    backgroundColor: '#10B981',
  },
  tipChipText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  tipGivenChip: {
    backgroundColor: colors.surfaceVariant,
  },
  tipGivenChipText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    marginBottom: spacing.md,
    color: colors.onSurface,
    fontWeight: '600',
  },
  modalParcelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
  },
  modalCarrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 8,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  helpText: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});