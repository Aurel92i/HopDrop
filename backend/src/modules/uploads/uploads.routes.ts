// backend/src/modules/uploads/uploads.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossier d'upload
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadsRoutes(app: FastifyInstance) {
  
  // ============================================
  // Route principale POST / (pour l'app mobile)
  // ============================================
  app.post('/', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      if (!allowedMimes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Type de fichier non autorisé' });
      }

      const ext = path.extname(data.filename);
      const uniqueFilename = `${Date.now()}-${randomUUID()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      await pipeline(data.file, fs.createWriteStream(filePath));

      const fileUrl = `/uploads/${uniqueFilename}`;

      // Retourner le format attendu par l'app mobile
      return reply.send({
        url: fileUrl,
        filename: uniqueFilename,
        originalname: data.filename,
        mimetype: data.mimetype,
      });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l\'upload' });
    }
  });

  // ============================================
  // Upload d'un fichier unique (route legacy)
  // ============================================
  app.post('/single', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      // Vérifier le type MIME
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      if (!allowedMimes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Type de fichier non autorisé' });
      }

      // Générer un nom unique
      const ext = path.extname(data.filename);
      const uniqueFilename = `${Date.now()}-${randomUUID()}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Sauvegarder le fichier
      await pipeline(data.file, fs.createWriteStream(filePath));

      const fileUrl = `/uploads/${uniqueFilename}`;

      return reply.send({
        success: true,
        file: {
          filename: uniqueFilename,
          originalname: data.filename,
          mimetype: data.mimetype,
          url: fileUrl,
        },
      });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l\'upload' });
    }
  });

  // ============================================
  // Upload de plusieurs fichiers
  // ============================================
  app.post('/multiple', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parts = request.files();
      const uploadedFiles: any[] = [];

      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      for await (const part of parts) {
        if (!allowedMimes.includes(part.mimetype)) {
          continue; // Ignorer les fichiers non autorisés
        }

        const ext = path.extname(part.filename);
        const uniqueFilename = `${Date.now()}-${randomUUID()}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFilename);

        await pipeline(part.file, fs.createWriteStream(filePath));

        uploadedFiles.push({
          filename: uniqueFilename,
          originalname: part.filename,
          mimetype: part.mimetype,
          url: `/uploads/${uniqueFilename}`,
        });
      }

      if (uploadedFiles.length === 0) {
        return reply.status(400).send({ error: 'Aucun fichier valide fourni' });
      }

      return reply.send({
        success: true,
        files: uploadedFiles,
      });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l\'upload' });
    }
  });

  // ============================================
  // Supprimer un fichier
  // ============================================
  app.delete('/:filename', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params;
      
      // Sécurité: empêcher la traversée de répertoire
      if (filename.includes('..') || filename.includes('/')) {
        return reply.status(400).send({ error: 'Nom de fichier invalide' });
      }

      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: 'Fichier non trouvé' });
      }

      fs.unlinkSync(filePath);

      return reply.send({
        success: true,
        message: 'Fichier supprimé',
      });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression' });
    }
  });

  // ============================================
  // Lister les fichiers uploadés
  // ============================================
  app.get('/list', {
    preHandler: [app.authenticate],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = fs.readdirSync(uploadsDir);
      
      const fileList = files
        .filter(f => !fs.statSync(path.join(uploadsDir, f)).isDirectory())
        .map((filename) => {
          const filePath = path.join(uploadsDir, filename);
          const stats = fs.statSync(filePath);
          return {
            filename,
            url: `/uploads/${filename}`,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        });

      return reply.send({ files: fileList });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des fichiers' });
    }
  });
}