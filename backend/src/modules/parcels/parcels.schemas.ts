import { z } from 'zod';

// Enums
export const ParcelSize = z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']);
export const ParcelStatus = z.enum(['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'EXPIRED']);
export const DropoffType = z.enum(['POST_OFFICE', 'RELAY_POINT', 'OTHER']);
export const Carrier = z.enum(['VINTED', 'MONDIAL_RELAY', 'COLISSIMO', 'CHRONOPOST', 'RELAIS_COLIS', 'UPS', 'OTHER']);

// Schema de création
export const createParcelSchema = z.object({
  pickupAddressId: z.string().uuid(),
  dropoffType: DropoffType,
  dropoffName: z.string().min(1).max(100),
  dropoffAddress: z.string().min(1).max(255),
  size: ParcelSize,
  weightEstimate: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  carrier: Carrier.default('OTHER'),
  hasShippingLabel: z.boolean().default(false),
  shippingLabelUrl: z.string().url().optional(),
  pickupSlotStart: z.string().datetime(),
  pickupSlotEnd: z.string().datetime(),
});

// Schema de mise à jour
export const updateParcelSchema = createParcelSchema.partial();

// Schema pour confirmer la récupération
export const confirmPickupSchema = z.object({
  pickupCode: z.string().min(4).max(10),
});

// Schema pour lister les colis
export const listParcelsSchema = z.object({
  status: ParcelStatus.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// Types exportés
export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type UpdateParcelInput = z.infer<typeof updateParcelSchema>;
export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;
export type ListParcelsQuery = z.infer<typeof listParcelsSchema>;