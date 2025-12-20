import { FastifyRequest, FastifyReply } from 'fastify';
import { CarrierDocumentsService } from './carrier-documents.service.js';
import {
  uploadDocumentSchema,
  updateCarrierProfileSchema,
  UploadDocumentInput,
  UpdateCarrierProfileInput,
} from './carrier-documents.schemas.js';

export class CarrierDocumentsController {
  constructor(private service: CarrierDocumentsService) {}

  async getDocuments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.service.getDocuments(userId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async uploadDocument(
    request: FastifyRequest<{ Body: UploadDocumentInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = uploadDocumentSchema.parse(request.body);
      const document = await this.service.uploadDocument(userId, input);
      return reply.status(201).send({ document });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async deleteDocument(
    request: FastifyRequest<{ Params: { type: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.service.deleteDocument(userId, request.params.type);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateProfile(
    request: FastifyRequest<{ Body: UpdateCarrierProfileInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateCarrierProfileSchema.parse(request.body);
      const profile = await this.service.updateProfile(userId, input);
      return reply.send({ profile });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }
}