import { z } from 'zod';

export const createParcelSchema = z.object({
  pickupAddressId: z.string().uuid('ID d\'adresse invalide'),
  dropoffType: z.enum(['POST_OFFICE', 'RELAY_POINT', 'OTHER']),
  dropoffName: z.string().min(1, 'Le nom du point de dépôt est requis'),
  dropoffAddress: z.string().min(1, 'L\'adresse de dépôt est requise'),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
  weightEstimate: z.number().positive().optional(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  pickupSlotStart: z.string().datetime('Date de début invalide'),
  pickupSlotEnd: z.string().datetime('Date de fin invalide'),
});

export const updateParcelSchema = z.object({
  description: z.string().optional(),
  pickupSlotStart: z.string().datetime('Date de début invalide').optional(),
  pickupSlotEnd: z.string().datetime('Date de fin invalide').optional(),
});

export const confirmPickupSchema = z.object({
  pickupCode: z.string().length(6, 'Le code doit contenir 6 chiffres'),
});

export const listParcelsSchema = z.object({
  status: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('10'),
});

export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type UpdateParcelInput = z.infer<typeof updateParcelSchema>;
export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;
export type ListParcelsQuery = z.infer<typeof listParcelsSchema>;