export const paymentsConfig = {
  platformFeePercentage: 0.20, // 20% commission
  currency: 'eur',
  
  // Prix par taille (en centimes pour Stripe)
  prices: {
    SMALL: 300,    // 3.00€
    MEDIUM: 400,   // 4.00€
    LARGE: 550,    // 5.50€
    XLARGE: 700,   // 7.00€
  },
};