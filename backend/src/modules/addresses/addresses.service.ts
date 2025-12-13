import { prisma } from '../../shared/prisma.js';
import { CreateAddressInput, UpdateAddressInput } from './addresses.schemas.js';

// Lookup basique pour le geocoding MVP (grandes villes françaises)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'paris': { lat: 48.8566, lng: 2.3522 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'toulouse': { lat: 43.6047, lng: 1.4442 },
  'nice': { lat: 43.7102, lng: 7.2620 },
  'nantes': { lat: 47.2184, lng: -1.5536 },
  'bordeaux': { lat: 44.8378, lng: -0.5792 },
  'lille': { lat: 50.6292, lng: 3.0573 },
  'rennes': { lat: 48.1173, lng: -1.6778 },
  'strasbourg': { lat: 48.5734, lng: 7.7521 },
};

export class AddressesService {
  async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    // Si c'est la première adresse ou isDefault=true, gérer le défaut
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // Si c'est la première adresse, la mettre par défaut
    const existingCount = await prisma.address.count({ where: { userId } });
    const isDefault = existingCount === 0 ? true : input.isDefault;

    return prisma.address.create({
      data: {
        userId,
        label: input.label,
        street: input.street,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
        instructions: input.instructions,
        isDefault,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    // Vérifier que l'adresse appartient à l'utilisateur
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new Error('Adresse non trouvée');
    }

    // Gérer le isDefault
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data: {
        ...(input.label && { label: input.label }),
        ...(input.street && { street: input.street }),
        ...(input.city && { city: input.city }),
        ...(input.postalCode && { postalCode: input.postalCode }),
        ...(input.country && { country: input.country }),
        ...(input.latitude && { latitude: input.latitude }),
        ...(input.longitude && { longitude: input.longitude }),
        ...(input.instructions !== undefined && { instructions: input.instructions }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    // Vérifier que l'adresse appartient à l'utilisateur
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new Error('Adresse non trouvée');
    }

    // Vérifier si des parcels PENDING utilisent cette adresse
    const pendingParcels = await prisma.parcel.count({
      where: {
        pickupAddressId: addressId,
        status: 'PENDING',
      },
    });

    if (pendingParcels > 0) {
      throw new Error('Impossible de supprimer cette adresse car elle est utilisée par des colis en attente');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return { message: 'Adresse supprimée' };
  }

  async geocode(address: string): Promise<{ latitude: number; longitude: number; formattedAddress: string }> {
    // MVP: Lookup basique par ville
    const cityMatch = address.toLowerCase();
    
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
      if (cityMatch.includes(city)) {
        return {
          latitude: coords.lat,
          longitude: coords.lng,
          formattedAddress: address,
        };
      }
    }

    // Par défaut: Paris avec un petit décalage aléatoire
    return {
      latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
      longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
      formattedAddress: address,
    };
  }
}