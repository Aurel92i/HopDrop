import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialiser les notifications et obtenir le token
   */
  async initialize(): Promise<string | null> {
    try {
      // Vérifier si c'est un appareil physique
      if (!Device.isDevice) {
        console.log('⚠️ Les notifications push nécessitent un appareil physique');
        return null;
      }

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission notifications refusée');
        return null;
      }

      // Configurer le canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('hopdrop_default', {
          name: 'HopDrop',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
        });
      }

      // Obtenir le token Expo Push
      // On utilise le projectId de l'app.json/app.config.js
      const projectId = Constants.expoConfig?.extra?.eas?.projectId 
        ?? Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      this.expoPushToken = tokenData.data;
      console.log('📱 Push Token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      return null;
    }
  }

  /**
   * Enregistrer le token sur le serveur
   */
  async registerToken(): Promise<boolean> {
    try {
      const token = this.expoPushToken || (await this.initialize());
      
      if (!token) {
        console.log('Pas de token à enregistrer');
        return false;
      }

      await api.updateFcmToken(token);
      console.log('✅ Token enregistré sur le serveur');
      return true;
    } catch (error) {
      console.error('Erreur enregistrement token:', error);
      return false;
    }
  }

  /**
   * Écouter les notifications reçues
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Écouter les notifications cliquées
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Obtenir le token actuel
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Envoyer une notification locale (pour les tests)
   */
  async sendLocalNotification(title: string, body: string, data?: object) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Immédiat
    });
  }
}

export const notificationService = new NotificationService();