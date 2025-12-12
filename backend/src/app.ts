import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
});

// Health check
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hopdrop-api',
  };
});

// Route racine
app.get('/', async () => {
  return {
    message: '🚀 HopDrop API is running!',
    version: '1.0.0',
  };
});

// Gestion d'erreurs globale
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.name,
    message: error.message,
    statusCode: error.statusCode || 500,
  });
});

// Démarrer le serveur
const start = async () => {
  try {
    const port = parseInt(env.PORT);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`
    🚀 HopDrop API started!
    📍 http://localhost:${port}
    ❤️  Health: http://localhost:${port}/health
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
