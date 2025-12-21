import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from './chat.service.js';

export class ChatController {
  constructor(private service: ChatService) {}

  async getConversation(
    request: FastifyRequest<{ Params: { parcelId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const conversation = await this.service.getOrCreateConversation(
        request.params.parcelId,
        userId
      );
      return reply.send({ conversation });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async sendMessage(
    request: FastifyRequest<{
      Params: { conversationId: string };
      Body: { content: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const { content } = request.body;

      if (!content?.trim()) {
        return reply.status(400).send({ error: 'Le message ne peut pas être vide' });
      }

      const message = await this.service.sendMessage(
        request.params.conversationId,
        userId,
        content.trim()
      );
      return reply.send({ message });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async markAsRead(
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      await this.service.markAsRead(request.params.conversationId, userId);
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getMyConversations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const conversations = await this.service.getUserConversations(userId);
      return reply.send({ conversations });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }
}