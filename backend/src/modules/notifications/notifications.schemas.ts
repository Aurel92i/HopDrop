import { z } from 'zod';

export const sendTestNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

export type SendTestNotificationInput = z.infer<typeof sendTestNotificationSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;