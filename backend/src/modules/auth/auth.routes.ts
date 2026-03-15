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
  app.post('/auth/social', authController.socialLogin.bind(authController));
  app.post('/auth/forgot-password', authController.forgotPassword.bind(authController));
  app.post('/auth/reset-password', authController.resetPassword.bind(authController));

  // Routes protégées
  app.post('/auth/logout', {
    preHandler: [app.authenticate],
  }, authController.logout.bind(authController));

  app.get('/auth/me', {
    preHandler: [app.authenticate],
  }, authController.getMe.bind(authController));

  app.post('/auth/change-password', {
    preHandler: [app.authenticate],
  }, authController.changePassword.bind(authController));

  // ===== VÉRIFICATION EMAIL =====

  // POST /auth/send-verification-code — Envoyer/renvoyer le code
  app.post('/auth/send-verification-code', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      await authService.sendVerificationCode(userId);
      return reply.send({ message: 'Code de vérification envoyé par email' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // POST /auth/verify-email — Vérifier le code
  app.post('/auth/verify-email', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).userId;
      const { code } = request.body as { code: string };

      if (!code || code.length !== 6) {
        return reply.status(400).send({ error: 'Code à 6 chiffres requis' });
      }

      await authService.verifyEmail(userId, code);
      return reply.send({ message: 'Email vérifié avec succès', verified: true });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
