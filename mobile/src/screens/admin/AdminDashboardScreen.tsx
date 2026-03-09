import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  Linking,
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { AdminStats, PendingDocument, DocumentType } from '../../types';
import { useTranslation } from '../../i18n/i18nContext';

export function AdminDashboardScreen() {
  const { t } = useTranslation();

  const documentLabels: Record<DocumentType, string> = useMemo(() => ({
    ID_CARD_FRONT: t('admin.idFront'),
    ID_CARD_BACK: t('admin.idBack'),
    KBIS: t('admin.kbis'),
    VEHICLE_REGISTRATION: t('admin.vehicleReg'),
  }), [t]);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, docsRes] = await Promise.all([
        api.getAdminStats(),
        api.getPendingDocuments(),
      ]);
      setStats(statsRes);
      setDocuments(docsRes.documents);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Statistiques */}
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {t('admin.stats')}
      </Text>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="account-group" size={32} color={colors.primary} />
            <Text variant="headlineMedium" style={styles.statValue}>
              {stats?.users.total || 0}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.users')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="bike" size={32} color={colors.secondary} />
            <Text variant="headlineMedium" style={styles.statValue}>
              {stats?.carriers.verified || 0}/{stats?.carriers.total || 0}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.verifiedCarriers')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="file-clock" size={32} color={colors.error} />
            <Text variant="headlineMedium" style={styles.statValue}>
              {stats?.documents.pending || 0}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.pendingDocs')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="package-variant" size={32} color={colors.primary} />
            <Text variant="headlineMedium" style={styles.statValue}>
              {stats?.parcels.delivered || 0}/{stats?.parcels.total || 0}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.deliveredParcels')}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Documents en attente */}
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {t('admin.pendingDocuments')} ({documents.length})
      </Text>

      {documents.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.primary} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              {t('admin.noPendingDocuments')}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        documents.map((doc) => (
          <Card key={doc.id} style={styles.documentCard}>
            <Card.Content>
              {/* En-tete */}
              <View style={styles.docHeader}>
                <View>
                  <Text variant="titleMedium">
                    {doc.carrier.firstName} {doc.carrier.lastName}
                  </Text>
                  <Text variant="bodySmall" style={styles.docEmail}>
                    {doc.carrier.email}
                  </Text>
                </View>
                <Chip compact style={styles.docTypeChip}>
                  {documentLabels[doc.type]}
                </Chip>
              </View>

              {/* Image du document */}
              <View style={styles.docImageContainer}>
                <Image
                  source={{ uri: doc.fileUrl }}
                  style={styles.docImage}
                  resizeMode="contain"
                />
                <Button
                  mode="text"
                  icon="open-in-new"
                  onPress={() => openDocument(doc.fileUrl)}
                  style={styles.openButton}
                >
                  {t('admin.openFull')}
                </Button>
              </View>

              {/* Date */}
              <Text variant="bodySmall" style={styles.docDate}>
                {t('admin.sentOn')} {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
              </Text>

              {/* Actions */}
              <View style={styles.docActions}>
                <Button
                  mode="contained"
                  icon="check"
                  onPress={() => handleApprove(doc)}
                  style={styles.approveButton}
                  disabled={actionLoading}
                >
                  {t('admin.approve')}
                </Button>
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={() => handleRejectPress(doc)}
                  textColor={colors.error}
                  style={styles.rejectButton}
                  disabled={actionLoading}
                >
                  {t('admin.reject')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {/* Modal de rejet */}
      <Portal>
        <Modal
          visible={showRejectModal}
          onDismiss={() => setShowRejectModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t('admin.rejectDocument')}
          </Text>
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
            <Button
              mode="outlined"
              onPress={() => setShowRejectModal(false)}
              style={styles.modalButton}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleRejectConfirm}
              loading={actionLoading}
              disabled={actionLoading || !rejectReason.trim()}
              style={styles.modalButton}
              buttonColor={colors.error}
            >
              {t('admin.reject')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
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
  sectionTitle: {
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    color: colors.onSurface,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    backgroundColor: colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  documentCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  docEmail: {
    color: colors.onSurfaceVariant,
  },
  docTypeChip: {
    backgroundColor: colors.primaryContainer,
  },
  docImageContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  docImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
  },
  openButton: {
    marginTop: spacing.sm,
  },
  docDate: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  docActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  approveButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
    borderColor: colors.error,
  },
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  reasonInput: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
