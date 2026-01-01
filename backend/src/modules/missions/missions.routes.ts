import { FastifyInstance } from 'fastify';
import { MissionsController } from './missions.controller.js';
import { MissionsService } from './missions.service.js';
import { MissionTrackingService } from './missions.tracking.js';

export async function missionsRoutes(app: FastifyInstance) {
  const missionsService = new MissionsService();
  const missionsController = new MissionsController(missionsService);

  // Routes Missions (toutes protégées)
  app.get('/missions/available', {
    preHandler: [app.authenticate],
  }, missionsController.getAvailableMissions.bind(missionsController));

  app.post('/missions/:parcelId/accept', {
    preHandler: [app.authenticate],
  }, missionsController.acceptMission.bind(missionsController));

  app.get('/missions/current', {
    preHandler: [app.authenticate],
  }, missionsController.getCurrentMissions.bind(missionsController));

  app.get('/missions/history', {
    preHandler: [app.authenticate],
  }, missionsController.getMissionHistory.bind(missionsController));

  app.post('/missions/:id/pickup', {
    preHandler: [app.authenticate],
  }, missionsController.pickupMission.bind(missionsController));

  app.post('/missions/:id/deliver', {
    preHandler: [app.authenticate],
  }, missionsController.deliverMission.bind(missionsController));

  app.post('/missions/:id/cancel', {
    preHandler: [app.authenticate],
  }, missionsController.cancelMission.bind(missionsController));

  // Routes Carrier Profile
  app.put('/carrier/availability', {
    preHandler: [app.authenticate],
  }, missionsController.updateAvailability.bind(missionsController));

  app.put('/carrier/location', {
    preHandler: [app.authenticate],
  }, missionsController.updateLocation.bind(missionsController));

  app.get('/carrier/:carrierId/location', {
    preHandler: [app.authenticate],
  }, missionsController.getCarrierLocation.bind(missionsController));

  app.put('/carrier/settings', {
    preHandler: [app.authenticate],
  }, missionsController.updateSettings.bind(missionsController));

  app.get('/carrier/profile', {
    preHandler: [app.authenticate],
  }, missionsController.getCarrierProfile.bind(missionsController));

const trackingService = new MissionTrackingService();

// Livreur démarre le trajet
app.post('/missions/:id/depart', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  try {
    const carrierId = (request.user as any).userId;
    const { id } = request.params as { id: string };
    const { latitude, longitude } = request.body as { latitude: number; longitude: number };
    
    const result = await trackingService.startJourney(id, carrierId, latitude, longitude);
    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// Livreur est arrivé
app.post('/missions/:id/arrived', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  try {
    const carrierId = (request.user as any).userId;
    const { id } = request.params as { id: string };
    
    const mission = await trackingService.arrivedAtPickup(id, carrierId);
    return reply.send({ mission });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// Livreur confirme l'emballage
app.post('/missions/:id/packaging', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  try {
    const carrierId = (request.user as any).userId;
    const { id } = request.params as { id: string };
    const { photoUrl } = request.body as { photoUrl: string };
    
    const result = await trackingService.confirmPackaging(id, carrierId, photoUrl);
    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// Vendeur confirme l'emballage
app.post('/parcels/:id/confirm-packaging', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  try {
    const vendorId = (request.user as any).userId;
    const { id } = request.params as { id: string };
    
    const result = await trackingService.vendorConfirmPackaging(id, vendorId);
    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});
}