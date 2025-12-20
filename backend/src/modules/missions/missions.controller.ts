import { FastifyRequest, FastifyReply } from 'fastify';
import { MissionsService } from './missions.service.js';
import {
  availableMissionsSchema,
  deliverMissionSchema,
  cancelMissionSchema,
  updateLocationSchema,
  updateAvailabilitySchema,
  updateCarrierSettingsSchema,
  DeliverMissionInput,
  CancelMissionInput,
  UpdateLocationInput,
  UpdateAvailabilityInput,
  UpdateCarrierSettingsInput,
} from './missions.schemas.js';

export class MissionsController {
  constructor(private missionsService: MissionsService) {}

  async getAvailableMissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const query = availableMissionsSchema.parse(request.query);
      const result = await this.missionsService.getAvailableMissions(userId, query);
      return reply.send(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Paramètres invalides', details: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  }

  async acceptMission(
    request: FastifyRequest<{ Params: { parcelId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.missionsService.acceptMission(userId, request.params.parcelId);
      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getCurrentMissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.missionsService.getCurrentMissions(userId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getMissionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const { page = '1', limit = '10' } = request.query as any;
      const result = await this.missionsService.getMissionHistory(
        userId,
        parseInt(page),
        parseInt(limit)
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async pickupMission(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const mission = await this.missionsService.pickupMission(userId, request.params.id);
      return reply.send({ mission });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async deliverMission(
    request: FastifyRequest<{ Params: { id: string }; Body: DeliverMissionInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = deliverMissionSchema.parse(request.body);
      const mission = await this.missionsService.deliverMission(userId, request.params.id, input);
      return reply.send({ mission });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async cancelMission(
    request: FastifyRequest<{ Params: { id: string }; Body: CancelMissionInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = cancelMissionSchema.parse(request.body);
      const result = await this.missionsService.cancelMission(userId, request.params.id, input);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  // Carrier endpoints
  async updateAvailability(
    request: FastifyRequest<{ Body: UpdateAvailabilityInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateAvailabilitySchema.parse(request.body);
      const profile = await this.missionsService.updateAvailability(userId, input);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateLocation(
    request: FastifyRequest<{ Body: UpdateLocationInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateLocationSchema.parse(request.body);
      const profile = await this.missionsService.updateLocation(userId, input);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateSettings(
    request: FastifyRequest<{ Body: UpdateCarrierSettingsInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = updateCarrierSettingsSchema.parse(request.body);
      const profile = await this.missionsService.updateSettings(userId, input);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getCarrierProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const profile = await this.missionsService.getCarrierProfile(userId);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  }

  async getCarrierLocation(
    request: FastifyRequest<{ Params: { carrierId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const location = await this.missionsService.getCarrierLocation(request.params.carrierId);
      return reply.send(location);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}