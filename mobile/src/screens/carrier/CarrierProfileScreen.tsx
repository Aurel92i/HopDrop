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

interface CarrierStats {
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number | null;
  totalReviews: number;
  availableBalance: number;
}

export function CarrierProfileScreen() {
  const { user, updateUser } = useAuthStore();
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

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      // Charger le profil carrier
      const profile = await api.getCarrierProfile();
      
      // Charger les avis reçus pour les stats
      const reviewsData = await api.getMyReviews();
      
      // Charger l'historique pour les gains
      const history = await api.getMissionHistory(1, 100);
      
      const deliveredMissions = history.missions?.filter((m: any) => m.status === 'DELIVERED') || [];
      const totalEarnings = deliveredMissions.reduce((sum: number, m: any) => 
        sum + (m.parcel ? Number(m.parcel.price) * 0.8 : 0), 0
      );

      setStats({
        totalDeliveries: deliveredMissions.length,
        totalEarnings,
        averageRating: profile.averageRating,
        totalReviews: reviewsData.stats?.totalReviews || 0,
        availableBalance: profile.balance || 0,
      });
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploading(true);
    try {
      const uploadResult = await api.uploadFile(uri, 'avatars');
      await api.updateProfile({ avatarUrl: uploadResult.url });
      
      // Mettre à jour le store local
      if (user) {
        updateUser({ ...user, avatarUrl: uploadResult.url });
      }
      
      Alert.alert('Succès', 'Photo de profil mise à jour !');
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    } finally {
      setIsUploading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <Text style={styles.noRating}>Pas encore noté</Text>;
    
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
    return <LoadingScreen message="Chargement du profil..." />;
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
        <TouchableOpacity onPress={pickImage} disabled={isUploading}>
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

      {/* Rating Card */}
      <Card style={styles.card}>
        <Card.Content style={styles.ratingCard}>
          <MaterialCommunityIcons name="star-circle" size={40} color="#F59E0B" />
          <View style={styles.ratingInfo}>
            <Text variant="titleMedium">Note moyenne</Text>
            {renderStars(stats.averageRating)}
            <Text variant="bodySmall" style={styles.reviewCount}>
              {stats.totalReviews} avis reçus
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Balance Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.balanceHeader}>
            <MaterialCommunityIcons name="wallet" size={32} color={colors.primary} />
            <Text variant="titleMedium" style={styles.balanceTitle}>Ma cagnotte</Text>
          </View>
          <Text variant="displaySmall" style={styles.balanceAmount}>
            {stats.availableBalance.toFixed(2)} €
          </Text>
          <Text variant="bodySmall" style={styles.balanceHint}>
            Gains disponibles pour retrait
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.earningsRow}>
            <Text variant="bodyMedium" style={styles.earningsLabel}>Gains totaux</Text>
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
            Demander un virement
          </Button>
          {stats.availableBalance < 10 && (
            <Text variant="bodySmall" style={styles.withdrawHint}>
              Minimum 10€ pour demander un virement
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Stats Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            📊 Statistiques
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="package-variant-closed-check" size={32} color={colors.primary} />
              <Text variant="headlineSmall" style={styles.statValue}>
                {stats.totalDeliveries}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Livraisons</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="cash-multiple" size={32} color="#10B981" />
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#10B981' }]}>
                {stats.totalEarnings.toFixed(0)}€
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Gagnés</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={32} color="#F59E0B" />
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#F59E0B' }]}>
                {stats.averageRating?.toFixed(1) || '-'}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Note</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
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
  bottomSpacing: {
    height: spacing.xl,
  },
});