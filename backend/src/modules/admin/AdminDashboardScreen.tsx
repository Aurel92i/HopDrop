import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  TextInput,
  Modal,
  Portal,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { AdminStats, PendingDocument, DocumentType } from '../../types';
import { useTranslation } from '../../i18n/i18nContext';

interface Dispute {
  id: string;
  parcelId: string;
  status: 'OPEN' | 'CONFIRMED_AFTER_CONTEST' | 'RESOLVED';
  contestedAt: string;
  contestReason: string;
  carrierResponse: string | null;
  carrierDisputeProofUrl: string | null;
  deliveryProofUrl: string | null;
  deliveredAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  vendor: { id: string; firstName: string; lastName: string; email: string; phone?: string };
  carrier: { id: string; firstName: string; lastName: string; email: string; phone?: string };
  parcel: { id: string; size: string; dropoffName: string; dropoffAddress: string; price: any; description?: string };
}

export function AdminDashboardScreen() {
  const { t } = useTranslation();

  const documentLabels: Record<DocumentType, string> = useMemo(() => ({
    ID_CARD_FRONT: t('admin.idFront'),
    ID_CARD_BACK: t('admin.idBack'),
    KBIS: t('admin.kbis'),
    VEHICLE_REGISTRATION: t('admin.vehicleReg'),
    DRIVING_LICENSE: 'Permis de conduire',
  }), [t]);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab active
  const [activeTab, setActiveTab] = useState<'stats' | 'documents' | 'disputes'>('stats');

  // Modal résolution litige
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, docsRes, disputesRes] = await Promise.all([
        api.getAdminStats(),
        api.getPendingDocuments(),
        api.getAdminDisputes().catch(() => ({ disputes: [] })),
      ]);
      setStats(statsRes);
      setDocuments(docsRes.documents);
      setDisputes(disputesRes.disputes || []);
    } catch (error: any) {
      console.error('Erreur chargement admin:', error);
      Alert.alert(t('common.error'), error.message || t('admin.loadError'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (doc: PendingDocument) => {
    Alert.alert(
      t('admin.approveDocumentTitle'),
      t('admin.approveDocumentMessage').replace('{docType}', documentLabels[doc.type]),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.approve'),
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.approveDocument(doc.id);
              Alert.alert(t('common.success'), t('admin.documentApproved'));
              loadData();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectPress = (doc: PendingDocument) => {
    setSelectedDoc(doc);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedDoc || !rejectReason.trim()) {
      Alert.alert(t('common.error'), t('admin.pleaseIndicateReason'));
      return;
    }

    setActionLoading(true);
    try {
      await api.rejectDocument(selectedDoc.id, rejectReason.trim());
      setShowRejectModal(false);
      Alert.alert(t('common.success'), t('admin.documentRejected'));
      loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDocument = (url: string) => {
    Linking.openURL(url);
  };

  // ===== RÉSOLUTION LITIGE =====
  const handleResolveDispute = async (resolution: 'CARRIER_WINS' | 'CLIENT_WINS' | 'REFUND') => {
    if (!selectedDispute) return;

    const labels: Record<string, string> = {
      CARRIER_WINS: 'en faveur du LIVREUR (paiement déclenché)',
      CLIENT_WINS: 'en faveur du CLIENT (remboursement)',
      REFUND: 'avec REMBOURSEMENT',
    };

    Alert.alert(
      'Confirmer la résolution',
      `Résoudre ce litige ${labels[resolution]} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.resolveAdminDispute(selectedDispute.id, resolution);
              setShowResolveModal(false);
              setSelectedDispute(null);
              Alert.alert('Succès', 'Litige résolu.');
              loadData();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const openDisputes = disputes.filter((d) => d.status === 'OPEN');

  // ===== RENDU ONGLETS =====
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
        onPress={() => setActiveTab('stats')}
      >
        <MaterialCommunityIcons name="chart-bar" size={20} color={activeTab === 'stats' ? colors.primary : colors.onSurfaceVariant} />
        <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
        onPress={() => setActiveTab('documents')}
      >
        <MaterialCommunityIcons name="file-document" size={20} color={activeTab === 'documents' ? colors.primary : colors.onSurfaceVariant} />
        <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
          Docs ({documents.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'disputes' && styles.tabActive]}
        onPress={() => setActiveTab('disputes')}
      >
        <MaterialCommunityIcons name="alert-circle" size={20} color={activeTab === 'disputes' ? colors.error : colors.onSurfaceVariant} />
        <Text style={[styles.tabText, activeTab === 'disputes' && { color: openDisputes.length > 0 ? colors.error : colors.primary, fontWeight: 'bold' }]}>
          Litiges ({openDisputes.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ===== RENDU STATS =====
  const renderStats = () => (
    <>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="account-group" size={32} color={colors.primary} />
            <Text variant="headlineMedium" style={styles.statValue}>{stats?.users.total || 0}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.users')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="bike" size={32} color={colors.secondary} />
            <Text variant="headlineMedium" style={styles.statValue}>{stats?.carriers.verified || 0}/{stats?.carriers.total || 0}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.verifiedCarriers')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="file-clock" size={32} color={colors.error} />
            <Text variant="headlineMedium" style={styles.statValue}>{stats?.documents.pending || 0}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.pendingDocs')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="package-variant" size={32} color={colors.primary} />
            <Text variant="headlineMedium" style={styles.statValue}>{stats?.parcels.delivered || 0}/{stats?.parcels.total || 0}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.deliveredParcels')}</Text>
          </Card.Content>
        </Card>
      </View>
    </>
  );

  // ===== RENDU DOCUMENTS =====
  const renderDocuments = () => (
    <>
      {documents.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.primary} />
            <Text variant="bodyLarge" style={styles.emptyText}>{t('admin.noPendingDocuments')}</Text>
          </Card.Content>
        </Card>
      ) : (
        documents.map((doc) => (
          <Card key={doc.id} style={styles.documentCard}>
            <Card.Content>
              <View style={styles.docHeader}>
                <View>
                  <Text variant="titleMedium">{doc.carrier.firstName} {doc.carrier.lastName}</Text>
                  <Text variant="bodySmall" style={styles.docEmail}>{doc.carrier.email}</Text>
                </View>
                <Chip compact style={styles.docTypeChip}>{documentLabels[doc.type]}</Chip>
              </View>

              <View style={styles.docImageContainer}>
                <Image source={{ uri: doc.fileUrl }} style={styles.docImage} resizeMode="contain" />
                <Button mode="text" icon="open-in-new" onPress={() => openDocument(doc.fileUrl)} style={styles.openButton}>
                  {t('admin.openFull')}
                </Button>
              </View>

              <Text variant="bodySmall" style={styles.docDate}>
                {t('admin.sentOn')} {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
              </Text>

              <View style={styles.docActions}>
                <Button mode="contained" icon="check" onPress={() => handleApprove(doc)} style={styles.approveButton} disabled={actionLoading}>
                  {t('admin.approve')}
                </Button>
                <Button mode="outlined" icon="close" onPress={() => handleRejectPress(doc)} textColor={colors.error} style={styles.rejectButton} disabled={actionLoading}>
                  {t('admin.reject')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </>
  );

  // ===== RENDU LITIGES =====
  const renderDisputes = () => (
    <>
      {disputes.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.primary} />
            <Text variant="bodyLarge" style={styles.emptyText}>Aucun litige en cours</Text>
          </Card.Content>
        </Card>
      ) : (
        disputes.map((dispute) => {
          const isOpen = dispute.status === 'OPEN';
          const isResolved = dispute.status === 'RESOLVED';
          const statusColor = isOpen ? colors.error : isResolved ? '#10B981' : '#F59E0B';
          const statusLabel = isOpen ? 'OUVERT' : isResolved ? `RÉSOLU (${dispute.resolution})` : 'CONFIRMÉ APRÈS CONTESTATION';

          return (
            <Card key={dispute.id} style={[styles.disputeCard, { borderLeftColor: statusColor }]}>
              <Card.Content>
                {/* Header */}
                <View style={styles.disputeHeader}>
                  <Chip compact style={[styles.disputeStatusChip, { backgroundColor: statusColor + '20' }]}>
                    <Text style={{ color: statusColor, fontWeight: 'bold', fontSize: 11 }}>{statusLabel}</Text>
                  </Chip>
                  <Text variant="bodySmall" style={styles.disputeDate}>
                    {formatDate(dispute.contestedAt)}
                  </Text>
                </View>

                {/* Acteurs */}
                <View style={styles.disputeActors}>
                  <View style={styles.disputeActor}>
                    <MaterialCommunityIcons name="account" size={16} color={colors.primary} />
                    <Text variant="bodySmall">Client : {dispute.vendor.firstName} {dispute.vendor.lastName}</Text>
                  </View>
                  <View style={styles.disputeActor}>
                    <MaterialCommunityIcons name="bike" size={16} color={colors.secondary} />
                    <Text variant="bodySmall">Livreur : {dispute.carrier.firstName} {dispute.carrier.lastName}</Text>
                  </View>
                </View>

                {/* Colis */}
                <View style={styles.disputeParcelInfo}>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Colis {dispute.parcel.size} → {dispute.parcel.dropoffName} — {Number(dispute.parcel.price).toFixed(2)}€
                  </Text>
                </View>

                <Divider style={{ marginVertical: spacing.sm }} />

                {/* Raison contestation */}
                <View style={styles.disputeSection}>
                  <Text variant="labelSmall" style={{ color: colors.error, fontWeight: '600' }}>
                    ⚠️ Raison de la contestation :
                  </Text>
                  <Text variant="bodyMedium" style={styles.disputeReason}>
                    {dispute.contestReason}
                  </Text>
                </View>

                {/* Réponse livreur */}
                {dispute.carrierResponse && (
                  <View style={styles.disputeSection}>
                    <Text variant="labelSmall" style={{ color: colors.secondary, fontWeight: '600' }}>
                      📝 Réponse du livreur :
                    </Text>
                    <Text variant="bodyMedium" style={styles.disputeResponse}>
                      {dispute.carrierResponse}
                    </Text>
                  </View>
                )}

                {/* Photos preuves */}
                <View style={styles.disputePhotos}>
                  {dispute.deliveryProofUrl && (
                    <TouchableOpacity onPress={() => openDocument(dispute.deliveryProofUrl!)}>
                      <View style={styles.proofThumb}>
                        <Image source={{ uri: dispute.deliveryProofUrl }} style={styles.proofImage} resizeMode="cover" />
                        <Text variant="labelSmall" style={styles.proofLabel}>Preuve dépôt</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {dispute.carrierDisputeProofUrl && (
                    <TouchableOpacity onPress={() => openDocument(dispute.carrierDisputeProofUrl!)}>
                      <View style={styles.proofThumb}>
                        <Image source={{ uri: dispute.carrierDisputeProofUrl }} style={styles.proofImage} resizeMode="cover" />
                        <Text variant="labelSmall" style={styles.proofLabel}>Preuve livreur</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Actions admin (seulement si ouvert) */}
                {isOpen && (
                  <View style={styles.disputeActions}>
                    <Button
                      mode="contained"
                      icon="gavel"
                      onPress={() => {
                        setSelectedDispute(dispute);
                        setShowResolveModal(true);
                      }}
                      style={styles.resolveButton}
                      buttonColor="#8B5CF6"
                    >
                      Résoudre le litige
                    </Button>
                  </View>
                )}

                {/* Résolution */}
                {isResolved && dispute.resolvedAt && (
                  <View style={styles.disputeResolutionBox}>
                    <MaterialCommunityIcons name="gavel" size={16} color="#10B981" />
                    <Text variant="bodySmall" style={{ color: '#10B981', flex: 1 }}>
                      Résolu le {formatDate(dispute.resolvedAt)} — {dispute.resolution}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })
      )}
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Onglets */}
      {renderTabs()}

      {/* Contenu selon l'onglet */}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'documents' && renderDocuments()}
      {activeTab === 'disputes' && renderDisputes()}

      {/* Modal de rejet document */}
      <Portal>
        <Modal
          visible={showRejectModal}
          onDismiss={() => setShowRejectModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>{t('admin.rejectDocument')}</Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            {selectedDoc && documentLabels[selectedDoc.type]}
          </Text>
          <TextInput
            label={t('admin.rejectReason')}
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
            numberOfLines={3}
            style={styles.reasonInput}
            placeholder={t('admin.rejectPlaceholder')}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowRejectModal(false)} style={styles.modalButton}>
              {t('common.cancel')}
            </Button>
            <Button mode="contained" onPress={handleRejectConfirm} loading={actionLoading} disabled={actionLoading || !rejectReason.trim()} style={styles.modalButton} buttonColor={colors.error}>
              {t('admin.reject')}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Modal résolution litige */}
      <Portal>
        <Modal
          visible={showResolveModal}
          onDismiss={() => setShowResolveModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>⚖️ Résoudre le litige</Text>
          {selectedDispute && (
            <>
              <Text variant="bodyMedium" style={styles.modalSubtitle}>
                {selectedDispute.vendor.firstName} vs {selectedDispute.carrier.firstName} — {selectedDispute.parcel.dropoffName}
              </Text>

              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <Button
                  mode="contained"
                  icon="bike"
                  onPress={() => handleResolveDispute('CARRIER_WINS')}
                  buttonColor="#10B981"
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Livreur a raison → Payer
                </Button>
                <Button
                  mode="contained"
                  icon="account"
                  onPress={() => handleResolveDispute('CLIENT_WINS')}
                  buttonColor={colors.error}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Client a raison → Rembourser
                </Button>
                <Button
                  mode="outlined"
                  icon="cash-refund"
                  onPress={() => handleResolveDispute('REFUND')}
                  textColor={colors.tertiary}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Remboursement global
                </Button>
                <Button
                  mode="text"
                  onPress={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                >
                  Annuler
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.onSurfaceVariant },
  // Onglets
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: colors.primaryContainer },
  tabText: { fontSize: 13, color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.primary, fontWeight: 'bold' },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '48%', backgroundColor: colors.surface },
  statContent: { alignItems: 'center', paddingVertical: spacing.md },
  statValue: { color: colors.onSurface, fontWeight: 'bold', marginTop: spacing.xs },
  statLabel: { color: colors.onSurfaceVariant },
  // Documents
  emptyCard: { backgroundColor: colors.surface },
  emptyContent: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.onSurfaceVariant, marginTop: spacing.md },
  documentCard: { marginBottom: spacing.md, backgroundColor: colors.surface },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  docEmail: { color: colors.onSurfaceVariant },
  docTypeChip: { backgroundColor: colors.primaryContainer },
  docImageContainer: { alignItems: 'center', marginVertical: spacing.md },
  docImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: colors.surfaceVariant },
  openButton: { marginTop: spacing.sm },
  docDate: { color: colors.onSurfaceVariant, textAlign: 'center' },
  docActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  approveButton: { flex: 1 },
  rejectButton: { flex: 1, borderColor: colors.error },
  // Modal
  modal: { backgroundColor: colors.surface, margin: spacing.lg, padding: spacing.lg, borderRadius: 12 },
  modalTitle: { marginBottom: spacing.xs },
  modalSubtitle: { color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  reasonInput: { marginBottom: spacing.lg, backgroundColor: colors.surface },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalButton: { flex: 1 },
  // Litiges
  disputeCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  disputeStatusChip: { borderRadius: 6 },
  disputeDate: { color: colors.onSurfaceVariant, fontSize: 11 },
  disputeActors: { gap: 4, marginBottom: spacing.sm },
  disputeActor: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  disputeParcelInfo: { marginBottom: spacing.xs },
  disputeSection: { marginTop: spacing.sm },
  disputeReason: { color: colors.onSurface, fontStyle: 'italic', marginTop: 4, lineHeight: 20 },
  disputeResponse: { color: colors.onSurface, marginTop: 4, lineHeight: 20 },
  disputePhotos: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  proofThumb: { alignItems: 'center' },
  proofImage: { width: 100, height: 80, borderRadius: 8, backgroundColor: colors.surfaceVariant },
  proofLabel: { color: colors.onSurfaceVariant, marginTop: 4, fontSize: 10 },
  disputeActions: { marginTop: spacing.md },
  resolveButton: { paddingVertical: spacing.xs },
  disputeResolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
});
