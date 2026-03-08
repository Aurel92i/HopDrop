import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Modal, TouchableOpacity } from 'react-native';
import { FAB, SegmentedButtons, Text, IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { ParcelCard } from '../../components/common/ParcelCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useParcelStore } from '../../stores/parcelStore';
import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { useTranslation, languageLabels, Language } from '../../i18n/i18nContext';

type VendorHomeScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'VendorHome'>;
};

export function VendorHomeScreen({ navigation }: VendorHomeScreenProps) {
  const { parcels, isLoading, fetchParcels } = useParcelStore();
  const [filter, setFilter] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const { t, language, setLanguage } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);

  const showLanguagePicker = () => {
    setShowLanguageModal(true);
  };

  // Ajouter le bouton historique et le bouton langue dans le header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="translate"
            size={24}
            onPress={showLanguagePicker}
          />
          <IconButton
            icon="history"
            size={24}
            onPress={() => navigation.navigate('VendorHistory')}
          />
        </View>
      ),
    });
  }, [navigation, language]);

  useFocusEffect(
    useCallback(() => {
      loadParcels();
    }, [filter])
  );

  const loadParcels = async () => {
    // Always fetch all parcels, filtering is done client-side
    await fetchParcels(undefined);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParcels();
    setRefreshing(false);
  };

  const filteredParcels = React.useMemo(() => {
    if (filter === 'all') return parcels;
    if (filter === 'accepted') {
      // Include both ACCEPTED and PICKED_UP statuses in "En cours" tab
      return parcels.filter((p) => p.status === 'ACCEPTED' || p.status === 'PICKED_UP');
    }
    return parcels.filter((p) => p.status === filter.toUpperCase());
  }, [parcels, filter]);

  if (isLoading && parcels.length === 0) {
    return <LoadingScreen message={t('vendor.home.loadingParcels')} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: t('vendor.home.all') },
            { value: 'pending', label: t('vendor.home.pending') },
            { value: 'accepted', label: t('vendor.home.inProgress') },
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
            title={t('vendor.home.noParcels')}
            description={t('vendor.home.noParcelsDesc')}
            actionLabel={t('vendor.home.createButton')}
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

      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableOpacity style={styles.langModalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>{t('shared.settings.selectLanguage')}</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.langModalOption}
                onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
              >
                <Text style={[styles.langModalOptionText, lang === language && { color: colors.primary, fontWeight: '700' }]}>
                  {languageLabels[lang]}{lang === language ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
  langModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  langModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '80%', maxWidth: 320 },
  langModalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  langModalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  langModalOptionText: { fontSize: 16, color: '#374151', textAlign: 'center' },
});
