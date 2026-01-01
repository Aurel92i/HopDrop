import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService();
  const usersController = new UsersController(usersService);

  // Routes protégées
  app.get('/users/me', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => usersController.getMe(request, reply));

  app.put('/users/me', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => usersController.updateMe(request, reply));

  app.put('/users/me/avatar', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => usersController.updateAvatar(request, reply));

  app.put('/users/fcm-token', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => usersController.updateFcmToken(request, reply));

  // Route publique
  app.get('/users/:id/profile', (request: FastifyRequest, reply: FastifyReply) => usersController.getPublicProfile(request, reply));
}