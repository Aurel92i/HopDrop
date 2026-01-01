// backend/src/modules/ai-analysis/ai-analysis.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  analyzeArticleImage,
  analyzeArticleImageBase64,
} from './ai-analysis.service.js';
import { PACKAGE_SIZES, PRICING } from './ai-analysis.types.js';

// Types pour les requêtes
interface AnalyzeBody {
  imageUrl?: string;
  base64Image?: string;
}

export async function aiAnalysisRoutes(app: FastifyInstance) {
  // ===== POST /ai/analyze =====
  // Analyse une image d'article avec l'IA
  app.post<{ Body: AnalyzeBody }>(
    '/ai/analyze',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest<{ Body: AnalyzeBody }>, reply: FastifyReply) => {
      try {
        const { imageUrl, base64Image } = request.body;

        if (!imageUrl && !base64Image) {
          return reply.status(400).send({
            error: 'Données manquantes',
            message: 'imageUrl ou base64Image requis',
          });
        }

        let result;

        if (base64Image) {
          result = await analyzeArticleImageBase64(base64Image);
        } else {
          result = await analyzeArticleImage(imageUrl!);
        }

        return reply.send({
          success: true,
          analysis: result,
          pricing: {
            fixedPrice: PRICING.FIXED_PRICE,
            carrierPayout: PRICING.CARRIER_PAYOUT,
          },
        });
      } catch (error: any) {
        console.error('Erreur analyse article:', error);
        return reply.status(500).send({
          error: 'Erreur',
          message: error.message || 'Impossible d\'analyser l\'image',
        });
      }
    }
  );

  // ===== GET /ai/package-sizes =====
  // Retourne les tailles de colis disponibles (public)
  app.get(
    '/ai/package-sizes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sizes = Object.entries(PACKAGE_SIZES).map(([key, value]) => ({
          size: key,
          name: value.name,
          description: value.description,
          maxDimensions: value.maxDimensions,
          examples: value.examples,
        }));

        return reply.send({
          success: true,
          sizes,
          note: 'Ces tailles sont valables pour tous les transporteurs (Mondial Relay, Vinted Go, Colissimo, etc.)',
        });
      } catch (error: any) {
        console.error('Erreur récupération tailles:', error);
        return reply.status(500).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );

  // ===== GET /ai/pricing =====
  // Retourne les informations de tarification (public)
  app.get(
    '/ai/pricing',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply.send({
          success: true,
          pricing: {
            fixedPrice: PRICING.FIXED_PRICE,
            platformFee: PRICING.PLATFORM_FEE,
            carrierPayout: PRICING.CARRIER_PAYOUT,
            currency: 'EUR',
            description: `Prix fixe de ${PRICING.FIXED_PRICE}€ quelle que soit la taille du colis`,
          },
        });
      } catch (error: any) {
        console.error('Erreur récupération pricing:', error);
        return reply.status(500).send({
          error: 'Erreur',
          message: error.message,
        });
      }
    }
  );
}