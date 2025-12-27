import { prisma } from '../../shared/prisma.js';
import { calculateDistance } from './missions.matching.js';
import {
  AvailableMissionsQuery,
  DeliverMissionInput,
  CancelMissionInput,
  UpdateLocationInput,
  UpdateAvailabilityInput,
  UpdateCarrierSettingsInput,
} from './missions.schemas.js';
import { calculatePrice } from '../parcels/parcels.pricing.js';

export class MissionsService {
  async getAvailableMissions(carrierId: string, query: AvailableMissionsQuery) {
    const { latitude, longitude, radius } = query;

    const pendingParcels = await prisma.parcel.findMany({
      where: {
        status: 'PENDING',
        pickupSlotStart: { gt: new Date() },
        vendorId: { not: carrierId },
      },
      include: {
        pickupAddress: true,
        vendor: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const parcelsWithDistance = pendingParcels
      .map((parcel) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          parcel.pickupAddress.latitude,
          parcel.pickupAddress.longitude
        );

        const pricing = calculatePrice({ size: parcel.size });

        return {
          id: parcel.id,
          size: parcel.size,
          description: parcel.description,
          dropoffType: parcel.dropoffType,
          dropoffName: parcel.dropoffName,
          pickupSlot: {
            start: parcel.pickupSlotStart,
            end: parcel.pickupSlotEnd,
          },
          price: {
            total: Number(parcel.price),
            carrierPayout: pricing.carrierPayout,
          },
          distance,
          pickupAddress: {
            id: parcel.pickupAddress.id,
            latitude: parcel.pickupAddress.latitude,
            longitude: parcel.pickupAddress.longitude,
            city: parcel.pickupAddress.city,
            postalCode: parcel.pickupAddress.postalCode,
            street: parcel.pickupAddress.street,
          },
          vendor: parcel.vendor,
        };
      })
      .filter((parcel) => parcel.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return { missions: parcelsWithDistance };
  }

  async acceptMission(carrierId: string, parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        pickupAddress: true,
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'PENDING') {
      throw new Error("Ce colis n'est plus disponible");
    }

    if (parcel.vendorId === carrierId) {
      throw new Error('Vous ne pouvez pas accepter votre propre colis');
    }

    const [mission] = await prisma.$transaction([
      prisma.mission.create({
        data: {
          parcelId,
          carrierId,
          status: 'ACCEPTED',
        },
      }),
      prisma.parcel.update({
        where: { id: parcelId },
        data: {
          status: 'ACCEPTED',
          assignedCarrierId: carrierId,
        },
      }),
    ]);

    return {
      mission,
      parcel: {
        ...parcel,
        pickupCode: parcel.pickupCode,
      },
    };
  }

  async getCurrentMissions(carrierId: string) {
    const missions = await prisma.mission.findMany({
      where: {
        carrierId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP'] },
      },
      include: {
        parcel: {
          include: {
            pickupAddress: true,
            vendor: {
              select: {
                id: true,
                firstName: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    return { missions };
  }

  async getMissionHistory(carrierId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where: {
          carrierId,
          status: { in: ['DELIVERED', 'CANCELLED'] },
        },
        include: {
          parcel: {
            select: {
              id: true,
              size: true,
              price: true,
              dropoffName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mission.count({
        where: {
          carrierId,
          status: { in: ['DELIVERED', 'CANCELLED'] },
        },
      }),
    ]);

    return {
      missions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===== PICKUP MISSION - MODIFIÉ =====
  async pickupMission(carrierId: string, missionId: string) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: { 
        parcel: {
          select: {
            id: true,
            status: true,
            packagingConfirmedAt: true,
            vendorPackagingConfirmedAt: true,
          },
        },
      },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    // Vérifier le statut de la mission (ACCEPTED ou IN_PROGRESS)
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(mission.status)) {
      throw new Error('Cette mission ne peut pas être marquée comme récupérée');
    }

    // ===== VÉRIFIER QUE L'EMBALLAGE EST CONFIRMÉ DES DEUX CÔTÉS =====
    if (!mission.parcel.packagingConfirmedAt) {
      throw new Error('Vous devez d\'abord confirmer l\'emballage avec une photo');
    }

    if (!mission.parcel.vendorPackagingConfirmedAt) {
      throw new Error('Le client doit d\'abord confirmer l\'emballage');
    }

    const [updatedMission] = await prisma.$transaction([
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: 'PICKED_UP',
          pickedUpAt: new Date(),
        },
        include: {
          parcel: {
            include: {
              pickupAddress: true,
              vendor: {
                select: {
                  id: true,
                  firstName: true,
                  fcmToken: true,
                },
              },
            },
          },
        },
      }),
      prisma.parcel.update({
        where: { id: mission.parcel.id },
        data: { status: 'PICKED_UP' },
      }),
    ]);

    return updatedMission;
  }

  // ===== DELIVER MISSION - GARDÉ POUR COMPATIBILITÉ =====
  // Note: Utiliser plutôt DeliveryService.confirmDelivery() pour le nouveau flow
  async deliverMission(carrierId: string, missionId: string, input: DeliverMissionInput) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: { parcel: true },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (mission.status !== 'PICKED_UP') {
      throw new Error("Le colis doit d'abord être récupéré");
    }

    // Calculer la deadline de confirmation (12H)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 12);

    const [updatedMission] = await prisma.$transaction([
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          proofPhotoUrl: input.proofPhotoUrl,
          deliveryProofUrl: input.proofPhotoUrl, // Nouveau champ
          deliveryConfirmationDeadline: deadline,
          carrierNotes: input.notes,
        },
        include: {
          parcel: true,
        },
      }),
      // Note: On ne change PAS le statut du colis ici
      // Il passera à DELIVERED après confirmation client ou auto-confirmation
    ]);

    return {
      mission: updatedMission,
      confirmationDeadline: deadline,
      hoursRemaining: 12,
    };
  }

  async cancelMission(carrierId: string, missionId: string, input: CancelMissionInput) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (mission.status !== 'ACCEPTED') {
      throw new Error('Seules les missions acceptées (non récupérées) peuvent être annulées');
    }

    await prisma.$transaction([
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: 'CANCELLED',
          carrierNotes: input.reason,
        },
      }),
      prisma.parcel.update({
        where: { id: mission.parcelId },
        data: {
          status: 'PENDING',
          assignedCarrierId: null,
        },
      }),
    ]);

    return { message: 'Mission annulée' };
  }

  // Carrier profile methods
  async updateAvailability(carrierId: string, input: UpdateAvailabilityInput) {
    const profile = await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: { isAvailable: input.isAvailable },
    });

    return profile;
  }

  async updateLocation(carrierId: string, input: UpdateLocationInput) {
    const profile = await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: {
        currentLatitude: input.latitude,
        currentLongitude: input.longitude,
        lastLocationUpdate: new Date(),
      },
    });

    return profile;
  }

  async updateSettings(carrierId: string, input: UpdateCarrierSettingsInput) {
    const profile = await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: {
        ...(input.coverageRadiusKm && { coverageRadiusKm: input.coverageRadiusKm }),
      },
    });

    return profile;
  }

  async getCarrierProfile(carrierId: string) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) {
      throw new Error('Profil carrier non trouvé');
    }

    return profile;
  }

  async getCarrierLocation(carrierId: string) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
      select: {
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        user: {
          select: {
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error('Livreur non trouvé');
    }

    return {
      latitude: profile.currentLatitude,
      longitude: profile.currentLongitude,
      lastUpdate: profile.lastLocationUpdate,
      carrier: profile.user,
    };
  }
}