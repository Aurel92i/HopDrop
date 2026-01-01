import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export function setupAuthMiddleware(app: FastifyInstance) {
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Non autorisé', message: 'Token invalide ou expiré' });
    }
  });
}

// Étendre les types Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}