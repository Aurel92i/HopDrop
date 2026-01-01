import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

const LOCATION_TASK_NAME = 'HOPDROP_BACKGROUND_LOCATION';

// Définir la tâche en arrière-plan
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Erreur tâche localisation:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        await api.updateLocation(
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('📍 Position mise à jour:', location.coords);
      } catch (err) {
        console.error('Erreur envoi position:', err);
      }
    }
  }
});

class LocationService {
  private isTracking: boolean = false;
  private watchSubscription: Location.LocationSubscription | null = null;

  /**
   * Demander les permissions de localisation
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Permission au premier plan
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.log('Permission localisation premier plan refusée');
        return false;
      }

      // Permission en arrière-plan
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.log('Permission localisation arrière-plan refusée');
        // On peut quand même fonctionner sans l'arrière-plan
      }

      return true;
    } catch (error) {
      console.error('Erreur demande permissions:', error);
      return false;
    }
  }

  /**
   * Obtenir la position actuelle
   */
  async getCurrentPosition(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error('Erreur obtention position:', error);
      return null;
    }
  }

  /**
   * Démarrer le suivi de position (premier plan)
   */
  async startForegroundTracking(
    onLocationUpdate: (location: Location.LocationObject) => void,
    intervalMs: number = 10000
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Arrêter le suivi existant
      await this.stopTracking();

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 50, // Mise à jour tous les 50m
        },
        (location) => {
          onLocationUpdate(location);
          // Envoyer au serveur
          api.updateLocation(
            location.coords.latitude,
            location.coords.longitude
          ).catch(console.error);
        }
      );

      this.isTracking = true;
      console.log('✅ Suivi de position démarré (premier plan)');
      return true;
    } catch (error) {
      console.error('Erreur démarrage suivi:', error);
      return false;
    }
  }

  /**
   * Démarrer le suivi en arrière-plan
   */
  async startBackgroundTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

      if (!isTaskRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Toutes les 30 secondes
          distanceInterval: 100, // Ou tous les 100m
          deferredUpdatesInterval: 60000, // Batch toutes les minutes
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'HopDrop',
            notificationBody: 'Partage de position actif',
            notificationColor: '#4CAF50',
          },
        });
      }

      this.isTracking = true;
      console.log('✅ Suivi de position démarré (arrière-plan)');
      return true;
    } catch (error) {
      console.error('Erreur démarrage suivi arrière-plan:', error);
      return false;
    }
  }

  /**
   * Arrêter le suivi de position
   */
  async stopTracking(): Promise<void> {
    try {
      // Arrêter le suivi premier plan
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }

      // Arrêter le suivi arrière-plan
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
      console.log('🛑 Suivi de position arrêté');
    } catch (error) {
      console.error('Erreur arrêt suivi:', error);
    }
  }

  /**
   * Vérifier si le suivi est actif
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Calculer la distance entre deux points (en km)
   */
  calculateDistance(
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

export const locationService = new LocationService();