import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentsService } from './payments.service.js';
import {
  createPaymentIntentSchema,
  confirmPaymentSchema,
  CreatePaymentIntentInput,
  ConfirmPaymentInput,
} from './payments.schemas.js';

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  async createPaymentIntent(
    request: FastifyRequest<{ Body: CreatePaymentIntentInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = createPaymentIntentSchema.parse(request.body);
      const result = await this.paymentsService.createPaymentIntent(userId, input.parcelId);
      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async confirmPayment(
    request: FastifyRequest<{ Body: ConfirmPaymentInput }>,
    reply: FastifyReply
  ) {
    try {
      const input = confirmPaymentSchema.parse(request.body);
      const result = await this.paymentsService.confirmPayment(input.paymentIntentId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async createConnectAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.paymentsService.createConnectAccount(userId);
      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getConnectAccountStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const result = await this.paymentsService.getConnectAccountStatus(userId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTransactionHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const { page = '1', limit = '10' } = request.query as any;
      const result = await this.paymentsService.getTransactionHistory(
        userId,
        parseInt(page),
        parseInt(limit)
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }
}