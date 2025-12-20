import admin from 'firebase-admin';
import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma.js';

// Initialiser Firebase Admin
let firebaseInitialized = false;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
  }
} else {
  console.warn('⚠️ Firebase non configuré - notifications push désactivées');
}

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushService {
  /**
   * Envoyer une notification à un utilisateur
   */
  async sendToUser(userId: string, notification: PushNotification): Promise<boolean> {
    if (!firebaseInitialized) {
      console.log(`[PUSH SIMULÉ] To: ${userId}`, notification);
      return true;
    }

    try {
      // Récupérer le token FCM de l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      if (!user?.fcmToken) {
        console.log(`Pas de token FCM pour l'utilisateur ${userId}`);
        return false;
      }

      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'hopdrop_default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      console.log(`✅ Notification envoyée à ${userId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Erreur envoi notification à ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  async sendToUsers(userIds: string[], notification: PushNotification): Promise<number> {
    let successCount = 0;
    
    for (const userId of userIds) {
      const success = await this.sendToUser(userId, notification);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Envoyer une notification aux livreurs dans un rayon
   */
  async sendToNearbyCarriers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    notification: PushNotification
  ): Promise<number> {
    // Récupérer les livreurs disponibles dans le rayon
    const carriers = await prisma.carrierProfile.findMany({
      where: {
        isAvailable: true,
        documentsVerified: true,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      include: {
        user: {
          select: { id: true, fcmToken: true },
        },
      },
    });

    // Filtrer par distance
    const nearbyCarriers = carriers.filter((carrier) => {
      if (!carrier.currentLatitude || !carrier.currentLongitude) return false;
      
      const distance = this.calculateDistance(
        latitude,
        longitude,
        carrier.currentLatitude,
        carrier.currentLongitude
      );
      
      return distance <= radiusKm;
    });

    console.log(`📍 ${nearbyCarriers.length} livreurs trouvés dans un rayon de ${radiusKm}km`);

    // Envoyer les notifications
    const userIds = nearbyCarriers.map((c) => c.user.id);
    return this.sendToUsers(userIds, notification);
  }

  /**
   * Calculer la distance entre deux points (formule Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const pushService = new PushService();