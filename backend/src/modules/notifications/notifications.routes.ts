import { FastifyInstance } from 'fastify';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

export async function notificationsRoutes(app: FastifyInstance) {
  const notificationsService = new NotificationsService();
  const notificationsController = new NotificationsController(notificationsService);

  // Routes de test (protégées)
  app.post('/notifications/test-push', {
    preHandler: [app.authenticate],
  }, notificationsController.sendTestPush.bind(notificationsController));

  app.post('/notifications/test-email', {
    preHandler: [app.authenticate],
  }, notificationsController.sendTestEmail.bind(notificationsController));
}