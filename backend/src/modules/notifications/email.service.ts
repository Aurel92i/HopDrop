import { Resend } from 'resend';
import { env } from '../../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    // Mode simulation si pas de clé API
    if (!resend) {
      console.log('[EMAIL SIMULATED]', {
        to: options.to,
        subject: options.subject,
      });
      return { success: true, messageId: `simulated_${Date.now()}` };
    }

    try {
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error('Email error:', error);
      return { success: false };
    }
  }

  // Templates d'emails
  async sendWelcome(email: string, firstName: string) {
    return this.send({
      to: email,
      subject: 'Bienvenue sur HopDrop !',
      html: `
        <h1>Bienvenue ${firstName} !</h1>
        <p>Merci de rejoindre HopDrop, la plateforme de livraison collaborative.</p>
        <p>Vous pouvez maintenant :</p>
        <ul>
          <li>Déposer vos colis pour les faire livrer</li>
          <li>Devenir livreur et gagner de l'argent</li>
        </ul>
        <p>À bientôt !</p>
        <p>L'équipe HopDrop</p>
      `,
    });
  }

  async sendParcelAccepted(email: string, firstName: string, carrierName: string, parcelId: string) {
    return this.send({
      to: email,
      subject: 'Votre colis a été accepté !',
      html: `
        <h1>Bonne nouvelle ${firstName} !</h1>
        <p>${carrierName} a accepté de livrer votre colis.</p>
        <p>Vous serez notifié lorsque le livreur arrivera pour récupérer votre colis.</p>
        <p>Référence du colis : ${parcelId}</p>
        <p>L'équipe HopDrop</p>
      `,
    });
  }

  async sendParcelPickedUp(email: string, firstName: string, parcelId: string) {
    return this.send({
      to: email,
      subject: 'Votre colis a été récupéré !',
      html: `
        <h1>Colis en route ${firstName} !</h1>
        <p>Votre colis a été récupéré et est en cours de livraison.</p>
        <p>Référence du colis : ${parcelId}</p>
        <p>L'équipe HopDrop</p>
      `,
    });
  }

  async sendParcelDelivered(email: string, firstName: string, parcelId: string) {
    return this.send({
      to: email,
      subject: 'Votre colis a été livré !',
      html: `
        <h1>Livraison effectuée ${firstName} !</h1>
        <p>Votre colis a été déposé avec succès.</p>
        <p>N'oubliez pas de laisser un avis sur votre livreur !</p>
        <p>Référence du colis : ${parcelId}</p>
        <p>Merci d'utiliser HopDrop !</p>
        <p>L'équipe HopDrop</p>
      `,
    });
  }

  async sendPasswordReset(email: string, resetToken: string) {
    const resetUrl = `https://hopdrop.fr/reset-password?token=${resetToken}`;
    return this.send({
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous (valide 1 heure) :</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        <p>L'équipe HopDrop</p>
      `,
    });
  }
}