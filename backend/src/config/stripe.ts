import Stripe from 'stripe';
import { env } from './env.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});
