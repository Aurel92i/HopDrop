import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as packagingService from './packaging.service.js';

// Types pour les requêtes
interface CarrierConfirmBody {
  missionId: string;
  photoUrl: string;
}

interface VendorConfirmBody {
  parcelId: string;
}

interface VendorRejectBody {
  parcelId: string;
  reason: string;
}

interface StatusParams {
  parcelId: string;
}

export async function packagingRoutes(app: FastifyInstance) {
  // ===== POST /packaging/carrier-confirm =====
  // Livreur confirme l'emballage avec photo
  app.post<{ Body: CarrierConfirmBody }>(
    '/packaging/carrier-confirm',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: CarrierConfirmBody }>, reply: FastifyReply) => {
      try {
        const { missionId, photoUrl } = request.body;
        const carrierId = (request.user as any).id;

        if (!missionId || !photoUrl) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'missionId et photoUrl sont requis',
          });
        }

        const result = await packagingService.carrierConfirmPackaging(
          missionId,
          carrierId,
          photoUrl
        );

        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur confirmation emballage livreur:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /packaging/vendor-confirm =====
  // Client confirme l'emballage
  app.post<{ Body: VendorConfirmBody }>(
    '/packaging/vendor-confirm',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: VendorConfirmBody }>, reply: FastifyReply) => {
      try {
        const { parcelId } = request.body;
        const vendorId = (request.user as any).id;

        if (!parcelId) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'parcelId est requis',
          });
        }

        const result = await packagingService.vendorConfirmPackaging(
          parcelId,
          vendorId
        );

        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur confirmation emballage vendeur:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== POST /packaging/vendor-reject =====
  // Client refuse l'emballage
  app.post<{ Body: VendorRejectBody }>(
    '/packaging/vendor-reject',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: VendorRejectBody }>, reply: FastifyReply) => {
      try {
        const { parcelId, reason } = request.body;
        const vendorId = (request.user as any).id;

        if (!parcelId || !reason) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'parcelId et reason sont requis',
          });
        }

        const result = await packagingService.vendorRejectPackaging(
          parcelId,
          vendorId,
          reason
        );

        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur refus emballage:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /packaging/status/:parcelId =====
  // Récupérer le statut d'emballage
  app.get<{ Params: StatusParams }>(
    '/packaging/status/:parcelId',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Params: StatusParams }>, reply: FastifyReply) => {
      try {
        const { parcelId } = request.params;
        const userId = (request.user as any).id;

        const result = await packagingService.getPackagingStatus(parcelId, userId);

        return reply.send(result);
      } catch (error: any) {
        console.error('Erreur récupération statut emballage:', error);
        return reply.status(400).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );
}