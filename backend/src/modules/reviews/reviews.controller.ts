import { FastifyRequest, FastifyReply } from 'fastify';
import { ReviewsService } from './reviews.service.js';
import {
  createReviewSchema,
  listReviewsSchema,
  CreateReviewInput,
} from './reviews.schemas.js';

export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  async createReview(
    request: FastifyRequest<{ Body: CreateReviewInput }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const input = createReviewSchema.parse(request.body);
      const review = await this.reviewsService.createReview(userId, input);
      return reply.status(201).send({ review });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async getReviewsForUser(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const query = listReviewsSchema.parse(request.query);
      const result = await this.reviewsService.getReviewsForUser(
        request.params.userId,
        parseInt(query.page),
        parseInt(query.limit)
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getMyReceivedReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const query = listReviewsSchema.parse(request.query);
      const result = await this.reviewsService.getReviewsForUser(
        userId,
        parseInt(query.page),
        parseInt(query.limit)
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getMyGivenReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const query = listReviewsSchema.parse(request.query);
      const result = await this.reviewsService.getMyReviews(
        userId,
        parseInt(query.page),
        parseInt(query.limit)
      );
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }
}