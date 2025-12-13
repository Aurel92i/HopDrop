import { prisma } from '../../shared/prisma.js';
import { UpdateUserInput } from './users.schemas.js';
import { sanitizeUser, SafeUser } from '../auth/auth.types.js';

export class UsersService {
  async getMe(userId: string): Promise<SafeUser & { carrierProfile?: any; stats?: any }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        carrierProfile: true,
        _count: {
          select: {
            parcelsAsVendor: true,
            missions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return {
      ...sanitizeUser(user),
      carrierProfile: user.carrierProfile,
      stats: {
        totalParcels: user._count.parcelsAsVendor,
        totalDeliveries: user._count.missions,
      },
    };
  }

  async updateMe(userId: string, input: UpdateUserInput): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName && { firstName: input.firstName }),
        ...(input.lastName && { lastName: input.lastName }),
        ...(input.phone && { phone: input.phone }),
      },
    });

    return sanitizeUser(user);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return sanitizeUser(user);
  }

  async getPublicProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        carrierProfile: true,
        reviewsReceived: {
          select: {
            rating: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Calculer la note moyenne
    const ratings = user.reviewsReceived.map((r) => r.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : null;

    return {
      id: user.id,
      firstName: user.firstName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      carrierProfile: user.carrierProfile
        ? {
            totalDeliveries: user.carrierProfile.totalDeliveries,
            averageRating: averageRating,
            identityVerified: user.carrierProfile.identityVerified,
          }
        : null,
    };
  }
}