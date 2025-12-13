import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';
import { AuthTokens, sanitizeUser, SafeUser } from './auth.types.js';
import { FastifyInstance } from 'fastify';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(input: RegisterInput): Promise<SafeUser> {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Générer un token de vérification email
    const emailVerificationToken = nanoid(32);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        emailVerificationToken,
      },
    });

    // Si le rôle est CARRIER ou BOTH, créer le profil carrier
    if (input.role === 'CARRIER' || input.role === 'BOTH') {
      await prisma.carrierProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    // TODO: Envoyer l'email de vérification

    return sanitizeUser(user);
  }

  async login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Trouver le refresh token en BDD
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Refresh token invalide');
    }

    // Vérifier l'expiration
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Refresh token expiré');
    }

    // Supprimer l'ancien token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Générer de nouveaux tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Ne pas révéler si l'email existe ou non
      return;
    }

    const resetToken = nanoid(32);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Envoyer l'email avec le lien de reset
    console.log(`[DEV] Reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new Error('Token invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Supprimer tous les refresh tokens de cet utilisateur
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });
  }

  async getMe(userId: string): Promise<SafeUser & { carrierProfile?: any }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        carrierProfile: true,
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return {
      ...sanitizeUser(user),
      carrierProfile: user.carrierProfile,
    };
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    // Générer l'access token JWT
    const accessToken = this.app.jwt.sign(
      { userId, email, role },
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Générer le refresh token
    const refreshToken = nanoid(64);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Stocker le refresh token en BDD
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}