import { FastifyInstance } from 'fastify';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

export async function reviewsRoutes(app: FastifyInstance) {
  const reviewsService = new ReviewsService();
  const reviewsController = new ReviewsController(reviewsService);

  // Créer un avis (protégé)
  app.post('/reviews', {
    preHandler: [app.authenticate],
  }, reviewsController.createReview.bind(reviewsController));

  // Mes avis reçus (protégé)
  app.get('/reviews/received', {
    preHandler: [app.authenticate],
  }, reviewsController.getMyReceivedReviews.bind(reviewsController));

  // Mes avis donnés (protégé)
  app.get('/reviews/given', {
    preHandler: [app.authenticate],
  }, reviewsController.getMyGivenReviews.bind(reviewsController));

  // Avis d'un utilisateur (public)
  app.get('/reviews/user/:userId', reviewsController.getReviewsForUser.bind(reviewsController));
}