// backend/src/modules/payments/payments.routes.ts

import { FastifyInstance } from 'fastify';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

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

  // ===== Stripe Connect (livreur) =====
  
  // Créer un compte Connect
  app.post('/payments/connect/create', {
    preHandler: [app.authenticate],
  }, paymentsController.createConnectAccount.bind(paymentsController));

  // Route pour créer un PaymentIntent en pré-autorisation (avant création du colis)
app.post('/create-preauth-intent', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  const { size, carrier } = request.body as { size: string; carrier: string };
  const userId = request.user.id;
  
  // Calculer le prix selon la taille
  const PRICING = { SMALL: 4.50, MEDIUM: 4.50, LARGE: 4.50, XLARGE: 4.50 };
  const amount = PRICING[size as keyof typeof PRICING] || 4.50;
  
  // En mode réel, créer un PaymentIntent Stripe avec capture_method: 'manual'
  // Pour le MVP, on simule
  const paymentIntentId = `pi_preauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;
  
  return { clientSecret, paymentIntentId, amount };
});

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
  app.get('/payments/transactions/:role', {
    preHandler: [app.authenticate],
  }, paymentsController.getTransactionsByRole.bind(paymentsController));

  // ===== Gains livreur =====
  
  // Obtenir les gains du livreur
  app.get('/carrier/earnings', {
    preHandler: [app.authenticate],
  }, paymentsController.getCarrierEarnings.bind(paymentsController));
}