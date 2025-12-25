import { prisma } from '../../shared/prisma.js';
import { NotificationService } from '../../shared/services/notification.service.js';

export class MissionTrackingService {
  private notificationService = new NotificationService();

  // Livreur clique "Je pars"
  async startJourney(missionId: string, carrierId: string, latitude: number, longitude: number) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: {
        parcel: {
          include: {
            vendor: true,
            pickupAddress: true,
          },
        },
      },
    });

    if (!mission) throw new Error('Mission non trouvée');
    if (mission.status !== 'ACCEPTED') throw new Error('Mission non valide');

    // Calculer l'ETA (estimation simple : 3 min/km en ville)
    const distance = this.calculateDistance(
      latitude,
      longitude,
      mission.parcel.pickupAddress.latitude,
      mission.parcel.pickupAddress.longitude
    );
    const etaMinutes = Math.ceil(distance * 3);
    const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        status: 'IN_PROGRESS',
        departedAt: new Date(),
        departureLatitude: latitude,
        departureLongitude: longitude,
        estimatedArrival,
      },
      include: {
        parcel: {
          include: {
            vendor: true,
            pickupAddress: true,
          },
        },
        carrier: {
          select: { firstName: true, avatarUrl: true },
        },
      },
    });

    // Mettre à jour le statut du colis
    await prisma.parcel.update({
      where: { id: mission.parcelId },
      data: { status: 'IN_PROGRESS' },
    });

    // Notifier le vendeur
    if (mission.parcel.vendor.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '🚴 Livreur en route !',
        `Votre livreur arrive dans environ ${etaMinutes} minutes`,
        { 
          type: 'carrier_departed',
          parcelId: mission.parcelId,
          missionId,
          eta: estimatedArrival.toISOString(),
        }
      );
    }

    return {
      mission: updatedMission,
      eta: {
        minutes: etaMinutes,
        arrival: estimatedArrival,
      },
    };
  }

  // Livreur clique "Je suis arrivé"
  async arrivedAtPickup(missionId: string, carrierId: string) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: {
        parcel: {
          include: { vendor: true },
        },
      },
    });

    if (!mission) throw new Error('Mission non trouvée');

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: { arrivedAt: new Date() },
      include: {
        parcel: {
          include: {
            vendor: true,
            pickupAddress: true,
          },
        },
        carrier: {
          select: { firstName: true, phone: true, avatarUrl: true },
        },
      },
    });

    // Notifier le vendeur
    if (mission.parcel.vendor.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '📍 Livreur arrivé !',
        `Votre livreur est arrivé et vous attend`,
        { 
          type: 'carrier_arrived',
          parcelId: mission.parcelId,
          missionId,
        }
      );
    }

    return updatedMission;
  }

  // Confirmer l'emballage (livreur)
  async confirmPackaging(missionId: string, carrierId: string, photoUrl: string) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: {
        parcel: {
          include: { vendor: true },
        },
      },
    });

    if (!mission) throw new Error('Mission non trouvée');

    await prisma.parcel.update({
      where: { id: mission.parcelId },
      data: {
        packagingPhotoUrl: photoUrl,
        packagingConfirmedAt: new Date(),
      },
    });

    // Notifier le vendeur
    if (mission.parcel.vendor.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '📦 Confirmez l\'emballage',
        'Le livreur a emballé votre colis. Veuillez confirmer.',
        { 
          type: 'packaging_confirmation',
          parcelId: mission.parcelId,
          missionId,
        }
      );
    }

    return { success: true };
  }

  // Confirmer l'emballage (vendeur)
  async vendorConfirmPackaging(parcelId: string, vendorId: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
    });

    if (!parcel) throw new Error('Colis non trouvé');
    if (!parcel.packagingConfirmedAt) throw new Error('Le livreur n\'a pas encore confirmé');

    await prisma.parcel.update({
      where: { id: parcelId },
      data: { vendorPackagingConfirmedAt: new Date() },
    });

    return { success: true };
  }

  // Helper pour calculer la distance
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}