import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

export async function reviewsRoutes(app: FastifyInstance) {
  const reviewsService = new ReviewsService();
  const reviewsController = new ReviewsController(reviewsService);

  // Créer un avis (protégé)
  app.post('/reviews', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => reviewsController.createReview(request, reply));

  // Mes avis reçus (protégé)
  app.get('/reviews/received', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => reviewsController.getMyReceivedReviews(request, reply));

  // Mes avis donnés (protégé)
  app.get('/reviews/given', {
    preHandler: [app.authenticate],
  }, (request: FastifyRequest, reply: FastifyReply) => reviewsController.getMyGivenReviews(request, reply));

  // Avis d'un utilisateur (public)
  app.get('/reviews/user/:userId', (request: FastifyRequest, reply: FastifyReply) => reviewsController.getReviewsForUser(request, reply));
}