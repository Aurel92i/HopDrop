import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing } from '../../theme';
import { Message, Conversation } from '../../types';

type ChatScreenProps = NativeStackScreenProps<any, 'Chat'>;

export function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { parcelId } = route.params;
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadConversation = async () => {
    try {
      const { conversation: conv } = await api.getConversation(parcelId);
      setConversation(conv);
      setMessages(conv.messages || []);
      
      // Marquer comme lu
      if (conv.id) {
        await api.markConversationAsRead(conv.id);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de charger la conversation');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversation();
      
      // Rafraîchir toutes les 5 secondes
      const interval = setInterval(loadConversation, 5000);
      
      return () => clearInterval(interval);
    }, [parcelId])
  );

  useEffect(() => {
    // Mettre à jour le titre avec le nom du correspondant
    if (conversation) {
      const otherUser =
        user?.id === conversation.parcel.vendor.id
          ? conversation.parcel.assignedCarrier
          : conversation.parcel.vendor;
      
      navigation.setOptions({
        title: otherUser?.firstName || 'Chat',
      });
    }
  }, [conversation, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update - ajouter le message immédiatement
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      senderId: user?.id || '',
      content: messageContent,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id || '',
        firstName: user?.firstName || '',
        avatarUrl: user?.avatarUrl || null,
      },
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const { message } = await api.sendMessage(conversation.id, messageContent);
      // Remplacer le message temporaire par le vrai
      setMessages((prev) => 
        prev.map((m) => (m.id === tempMessage.id ? message : m))
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
      // Retirer le message temporaire
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageStatus = (message: Message, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;

    // Si c'est un message temporaire (envoi en cours)
    if (message.id.startsWith('temp-')) {
      return (
        <MaterialCommunityIcons
          name="clock-outline"
          size={14}
          color="rgba(255,255,255,0.5)"
          style={styles.statusIcon}
        />
      );
    }

    // Message envoyé et lu
    if (message.isRead) {
      return (
        <MaterialCommunityIcons
          name="check-all"
          size={14}
          color="#4FC3F7"
          style={styles.statusIcon}
        />
      );
    }

    // Message envoyé mais non lu
    return (
      <MaterialCommunityIcons
        name="check"
        size={14}
        color="rgba(255,255,255,0.7)"
        style={styles.statusIcon}
      />
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {renderMessageStatus(item, isOwnMessage)}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Parcel Info Banner */}
      <View style={styles.parcelBanner}>
        <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
        <Text variant="bodySmall" style={styles.parcelText} numberOfLines={1}>
          {conversation?.parcel.dropoffName}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={64}
              color={colors.onSurfaceVariant}
            />
            <Text variant="bodyLarge" style={styles.emptyText}>
              Aucun message
            </Text>
            <Text variant="bodySmall" style={styles.emptyHint}>
              Commencez la conversation !
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          style={styles.input}
          mode="outlined"
          outlineColor={colors.outline}
          activeOutlineColor={colors.primary}
          multiline
          maxLength={500}
        />
        <IconButton
          icon="send"
          mode="contained"
          containerColor={colors.primary}
          iconColor={colors.onPrimary}
          size={24}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parcelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  parcelText: {
    flex: 1,
    color: colors.onPrimaryContainer,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: colors.onPrimary,
  },
  otherMessageText: {
    color: colors.onSurface,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: colors.onSurfaceVariant,
  },
  statusIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  emptyHint: {
    color: colors.onSurfaceVariant,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.surface,
  },
});