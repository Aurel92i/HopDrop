import admin from 'firebase-admin';
import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma.js';

// Initialiser Firebase si les credentials sont présentes
let firebaseApp: admin.app.App | null = null;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.log('Firebase initialization skipped:', error);
  }
}

export interface PushNotificationOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushService {
  async sendToUser(options: PushNotificationOptions): Promise<{ success: boolean }> {
    // Mode simulation si Firebase pas configuré
    if (!firebaseApp) {
      console.log('[PUSH SIMULATED]', {
        userId: options.userId,
        title: options.title,
        body: options.body,
      });
      return { success: true };
    }

    try {
      // Récupérer les tokens FCM de l'utilisateur (à implémenter plus tard)
      // Pour le MVP, on simule
      console.log('[PUSH]', options);
      return { success: true };
    } catch (error: any) {
      console.error('Push error:', error);
      return { success: false };
    }
  }

  // Notifications prédéfinies
  async notifyParcelAccepted(vendorId: string, carrierName: string) {
    return this.sendToUser({
      userId: vendorId,
      title: 'Colis accepté !',
      body: `${carrierName} va livrer votre colis`,
      data: { type: 'PARCEL_ACCEPTED' },
    });
  }

  async notifyCarrierArriving(vendorId: string, carrierName: string) {
    return this.sendToUser({
      userId: vendorId,
      title: 'Livreur en approche',
      body: `${carrierName} arrive pour récupérer votre colis`,
      data: { type: 'CARRIER_ARRIVING' },
    });
  }

  async notifyParcelPickedUp(vendorId: string) {
    return this.sendToUser({
      userId: vendorId,
      title: 'Colis récupéré',
      body: 'Votre colis est en cours de livraison',
      data: { type: 'PARCEL_PICKED_UP' },
    });
  }

  async notifyParcelDelivered(vendorId: string) {
    return this.sendToUser({
      userId: vendorId,
      title: 'Colis livré !',
      body: 'Votre colis a été déposé avec succès',
      data: { type: 'PARCEL_DELIVERED' },
    });
  }

  async notifyNewMissionAvailable(carrierId: string, city: string) {
    return this.sendToUser({
      userId: carrierId,
      title: 'Nouvelle mission disponible',
      body: `Un colis est disponible à ${city}`,
      data: { type: 'NEW_MISSION' },
    });
  }

  async notifyPaymentReceived(carrierId: string, amount: number) {
    return this.sendToUser({
      userId: carrierId,
      title: 'Paiement reçu',
      body: `Vous avez reçu ${amount.toFixed(2)}€`,
      data: { type: 'PAYMENT_RECEIVED' },
    });
  }
}