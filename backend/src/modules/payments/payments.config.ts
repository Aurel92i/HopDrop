export const paymentsConfig = {
  currency: 'eur',

  // Prix fixe (en centimes pour Stripe)
  FIXED_AMOUNT: 1000,     // 10.00€ total vendeur
  PLATFORM_FEE: 100,      // 1.00€ plateforme
  CARRIER_PAYOUT: 900,    // 9.00€ livreur

  // Legacy — garder pour les routes existantes
  platformFeePercentage: 0.10,
  prices: {
    SMALL: 1000,
    MEDIUM: 1000,
    LARGE: 1000,
    XLARGE: 1000,
  },
};