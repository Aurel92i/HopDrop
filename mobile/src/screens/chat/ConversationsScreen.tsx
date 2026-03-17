import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { hdColors, borderRadius } from '../../theme';
import { Conversation } from '../../types';

type ConversationsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export function ConversationsScreen({ navigation }: ConversationsScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || data || []);
    } catch (e) {
      console.error('Erreur chargement conversations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      const interval = setInterval(loadConversations, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // Détermine l'autre utilisateur (si je suis le vendeur → afficher le carrier, et vice versa)
  const getOtherUser = (conv: Conversation) => {
    if (!user || !conv.parcel) return null;

    const vendor = conv.parcel.vendor;
    const carrier = conv.parcel.assignedCarrier;

    // Si je suis le vendeur → l'autre est le carrier
    if (vendor && vendor.id === user.id) {
      return carrier;
    }

    // Si je suis le carrier → l'autre est le vendeur
    if (carrier && carrier.id === user.id) {
      return vendor;
    }

    // Fallback : afficher le carrier s'il existe, sinon le vendeur
    return carrier || vendor;
  };

  const getDisplayName = (otherUser: { firstName: string; avatarUrl?: string | null } | null) => {
    if (!otherUser) return 'Utilisateur';
    return otherUser.firstName;
  };

  const getInitials = (otherUser: { firstName: string } | null) => {
    if (!otherUser) return '?';
    return otherUser.firstName.charAt(0).toUpperCase();
  };

  const getAvatarUrl = (otherUser: { avatarUrl?: string | null } | null) => {
    if (!otherUser || !otherUser.avatarUrl) return null;
    return otherUser.avatarUrl;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getUnreadCount = (conv: Conversation) => {
    if (!user || !conv.messages) return 0;
    return conv.messages.filter(m => !m.isRead && m.senderId !== user.id).length;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherUser(item);
    const displayName = getDisplayName(otherUser);
    const avatarUrl = getAvatarUrl(otherUser);
    const initials = getInitials(otherUser);
    const unreadCount = getUnreadCount(item);
    const hasUnread = unreadCount > 0;

    const lastMsg = item.lastMessage || (item.messages?.length ? item.messages[item.messages.length - 1] : null);
    const lastMessageContent = lastMsg?.content || 'Aucun message';
    const lastMessageTime = lastMsg?.createdAt;

    // Savoir si c'est moi qui ai envoyé le dernier message
    const isMyLastMessage = lastMsg?.senderId === user?.id;

    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => navigation.navigate('Chat', { parcelId: item.parcelId })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, hasUnread && styles.convNameUnread]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
              {formatTime(lastMessageTime)}
            </Text>
          </View>

          {/* Description du colis */}
          {item.parcel?.dropoffName && (
            <Text style={styles.convParcel} numberOfLines={1}>
              {item.parcel.dropoffName}
            </Text>
          )}

          {/* Dernier message */}
          <Text
            style={[styles.convMessage, hasUnread && styles.convMessageUnread]}
            numberOfLines={1}
          >
            {isMyLastMessage ? 'Vous : ' : ''}{lastMessageContent}
          </Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color={hdColors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      {/* Illustration */}
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyBubble1}>
          <MaterialCommunityIcons name="chat-outline" size={20} color={hdColors.accent} />
        </View>
        <View style={styles.emptyBubble2}>
          <MaterialCommunityIcons name="emoticon-happy-outline" size={16} color={hdColors.navy} />
        </View>
        <View style={styles.emptyIconMain}>
          <MaterialCommunityIcons name="chat-processing-outline" size={48} color={hdColors.accent} />
        </View>
      </View>

      <Text style={styles.emptyTitle}>Pas encore de messages</Text>
      <Text style={styles.emptyDesc}>
        Quand un livreur acceptera l'un de vos colis, vous pourrez échanger ici pour coordonner le retrait.
      </Text>

      {/* Tips */}
      <View style={styles.emptyTips}>
        <View style={styles.emptyTip}>
          <MaterialCommunityIcons name="package-variant" size={18} color={hdColors.accent} />
          <Text style={styles.emptyTipText}>Créez un colis depuis l'onglet "+"</Text>
        </View>
        <View style={styles.emptyTip}>
          <MaterialCommunityIcons name="account-check" size={18} color={hdColors.success} />
          <Text style={styles.emptyTipText}>Un livreur l'accepte</Text>
        </View>
        <View style={styles.emptyTip}>
          <MaterialCommunityIcons name="chat" size={18} color={hdColors.navy} />
          <Text style={styles.emptyTipText}>Discutez des détails ici</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[hdColors.accent]}
            tintColor={hdColors.accent}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: hdColors.accent,
    borderWidth: 2,
    borderColor: hdColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  convInfo: {
    flex: 1,
    gap: 2,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.text,
    flex: 1,
  },
  convNameUnread: {
    fontWeight: '800',
  },
  convTime: {
    fontSize: 12,
    color: hdColors.textTertiary,
    marginLeft: 8,
  },
  convTimeUnread: {
    color: hdColors.accent,
    fontWeight: '600',
  },
  convParcel: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },
  convMessage: {
    fontSize: 14,
    color: hdColors.textSecondary,
  },
  convMessageUnread: {
    color: hdColors.text,
    fontWeight: '600',
  },
  separator: {
    height: 0.5,
    backgroundColor: hdColors.border,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 120,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hdColors.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: hdColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  emptyIconMain: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBubble1: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hdColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBubble2: {
    position: 'absolute',
    bottom: 10,
    left: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8EDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTips: {
    width: '100%',
    backgroundColor: hdColors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginTop: 24,
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyTipText: {
    fontSize: 14,
    color: hdColors.text,
    fontWeight: '500',
  },
});