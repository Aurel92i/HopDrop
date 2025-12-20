import { FastifyInstance } from 'fastify';
import { CarrierDocumentsController } from './carrier-documents.controller.js';
import { CarrierDocumentsService } from './carrier-documents.service.js';

export async function carrierDocumentsRoutes(fastify: FastifyInstance) {
  const service = new CarrierDocumentsService();
  const controller = new CarrierDocumentsController(service);

  // Toutes les routes nécessitent une authentification
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /carrier/documents - Récupérer ses documents
  fastify.get('/', controller.getDocuments.bind(controller));

  // POST /carrier/documents - Uploader un document
  fastify.post('/', controller.uploadDocument.bind(controller));

  // DELETE /carrier/documents/:type - Supprimer un document
  fastify.delete('/:type', controller.deleteDocument.bind(controller));

  // PATCH /carrier/profile - Mettre à jour le profil (vehicleType, hasOwnPrinter)
  fastify.patch('/profile', controller.updateProfile.bind(controller));
}