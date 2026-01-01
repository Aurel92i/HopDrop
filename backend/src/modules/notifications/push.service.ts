// backend/src/modules/notifications/push.service.ts

import { prisma } from '../../shared/prisma.js';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class PushService {
  /**
   * Vérifier si un token est un Expo Push Token
   */
  private isExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Envoyer une notification à un utilisateur par son ID
   */
  async sendToUser(params: { userId: string; title: string; body: string; data?: Record<string, any> }): Promise<boolean> {
    const { userId, title, body, data } = params;
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true, firstName: true },
      });

      if (!user?.fcmToken) {
        console.log(`[PUSH] Pas de token pour ${userId}`);
        return false;
      }

      // Mode simulé si pas de token Expo valide
      if (!this.isExpoPushToken(user.fcmToken)) {
        console.log(`[PUSH SIMULÉ] To: ${user.firstName}`, { title, body });
        return true;
      }

      const message: ExpoPushMessage = {
        to: user.fcmToken,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'hopdrop_default',
      };

      const results = await this.sendPushNotifications([message]);
      const success = results.length > 0 && results[0].status === 'ok';
      
      if (success) {
        console.log(`✅ [PUSH] Envoyé à ${user.firstName}: "${title}"`);
      }
      
      return success;
    } catch (error: any) {
      console.error(`[PUSH] Erreur envoi à ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Notification: colis accepté par un livreur
   */
  async notifyParcelAccepted(vendorId: string, carrierName: string): Promise<boolean> {
    return this.sendToUser({
      userId: vendorId,
      title: '🎉 Livreur trouvé !',
      body: `${carrierName} va récupérer votre colis`,
      data: { type: 'PARCEL_ACCEPTED' },
    });
  }

  /**
   * Notification: colis récupéré
   */
  async notifyParcelPickedUp(vendorId: string): Promise<boolean> {
    return this.sendToUser({
      userId: vendorId,
      title: '📦 Colis récupéré',
      body: 'Votre colis est en route vers le point relais',
      data: { type: 'PARCEL_PICKED_UP' },
    });
  }

  /**
   * Notification: colis livré
   */
  async notifyParcelDelivered(vendorId: string): Promise<boolean> {
    return this.sendToUser({
      userId: vendorId,
      title: '✅ Colis déposé !',
      body: 'Votre colis a été déposé au point relais. Confirmez la livraison.',
      data: { type: 'PARCEL_DELIVERED' },
    });
  }

  /**
   * Notification: paiement reçu (livreur)
   */
  async notifyPaymentReceived(carrierId: string, amount: number): Promise<boolean> {
    return this.sendToUser({
      userId: carrierId,
      title: '💰 Paiement reçu !',
      body: `${amount.toFixed(2)} € ont été ajoutés à votre cagnotte`,
      data: { type: 'PAYMENT_RECEIVED', amount: amount.toString() },
    });
  }

  /**
   * Notification: nouvelle mission disponible (livreurs à proximité)
   */
  async notifyNewMissionAvailable(
    latitude: number,
    longitude: number,
    radiusKm: number,
    parcelInfo: { pickupAddress: string; price: number }
  ): Promise<number> {
    try {
      const carriers = await prisma.carrierProfile.findMany({
        where: {
          isAvailable: true,
          documentsVerified: true,
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
        include: {
          user: { select: { id: true, fcmToken: true, firstName: true } },
        },
      });

      // Filtrer par distance
      const nearbyCarriers = carriers.filter((carrier) => {
        if (!carrier.currentLatitude || !carrier.currentLongitude) return false;
        const distance = this.calculateDistance(
          latitude, longitude,
          carrier.currentLatitude, carrier.currentLongitude
        );
        return distance <= radiusKm;
      });

      console.log(`[PUSH] ${nearbyCarriers.length} livreurs dans ${radiusKm}km`);

      if (nearbyCarriers.length === 0) return 0;

      // Construire les messages
      const messages: ExpoPushMessage[] = nearbyCarriers
        .filter(c => c.user.fcmToken && this.isExpoPushToken(c.user.fcmToken))
        .map(c => ({
          to: c.user.fcmToken!,
          title: '🚴 Nouvelle mission !',
          body: `${parcelInfo.price.toFixed(2)} € - ${parcelInfo.pickupAddress}`,
          data: { type: 'NEW_MISSION' },
          sound: 'default' as const,
          priority: 'high' as const,
          channelId: 'hopdrop_default',
        }));

      if (messages.length === 0) return 0;

      const results = await this.sendPushNotifications(messages);
      return results.filter(r => r.status === 'ok').length;
    } catch (error: any) {
      console.error('[PUSH] Erreur notifyNewMission:', error.message);
      return 0;
    }
  }

  /**
   * Notification: emballage à valider (vendeur)
   */
  async notifyPackagingToValidate(vendorId: string): Promise<boolean> {
    return this.sendToUser({
      userId: vendorId,
      title: '📸 Emballage à valider',
      body: 'Le livreur a photographié l\'emballage. Veuillez le valider.',
      data: { type: 'PACKAGING_TO_VALIDATE' },
    });
  }

  /**
   * Notification: emballage validé (livreur)
   */
  async notifyPackagingValidated(carrierId: string): Promise<boolean> {
    return this.sendToUser({
      userId: carrierId,
      title: '✅ Emballage validé',
      body: 'Le vendeur a validé l\'emballage. Vous pouvez récupérer le colis.',
      data: { type: 'PACKAGING_VALIDATED' },
    });
  }

  /**
   * Notification: emballage refusé (livreur)
   */
  async notifyPackagingRejected(carrierId: string, reason: string): Promise<boolean> {
    return this.sendToUser({
      userId: carrierId,
      title: '❌ Emballage refusé',
      body: `Le vendeur a refusé l'emballage: ${reason}`,
      data: { type: 'PACKAGING_REJECTED', reason },
    });
  }

  /**
   * Notification: nouveau message chat
   */
  async notifyNewMessage(userId: string, senderName: string): Promise<boolean> {
    return this.sendToUser({
      userId,
      title: '💬 Nouveau message',
      body: `${senderName} vous a envoyé un message`,
      data: { type: 'NEW_MESSAGE' },
    });
  }

  /**
   * Envoyer les notifications via l'API Expo Push
   */
  private async sendPushNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const chunks = this.chunkArray(messages, 100);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        if (result.data) {
          tickets.push(...result.data);
        }
      } catch (error: any) {
        console.error('[PUSH] Erreur API Expo:', error.message);
      }
    }

    return tickets;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const pushService = new PushService();