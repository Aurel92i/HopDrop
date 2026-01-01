import { prisma } from '../../shared/prisma.js';

export class TipsService {
  // Créer un pourboire
  async createTip(parcelId: string, vendorId: string, amount: number, message?: string) {
    // Vérifier que le colis appartient au vendeur
    const parcel = await prisma.parcel.findFirst({
      where: {
        id: parcelId,
        vendorId: vendorId,
      },
      include: {
        mission: true,
        assignedCarrier: true,
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé ou vous n\'êtes pas autorisé');
    }

    if (!parcel.mission) {
      throw new Error('Ce colis n\'a pas de mission assignée');
    }

    if (!parcel.assignedCarrierId) {
      throw new Error('Ce colis n\'a pas de livreur assigné');
    }

    // Vérifier que la livraison est confirmée
    if (parcel.status !== 'DELIVERED' || parcel.mission.status !== 'DELIVERED') {
      throw new Error('Le colis doit être livré avant de pouvoir laisser un pourboire');
    }

    // Vérifier qu'un pourboire n'existe pas déjà
    const existingTip = await prisma.tip.findUnique({
      where: { parcelId },
    });

    if (existingTip) {
      throw new Error('Vous avez déjà laissé un pourboire pour ce colis');
    }

    // Valider le montant
    if (amount <= 0) {
      throw new Error('Le montant du pourboire doit être positif');
    }

    if (amount > 50) {
      throw new Error('Le pourboire ne peut pas dépasser 50€');
    }

    // Créer le pourboire
    const tip = await prisma.tip.create({
      data: {
        parcelId,
        missionId: parcel.mission.id,
        vendorId,
        carrierId: parcel.assignedCarrierId,
        amount,
        message: message || null,
      },
      include: {
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // TODO: Notifier le livreur
    // TODO: Traiter le paiement du pourboire via Stripe

    return {
      success: true,
      message: 'Pourboire enregistré avec succès',
      tip,
    };
  }

  // Récupérer le pourboire d'un colis
  async getTipByParcel(parcelId: string, userId: string) {
    const tip = await prisma.tip.findUnique({
      where: { parcelId },
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!tip) {
      return null;
    }

    // Vérifier que l'utilisateur est concerné (vendeur ou livreur)
    if (tip.vendorId !== userId && tip.carrierId !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à voir ce pourboire');
    }

    return tip;
  }

  // Récupérer tous les pourboires reçus par un livreur
  async getTipsReceivedByCarrier(carrierId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where: { carrierId },
        include: {
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          parcel: {
            select: {
              id: true,
              dropoffName: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tip.count({ where: { carrierId } }),
    ]);

    const totalAmount = await prisma.tip.aggregate({
      where: { carrierId },
      _sum: { amount: true },
    });

    return {
      tips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      totalAmount: totalAmount._sum.amount || 0,
    };
  }

  // Récupérer tous les pourboires donnés par un vendeur
  async getTipsGivenByVendor(vendorId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where: { vendorId },
        include: {
          carrier: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          parcel: {
            select: {
              id: true,
              dropoffName: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tip.count({ where: { vendorId } }),
    ]);

    const totalAmount = await prisma.tip.aggregate({
      where: { vendorId },
      _sum: { amount: true },
    });

    return {
      tips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      totalAmount: totalAmount._sum.amount || 0,
    };
  }
}
