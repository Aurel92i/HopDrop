// backend/src/modules/ai-analysis/ai-analysis.types.ts

// Nouvelles tailles de colis unifiées (valables pour tous les lockers et points relais)
export type PackageSize = 'XS' | 'S' | 'M' | 'L';
export type LockerSize = 'XS' | 'S' | 'M' | 'L' | 'NON_COMPATIBLE';
export type Carrier = 'MONDIAL_RELAY' | 'VINTED_GO' | 'COLISSIMO' | 'CHRONOPOST' | 'RELAIS_COLIS' | 'ALL';

// Dimensions en centimètres
export interface Dimensions {
  height: number;
  width: number;
  depth: number;
}

// Catégorie d'article détectée
export interface ArticleCategory {
  main: string;      // Ex: "Technologie", "Mode", "Maison"
  sub: string;       // Ex: "Souris PC", "Veste"
  icon: string;      // Icône MaterialCommunityIcons
}

// Résultat de l'analyse IA
export interface AnalysisResult {
  // Pour le VENDEUR
  articleCategory: ArticleCategory;
  articleName: string;              // Description courte de l'article
  
  // Pour le LIVREUR
  articleDimensions: Dimensions;    // Dimensions estimées de l'article
  
  // Pour les DEUX
  packageSize: PackageSize;         // XS, S, M, L
  lockerSize: LockerSize;           // Taille de casier recommandée
  packageDimensions: Dimensions;    // Dimensions du colis avec emballage
  
  // Métadonnées
  compatibleCarrier: Carrier;       // Transporteurs compatibles
  justification: string;            // Explication du choix
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompatible: boolean;            // Compatible avec les lockers
}

// Tarification fixe
export const PRICING = {
  FIXED_PRICE: 10,          // Prix fixe payé par le vendeur
  PLATFORM_FEE: 1,          // Commission plateforme
  CARRIER_PAYOUT: 9,        // Paiement au livreur (10 - 1)
} as const;

// Définition des tailles de colis (valables pour TOUS les lockers/points relais)
export const PACKAGE_SIZES = {
  XS: {
    name: 'Extra Small',
    description: 'Bijoux, accessoires, petits objets',
    maxDimensions: { height: 4, width: 23, depth: 40 },
    examples: ['Bijoux', 'Montres', 'Lunettes', 'Ceintures', 'Petits accessoires'],
  },
  S: {
    name: 'Small',
    description: 'Vêtements légers, livres, petite électronique',
    maxDimensions: { height: 8, width: 38, depth: 64 },
    examples: ['T-shirts', 'Livres', 'Souris PC', 'Petits jouets', 'Cosmétiques'],
  },
  M: {
    name: 'Medium',
    description: 'Vêtements épais, chaussures, sacs',
    maxDimensions: { height: 19, width: 38, depth: 64 },
    examples: ['Chaussures', 'Pulls', 'Sacs à main', 'Consoles', 'Casques audio'],
  },
  L: {
    name: 'Large',
    description: 'Manteaux, gros objets, électronique volumineuse',
    maxDimensions: { height: 38, width: 39, depth: 64 },
    examples: ['Manteaux', 'Couvertures', 'Ordinateurs portables', 'Gros jouets'],
  },
} as const;

// Catégories d'articles avec icônes
export const ARTICLE_CATEGORIES = {
  MODE: {
    label: 'Mode',
    icon: 'tshirt-crew',
    subcategories: ['Vêtements', 'Chaussures', 'Accessoires', 'Bijoux', 'Sacs'],
  },
  TECHNOLOGIE: {
    label: 'Technologie',
    icon: 'laptop',
    subcategories: ['Informatique', 'Téléphonie', 'Audio', 'Photo', 'Gaming'],
  },
  MAISON: {
    label: 'Maison',
    icon: 'home',
    subcategories: ['Décoration', 'Cuisine', 'Textile', 'Rangement', 'Luminaires'],
  },
  LOISIRS: {
    label: 'Loisirs',
    icon: 'gamepad-variant',
    subcategories: ['Jouets', 'Sport', 'Livres', 'Musique', 'Jeux vidéo'],
  },
  BEAUTE: {
    label: 'Beauté',
    icon: 'spa',
    subcategories: ['Cosmétiques', 'Parfums', 'Soins', 'Maquillage'],
  },
  AUTRE: {
    label: 'Autre',
    icon: 'package-variant',
    subcategories: ['Divers', 'Collection', 'Vintage', 'Fait main'],
  },
} as const;

// Contraintes
export const CONSTRAINTS = {
  MIN_DIMENSIONS: { height: 1, width: 10, depth: 15 },
  MAX_WEIGHT_KG: 25,
  PACKAGING_MARGIN_CM: 2, // Marge ajoutée pour l'emballage
};