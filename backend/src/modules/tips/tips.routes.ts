import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TipsService } from './tips.service.js';

const tipsService = new TipsService();

// Types pour les requêtes
interface CreateTipBody {
  parcelId: string;
  amount: number;
  message?: string;
}

interface GetTipParams {
  parcelId: string;
}

interface GetTipsQuery {
  page?: number;
  limit?: number;
}

export async function tipsRoutes(app: FastifyInstance) {

  // ===== POST /tips =====
  // Créer un pourboire
  app.post<{ Body: CreateTipBody }>(
    '/tips',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: CreateTipBody }>, reply: FastifyReply) => {
      try {
        const { parcelId, amount, message } = request.body;
        const user = request.user as any;
        const vendorId = user?.userId || user?.id;

        if (!parcelId || !amount) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'parcelId et amount sont requis',
          });
        }

        if (typeof amount !== 'number' || amount <= 0) {
          return reply.status(400).send({
            error: 'Données invalides',
            message: 'Le montant doit être un nombre positif',
          });
        }

        const result = await tipsService.createTip(parcelId, vendorId, amount, message);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur création pourboire:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /tips/parcel/:parcelId =====
  // Récupérer le pourboire d'un colis
  app.get<{ Params: GetTipParams }>(
    '/tips/parcel/:parcelId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Params: GetTipParams }>, reply: FastifyReply) => {
      try {
        const { parcelId } = request.params;
        const user = request.user as any;
        const userId = user?.userId || user?.id;

        const tip = await tipsService.getTipByParcel(parcelId, userId);

        if (!tip) {
          return reply.status(404).send({
            error: 'Non trouvé',
            message: 'Aucun pourboire trouvé pour ce colis',
          });
        }

        return reply.send(tip);
      } catch (error: any) {
        console.error('Erreur récupération pourboire:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /tips/received =====
  // Récupérer les pourboires reçus (livreur)
  app.get<{ Querystring: GetTipsQuery }>(
    '/tips/received',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Querystring: GetTipsQuery }>, reply: FastifyReply) => {
      try {
        const user = request.user as any;
        const carrierId = user?.userId || user?.id;
        const { page = 1, limit = 10 } = request.query;

        const result = await tipsService.getTipsReceivedByCarrier(carrierId, page, limit);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur récupération pourboires reçus:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /tips/given =====
  // Récupérer les pourboires donnés (vendeur)
  app.get<{ Querystring: GetTipsQuery }>(
    '/tips/given',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Querystring: GetTipsQuery }>, reply: FastifyReply) => {
      try {
        const user = request.user as any;
        const vendorId = user?.userId || user?.id;
        const { page = 1, limit = 10 } = request.query;

        const result = await tipsService.getTipsGivenByVendor(vendorId, page, limit);
        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur récupération pourboires donnés:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );
}
