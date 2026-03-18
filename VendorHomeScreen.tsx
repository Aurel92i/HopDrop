import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../../stores/authStore';
import { ParcelCard } from '../../components/common/ParcelCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Logo } from '../../components/common/Logo';
import { InfoCarousel } from '../../components/common/InfoCarousel';
import { useParcelStore } from '../../stores/parcelStore';
import { VendorStackParamList } from '../../navigation/types';
import { hdColors, spacing, borderRadius } from '../../theme';
import { useTranslation, languageLabels, Language } from '../../i18n/i18nContext';
import { api } from '../../services/api';

type VendorHomeScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'VendorHome'>;
};

export function VendorHomeScreen({ navigation }: VendorHomeScreenProps) {
  const { parcels, isLoading, fetchParcels } = useParcelStore();
  const [filter, setFilter] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const { t, language, setLanguage } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const { user } = useAuthStore();

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchParcels(undefined);
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParcels(undefined);
    setRefreshing(false);
  };

  const filteredParcels = useMemo(() => {
    if (filter === 'all') return parcels;
    if (filter === 'accepted') {
      return parcels.filter((p) => p.status === 'ACCEPTED' || p.status === 'PICKED_UP');
    }
    return parcels.filter((p) => p.status === filter.toUpperCase());
  }, [parcels, filter]);

  const stats = useMemo(() => {
    const inProgress = parcels.filter(p => p.status === 'ACCEPTED' || p.status === 'PICKED_UP').length;
    return { inProgress };
  }, [parcels]);

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : '?';

  const profilePicture = (user as any)?.avatarUrl || (user as any)?.profilePicture || (user as any)?.avatar || null;

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour changer votre photo de profil.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        try {
          const base64Image = `data:image/jpeg;base64,${asset.base64}`;
          await api.updateProfile({ avatarUrl: base64Image });
          const { checkAuth } = useAuthStore.getState();
          await checkAuth();
          Alert.alert('Photo mise à jour !');
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Impossible de mettre à jour la photo.');
        }
      }
    } catch (e) {
      console.error('Erreur image picker:', e);
    }
  };

  if (isLoading && parcels.length === 0) {
    return <LoadingScreen message={t('vendor.home.loadingParcels')} />;
  }

  const tabs = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'accepted', label: 'En cours' },
  ];

  const renderHeader = () => (
    <View>
      {/* HopDrop centré */}
      <View style={styles.topBar}>
        <Logo size="medium" />
      </View>

      {/* Greeting card */}
      <View style={styles.greetingCard}>
        {/* Photo de profil avec crayon */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={handleChangePhoto} activeOpacity={0.7}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <MaterialCommunityIcons name="pencil" size={10} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Texte */}
        <View style={styles.greetingText}>
          <Text style={styles.greetingHello}>
            Salut {user?.firstName || ''} !
          </Text>
          <Text style={styles.greetingSummary}>
            {stats.inProgress > 0
              ? `${stats.inProgress} colis en cours de livraison`
              : 'Aucun colis en cours'}
          </Text>
        </View>

        {/* Boutons traduction + historique HORIZONTAUX */}
        <View style={styles.greetingActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="translate" size={18} color={hdColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VendorHistory')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="history" size={18} color={hdColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bandeau email */}
      {user && !user.emailVerified && (
        <TouchableOpacity
          style={styles.emailBanner}
          onPress={() => navigation.navigate('EmailVerification')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="email-alert" size={18} color="#92400E" />
          <Text style={styles.emailBannerText}>Vérifiez votre email pour créer des colis</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#92400E" />
        </TouchableOpacity>
      )}

      {/* Tabs simples Revolut */}
      <View style={styles.tabsContainer}>
        {/* Diaporama infos */}
      <InfoCarousel />
        <View style={styles.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, filter === tab.key ? styles.tabActive : styles.tabInactive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, filter === tab.key ? styles.tabTextActive : styles.tabTextInactive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredParcels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ParcelCard
            parcel={item}
            onPress={() => navigation.navigate('ParcelDetail', { parcelId: item.id })}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[hdColors.accent]}
            tintColor={hdColors.accent}
          />
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
        showsVerticalScrollIndicator={false}
      />

      {/* Modal langue */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('shared.settings.selectLanguage')}</Text>
            {(Object.keys(languageLabels) as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.modalOption, lang === language && styles.modalOptionActive]}
                onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, lang === language && styles.modalOptionTextActive]}>
                  {languageLabels[lang]}
                </Text>
                {lang === language && (
                  <MaterialCommunityIcons name="check" size={18} color={hdColors.accent} />
                )}
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
    backgroundColor: hdColors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // ===== TOP BAR =====
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingBottom: 8,
  },

  // ===== GREETING CARD =====
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: hdColors.border,
    gap: 12,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: hdColors.accent,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: hdColors.surface,
  },

  // Greeting text
  greetingText: {
    flex: 1,
    gap: 2,
  },
  greetingHello: {
    fontSize: 17,
    fontWeight: '700',
    color: hdColors.text,
    fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
  },
  greetingSummary: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },

  // Actions HORIZONTALES
  greetingActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: hdColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== EMAIL =====
  emailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF5E9',
    padding: 12,
    borderRadius: borderRadius.md,
    gap: 8,
    marginTop: 12,
  },
  emailBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },

  // ===== TABS REVOLUT =====
  tabsContainer: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: hdColors.surfaceSecondary,
    borderRadius: borderRadius.full,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: hdColors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: hdColors.text,
  },
  tabTextInactive: {
    color: hdColors.textTertiary,
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hdColors.text,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  modalOptionActive: {
    backgroundColor: hdColors.accent50,
  },
  modalOptionText: {
    fontSize: 16,
    color: hdColors.text,
  },
  modalOptionTextActive: {
    color: hdColors.accent,
    fontWeight: '700',
  },
});