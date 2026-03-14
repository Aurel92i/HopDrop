import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { requireAdmin } from '../../shared/middlewares/admin.middleware.js';
import { DeliveryService } from '../delivery/delivery.service.js';

export async function adminRoutes(fastify: FastifyInstance) {
  const service = new AdminService();
  const controller = new AdminController(service);
  const deliveryService = new DeliveryService();

  // Toutes les routes admin nécessitent authentification + rôle admin
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', requireAdmin);

  // GET /admin/stats - Statistiques
  fastify.get('/stats', controller.getStats.bind(controller));

  // GET /admin/documents/pending - Documents en attente
  fastify.get('/documents/pending', controller.getPendingDocuments.bind(controller));

  // GET /admin/documents - Tous les documents (avec filtre optionnel)
  fastify.get('/documents', controller.getAllDocuments.bind(controller));

  // GET /admin/carriers/:carrierId - Détails d'un livreur
  fastify.get('/carriers/:carrierId', controller.getCarrierDocuments.bind(controller));

  // POST /admin/documents/:documentId/approve - Approuver
  fastify.post('/documents/:documentId/approve', controller.approveDocument.bind(controller));

  // POST /admin/documents/:documentId/reject - Rejeter
  fastify.post('/documents/:documentId/reject', controller.rejectDocument.bind(controller));

  // ===== ROUTES LITIGES =====

  // GET /admin/disputes - Liste des litiges
  fastify.get('/disputes', async (request, reply) => {
    try {
      const disputes = await deliveryService.getDisputes();
      return reply.send({ disputes });
    } catch (error: any) {
      console.error('Erreur récupération litiges:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/disputes/:missionId/resolve - Résoudre un litige
  fastify.post('/disputes/:missionId/resolve', async (request, reply) => {
    try {
      const { missionId } = request.params as { missionId: string };
      const { resolution } = request.body as { resolution: 'CARRIER_WINS' | 'CLIENT_WINS' | 'REFUND' };
      const adminId = (request.user as any).userId;

      if (!resolution || !['CARRIER_WINS', 'CLIENT_WINS', 'REFUND'].includes(resolution)) {
        return reply.status(400).send({
          error: 'resolution doit être CARRIER_WINS, CLIENT_WINS ou REFUND',
        });
      }

      const result = await deliveryService.resolveDispute(missionId, adminId, resolution);
      return reply.send(result);
    } catch (error: any) {
      console.error('Erreur résolution litige:', error);
      return reply.status(400).send({ error: error.message });
    }
  });
}