import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
    try {
      const input = registerSchema.parse(request.body);
      const user = await this.authService.register(input);
      
      return reply.status(201).send({
        user,
        message: 'Inscription réussie. Vérifiez votre email.',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async login(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
    try {
      const input = loginSchema.parse(request.body);
      const result = await this.authService.login(input);
      
      return reply.send({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(401).send({ error: error.message });
    }
  }

  async refresh(request: FastifyRequest<{ Body: RefreshTokenInput }>, reply: FastifyReply) {
    try {
      const input = refreshTokenSchema.parse(request.body);
      const tokens = await this.authService.refreshToken(input.refreshToken);
      
      return reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(401).send({ error: error.message });
    }
  }

  async logout(request: FastifyRequest<{ Body: RefreshTokenInput }>, reply: FastifyReply) {
    try {
      const input = refreshTokenSchema.parse(request.body);
      await this.authService.logout(input.refreshToken);
      
      return reply.send({ message: 'Déconnexion réussie' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async forgotPassword(request: FastifyRequest<{ Body: ForgotPasswordInput }>, reply: FastifyReply) {
    try {
      const input = forgotPasswordSchema.parse(request.body);
      await this.authService.forgotPassword(input.email);
      
      return reply.send({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async resetPassword(request: FastifyRequest<{ Body: ResetPasswordInput }>, reply: FastifyReply) {
    try {
      const input = resetPasswordSchema.parse(request.body);
      await this.authService.resetPassword(input.token, input.newPassword);
      
      return reply.send({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const user = await this.authService.getMe(userId);
      
      return reply.send({ user });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  }
}