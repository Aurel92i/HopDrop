import { ParcelStatus, ParcelSize, DropoffType, Carrier, PickupMode } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { CreateParcelInput, UpdateParcelInput, ListParcelsQuery } from './parcels.schemas.js';
import { calculatePrice } from './parcels.pricing.js';


function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class ParcelsService {
  async createParcel(vendorId: string, input: CreateParcelInput) {
    // Vérifier que l'adresse appartient au vendeur
    const address = await prisma.address.findFirst({
      where: { id: input.pickupAddressId, userId: vendorId },
    });

    if (!address) {
      throw new Error('Adresse non trouvée');
    }

    let slotStart: Date;
    let slotEnd: Date;

    if (input.pickupMode === 'IMMEDIATE') {
      // Mode immédiat : créneau = maintenant + 2h
      slotStart = new Date();
      slotEnd = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h
    } else {
      // Mode programmé : valider les créneaux
      if (!input.pickupSlotStart || !input.pickupSlotEnd) {
        throw new Error('Les créneaux sont obligatoires pour une prise en charge programmée');
      }

      slotStart = new Date(input.pickupSlotStart);
      slotEnd = new Date(input.pickupSlotEnd);
      const now = new Date();

      if (slotStart <= now) {
        throw new Error('Le créneau doit être dans le futur');
      }

      if (slotEnd <= slotStart) {
        throw new Error('La fin du créneau doit être après le début');
      }

      const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60 * 60);
      if (slotDuration > 4) {
        throw new Error('Le créneau ne peut pas dépasser 4 heures');
      }

      if (slotDuration < 0.5) {
        throw new Error('Le créneau doit être d\'au moins 30 minutes');
      }
    }

    // Calculer le prix
    const pricing = calculatePrice({
      size: input.size as ParcelSize,
      weightEstimate: input.weightEstimate,
    });

    // Générer le code de récupération
    const pickupCode = generatePickupCode();

    // Créer le parcel
    const parcel = await prisma.parcel.create({
      data: {
        vendorId,
        pickupAddressId: input.pickupAddressId,
        dropoffType: input.dropoffType as DropoffType,
        dropoffName: input.dropoffName,
        dropoffAddress: input.dropoffAddress,
        size: input.size as ParcelSize,
        weightEstimate: input.weightEstimate,
        description: input.description,
        photoUrl: input.photoUrl,
        carrier: (input.carrier as Carrier) || 'OTHER',
        hasShippingLabel: input.hasShippingLabel ?? false,
        shippingLabelUrl: input.shippingLabelUrl,
        pickupMode: input.pickupMode || 'SCHEDULED',
        price: pricing.totalPrice,
        pickupSlotStart: slotStart,
        pickupSlotEnd: slotEnd,
        pickupCode,
        status: 'PENDING',
      },
      include: {
        pickupAddress: true,
      },
    });

    // TODO F13: Si mode IMMEDIATE, envoyer notifications push aux livreurs proches

    return {
      ...parcel,
      pricing,
    };
  }

  async getParcels(vendorId: string, query: ListParcelsQuery) {
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const skip = (page - 1) * limit;

    // Parser les statuts si fournis
    let statusFilter: ParcelStatus[] | undefined;
    if (query.status) {
      statusFilter = query.status.split(',') as ParcelStatus[];
    }

    const where = {
      vendorId,
      ...(statusFilter && { status: { in: statusFilter } }),
    };

    const [parcels, total] = await Promise.all([
      prisma.parcel.findMany({
        where,
        include: {
          pickupAddress: true,
          assignedCarrier: {
            select: {
              id: true,
              firstName: true,
              avatarUrl: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.parcel.count({ where }),
    ]);

    return {
      parcels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getParcel(vendorId: string, parcelId: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: {
        pickupAddress: true,
        assignedCarrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
        mission: true,
        transactions: true,
        reviews: true,
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    return parcel;
  }

  async updateParcel(vendorId: string, parcelId: string, input: UpdateParcelInput) {
    // Vérifier ownership et status
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'PENDING') {
      throw new Error('Seuls les colis en attente peuvent être modifiés');
    }

    // Valider les créneaux si modifiés
    if (input.pickupSlotStart || input.pickupSlotEnd) {
      const slotStart = new Date(input.pickupSlotStart || parcel.pickupSlotStart);
      const slotEnd = new Date(input.pickupSlotEnd || parcel.pickupSlotEnd);

      if (slotEnd <= slotStart) {
        throw new Error('La fin du créneau doit être après le début');
      }

      const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60 * 60);
      if (slotDuration > 4) {
        throw new Error('Le créneau ne peut pas dépasser 4 heures');
      }
    }

    return prisma.parcel.update({
      where: { id: parcelId },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.pickupSlotStart && { pickupSlotStart: new Date(input.pickupSlotStart) }),
        ...(input.pickupSlotEnd && { pickupSlotEnd: new Date(input.pickupSlotEnd) }),
        ...(input.carrier && { carrier: input.carrier as Carrier }),
        ...(input.hasShippingLabel !== undefined && { hasShippingLabel: input.hasShippingLabel }),
        ...(input.shippingLabelUrl !== undefined && { shippingLabelUrl: input.shippingLabelUrl }),
      },
      include: {
        pickupAddress: true,
      },
    });
  }

  async cancelParcel(vendorId: string, parcelId: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'PENDING') {
      throw new Error('Seuls les colis en attente peuvent être annulés');
    }

    return prisma.parcel.update({
      where: { id: parcelId },
      data: { status: 'CANCELLED' },
    });
  }

  async confirmPickup(vendorId: string, parcelId: string, pickupCode: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: { mission: true },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'ACCEPTED') {
      throw new Error('Ce colis n\'a pas encore été accepté par un livreur');
    }

    if (parcel.pickupCode !== pickupCode) {
      throw new Error('Code de vérification incorrect');
    }

    // Mettre à jour le parcel et la mission
    const [updatedParcel] = await prisma.$transaction([
      prisma.parcel.update({
        where: { id: parcelId },
        data: { status: 'PICKED_UP' },
        include: {
          pickupAddress: true,
          assignedCarrier: {
            select: {
              id: true,
              firstName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.mission.update({
        where: { parcelId },
        data: {
          status: 'PICKED_UP',
          pickedUpAt: new Date(),
        },
      }),
    ]);

    return updatedParcel;
  }
}