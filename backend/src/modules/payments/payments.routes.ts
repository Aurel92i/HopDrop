import { FastifyInstance } from 'fastify';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

export async function paymentsRoutes(app: FastifyInstance) {
  const paymentsService = new PaymentsService();
  const paymentsController = new PaymentsController(paymentsService);

  // Paiements (vendeur)
  app.post('/payments/create-intent', {
    preHandler: [app.authenticate],
  }, paymentsController.createPaymentIntent.bind(paymentsController));

  app.post('/payments/confirm', {
    preHandler: [app.authenticate],
  }, paymentsController.confirmPayment.bind(paymentsController));

  // Stripe Connect (livreur)
  app.post('/payments/connect/create', {
    preHandler: [app.authenticate],
  }, paymentsController.createConnectAccount.bind(paymentsController));

  app.get('/payments/connect/status', {
    preHandler: [app.authenticate],
  }, paymentsController.getConnectAccountStatus.bind(paymentsController));

  // Historique
  app.get('/payments/transactions', {
    preHandler: [app.authenticate],
  }, paymentsController.getTransactionHistory.bind(paymentsController));
}