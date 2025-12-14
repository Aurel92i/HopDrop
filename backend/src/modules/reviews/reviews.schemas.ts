import { z } from 'zod';

export const createReviewSchema = z.object({
  parcelId: z.string().uuid('ID de colis invalide'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const listReviewsSchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('10'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsSchema>;