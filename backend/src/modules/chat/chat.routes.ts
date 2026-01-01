import { FastifyInstance } from 'fastify';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

export async function chatRoutes(app: FastifyInstance) {
  const service = new ChatService();
  const controller = new ChatController(service);

  // Toutes les routes sont protégées
  app.addHook('onRequest', app.authenticate);

  // GET /chat/conversations - Liste des conversations
  app.get('/conversations', controller.getMyConversations.bind(controller));

  // GET /chat/parcel/:parcelId - Obtenir/créer une conversation pour un colis
  app.get('/parcel/:parcelId', controller.getConversation.bind(controller));

  // POST /chat/:conversationId/messages - Envoyer un message
  app.post('/:conversationId/messages', controller.sendMessage.bind(controller));

  // POST /chat/:conversationId/read - Marquer comme lu
  app.post('/:conversationId/read', controller.markAsRead.bind(controller));
}