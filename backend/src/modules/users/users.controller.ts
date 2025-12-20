import { FastifyRequest, FastifyReply } from 'fastify';
import { UsersService } from './users.service.js';
import { updateUserSchema, UpdateUserInput } from './users.schemas.js';

export class UsersController {
  constructor(private usersService: UsersService) {}

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const user = await this.usersService.getMe(userId);
      return reply.send({ user });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  }

  async updateMe(request: FastifyRequest<{ Body: UpdateUserInput }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const input = updateUserSchema.parse(request.body);
      const user = await this.usersService.updateMe(userId, input);
      return reply.send({ user });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateAvatar(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Type de fichier non autorisé (jpg, png, webp uniquement)' });
      }

      // Pour le MVP, on stocke localement
      const fs = await import('fs');
      const path = await import('path');
      const { nanoid } = await import('nanoid');

      const ext = data.filename.split('.').pop();
      const filename = `${nanoid()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

      // Créer le dossier si nécessaire
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filepath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filepath, await data.toBuffer());

      const avatarUrl = `/uploads/avatars/${filename}`;
      const user = await this.usersService.updateAvatar(userId, avatarUrl);

      return reply.send({ user, avatarUrl });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

async updateFcmToken(request: FastifyRequest<{ Body: { fcmToken: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any).userId;
      const { fcmToken } = request.body;
      
      await this.service.updateFcmToken(userId, fcmToken);
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
  async getPublicProfile(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const profile = await this.usersService.getPublicProfile(request.params.id);
      return reply.send({ profile });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  }
}

  