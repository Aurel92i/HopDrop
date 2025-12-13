import { ParcelSize } from '@prisma/client';

interface PricingInput {
  size: ParcelSize;
  weightEstimate?: number;
}

interface PricingOutput {
  basePrice: number;
  platformFee: number;
  carrierPayout: number;
  totalPrice: number;
}

const SIZE_PRICES: Record<ParcelSize, number> = {
  SMALL: 3.00,
  MEDIUM: 4.00,
  LARGE: 5.50,
  XLARGE: 7.00,
};

const PLATFORM_FEE_PERCENTAGE = 0.20; // 20% commission

export function calculatePrice(input: PricingInput): PricingOutput {
  const basePrice = SIZE_PRICES[input.size];
  
  // Pour le futur: ajuster selon le poids
  // if (input.weightEstimate && input.weightEstimate > 5) {
  //   basePrice += (input.weightEstimate - 5) * 0.50;
  // }

  const platformFee = Math.round(basePrice * PLATFORM_FEE_PERCENTAGE * 100) / 100;
  const carrierPayout = Math.round((basePrice - platformFee) * 100) / 100;

  return {
    basePrice,
    platformFee,
    carrierPayout,
    totalPrice: basePrice,
  };
}