// Service de notification (stub pour le MVP)
// À remplacer par Firebase Cloud Messaging en production

export class NotificationService {
  async send(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Pour le MVP, on log simplement la notification
      console.log('📱 Notification:', {
        to: fcmToken.substring(0, 20) + '...',
        title,
        body,
        data,
      });

      // TODO: Implémenter Firebase Cloud Messaging
      // const message = {
      //   notification: { title, body },
      //   data,
      //   token: fcmToken,
      // };
      // await admin.messaging().send(message);

      return true;
    } catch (error) {
      console.error('Erreur envoi notification:', error);
      return false;
    }
  }

  async sendToMultiple(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      console.log('📱 Notifications multiples:', {
        count: fcmTokens.length,
        title,
        body,
      });

      // TODO: Implémenter Firebase Cloud Messaging multicast
      return true;
    } catch (error) {
      console.error('Erreur envoi notifications:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();