// backend/src/modules/payments/payments.service.ts

import { prisma } from '../../shared/prisma.js';
import { stripe } from '../../config/stripe.js';
import { paymentsConfig } from './payments.config.js';
import { ParcelSize } from '@prisma/client';

export class PaymentsService {
  
  async createPaymentIntent(vendorId: string, parcelId: string) {
    // Récupérer le parcel
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: { assignedCarrier: true },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'ACCEPTED') {
      throw new Error('Le colis doit être accepté par un livreur avant le paiement');
    }

    if (!parcel.assignedCarrierId) {
      throw new Error('Aucun livreur assigné');
    }

    // Calculer les montants
    const amount = paymentsConfig.prices[parcel.size as ParcelSize];
    const platformFee = Math.round(amount * paymentsConfig.platformFeePercentage);
    const carrierPayout = amount - platformFee;

    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: paymentsConfig.currency,
      metadata: {
        parcelId,
        vendorId,
        carrierId: parcel.assignedCarrierId,
        platformFee: platformFee.toString(),
        carrierPayout: carrierPayout.toString(),
      },
    });

    // Créer la transaction en BDD
    const transaction = await prisma.transaction.create({
      data: {
        parcelId,
        payerId: vendorId,
        payeeId: parcel.assignedCarrierId,
        amount: amount / 100,
        platformFee: platformFee / 100,
        carrierPayout: carrierPayout / 100,
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount / 100,
      platformFee: platformFee / 100,
      carrierPayout: carrierPayout / 100,
      currency: paymentsConfig.currency,
      simulated: false,
      transaction,
    };
  }

  async confirmPayment(paymentIntentId: string) {
    // Trouver la transaction
    const transaction = await prisma.transaction.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { parcel: true },
    });

    if (!transaction) {
      throw new Error('Transaction non trouvée');
    }

    // Vérifier le statut du PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CAPTURED' },
        include: {
          parcel: {
            select: { id: true, dropoffName: true, status: true }
          }
        }
      });

      return {
        success: true,
        message: 'Paiement confirmé',
        transaction: updatedTransaction,
      };
    }

    return {
      success: false,
      message: `Statut du paiement: ${paymentIntent.status}`,
      transaction,
    };
  }

  async transferToCarrier(parcelId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { parcelId, status: 'CAPTURED' },
      include: {
        payee: {
          include: { carrierProfile: true },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction non trouvée ou paiement non capturé');
    }

    if (!transaction.payee?.carrierProfile?.stripeAccountId) {
      throw new Error('Le livreur n\'a pas de compte Stripe Connect');
    }

    // Créer le transfert Stripe
    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(transaction.carrierPayout) * 100),
      currency: paymentsConfig.currency,
      destination: transaction.payee.carrierProfile.stripeAccountId,
      metadata: {
        parcelId,
        transactionId: transaction.id,
      },
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'TRANSFERRED',
        stripeTransferId: transfer.id,
      },
    });

    return {
      success: true,
      message: 'Transfert effectué',
      transferId: transfer.id,
      amount: Number(transaction.carrierPayout),
    };
  }

  async createConnectAccount(carrierId: string) {
    const user = await prisma.user.findUnique({
      where: { id: carrierId },
      include: { carrierProfile: true },
    });

    if (!user || !user.carrierProfile) {
      throw new Error('Profil livreur non trouvé');
    }

    if (user.carrierProfile.stripeAccountId) {
      return { accountId: user.carrierProfile.stripeAccountId, alreadyExists: true };
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: 'PENDING',
      },
    });

    return { accountId: account.id };
  }

  async createOnboardingLink(carrierId: string) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile?.stripeAccountId) {
      throw new Error('Aucun compte Stripe Connect. Créez-en un d\'abord.');
    }

    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeAccountId,
      refresh_url: 'exp+hopdrop://stripe-refresh',
      return_url: 'exp+hopdrop://stripe-return',
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getConnectAccountStatus(carrierId: string) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) {
      throw new Error('Profil livreur non trouvé');
    }

    if (!profile.stripeAccountId) {
      return { hasAccount: false, status: null };
    }

    const account = await stripe.accounts.retrieve(profile.stripeAccountId);

    let status: 'PENDING' | 'ACTIVE' | 'RESTRICTED' = 'PENDING';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'ACTIVE';
    } else if (account.requirements?.disabled_reason) {
      status = 'RESTRICTED';
    }

    await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: { stripeAccountStatus: status },
    });

    return {
      hasAccount: true,
      accountId: profile.stripeAccountId,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { payerId: userId },
            { payeeId: userId },
          ],
        },
        include: {
          parcel: {
            select: {
              id: true,
              size: true,
              dropoffName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: {
          OR: [
            { payerId: userId },
            { payeeId: userId },
          ],
        },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ===== NOUVELLE MÉTHODE: Transactions par rôle =====
  async getTransactionsByRole(userId: string, role: 'payer' | 'payee', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const whereClause = role === 'payer' 
      ? { payerId: userId }
      : { payeeId: userId };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          parcel: {
            select: {
              id: true,
              size: true,
              dropoffName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ===== NOUVELLE MÉTHODE: Gains du livreur =====
  async getCarrierEarnings(carrierId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Requêtes en parallèle pour performance
    const [todayEarnings, weekEarnings, monthEarnings, totalEarnings, pendingEarnings, availableEarnings] = await Promise.all([
      // Gains aujourd'hui
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: { in: ['CAPTURED', 'TRANSFERRED'] },
          createdAt: { gte: startOfToday },
        },
        _sum: { carrierPayout: true },
      }),
      // Gains cette semaine
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: { in: ['CAPTURED', 'TRANSFERRED'] },
          createdAt: { gte: startOfWeek },
        },
        _sum: { carrierPayout: true },
      }),
      // Gains ce mois
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: { in: ['CAPTURED', 'TRANSFERRED'] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { carrierPayout: true },
      }),
      // Total des gains
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: { in: ['CAPTURED', 'TRANSFERRED'] },
        },
        _sum: { carrierPayout: true },
      }),
      // En attente (PENDING)
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: 'PENDING',
        },
        _sum: { carrierPayout: true },
      }),
      // Disponible (CAPTURED mais pas encore TRANSFERRED)
      prisma.transaction.aggregate({
        where: {
          payeeId: carrierId,
          status: 'CAPTURED',
        },
        _sum: { carrierPayout: true },
      }),
    ]);

    return {
      today: Number(todayEarnings._sum.carrierPayout || 0),
      week: Number(weekEarnings._sum.carrierPayout || 0),
      month: Number(monthEarnings._sum.carrierPayout || 0),
      total: Number(totalEarnings._sum.carrierPayout || 0),
      pending: Number(pendingEarnings._sum.carrierPayout || 0),
      available: Number(availableEarnings._sum.carrierPayout || 0),
    };
  }
}