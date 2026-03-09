import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar, List, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout, updateUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const isCarrier = user?.role === 'CARRIER' || user?.role === 'BOTH';

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

  const handleLogout = () => {
    Alert.alert(
      t('shared.profile.logoutTitle'),
      t('shared.profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shared.profile.logoutTitle'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const getRoleLabel = () => {
    if (user?.role === 'VENDOR') return `📦 ${t('shared.profile.roleVendor')}`;
    if (user?.role === 'CARRIER') return `🚴 ${t('shared.profile.roleCarrier')}`;
    return `📦🚴 ${t('shared.profile.roleBoth')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <TouchableOpacity onPress={takePhoto} disabled={isUploading}>
            {user?.avatarUrl ? (
              <Avatar.Image
                size={80}
                source={{ uri: user.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={80}
                label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
                style={styles.avatar}
              />
            )}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons
                name={isUploading ? 'loading' : 'camera'}
                size={14}
                color="white"
              />
            </View>
          </TouchableOpacity>
          <Text variant="bodySmall" style={styles.photoHint}>
            {t('shared.profile.tapToPhoto')}
          </Text>
          <Text variant="headlineSmall" style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user?.email}
          </Text>
          <Text variant="labelMedium" style={styles.role}>
            {getRoleLabel()}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard}>
        <List.Item
          title={t('shared.profile.addresses')}
          description={t('shared.profile.addressesDesc')}
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Addresses')}
        />
        <Divider />

        {isCarrier && (
          <>
            <List.Item
              title={t('shared.profile.documents')}
              description={t('shared.profile.documentsDesc')}
              left={(props) => <List.Icon {...props} icon="file-document-multiple" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('CarrierDocuments')}
            />
            <Divider />
          </>
        )}

        <List.Item
          title={t('shared.profile.settings')}
          description={t('shared.profile.settingsDesc')}
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
        />
      </Card>

      {isCarrier && (
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <List.Icon icon="shield-check" color={colors.primary} />
            <View style={styles.infoText}>
              <Text variant="titleSmall">{t('shared.profile.verificationTitle')}</Text>
              <Text variant="bodySmall" style={styles.infoDescription}>
                {t('shared.profile.verificationDesc')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor={colors.error}
        icon="logout"
      >
        {t('shared.profile.logout')}
      </Button>

      <Text variant="bodySmall" style={styles.version}>
        {t('common.version')}
      </Text>

      <PhotoPreviewModal
        visible={!!previewUri}
        photoUri={previewUri}
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
  profileCard: {
    margin: spacing.md,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  name: {
    marginTop: spacing.md,
    color: colors.onSurface,
  },
  email: {
    color: colors.onSurfaceVariant,
  },
  role: {
    marginTop: spacing.xs,
    color: colors.primary,
  },
  menuCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  infoCard: {
    margin: spacing.md,
    marginTop: 0,
    backgroundColor: colors.primaryContainer,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoDescription: {
    color: colors.onSurfaceVariant,
  },
  logoutButton: {
    margin: spacing.md,
    borderColor: colors.error,
  },
  version: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
});
