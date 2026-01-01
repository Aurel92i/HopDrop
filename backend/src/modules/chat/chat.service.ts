import { prisma } from '../../shared/prisma.js';
import { pushService } from '../notifications/push.service.js';

export class ChatService {
  /**
   * Obtenir ou créer une conversation pour un colis
   */
  async getOrCreateConversation(parcelId: string, userId: string) {
    // Vérifier que l'utilisateur a accès à ce colis
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      select: {
        id: true,
        vendorId: true,
        assignedCarrierId: true,
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.vendorId !== userId && parcel.assignedCarrierId !== userId) {
      throw new Error('Accès non autorisé à cette conversation');
    }

    // Chercher ou créer la conversation
    let conversation = await prisma.conversation.findUnique({
      where: { parcelId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
              },
            },
          },
        },
        parcel: {
          select: {
            id: true,
            vendorId: true,
            assignedCarrierId: true,
            vendor: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
              },
            },
            assignedCarrier: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { parcelId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          parcel: {
            select: {
              id: true,
              vendorId: true,
              assignedCarrierId: true,
              vendor: {
                select: {
                  id: true,
                  firstName: true,
                  avatarUrl: true,
                },
              },
              assignedCarrier: {
                select: {
                  id: true,
                  firstName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Envoyer un message
   */
  async sendMessage(conversationId: string, senderId: string, content: string) {
    // Vérifier que l'utilisateur a accès à cette conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        parcel: {
          select: {
            vendorId: true,
            assignedCarrierId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation non trouvée');
    }

    const { vendorId, assignedCarrierId } = conversation.parcel;

    if (senderId !== vendorId && senderId !== assignedCarrierId) {
      throw new Error('Accès non autorisé');
    }

    // Créer le message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Notifier l'autre utilisateur
    const recipientId = senderId === vendorId ? assignedCarrierId : vendorId;
    if (recipientId) {
      await pushService.sendToUser(recipientId, {
        title: `Message de ${message.sender.firstName}`,
        body: content.length > 50 ? content.substring(0, 50) + '...' : content,
        data: {
          type: 'new_message',
          conversationId,
        },
      });
    }

    return message;
  }

  /**
   * Marquer les messages comme lus
   */
  async markAsRead(conversationId: string, userId: string) {
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  /**
   * Obtenir les conversations d'un utilisateur
   */
  async getUserConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        parcel: {
          OR: [{ vendorId: userId }, { assignedCarrierId: userId }],
        },
      },
      include: {
        parcel: {
          select: {
            id: true,
            status: true,
            dropoffName: true,
            vendor: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
              },
            },
            assignedCarrier: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Ajouter le nombre de messages non lus
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          ...conv,
          unreadCount,
          lastMessage: conv.messages[0] || null,
        };
      })
    );

    return conversationsWithUnread;
  }
}