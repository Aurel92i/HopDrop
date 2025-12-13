import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { setupAuthMiddleware } from './shared/middlewares/auth.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { addressesRoutes } from './modules/addresses/addresses.routes.js';
import { parcelsRoutes } from './modules/parcels/parcels.routes.js';
import { missionsRoutes } from './modules/missions/missions.routes.js';
import { uploadsRoutes } from './modules/uploads/uploads.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

await app.register(staticFiles, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});

// Middleware
setupAuthMiddleware(app);

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
    message: 'HopDrop API is running!',
    version: '1.0.0',
  };
});

// Routes
await app.register(authRoutes);
await app.register(usersRoutes);
await app.register(addressesRoutes);
await app.register(parcelsRoutes);
await app.register(missionsRoutes);
await app.register(uploadsRoutes);

// Gestion erreurs
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.name,
    message: error.message,
    statusCode: error.statusCode || 500,
  });
});

// Demarrer
const start = async () => {
  try {
    const port = parseInt(env.PORT);
    await app.listen({ port, host: '0.0.0.0' });
    console.log('HopDrop API started on http://localhost:' + port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();