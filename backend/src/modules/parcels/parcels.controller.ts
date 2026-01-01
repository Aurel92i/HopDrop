import { FastifyRequest, FastifyReply } from 'fastify';
import { ParcelsService } from './parcels.service.js';
import {
  createParcelSchema,
  updateParcelSchema,
  confirmPickupSchema,
  listParcelsSchema,
  CreateParcelInput,
  UpdateParcelInput,
  ConfirmPickupInput,
} from './parcels.schemas.js';

export class ParcelsController {
  constructor(private parcelsService: ParcelsService) {}

  async createParcel(request: FastifyRequest<{ Body: CreateParcelInput }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const input = createParcelSchema.parse(request.body);
      const parcel = await this.parcelsService.createParcel(userId, input);
      return reply.status(201).send({ parcel });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async getParcels(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const query = listParcelsSchema.parse(request.query);
      const result = await this.parcelsService.getParcels(userId, query);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getParcel(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const parcel = await this.parcelsService.getParcel(userId, request.params.id);
      return reply.send({ parcel });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  }

  async updateParcel(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateParcelInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateParcelSchema.parse(request.body);
      const parcel = await this.parcelsService.updateParcel(userId, request.params.id, input);
      return reply.send({ parcel });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async cancelParcel(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      await this.parcelsService.cancelParcel(userId, request.params.id);
      return reply.send({ message: 'Colis annulé' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async confirmPickup(
    request: FastifyRequest<{ Params: { id: string }; Body: ConfirmPickupInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = confirmPickupSchema.parse(request.body);
      const parcel = await this.parcelsService.confirmPickup(userId, request.params.id, input.pickupCode);
      return reply.send({ parcel });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }
}