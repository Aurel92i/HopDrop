import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from './delivery.service.js';

const deliveryService = new DeliveryService();

// Types pour les requêtes
interface ConfirmDeliveryBody {
  missionId: string;
  proofUrl: string;
}

interface ClientConfirmBody {
  parcelId: string;
  rating?: number;
  comment?: string;
}

interface ClientContestBody {
  parcelId: string;
  reason: string;
}

interface CarrierDisputeBody {
  missionId: string;
  response: string;
  proofUrl?: string;
}

interface StatusParams {
  parcelId: string;
}

export async function deliveryRoutes(app: FastifyInstance) {

  // ===== POST /delivery/confirm =====
  // Livreur confirme le dépôt avec preuve
  app.post<{ Body: ConfirmDeliveryBody }>(
    '/delivery/confirm',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: ConfirmDeliveryBody }>, reply: FastifyReply) => {
      try {
        const { missionId, proofUrl } = request.body;
        const user = request.user as any;
        const carrierId = user?.userId || user?.id;

        if (!missionId || !proofUrl) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'missionId et proofUrl sont requis',
          });
        }

        const result = await deliveryService.confirmDelivery(missionId, carrierId, proofUrl);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur confirmation dépôt:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /delivery/client-confirm =====
  // Client confirme la réception (fonctionne aussi après contestation)
  app.post<{ Body: ClientConfirmBody }>(
    '/delivery/client-confirm',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: ClientConfirmBody }>, reply: FastifyReply) => {
      try {
        const { parcelId, rating, comment } = request.body;
        const user = request.user as any;
        const vendorId = user?.userId || user?.id;

        if (!parcelId) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'parcelId est requis',
          });
        }

        if (rating !== undefined && (rating < 1 || rating > 5)) {
          return reply.status(400).send({
            error: 'Données invalides',
            message: 'La note doit être entre 1 et 5',
          });
        }

        const result = await deliveryService.clientConfirmDelivery(parcelId, vendorId, rating, comment);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur confirmation client:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /delivery/client-contest =====
  // Client conteste la livraison
  app.post<{ Body: ClientContestBody }>(
    '/delivery/client-contest',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: ClientContestBody }>, reply: FastifyReply) => {
      try {
        const { parcelId, reason } = request.body;
        const user = request.user as any;
        const vendorId = user?.userId || user?.id;

        if (!parcelId || !reason) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'parcelId et reason sont requis',
          });
        }

        const result = await deliveryService.clientContestDelivery(parcelId, vendorId, reason);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur contestation:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /delivery/carrier-dispute-response =====
  // Livreur répond à une contestation
  app.post<{ Body: CarrierDisputeBody }>(
    '/delivery/carrier-dispute-response',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: CarrierDisputeBody }>, reply: FastifyReply) => {
      try {
        const { missionId, response, proofUrl } = request.body;
        const user = request.user as any;
        const carrierId = user?.userId || user?.id;

        if (!missionId || !response) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'missionId et response sont requis',
          });
        }

        const result = await deliveryService.carrierRespondToDispute(missionId, carrierId, response, proofUrl);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur réponse litige:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /delivery/status/:parcelId =====
  // Récupérer le statut de livraison
  app.get<{ Params: StatusParams }>(
    '/delivery/status/:parcelId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Params: StatusParams }>, reply: FastifyReply) => {
      try {
        const { parcelId } = request.params;
        const user = request.user as any;
        const userId = user?.userId || user?.id;
        console.log('🆔 userId extrait:', userId);

        if (!userId) {
          return reply.status(401).send({
            error: 'Non authentifié',
            message: 'Vous devez être connecté pour accéder à cette ressource',
          });
        }

        const result = await deliveryService.getDeliveryStatus(parcelId, userId);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur récupération statut:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /delivery/auto-confirm (Admin/Cron) =====
  app.post(
    '/delivery/auto-confirm',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const cronSecret = request.headers['x-cron-secret'];
        if (cronSecret !== process.env.CRON_SECRET) {
          return reply.status(401).send({ error: 'Non autorisé' });
        }

        const result = await deliveryService.autoConfirmExpiredDeliveries();
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur auto-confirmation:', error);
        return reply.status(500).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );
}