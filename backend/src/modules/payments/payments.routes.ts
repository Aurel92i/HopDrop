// backend/src/modules/payments/payments.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { prisma } from '../../shared/prisma.js';

// Types pour les requêtes
interface CreatePreauthBody {
  size: string;
  carrier: string;
}

interface SimulatePaymentParams {
  parcelId: string;
}

interface TransactionRoleParams {
  role: 'payer' | 'payee';
}

export async function paymentsRoutes(app: FastifyInstance) {
  const paymentsService = new PaymentsService();
  const paymentsController = new PaymentsController(paymentsService);

  // ===== Paiements (vendeur) =====
  
  // Créer un PaymentIntent
  app.post('/payments/create-intent', {
    preHandler: [app.authenticate],
  }, paymentsController.createPaymentIntent.bind(paymentsController));

  // Confirmer un paiement
  app.post('/payments/confirm', {
    preHandler: [app.authenticate],
  }, paymentsController.confirmPayment.bind(paymentsController));

  // ===== Route: /payments/create-preauth-intent =====
  
  /**
   * POST /payments/create-preauth-intent
   * Crée un PaymentIntent en mode pré-autorisation pour un nouveau colis
   */
  app.post<{ Body: CreatePreauthBody }>('/payments/create-preauth-intent', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { size, carrier } = request.body;
    const userId = (request.user as { id: string }).id;
    
    // Calculer le prix selon la taille (prix fixe pour MVP)
    const PRICING: Record<string, number> = { 
      SMALL: 10, 
      MEDIUM: 10, 
      LARGE: 10, 
      XLARGE: 10 
    };
    const amount = PRICING[size] || 10;
    
    // En mode réel, créer un PaymentIntent Stripe avec capture_method: 'manual'
    // Pour le MVP, on simule
    const paymentIntentId = `pi_preauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;
    
    return reply.send({ clientSecret, paymentIntentId, amount });
  });

  // ===== Simulation de paiement (mode test) =====
  
  /**
   * POST /payments/simulate/:parcelId
   * Simule un paiement sans passer par Stripe
   */
  app.post<{ Params: SimulatePaymentParams }>('/payments/simulate/:parcelId', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { parcelId } = request.params;
      const userId = (request.user as { id: string }).id;

      // Vérifier que le colis existe et appartient à l'utilisateur
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          vendorId: userId,
        },
      });

      if (!parcel) {
        return reply.status(404).send({ error: 'Colis non trouvé' });
      }

      // Simuler le paiement : mettre à jour le statut du colis
      const updatedParcel = await prisma.parcel.update({
        where: { id: parcelId },
        data: {
          status: 'PENDING', // Disponible pour les livreurs
        },
      });

      return reply.send({
        success: true,
        message: 'Paiement simulé avec succès',
        parcel: updatedParcel,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la simulation du paiement';
      console.error('Erreur simulation paiement:', error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // ===== Solde livreur =====
  
  /**
   * GET /payments/carrier/balance
   * Récupère le solde de la cagnotte d'un livreur
   */
  app.get('/payments/carrier/balance', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as { id: string }).id;

      // Calculer les gains depuis les missions complétées
      const completedMissions = await prisma.mission.findMany({
        where: {
          carrierId: userId,
          status: 'DELIVERED',
        },
        include: {
          parcel: true,
        },
      });

      // Calculer le total
      let total = 0;
      let today = 0;
      let week = 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const mission of completedMissions) {
        const amount = mission.parcel?.price || 0;
        // Commission livreur = 70% du prix
        const carrierAmount = Number(amount) * 0.7;
        
        total += carrierAmount;
        
        if (mission.completedAt && new Date(mission.completedAt) >= todayStart) {
          today += carrierAmount;
        }
        
        if (mission.completedAt && new Date(mission.completedAt) >= weekStart) {
          week += carrierAmount;
        }
      }

      return reply.send({
        total: Math.round(total * 100) / 100,
        today: Math.round(today * 100) / 100,
        week: Math.round(week * 100) / 100,
        pending: 0,
        available: Math.round(total * 100) / 100,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
      console.error('Erreur récupération solde:', error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  /**
   * GET /payments/carrier/transactions
   * Récupère l'historique des transactions d'un livreur
   */
  app.get('/payments/carrier/transactions', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as { id: string }).id;

      // Récupérer les missions complétées comme transactions
      const missions = await prisma.mission.findMany({
        where: {
          carrierId: userId,
          status: 'DELIVERED',
        },
        orderBy: {
          completedAt: 'desc',
        },
        include: {
          parcel: {
            select: {
              id: true,
              description: true,
              size: true,
              dropoffName: true,
              price: true,
            },
          },
        },
        take: 50,
      });

      // Transformer en format transaction
      const transactions = missions.map(mission => ({
        id: mission.id,
        type: 'CARRIER_PAYMENT',
        amount: Number(mission.parcel?.price || 0) * 0.7,
        status: 'COMPLETED',
        createdAt: mission.completedAt,
        parcel: mission.parcel,
      }));

      return reply.send(transactions);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
      console.error('Erreur récupération transactions:', error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // ===== Stripe Connect (livreur) =====
  
  // Créer un compte Connect
  app.post('/payments/connect/create', {
    preHandler: [app.authenticate],
  }, paymentsController.createConnectAccount.bind(paymentsController));

  // Obtenir le statut du compte Connect
  app.get('/payments/connect/status', {
    preHandler: [app.authenticate],
  }, paymentsController.getConnectAccountStatus.bind(paymentsController));

  // ===== Historique =====
  
  // Historique de toutes les transactions
  app.get('/payments/transactions', {
    preHandler: [app.authenticate],
  }, paymentsController.getTransactionHistory.bind(paymentsController));

  // Historique des transactions par rôle (payer ou payee)
  app.get<{ Params: TransactionRoleParams }>('/payments/transactions/:role', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { role } = request.params;
    
    // Valider le rôle
    if (role !== 'payer' && role !== 'payee') {
      return reply.status(400).send({ error: 'Role must be "payer" or "payee"' });
    }
    
    // Déléguer au controller avec le rôle validé
    return paymentsController.getTransactionsByRole.call(paymentsController, request, reply);
  });

  // ===== Gains livreur =====
  
  // Obtenir les gains du livreur
  app.get('/carrier/earnings', {
    preHandler: [app.authenticate],
  }, paymentsController.getCarrierEarnings.bind(paymentsController));
}