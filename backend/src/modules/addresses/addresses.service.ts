import { prisma } from '../../shared/prisma.js';
import { geocodingService } from '../../shared/services/geocoding.service.js';

interface CreateAddressInput {
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  isDefault?: boolean;
}

interface UpdateAddressInput {
  label?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  isDefault?: boolean;
}

export class AddressesService {
  // Méthode renommée pour correspondre au controller
  async getAddresses(userId: string) {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses;
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    let { latitude, longitude } = input;

   // Si pas de coordonnées fournies OU coordonnées par défaut de Paris, géocoder l'adresse
const isDefaultCoords = latitude === 48.8566 && longitude === 2.3522;
if (!latitude || !longitude || isDefaultCoords) {
      console.log('Géocodage de l\'adresse:', input.street, input.city);
      
      const geocoded = await geocodingService.geocode(
        input.street,
        input.city,
        input.postalCode,
        input.country || 'France'
      );

      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
        console.log('Coordonnées trouvées:', latitude, longitude);
      } else {
        // Coordonnées par défaut (centre de la France) si géocodage échoue
        console.warn('Géocodage échoué, utilisation des coordonnées par défaut');
        latitude = 46.603354;
        longitude = 1.888334;
      }
    }

    // Si c'est la première adresse ou si isDefault est true, gérer les défauts
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Vérifier si c'est la première adresse
    const existingCount = await prisma.address.count({ where: { userId } });
    const shouldBeDefault = existingCount === 0 || input.isDefault;

    const address = await prisma.address.create({
      data: {
        userId,
        label: input.label,
        street: input.street,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country || 'France',
        latitude,
        longitude,
        instructions: input.instructions,
        isDefault: shouldBeDefault,
      },
    });

    return address;
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    // Vérifier que l'adresse appartient à l'utilisateur
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new Error('Adresse non trouvée');
    }

    let { latitude, longitude } = input;

    // Si l'adresse change, re-géocoder
    if (
      (input.street && input.street !== existing.street) ||
      (input.city && input.city !== existing.city) ||
      (input.postalCode && input.postalCode !== existing.postalCode)
    ) {
      const geocoded = await geocodingService.geocode(
        input.street || existing.street,
        input.city || existing.city,
        input.postalCode || existing.postalCode,
        input.country || existing.country
      );

      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      }
    }

    // Gérer le défaut
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(input.label && { label: input.label }),
        ...(input.street && { street: input.street }),
        ...(input.city && { city: input.city }),
        ...(input.postalCode && { postalCode: input.postalCode }),
        ...(input.country && { country: input.country }),
        ...(latitude && { latitude }),
        ...(longitude && { longitude }),
        ...(input.instructions !== undefined && { instructions: input.instructions }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });

    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    // Vérifier que l'adresse appartient à l'utilisateur
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new Error('Adresse non trouvée');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    // Si c'était l'adresse par défaut, définir une autre comme défaut
    if (existing.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Adresse supprimée' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    // Vérifier que l'adresse appartient à l'utilisateur
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new Error('Adresse non trouvée');
    }

    // Retirer le défaut des autres adresses
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Définir celle-ci comme défaut
    const address = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return address;
  }

  // Méthode pour le géocodage direct (si utilisée par le controller)
  async geocode(address: string) {
    const parts = address.split(',').map(p => p.trim());
    const street = parts[0] || '';
    const rest = parts.slice(1).join(' ');
    
    // Essayer d'extraire code postal et ville
    const postalMatch = rest.match(/(\d{5})/);
    const postalCode = postalMatch ? postalMatch[1] : '';
    const city = rest.replace(/\d{5}/, '').trim();

    const result = await geocodingService.geocode(street, city, postalCode);
    
    if (!result) {
      throw new Error('Adresse non trouvée');
    }

    return result;
  }
}