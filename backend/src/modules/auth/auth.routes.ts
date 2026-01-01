import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);
  const authController = new AuthController(authService);

  // Routes publiques
  app.post('/auth/register', authController.register.bind(authController));
  app.post('/auth/login', authController.login.bind(authController));
  app.post('/auth/refresh', authController.refresh.bind(authController));
  app.post('/auth/forgot-password', authController.forgotPassword.bind(authController));
  app.post('/auth/reset-password', authController.resetPassword.bind(authController));

  // Routes protégées
  app.post('/auth/logout', {
    preHandler: [app.authenticate],
  }, authController.logout.bind(authController));

  app.get('/auth/me', {
    preHandler: [app.authenticate],
  }, authController.getMe.bind(authController));
}