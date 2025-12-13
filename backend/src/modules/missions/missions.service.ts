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

    // Récupérer tous les parcels PENDING avec leur adresse
    const pendingParcels = await prisma.parcel.findMany({
      where: {
        status: 'PENDING',
        pickupSlotStart: { gt: new Date() },
        vendorId: { not: carrierId }, // Exclure ses propres colis
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

    // Filtrer par distance et calculer la distance pour chaque parcel
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
          pickupArea: {
            city: parcel.pickupAddress.city,
            postalCode: parcel.pickupAddress.postalCode,
          },
          vendor: parcel.vendor,
        };
      })
      .filter((parcel) => parcel.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return { parcels: parcelsWithDistance };
  }

  async acceptMission(carrierId: string, parcelId: string) {
    // Vérifier que le parcel existe et est PENDING
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
      throw new Error('Ce colis n\'est plus disponible');
    }

    if (parcel.vendorId === carrierId) {
      throw new Error('Vous ne pouvez pas accepter votre propre colis');
    }

    // Créer la mission et mettre à jour le parcel
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
          carrierId,
        },
      }),
    ]);

    // Retourner la mission avec les détails complets
    return {
      mission,
      parcel: {
        ...parcel,
        pickupCode: parcel.pickupCode, // Maintenant visible pour le livreur
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
              deliveredAt: true,
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

  async pickupMission(carrierId: string, missionId: string) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: { parcel: true },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (mission.status !== 'ACCEPTED') {
      throw new Error('Cette mission ne peut pas être marquée comme récupérée');
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
            },
          },
        },
      }),
      prisma.parcel.update({
        where: { id: mission.parcelId },
        data: { status: 'PICKED_UP' },
      }),
    ]);

    return updatedMission;
  }

  async deliverMission(carrierId: string, missionId: string, input: DeliverMissionInput) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: { parcel: true },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (mission.status !== 'PICKED_UP') {
      throw new Error('Le colis doit d\'abord être récupéré');
    }

    const [updatedMission] = await prisma.$transaction([
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          proofPhotoUrl: input.proofPhotoUrl,
          carrierNotes: input.notes,
        },
        include: {
          parcel: true,
        },
      }),
      prisma.parcel.update({
        where: { id: mission.parcelId },
        data: { status: 'DELIVERED' },
      }),
      // Incrémenter le compteur de livraisons du carrier
      prisma.carrierProfile.update({
        where: { userId: carrierId },
        data: {
          totalDeliveries: { increment: 1 },
        },
      }),
    ]);

    return updatedMission;
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
          carrierId: null,
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
}