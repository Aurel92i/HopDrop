import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { RegisterInput, LoginInput, SocialAuthInput } from './auth.schemas.js';
import { AuthTokens, sanitizeUser, SafeUser } from './auth.types.js';
import { FastifyInstance } from 'fastify';
import { verifyGoogleToken, verifyAppleToken } from './social-auth.service.js';
import { emailService } from '../../shared/services/email.service.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Générer un code de vérification à 6 chiffres
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        emailVerificationCode: verificationCode,
        emailVerificationCodeExp: codeExpiry,
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

    // Envoyer le code par email
    await emailService.sendVerificationCode(user.email, verificationCode, user.firstName);

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

    // Si l'utilisateur s'est inscrit via social auth et n'a pas de mot de passe
    if (!user.passwordHash) {
      throw new Error('Ce compte utilise la connexion ' + (user.authProvider || 'sociale') + '. Veuillez vous connecter avec ' + (user.authProvider || 'votre provider social') + '.');
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

  // ===== ENVOYER / RENVOYER LE CODE DE VÉRIFICATION =====
  async sendVerificationCode(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    if (user.emailVerified) {
      throw new Error('Votre email est déjà vérifié');
    }

    // Générer un nouveau code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationCodeExp: codeExpiry,
      },
    });

    // Envoyer le code par email
    await emailService.sendVerificationCode(user.email, verificationCode, user.firstName);
  }

  // ===== VÉRIFIER LE CODE =====
  async verifyEmail(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    if (user.emailVerified) {
      throw new Error('Votre email est déjà vérifié');
    }

    if (!user.emailVerificationCode || !user.emailVerificationCodeExp) {
      throw new Error('Aucun code de vérification en attente. Demandez un nouveau code.');
    }

    // Vérifier l'expiration
    if (user.emailVerificationCodeExp < new Date()) {
      throw new Error('Le code a expiré. Demandez un nouveau code.');
    }

    // Vérifier le code
    if (user.emailVerificationCode !== code) {
      throw new Error('Code incorrect');
    }

    // Marquer comme vérifié
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationCodeExp: null,
        emailVerificationToken: null,
      },
    });
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

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Mot de passe actuel incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async socialLogin(input: SocialAuthInput): Promise<{ user: SafeUser; tokens: AuthTokens; isNewUser: boolean }> {
    // Vérifier le token selon le provider
    const socialUser = input.provider === 'google'
      ? await verifyGoogleToken(input.token)
      : await verifyAppleToken(input.token);

    // Chercher un utilisateur existant par email
    let user = await prisma.user.findUnique({
      where: { email: socialUser.email },
    });

    let isNewUser = false;

    if (user) {
      // Mettre à jour le provider si pas déjà défini
      if (!user.authProvider) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: input.provider,
            authProviderId: socialUser.providerId,
          },
        });
      }
    } else {
      // Créer l'utilisateur
      const role = input.role || 'VENDOR';
      user = await prisma.user.create({
        data: {
          email: socialUser.email,
          firstName: socialUser.firstName || 'Utilisateur',
          lastName: socialUser.lastName || '',
          role,
          avatarUrl: socialUser.avatarUrl,
          authProvider: input.provider,
          authProviderId: socialUser.providerId,
          emailVerified: true, // Email vérifié par le provider
        },
      });

      // Si le rôle est CARRIER ou BOTH, créer le profil carrier
      if (role === 'CARRIER' || role === 'BOTH') {
        await prisma.carrierProfile.create({
          data: { userId: user.id },
        });
      }

      isNewUser = true;
    }

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: sanitizeUser(user),
      tokens,
      isNewUser,
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
