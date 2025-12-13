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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Servir les fichiers statiques (uploads)
await app.register(staticFiles, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});

// Middleware d'authentification
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
    message: '🚀 HopDrop API is running!',
    version: '1.0.0',
  };
});

// Routes
await app.register(authRoutes);
await app.register(usersRoutes);
await app.register(addressesRoutes);
await app.register(parcelsRoutes);
await app.register(missionsRoutes);

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
    
    📝 Endpoints disponibles:
    
    AUTH:
    POST /auth/register
    POST /auth/login
    POST /auth/refresh
    POST /auth/logout
    POST /auth/forgot-password
    POST /auth/reset-password
    GET  /auth/me
    
    USERS:
    GET  /users/me
    PUT  /users/me
    PUT  /users/me/avatar
    GET  /users/:id/profile
    
    ADDRESSES:
    GET    /addresses
    POST   /addresses
    PUT    /addresses/:id
    DELETE /addresses/:id
    POST   /addresses/geocode

    PARCELS:
    POST   /parcels
    GET    /parcels
    GET    /parcels/:id
    PUT    /parcels/:id
    DELETE /parcels/:id
    POST   /parcels/:id/confirm-pickup

    MISSIONS:
    GET    /missions/available?latitude=X&longitude=Y&radius=Z
    POST   /missions/:parcelId/accept
    GET    /missions/current
    GET    /missions/history
    POST   /missions/:id/pickup
    POST   /missions/:id/deliver
    POST   /missions/:id/cancel
    
    CARRIER:
    PUT    /carrier/availability
    PUT    /carrier/location
    PUT    /carrier/settings
    GET    /carrier/profile
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();