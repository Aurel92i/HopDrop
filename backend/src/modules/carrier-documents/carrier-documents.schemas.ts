import { z } from 'zod';

export const DocumentType = z.enum(['ID_CARD_FRONT', 'ID_CARD_BACK', 'KBIS', 'VEHICLE_REGISTRATION']);
export const DocumentStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const VehicleType = z.enum(['NONE', 'BIKE', 'SCOOTER', 'CAR']);

export const uploadDocumentSchema = z.object({
  type: DocumentType,
  fileUrl: z.string().url(),
});

export const updateCarrierProfileSchema = z.object({
  vehicleType: VehicleType.optional(),
  hasOwnPrinter: z.boolean().optional(),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateCarrierProfileInput = z.infer<typeof updateCarrierProfileSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;