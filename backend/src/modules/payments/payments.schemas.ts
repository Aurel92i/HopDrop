import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  parcelId: z.string().uuid('ID de colis invalide'),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'PaymentIntent ID requis'),
});

export const createConnectAccountSchema = z.object({
  // Informations pour créer un compte Stripe Connect
  email: z.string().email().optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type CreateConnectAccountInput = z.infer<typeof createConnectAccountSchema>;