import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from './admin.service.js';

export class AdminController {
  constructor(private service: AdminService) {}

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.service.getStats();
      return reply.send(stats);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getPendingDocuments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const documents = await this.service.getPendingDocuments();
      return reply.send({ documents });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getAllDocuments(
    request: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const status = request.query.status as any;
      const documents = await this.service.getAllDocuments(status);
      return reply.send({ documents });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getCarrierDocuments(
    request: FastifyRequest<{ Params: { carrierId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const carrier = await this.service.getCarrierDocuments(request.params.carrierId);
      return reply.send({ carrier });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async approveDocument(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const document = await this.service.approveDocument(request.params.documentId);
      return reply.send({ document, message: 'Document approuvé' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async rejectDocument(
    request: FastifyRequest<{ Params: { documentId: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { reason } = request.body;
      if (!reason) {
        return reply.status(400).send({ error: 'La raison du refus est obligatoire' });
      }

      const document = await this.service.rejectDocument(request.params.documentId, reason);
      return reply.send({ document, message: 'Document refusé' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}