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

// Interface pour le body JSON avec base64
interface Base64UploadBody {
  file?: string;      // base64 string
  base64?: string;    // alternative key
  folder?: string;
}

export async function uploadsRoutes(app: FastifyInstance) {
  
  // ===== Route principale: POST /uploads =====
  // Accepte multipart (FormData) OU JSON (base64)
  app.post('/', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const contentType = request.headers['content-type'] || '';
      
      // === CAS 1: Multipart (FormData) ===
      if (contentType.includes('multipart/form-data')) {
        return await handleMultipartUpload(request, reply, app);
      }
      
      // === CAS 2: JSON avec base64 ===
      if (contentType.includes('application/json')) {
        return await handleBase64Upload(request, reply, app);
      }
      
      // === CAS 3: Essayer multipart par défaut ===
      try {
        return await handleMultipartUpload(request, reply, app);
      } catch (multipartError) {
        // Si multipart échoue, essayer base64
        try {
          return await handleBase64Upload(request, reply, app);
        } catch (base64Error) {
          app.log.error('Upload failed for both multipart and base64');
          return reply.status(400).send({ 
            error: 'Format non supporté. Utilisez multipart/form-data ou JSON avec base64.' 
          });
        }
      }
    } catch (error: any) {
      app.log.error('Upload error:', error);
      return reply.status(500).send({ error: error.message || 'Erreur lors de l\'upload' });
    }
  });

  // ===== Route legacy: POST /uploads/single =====
  app.post('/single', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handleMultipartUpload(request, reply, app);
    } catch (error: any) {
      app.log.error('Upload single error:', error);
      return reply.status(500).send({ error: error.message || 'Erreur lors de l\'upload' });
    }
  });

  // ===== Route base64 explicite: POST /uploads/base64 =====
  app.post('/base64', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handleBase64Upload(request, reply, app);
    } catch (error: any) {
      app.log.error('Upload base64 error:', error);
      return reply.status(500).send({ error: error.message || 'Erreur lors de l\'upload' });
    }
  });

  // ===== Supprimer un fichier de Cloudinary =====
  app.delete('/:publicId', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { publicId: string } }>, reply: FastifyReply) => {
    try {
      const { publicId } = request.params;
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        return reply.send({ success: true, message: 'Fichier supprime' });
      } else {
        return reply.status(404).send({ error: 'Fichier non trouve' });
      }
    } catch (error: any) {
      app.log.error('Delete error:', error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression' });
    }
  });
}

// ===== Handler pour upload multipart (FormData) =====
async function handleMultipartUpload(
  request: FastifyRequest, 
  reply: FastifyReply,
  app: FastifyInstance
): Promise<any> {
  const data = await request.file();
  
  if (!data) {
    return reply.status(400).send({ error: 'Aucun fichier fourni' });
  }

  // Verifier le type MIME
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ];

  if (!allowedMimes.includes(data.mimetype)) {
    return reply.status(400).send({ 
      error: `Type de fichier non autorise: ${data.mimetype}` 
    });
  }

  // Lire le fichier en buffer
  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  
  // Convertir en base64 pour Cloudinary
  const base64 = buffer.toString('base64');
  const dataUri = `data:${data.mimetype};base64,${base64}`;

  // Upload vers Cloudinary
  const publicId = `hopdrop/${Date.now()}-${randomUUID()}`;
  
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: 'hopdrop',
    resource_type: 'auto',
  });

  app.log.info(`Uploaded to Cloudinary: ${result.secure_url}`);

  return reply.send({
    success: true,
    url: result.secure_url,
    publicId: result.public_id,
    file: {
      filename: data.filename,
      mimetype: data.mimetype,
      url: result.secure_url,
      publicId: result.public_id,
    },
  });
}

// ===== Handler pour upload base64 (JSON) =====
async function handleBase64Upload(
  request: FastifyRequest,
  reply: FastifyReply,
  app: FastifyInstance
): Promise<any> {
  const body = request.body as Base64UploadBody;
  const base64Data = body.file || body.base64;
  const folder = body.folder || 'hopdrop';

  if (!base64Data) {
    return reply.status(400).send({ 
      error: 'Aucune donnee base64 fournie. Utilisez "file" ou "base64" dans le body.' 
    });
  }

  // Verifier si c'est un data URI ou juste du base64 brut
  let dataUri = base64Data;
  if (!base64Data.startsWith('data:')) {
    // Essayer de detecter le type d'image depuis le base64
    const mimeType = detectMimeType(base64Data);
    dataUri = `data:${mimeType};base64,${base64Data}`;
  }

  // Upload vers Cloudinary
  const publicId = `${folder}/${Date.now()}-${randomUUID()}`;
  
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: folder,
    resource_type: 'auto',
  });

  app.log.info(`Uploaded base64 to Cloudinary: ${result.secure_url}`);

  return reply.send({
    success: true,
    url: result.secure_url,
    publicId: result.public_id,
  });
}

// ===== Detecter le type MIME depuis les premiers bytes du base64 =====
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

  return 'image/jpeg'; // Defaut
}