// backend/src/modules/carrier-documents/carrier-documents.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as carrierDocumentsService from './carrier-documents.service.js';
import { DocumentType } from '@prisma/client';

export async function carrierDocumentsRoutes(app: FastifyInstance) {
  // Récupérer les documents requis avec leur statut
  app.get('/required', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const documents = await carrierDocumentsService.getRequiredDocuments(userId);
      return reply.send({ documents });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Récupérer les documents requis selon le type de véhicule + profil
  app.get('/', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      // Utiliser getRequiredDocuments qui retourne la liste selon le vehicleType
      const documents = await carrierDocumentsService.getRequiredDocuments(userId);
      const profile = await carrierDocumentsService.getOrCreateCarrierProfile(userId);
      return reply.send({ documents, profile });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Upload un document
  app.post('/', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type, fileUrl } = request.body as {
        type: DocumentType;
        fileUrl: string;
      };

      // Valider le type de document
      const validTypes: DocumentType[] = [
        'ID_CARD_FRONT',
        'ID_CARD_BACK',
        'KBIS',
        'VEHICLE_REGISTRATION',
        'DRIVING_LICENSE',
      ];

      if (!validTypes.includes(type)) {
        return reply.status(400).send({ error: 'Type de document invalide' });
      }

      const document = await carrierDocumentsService.uploadDocument(
        userId,
        type,
        fileUrl
      );

      return reply.send({ document });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Supprimer un document
  app.delete('/:type', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { type: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type } = request.params;

      await carrierDocumentsService.deleteDocument(userId, type as DocumentType);
      return reply.send({ message: 'Document supprimé' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Vérifier si tous les documents sont complets
  app.get('/status', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const isComplete = await carrierDocumentsService.checkDocumentsComplete(userId);
      return reply.send({ documentsComplete: isComplete });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Mettre à jour le profil livreur (vehicleType, hasOwnPrinter)
  app.patch('/profile', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const data = request.body as { vehicleType?: string; hasOwnPrinter?: boolean };

      const profile = await carrierDocumentsService.updateCarrierProfile(userId, data);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}