// backend/src/modules/ai-analysis/ai-analysis.service.ts

import OpenAI from 'openai';
import {
  AnalysisResult,
  PackageSize,
  LockerSize,
  Dimensions,
  PACKAGE_SIZES,
  CONSTRAINTS,
  PRICING
} from './ai-analysis.types.js';

// Mode mock pour le développement (économiser les crédits OpenAI)
const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true' || process.env.NODE_ENV === 'development';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

const SYSTEM_PROMPT = `Tu es un expert logistique professionnel spécialisé dans l'analyse d'articles pour l'expédition via lockers et points relais.

À partir de la photo fournie, tu dois analyser l'article et déterminer :

## 1️⃣ IDENTIFICATION DE L'ARTICLE (pour le vendeur)
- **Catégorie principale** : Mode, Technologie, Maison, Loisirs, Beauté, Autre
- **Sous-catégorie** : Ex: "Souris PC" pour Technologie, "Veste" pour Mode
- **Nom de l'article** : Description courte et précise SANS MENTIONNER LA MARQUE (pour éviter les tentatives de délits et agressions). Rester général, ex: "Souris sans fil ergonomique" au lieu de "Logitech MX Master"

## 2️⃣ DIMENSIONS DE L'ARTICLE (pour le livreur)
- Estimer les dimensions réelles (hauteur × largeur × profondeur) en centimètres
- Ajouter une marge de 2-3 cm par côté pour l'emballage

## 3️⃣ TAILLE DE COLIS RECOMMANDÉE
Choisir la plus petite taille compatible parmi :

| Taille | Dimensions max (H×L×P) | Exemples |
|--------|------------------------|----------|
| XS | 4 × 23 × 40 cm | Bijoux, montres, petits accessoires |
| S | 8 × 38 × 64 cm | T-shirts, livres, souris PC, petits jouets |
| M | 19 × 38 × 64 cm | Chaussures, pulls, sacs, casques audio |
| L | 38 × 39 × 64 cm | Manteaux, gros objets, ordinateurs portables |

⚠️ Ces tailles sont valables pour TOUS les transporteurs (Mondial Relay, Vinted Go, Colissimo, etc.)

## 4️⃣ RÈGLES IMPÉRATIVES
- Toujours choisir la PLUS PETITE taille compatible
- Ne jamais dépasser les dimensions maximales
- Être conservateur (mieux vaut trop grand que trop petit)
- Si aucune taille compatible → indiquer "NON_COMPATIBLE"

## 5️⃣ FORMAT DE RÉPONSE (JSON strict)
{
  "articleCategory": {
    "main": "Technologie",
    "sub": "Souris PC",
    "icon": "mouse"
  },
  "articleName": "Souris sans fil ergonomique",
  "articleDimensions": { "height": 4, "width": 7, "depth": 12 },
  "packageDimensions": { "height": 6, "width": 10, "depth": 15 },
  "packageSize": "S",
  "lockerSize": "S",
  "compatibleCarrier": "ALL",
  "justification": "Article compact de type souris PC. Dimensions estimées 4×7×12cm, avec emballage 6×10×15cm. Compatible avec casier S (8×38×64cm).",
  "confidence": "HIGH",
  "isCompatible": true
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

// Fonction MOCK pour le développement (ne consomme pas de crédits OpenAI)
function generateMockAnalysis(): AnalysisResult {
  // Simuler différents types d'articles de manière réaliste
  const mockVariations = [
    {
      articleCategory: {
        main: 'Mode',
        sub: 'T-shirt',
        icon: 'tshirt-crew',
      },
      articleName: 'T-shirt en coton',
      articleDimensions: { height: 1, width: 25, depth: 30 },
      packageDimensions: { height: 3, width: 28, depth: 33 },
      packageSize: 'S' as PackageSize,
      lockerSize: 'S' as LockerSize,
      compatibleCarrier: 'ALL',
      justification: 'T-shirt plié standard. Dimensions article estimées 1×25×30cm, avec emballage 3×28×33cm. Compatible avec casier S (8×38×64cm).',
      confidence: 'HIGH' as const,
      isCompatible: true,
    },
    {
      articleCategory: {
        main: 'Technologie',
        sub: 'Souris PC',
        icon: 'mouse',
      },
      articleName: 'Souris sans fil ergonomique',
      articleDimensions: { height: 4, width: 7, depth: 12 },
      packageDimensions: { height: 6, width: 10, depth: 15 },
      packageSize: 'S' as PackageSize,
      lockerSize: 'S' as LockerSize,
      compatibleCarrier: 'ALL',
      justification: 'Article compact de type souris PC. Dimensions estimées 4×7×12cm, avec emballage 6×10×15cm. Compatible avec casier S (8×38×64cm).',
      confidence: 'HIGH' as const,
      isCompatible: true,
    },
    {
      articleCategory: {
        main: 'Mode',
        sub: 'Chaussures',
        icon: 'shoe-formal',
      },
      articleName: 'Paire de baskets',
      articleDimensions: { height: 10, width: 28, depth: 32 },
      packageDimensions: { height: 12, width: 30, depth: 35 },
      packageSize: 'M' as PackageSize,
      lockerSize: 'M' as LockerSize,
      compatibleCarrier: 'ALL',
      justification: 'Paire de chaussures standard. Dimensions estimées 10×28×32cm, avec emballage 12×30×35cm. Compatible avec casier M (19×38×64cm).',
      confidence: 'HIGH' as const,
      isCompatible: true,
    },
    {
      articleCategory: {
        main: 'Maison',
        sub: 'Livre',
        icon: 'book-open-page-variant',
      },
      articleName: 'Livre broché format standard',
      articleDimensions: { height: 2, width: 15, depth: 23 },
      packageDimensions: { height: 4, width: 18, depth: 26 },
      packageSize: 'S' as PackageSize,
      lockerSize: 'S' as LockerSize,
      compatibleCarrier: 'ALL',
      justification: 'Livre de taille standard. Dimensions estimées 2×15×23cm, avec emballage 4×18×26cm. Compatible avec casier S (8×38×64cm).',
      confidence: 'HIGH' as const,
      isCompatible: true,
    },
    {
      articleCategory: {
        main: 'Beauté',
        sub: 'Parfum',
        icon: 'spray',
      },
      articleName: 'Flacon de parfum',
      articleDimensions: { height: 12, width: 5, depth: 8 },
      packageDimensions: { height: 14, width: 8, depth: 11 },
      packageSize: 'S' as PackageSize,
      lockerSize: 'S' as LockerSize,
      compatibleCarrier: 'ALL',
      justification: 'Flacon de parfum avec emballage protecteur. Dimensions estimées 12×5×8cm, avec emballage 14×8×11cm. Compatible avec casier S (8×38×64cm).',
      confidence: 'MEDIUM' as const,
      isCompatible: true,
    },
  ];

  // Retourner une variation aléatoire pour plus de réalisme
  const randomIndex = Math.floor(Math.random() * mockVariations.length);
  return mockVariations[randomIndex];
}

export async function analyzeArticleImage(imageUrl: string): Promise<AnalysisResult> {
  // MODE MOCK pour le développement
  if (USE_MOCK_AI) {
    console.log('🎭 MODE MOCK AI ACTIVÉ - Aucun crédit OpenAI utilisé');
    // Simuler un délai de traitement réaliste (1-2 secondes)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    return generateMockAnalysis();
  }

  // MODE PRODUCTION - Vraie API OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse cet article et détermine sa catégorie, ses dimensions et la taille de colis optimale.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Aucune réponse de l\'IA');
    }

    // Parser le JSON de la réponse
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    const result: AnalysisResult = JSON.parse(jsonMatch[0]);
    
    // Validation et ajustement
    return validateAndAdjustResult(result);
    
  } catch (error) {
    console.error('Erreur analyse IA:', error);
    throw new Error('Impossible d\'analyser l\'image. Veuillez réessayer.');
  }
}

function validateAndAdjustResult(result: AnalysisResult): AnalysisResult {
  const { packageDimensions, packageSize } = result;
  
  if (packageSize === 'NON_COMPATIBLE' || result.lockerSize === 'NON_COMPATIBLE') {
    return { ...result, isCompatible: false };
  }

  // Vérifier que le colis rentre dans la taille recommandée
  const sizeInfo = PACKAGE_SIZES[packageSize as keyof typeof PACKAGE_SIZES];
  if (!sizeInfo) {
    return { ...result, lockerSize: 'NON_COMPATIBLE', isCompatible: false };
  }

  const fits = checkFitsInSize(packageDimensions, sizeInfo.maxDimensions);
  
  if (!fits) {
    // Trouver la bonne taille
    const correctedSize = findSmallestFittingSize(packageDimensions);
    return {
      ...result,
      packageSize: correctedSize as PackageSize,
      lockerSize: correctedSize as LockerSize,
      isCompatible: correctedSize !== 'NON_COMPATIBLE',
    };
  }

  // S'assurer que lockerSize = packageSize (unifiés)
  return { 
    ...result, 
    lockerSize: packageSize as LockerSize,
    isCompatible: true 
  };
}

function checkFitsInSize(pkg: Dimensions, maxDims: Dimensions): boolean {
  // Tester les 6 orientations possibles du colis
  const pkgDims = [pkg.height, pkg.width, pkg.depth].sort((a, b) => a - b);
  const maxDimsSorted = [maxDims.height, maxDims.width, maxDims.depth].sort((a, b) => a - b);
  
  return pkgDims[0] <= maxDimsSorted[0] && 
         pkgDims[1] <= maxDimsSorted[1] && 
         pkgDims[2] <= maxDimsSorted[2];
}

function findSmallestFittingSize(pkg: Dimensions): PackageSize | 'NON_COMPATIBLE' {
  const sizes: PackageSize[] = ['XS', 'S', 'M', 'L'];
  
  for (const size of sizes) {
    const sizeInfo = PACKAGE_SIZES[size];
    if (checkFitsInSize(pkg, sizeInfo.maxDimensions)) {
      return size;
    }
  }
  
  return 'NON_COMPATIBLE';
}

// Analyser avec base64
export async function analyzeArticleImageBase64(base64Image: string): Promise<AnalysisResult> {
  // MODE MOCK pour le développement
  if (USE_MOCK_AI) {
    console.log('🎭 MODE MOCK AI ACTIVÉ (Base64) - Aucun crédit OpenAI utilisé');
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    return generateMockAnalysis();
  }

  // MODE PRODUCTION
  const imageUrl = `data:image/jpeg;base64,${base64Image}`;
  return analyzeArticleImage(imageUrl);
}

// Obtenir les informations de tarification
export function getPricingInfo() {
  return {
    fixedPrice: PRICING.FIXED_PRICE,
    platformFee: PRICING.PLATFORM_FEE,
    carrierPayout: PRICING.CARRIER_PAYOUT,
    message: `Prix fixe de ${PRICING.FIXED_PRICE}€ quelle que soit la taille du colis`,
  };
}

// Obtenir les tailles disponibles
export function getPackageSizes() {
  return Object.entries(PACKAGE_SIZES).map(([key, value]) => ({
    size: key,
    ...value,
  }));
}