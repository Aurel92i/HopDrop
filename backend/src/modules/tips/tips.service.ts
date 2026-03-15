import { prisma } from '../../shared/prisma.js';
import { stripe } from '../../config/stripe.js';
import { paymentsConfig } from '../payments/payments.config.js';
import { pushService } from '../notifications/push.service.js';

export class TipsService {
  // Créer un pourboire — retourne un clientSecret pour le paiement
  async createTip(parcelId: string, vendorId: string, amount: number, message?: string) {
    // Vérifier que le colis appartient au vendeur
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: {
        mission: true,
        assignedCarrier: { include: { carrierProfile: true } },
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

    if (parcel.status !== 'DELIVERED' || parcel.mission.status !== 'DELIVERED') {
      throw new Error('Le colis doit être livré avant de pouvoir laisser un pourboire');
    }

    const existingTip = await prisma.tip.findUnique({ where: { parcelId } });
    if (existingTip) {
      throw new Error('Vous avez déjà laissé un pourboire pour ce colis');
    }

    if (amount <= 0) throw new Error('Le montant du pourboire doit être positif');
    if (amount > 50) throw new Error('Le pourboire ne peut pas dépasser 50€');

    const amountCents = Math.round(amount * 100);

    // Créer un PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: paymentsConfig.currency,
      metadata: {
        type: 'tip',
        parcelId,
        vendorId,
        carrierId: parcel.assignedCarrierId,
      },
    });

    // Créer le Tip en BDD (en attente de paiement)
    const tip = await prisma.tip.create({
      data: {
        parcelId,
        missionId: parcel.mission.id,
        vendorId,
        carrierId: parcel.assignedCarrierId,
        amount,
        message: message || null,
        stripePaymentIntentId: paymentIntent.id,
      },
      include: {
        carrier: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      tip,
    };
  }

  // Confirmer le paiement du pourboire et transférer au livreur
  async confirmTipPayment(tipId: string) {
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        carrier: { include: { carrierProfile: true } },
        vendor: { select: { firstName: true } },
      },
    });

    if (!tip) throw new Error('Pourboire non trouvé');
    if (tip.stripeTransferId) return { success: true, alreadyTransferred: true };

    const amountCents = Math.round(tip.amount * 100);

    // Transférer 100% au livreur si compte Stripe actif
    const carrierProfile = tip.carrier?.carrierProfile;
    if (carrierProfile?.stripeAccountId && carrierProfile.stripeAccountStatus === 'ACTIVE') {
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: paymentsConfig.currency,
        destination: carrierProfile.stripeAccountId,
        metadata: { type: 'tip', tipId: tip.id, parcelId: tip.parcelId },
      });

      await prisma.tip.update({
        where: { id: tipId },
        data: { stripeTransferId: transfer.id },
      });

      // Notifier le livreur qu'il a reçu un pourboire
      await pushService.sendToUser({
        userId: tip.carrierId,
        title: '🎉 Pourboire reçu !',
        body: `${tip.vendor?.firstName || 'Un client'} vous a envoyé ${tip.amount.toFixed(2)} €${tip.message ? ' — "' + tip.message + '"' : ''}`,
        data: { type: 'TIP_RECEIVED', amount: tip.amount.toString(), parcelId: tip.parcelId },
      });

      return { success: true, transferId: transfer.id };
    }

    // Pas de compte Stripe — notifier quand même le livreur
    await pushService.sendToUser({
      userId: tip.carrierId,
      title: '🎉 Pourboire reçu !',
      body: `${tip.vendor?.firstName || 'Un client'} vous a envoyé ${tip.amount.toFixed(2)} €${tip.message ? ' — "' + tip.message + '"' : ''}`,
      data: { type: 'TIP_RECEIVED', amount: tip.amount.toString(), parcelId: tip.parcelId },
    });

    // Le transfer sera fait plus tard
    return { success: true, pendingTransfer: true };
  }

  // Récupérer le pourboire d'un colis
  async getTipByParcel(parcelId: string, userId: string) {
    const tip = await prisma.tip.findUnique({
      where: { parcelId },
      include: {
        vendor: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        carrier: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!tip) return null;

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
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          parcel: {
            select: { id: true, dropoffName: true, createdAt: true },
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          parcel: {
            select: { id: true, dropoffName: true, createdAt: true },
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      totalAmount: totalAmount._sum.amount || 0,
    };
  }
}
