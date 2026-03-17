import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { ProfileStackParamList } from '../../navigation/types';
import { hdColors, spacing, borderRadius } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';

const QS = Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' });

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout, updateUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const isCarrier = user?.role === 'CARRIER' || user?.role === 'BOTH';

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

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
        { text: t('shared.profile.logoutTitle'), style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const getRoleLabel = () => {
    if (user?.role === 'VENDOR') return t('shared.profile.roleVendor');
    if (user?.role === 'CARRIER') return t('shared.profile.roleCarrier');
    return t('shared.profile.roleBoth');
  };

  const getRoleIcon = (): string => {
    if (user?.role === 'VENDOR') return 'package-variant';
    if (user?.role === 'CARRIER') return 'bike';
    return 'swap-horizontal';
  };

  const menuItems = [
    {
      icon: 'map-marker-outline',
      title: t('shared.profile.addresses'),
      desc: t('shared.profile.addressesDesc'),
      onPress: () => navigation.navigate('Addresses'),
    },
    ...(isCarrier ? [{
      icon: 'file-document-outline',
      title: t('shared.profile.documents'),
      desc: t('shared.profile.documentsDesc'),
      onPress: () => navigation.navigate('CarrierDocuments'),
    }] : []),
    {
      icon: 'cog-outline',
      title: t('shared.profile.settings'),
      desc: t('shared.profile.settingsDesc'),
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={takePhoto} disabled={isUploading} style={styles.avatarWrapper}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <MaterialCommunityIcons name={isUploading ? 'loading' : 'camera'} size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.photoHint}>{t('shared.profile.tapToPhoto')}</Text>

        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name={getRoleIcon()} size={16} color={hdColors.accent} />
          <Text style={styles.roleText}>{getRoleLabel()}</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.title}>
            {index > 0 && <View style={styles.menuDivider} />}
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.menuIconCircle}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={hdColors.accent} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={hdColors.textTertiary} />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Carrier verification banner */}
      {isCarrier && (
        <View style={styles.verificationBanner}>
          <View style={styles.verificationIcon}>
            <MaterialCommunityIcons name="shield-check" size={22} color={hdColors.accent} />
          </View>
          <View style={styles.verificationText}>
            <Text style={styles.verificationTitle}>{t('shared.profile.verificationTitle')}</Text>
            <Text style={styles.verificationDesc}>{t('shared.profile.verificationDesc')}</Text>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <MaterialCommunityIcons name="logout" size={20} color="#C0392B" />
        <Text style={styles.logoutText}>{t('shared.profile.logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t('common.version')}</Text>

      <PhotoPreviewModal
        visible={!!previewUri}
        photoUri={previewUri}
        aspectRatio={[1, 1]}
        onValidate={(uri) => { setPreviewUri(null); uploadAvatar(uri); }}
        onRetake={() => setPreviewUri(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },

  // Profile card
  profileCard: {
    backgroundColor: hdColors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: hdColors.accent,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: hdColors.accent,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: hdColors.surface,
  },
  photoHint: {
    color: hdColors.textTertiary,
    fontSize: 12,
    marginTop: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: hdColors.text,
    marginTop: 14,
    fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
  },
  email: {
    fontSize: 14,
    color: hdColors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: hdColors.accent50,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: hdColors.accent,
  },

  // Menu
  menuCard: {
    backgroundColor: hdColors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.text,
  },
  menuDesc: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: hdColors.border,
    marginLeft: 70,
  },

  // Verification
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hdColors.accent50,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: borderRadius.lg,
    padding: 16,
    gap: 14,
  },
  verificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationText: {
    flex: 1,
    gap: 2,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: hdColors.text,
  },
  verificationDesc: {
    fontSize: 12,
    color: hdColors.textSecondary,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#C0392B',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C0392B',
  },

  version: {
    textAlign: 'center',
    color: hdColors.textTertiary,
    fontSize: 12,
    marginTop: 20,
    marginBottom: 40,
  },
});