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

// Prix fixe unique de 10€ pour tous les colis
const FIXED_PRICE = 10.00;
const PLATFORM_FEE = 1.00;
const CARRIER_PAYOUT = 9.00;

export function calculatePrice(input: PricingInput): PricingOutput {
  // Tarif unique peu importe la taille
  const basePrice = FIXED_PRICE;
  const platformFee = PLATFORM_FEE;
  const carrierPayout = CARRIER_PAYOUT;

  return {
    basePrice,
    platformFee,
    carrierPayout,
    totalPrice: basePrice,
  };
}