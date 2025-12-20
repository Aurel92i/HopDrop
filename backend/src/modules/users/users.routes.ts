import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService();
  const usersController = new UsersController(usersService);

  // Routes protégées
  app.get('/users/me', {
    preHandler: [app.authenticate],
  }, usersController.getMe.bind(usersController));

  app.put('/users/me', {
    preHandler: [app.authenticate],
  }, usersController.updateMe.bind(usersController));

  app.put('/users/me/avatar', {
    preHandler: [app.authenticate],
  }, usersController.updateAvatar.bind(usersController));

  app.put('/users/fcm-token', {
    preHandler: [app.authenticate],
  }, usersController.updateFcmToken.bind(usersController));

  // Route publique
  app.get('/users/:id/profile', usersController.getPublicProfile.bind(usersController));
}