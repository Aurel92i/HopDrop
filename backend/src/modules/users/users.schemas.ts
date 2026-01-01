import { z } from 'zod';

export const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;