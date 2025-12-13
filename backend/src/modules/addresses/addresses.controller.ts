import { FastifyRequest, FastifyReply } from 'fastify';
import { AddressesService } from './addresses.service.js';
import {
  createAddressSchema,
  updateAddressSchema,
  geocodeSchema,
  CreateAddressInput,
  UpdateAddressInput,
  GeocodeInput,
} from './addresses.schemas.js';

export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  async getAddresses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const addresses = await this.addressesService.getAddresses(userId);
      return reply.send({ addresses });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async createAddress(request: FastifyRequest<{ Body: CreateAddressInput }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const input = createAddressSchema.parse(request.body);
      const address = await this.addressesService.createAddress(userId, input);
      return reply.status(201).send({ address });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateAddress(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateAddressInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateAddressSchema.parse(request.body);
      const address = await this.addressesService.updateAddress(userId, request.params.id, input);
      return reply.send({ address });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(404).send({ error: error.message });
    }
  }

  async deleteAddress(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.addressesService.deleteAddress(userId, request.params.id);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async geocode(request: FastifyRequest<{ Body: GeocodeInput }>, reply: FastifyReply) {
    try {
      const input = geocodeSchema.parse(request.body);
      const result = await this.addressesService.geocode(input.address);
      return reply.send(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  }
}