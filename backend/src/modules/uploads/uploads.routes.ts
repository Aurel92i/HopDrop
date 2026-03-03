// backend/src/modules/uploads/uploads.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';

// Configuration Cloudinary (utilise les variables d'environnement)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface Base64UploadBody {
  file?: string;
  base64?: string;
  folder?: string;
}

export async function uploadsRoutes(app: FastifyInstance) {

  // ============================================================
  // Route principale: POST /uploads
  // Accepte multipart (FormData) OU JSON (base64)
  // Body limit augmenté à 50 MB pour les gros PDF en base64
  // ============================================================
  app.post('/', {
    preHandler: [app.authenticate],
    config: {
      // Augmenter la limite pour les fichiers base64 volumineux
      rawBody: true,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const contentType = request.headers['content-type'] || '';

      app.log.info(`[UPLOAD] POST /uploads - Content-Type: ${contentType}`);

      if (contentType.includes('multipart/form-data')) {
        app.log.info('[UPLOAD] Mode: multipart/form-data');
        return await handleMultipartUpload(request, reply, app);
      }

      if (contentType.includes('application/json')) {
        app.log.info('[UPLOAD] Mode: application/json (base64)');
        return await handleBase64Upload(request, reply, app);
      }

      // Fallback: essayer multipart puis base64
      try {
        return await handleMultipartUpload(request, reply, app);
      } catch (multipartError) {
        try {
          return await handleBase64Upload(request, reply, app);
        } catch (base64Error) {
          app.log.error('[UPLOAD] Aucun format reconnu');
          return reply.status(400).send({
            error: 'Format non supporté. Utilisez multipart/form-data ou application/json.',
          });
        }
      }
    } catch (error: any) {
      app.log.error('[UPLOAD] Erreur générale:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });

  // ============================================================
  // Route base64 explicite: POST /uploads/base64
  // (Gardée pour compatibilité, mais /uploads accepte aussi le JSON)
  // ============================================================
  app.post('/base64', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      app.log.info('[UPLOAD] POST /uploads/base64');
      return await handleBase64Upload(request, reply, app);
    } catch (error: any) {
      app.log.error('[UPLOAD] Erreur /uploads/base64:', error.message);
      return reply.status(500).send({ error: error.message });
    }
  });
}

// Handler pour upload multipart (FormData)
async function handleMultipartUpload(request: FastifyRequest, reply: FastifyReply, app: FastifyInstance) {
  const data = await (request as any).file();

  if (!data) {
    app.log.warn('[UPLOAD] Multipart reçu SANS fichier - ignoré');
    return reply.status(200).send({ success: false, error: 'Aucun fichier fourni', url: null });
  }

  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/heic', 'image/heif', 'application/pdf',
  ];

  if (!allowedMimes.includes(data.mimetype)) {
    return reply.status(400).send({
      error: `Type non autorisé: ${data.mimetype}`,
    });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString('base64');
  const dataUri = `data:${data.mimetype};base64,${base64}`;

  const publicId = `hopdrop/${Date.now()}-${randomUUID()}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: 'hopdrop',
    resource_type: 'auto',
  });

  app.log.info(`[UPLOAD] Multipart -> Cloudinary OK: ${result.secure_url}`);

  return reply.send({
    success: true,
    url: result.secure_url,
    publicId: result.public_id,
  });
}

// Handler pour upload base64 (JSON)
async function handleBase64Upload(request: FastifyRequest, reply: FastifyReply, app: FastifyInstance) {
  const body = request.body as Base64UploadBody;
  const base64Data = body.file || body.base64;
  const folder = body.folder || 'hopdrop';

  if (!base64Data) {
    app.log.error('[UPLOAD] Base64: aucune donnée reçue. Body keys:', Object.keys(body || {}));
    return reply.status(400).send({
      error: 'Aucune donnée base64 fournie. Envoyez { "file": "data:...;base64,..." }',
    });
  }

  app.log.info(`[UPLOAD] Base64 reçu - taille: ${Math.round(base64Data.length / 1024)} KB - folder: ${folder}`);

  let dataUri = base64Data;
  if (!base64Data.startsWith('data:')) {
    const mimeType = detectMimeType(base64Data);
    dataUri = `data:${mimeType};base64,${base64Data}`;
    app.log.info(`[UPLOAD] MIME détecté automatiquement: ${mimeType}`);
  }

  const publicId = `${folder}/${Date.now()}-${randomUUID()}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: folder,
    resource_type: 'auto',
  });

  app.log.info(`[UPLOAD] Base64 -> Cloudinary OK: ${result.secure_url}`);

  return reply.send({
    success: true,
    url: result.secure_url,
    publicId: result.public_id,
  });
}

function detectMimeType(base64: string): string {
  const signatures: { [key: string]: string } = {
    '/9j/': 'image/jpeg',
    'iVBORw': 'image/png',
    'R0lGOD': 'image/gif',
    'UklGR': 'image/webp',
    'JVBER': 'application/pdf',
  };

  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (base64.startsWith(signature)) {
      return mimeType;
    }
  }

  return 'image/jpeg';
}
