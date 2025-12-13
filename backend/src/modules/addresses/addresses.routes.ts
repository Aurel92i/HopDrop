import { FastifyInstance } from 'fastify';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';

export async function addressesRoutes(app: FastifyInstance) {
  const addressesService = new AddressesService();
  const addressesController = new AddressesController(addressesService);

  // Toutes les routes sont protégées
  app.get('/addresses', {
    preHandler: [app.authenticate],
  }, addressesController.getAddresses.bind(addressesController));

  app.post('/addresses', {
    preHandler: [app.authenticate],
  }, addressesController.createAddress.bind(addressesController));

  app.put('/addresses/:id', {
    preHandler: [app.authenticate],
  }, addressesController.updateAddress.bind(addressesController));

  app.delete('/addresses/:id', {
    preHandler: [app.authenticate],
  }, addressesController.deleteAddress.bind(addressesController));

  app.post('/addresses/geocode', {
    preHandler: [app.authenticate],
  }, addressesController.geocode.bind(addressesController));
}