import { FastifyInstance } from 'fastify';
import { MissionsController } from './missions.controller.js';
import { MissionsService } from './missions.service.js';

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

  app.put('/carrier/settings', {
    preHandler: [app.authenticate],
  }, missionsController.updateSettings.bind(missionsController));

  app.get('/carrier/profile', {
    preHandler: [app.authenticate],
  }, missionsController.getCarrierProfile.bind(missionsController));
}