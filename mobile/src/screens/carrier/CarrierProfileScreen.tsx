import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';

interface CarrierStats {
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  availableBalance: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: {
    firstName: string;
    lastName?: string;
  };
}

export function CarrierProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CarrierStats>({
    totalDeliveries: 0,
    totalEarnings: 0,
    averageRating: null,
    totalReviews: 0,
    availableBalance: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      // Charger le profil carrier + solde + avis en parallèle
      const [profile, balance, reviewsData] = await Promise.all([
        api.getCarrierProfile(),
        api.getCarrierBalance(),
        api.getMyReviews(),
      ]);

      setStats({
        totalDeliveries: profile.totalDeliveries || 0,
        totalEarnings: balance.total || 0,
        averageRating: profile.averageRating,
        totalReviews: reviewsData.stats?.totalReviews || 0,
        availableBalance: balance.available || 0,
      });

      setReviews(reviewsData.reviews || []);
    } catch (e) {
      console.error('Erreur chargement profil:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

    const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('common.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploading(true);
    try {
      const avatarUrl = await api.uploadImage(uri);
      await api.updateProfile({ avatarUrl });

      // Mettre à jour le store local
      if (user) {
        updateUser({ ...user, avatarUrl });
      }

      Alert.alert(t('common.success'), t('shared.profile.photoUpdated'));
    } catch (e: any) {
      Alert.alert(t('common.error'), t('shared.profile.photoError'));
    } finally {
      setIsUploading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <Text style={styles.noRating}>{t('carrier.profile.notRated')}</Text>;

    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= Math.round(rating) ? 'star' : 'star-outline'}
            size={24}
            color="#F59E0B"
          />
        ))}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen message={t('carrier.profile.loadingProfile')} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={takePhoto} disabled={isUploading}>
          {user?.avatarUrl ? (
            <Avatar.Image
              size={100}
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Icon
              size={100}
              icon="account"
              style={styles.avatar}
            />
          )}
          <View style={styles.editBadge}>
            <MaterialCommunityIcons
              name={isUploading ? 'loading' : 'camera'}
              size={16}
              color="white"
            />
          </View>
        </TouchableOpacity>
        <Text variant="headlineSmall" style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
      </View>

      {/* Stats Card - en premier après l'avatar */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('carrier.profile.stats')}
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="package-variant-closed-check" size={32} color={colors.primary} />
              <Text variant="headlineSmall" style={styles.statValue}>
                {stats.totalDeliveries}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('carrier.profile.deliveries')}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="cash-multiple" size={32} color="#10B981" />
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#10B981' }]}>
                {stats.totalEarnings.toFixed(0)}€
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('carrier.profile.earned')}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={32} color="#F59E0B" />
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#F59E0B' }]}>
                {stats.averageRating?.toFixed(1) || '-'}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('carrier.profile.rating')}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Balance Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.balanceHeader}>
            <MaterialCommunityIcons name="wallet" size={32} color={colors.primary} />
            <Text variant="titleMedium" style={styles.balanceTitle}>{t('carrier.profile.wallet')}</Text>
          </View>
          <Text variant="displaySmall" style={styles.balanceAmount}>
            {stats.availableBalance.toFixed(2)} €
          </Text>
          <Text variant="bodySmall" style={styles.balanceHint}>
            {t('carrier.profile.availableBalance')}
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.earningsRow}>
            <Text variant="bodyMedium" style={styles.earningsLabel}>{t('carrier.profile.totalEarnings')}</Text>
            <Text variant="titleMedium" style={styles.earningsValue}>
              {stats.totalEarnings.toFixed(2)} €
            </Text>
          </View>
          <Button
            mode="contained"
            icon="bank-transfer"
            style={styles.withdrawButton}
            disabled={stats.availableBalance < 10}
          >
            {t('carrier.profile.requestTransfer')}
          </Button>
          {stats.availableBalance < 10 && (
            <Text variant="bodySmall" style={styles.withdrawHint}>
              {t('carrier.profile.minTransfer')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Rating Card */}
      <Card style={styles.card}>
        <Card.Content style={styles.ratingCard}>
          <MaterialCommunityIcons name="star-circle" size={40} color="#F59E0B" />
          <View style={styles.ratingInfo}>
            <Text variant="titleMedium">{t('carrier.profile.averageRating')}</Text>
            {renderStars(stats.averageRating)}
            <Text variant="bodySmall" style={styles.reviewCount}>
              {stats.totalReviews} {t('carrier.profile.reviews')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Reviews Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('carrier.profile.reviewsTitle')}
          </Text>
          {reviews.length === 0 ? (
            <Text variant="bodyMedium" style={styles.noReviewsText}>
              {t('carrier.profile.noReviews')}
            </Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialCommunityIcons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text variant="bodySmall" style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.reviewAuthor}>
                  {review.reviewer?.firstName
                    ? review.reviewer.firstName + (review.reviewer.lastName ? ` ${review.reviewer.lastName.charAt(0)}.` : '')
                    : t('carrier.profile.anonymous')}
                </Text>
                {review.comment ? (
                  <Text variant="bodyMedium" style={styles.reviewComment}>
                    {review.comment}
                  </Text>
                ) : null}
                <Divider style={styles.reviewDivider} />
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />

      <PhotoPreviewModal
        visible={!!previewUri}
        photoUri={previewUri}
        aspectRatio={[1, 1]}
        onValidate={(uri) => {
          setPreviewUri(null);
          uploadAvatar(uri);
        }}
        onRetake={() => setPreviewUri(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
  },
  avatar: {
    backgroundColor: colors.primaryContainer,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    marginTop: spacing.md,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  email: {
    color: colors.onSurfaceVariant,
  },
  card: {
    margin: spacing.md,
    marginBottom: 0,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingInfo: {
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingText: {
    marginLeft: spacing.sm,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  noRating: {
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  reviewCount: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  balanceTitle: {
    color: colors.onSurface,
  },
  balanceAmount: {
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  balanceHint: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  divider: {
    marginVertical: spacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  earningsLabel: {
    color: colors.onSurfaceVariant,
  },
  earningsValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  withdrawButton: {
    marginTop: spacing.sm,
  },
  withdrawHint: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  noReviewsText: {
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  reviewItem: {
    marginTop: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    color: colors.onSurfaceVariant,
  },
  reviewAuthor: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '600',
  },
  reviewComment: {
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  reviewDivider: {
    marginTop: spacing.sm,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
