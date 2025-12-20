import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { requireAdmin } from '../../shared/middlewares/admin.middleware.js';

export async function adminRoutes(fastify: FastifyInstance) {
  const service = new AdminService();
  const controller = new AdminController(service);

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
}