import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().min(1, 'Le label est requis'),
  street: z.string().min(1, 'La rue est requise'),
  city: z.string().min(1, 'La ville est requise'),
  postalCode: z.string().min(5, 'Le code postal est requis'),
  country: z.string().default('France'),
  latitude: z.number(),
  longitude: z.number(),
  instructions: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const geocodeSchema = z.object({
  address: z.string().min(1, 'L\'adresse est requise'),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type GeocodeInput = z.infer<typeof geocodeSchema>;