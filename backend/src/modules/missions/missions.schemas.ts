import { z } from 'zod';

export const availableMissionsSchema = z.object({
  latitude: z.string().transform((val) => parseFloat(val)),
  longitude: z.string().transform((val) => parseFloat(val)),
  radius: z.string().default('5').transform((val) => parseFloat(val)),
});

export const deliverMissionSchema = z.object({
  proofPhotoUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelMissionSchema = z.object({
  reason: z.string().optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const updateCarrierSettingsSchema = z.object({
  coverageRadiusKm: z.number().min(1).max(50).optional(),
});

export type AvailableMissionsQuery = z.infer<typeof availableMissionsSchema>;
export type DeliverMissionInput = z.infer<typeof deliverMissionSchema>;
export type CancelMissionInput = z.infer<typeof cancelMissionSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type UpdateCarrierSettingsInput = z.infer<typeof updateCarrierSettingsSchema>;