// backend/src/shared/services/email.service.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM_EMAIL = process.env.FROM_EMAIL || 'HopDrop <onboarding@resend.dev>';

export class EmailService {
  /**
   * Envoyer un code de vérification par email
   */
  async sendVerificationCode(to: string, code: string, firstName: string): Promise<boolean> {
    try {
      // Si pas de clé API, mode simulé (dev)
      if (!process.env.RESEND_API_KEY) {
        console.log(`📧 [EMAIL SIMULÉ] Code de vérification pour ${to}: ${code}`);
        return true;
      }

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `HopDrop — Votre code de vérification : ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #264653; margin: 0;">
                <span style="color: #264653;">Hop</span><span style="color: #FF4422;">Drop</span>
              </h1>
            </div>
            
            <h2 style="color: #333; text-align: center;">Bonjour ${firstName} !</h2>
            
            <p style="color: #666; text-align: center; font-size: 16px;">
              Voici votre code de vérification :
            </p>
            
            <div style="background: #F0F4F8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #264653;">
                ${code}
              </span>
            </div>
            
            <p style="color: #999; text-align: center; font-size: 14px;">
              Ce code expire dans <strong>15 minutes</strong>.
            </p>
            
            <p style="color: #999; text-align: center; font-size: 12px; margin-top: 32px;">
              Si vous n'avez pas demandé ce code, ignorez cet email.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('❌ Erreur envoi email:', error);
        return false;
      }

      console.log(`✅ Email de vérification envoyé à ${to}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur envoi email:', error.message);
      // En dev, on continue même si l'email échoue
      console.log(`📧 [FALLBACK] Code de vérification pour ${to}: ${code}`);
      return true;
    }
  }
}

export const emailService = new EmailService();
