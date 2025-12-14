import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationsService } from './notifications.service.js';
import {
  sendTestNotificationSchema,
  SendTestNotificationInput,
} from './notifications.schemas.js';

export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  async sendTestPush(
    request: FastifyRequest<{ Body: SendTestNotificationInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = sendTestNotificationSchema.parse(request.body);
      const result = await this.notificationsService.sendTestPush(
        userId,
        input.title,
        input.body
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async sendTestEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      
      // Récupérer l'email de l'utilisateur
      const { prisma } = await import('../../shared/prisma.js');
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        return reply.status(404).send({ error: 'Utilisateur non trouvé' });
      }

      const result = await this.notificationsService.sendTestEmail(
        user.email,
        'Test HopDrop',
        'Ceci est un email de test depuis HopDrop !'
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}