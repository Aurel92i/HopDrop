import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    
    if (!userId) {
      return reply.status(401).send({ error: 'Non authentifié' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs' });
    }
  } catch (error) {
    return reply.status(500).send({ error: 'Erreur serveur' });
  }
}