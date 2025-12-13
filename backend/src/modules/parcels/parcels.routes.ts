import { FastifyInstance } from 'fastify';
import { ParcelsController } from './parcels.controller.js';
import { ParcelsService } from './parcels.service.js';

export async function parcelsRoutes(app: FastifyInstance) {
  const parcelsService = new ParcelsService();
  const parcelsController = new ParcelsController(parcelsService);

  // Toutes les routes sont protégées
  app.post('/parcels', {
    preHandler: [app.authenticate],
  }, parcelsController.createParcel.bind(parcelsController));

  app.get('/parcels', {
    preHandler: [app.authenticate],
  }, parcelsController.getParcels.bind(parcelsController));

  app.get('/parcels/:id', {
    preHandler: [app.authenticate],
  }, parcelsController.getParcel.bind(parcelsController));

  app.put('/parcels/:id', {
    preHandler: [app.authenticate],
  }, parcelsController.updateParcel.bind(parcelsController));

  app.delete('/parcels/:id', {
    preHandler: [app.authenticate],
  }, parcelsController.cancelParcel.bind(parcelsController));

  app.post('/parcels/:id/confirm-pickup', {
    preHandler: [app.authenticate],
  }, parcelsController.confirmPickup.bind(parcelsController));
}