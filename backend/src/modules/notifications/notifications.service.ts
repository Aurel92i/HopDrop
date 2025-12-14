import { EmailService } from './email.service.js';
import { PushService } from './push.service.js';
import { prisma } from '../../shared/prisma.js';

export class NotificationsService {
  private emailService: EmailService;
  private pushService: PushService;

  constructor() {
    this.emailService = new EmailService();
    this.pushService = new PushService();
  }

  // Notification lors de l'inscription
  async onUserRegistered(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.emailService.sendWelcome(user.email, user.firstName);
  }

  // Notification quand un colis est accepté par un livreur
  async onParcelAccepted(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        vendor: true,
        carrier: true,
      },
    });

    if (!parcel || !parcel.carrier) return;

    // Email au vendeur
    await this.emailService.sendParcelAccepted(
      parcel.vendor.email,
      parcel.vendor.firstName,
      parcel.carrier.firstName,
      parcelId
    );

    // Push notification au vendeur
    await this.pushService.notifyParcelAccepted(
      parcel.vendor.id,
      parcel.carrier.firstName
    );
  }

  // Notification quand un colis est récupéré
  async onParcelPickedUp(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { vendor: true },
    });

    if (!parcel) return;

    await this.emailService.sendParcelPickedUp(
      parcel.vendor.email,
      parcel.vendor.firstName,
      parcelId
    );

    await this.pushService.notifyParcelPickedUp(parcel.vendor.id);
  }

  // Notification quand un colis est livré
  async onParcelDelivered(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { vendor: true, carrier: true },
    });

    if (!parcel) return;

    // Email au vendeur
    await this.emailService.sendParcelDelivered(
      parcel.vendor.email,
      parcel.vendor.firstName,
      parcelId
    );

    // Push au vendeur
    await this.pushService.notifyParcelDelivered(parcel.vendor.id);

    // Push au livreur pour le paiement
    if (parcel.carrier) {
      const carrierPayout = Number(parcel.price) * 0.8;
      await this.pushService.notifyPaymentReceived(parcel.carrier.id, carrierPayout);
    }
  }

  // Test de notification
  async sendTestPush(userId: string, title: string, body: string) {
    return this.pushService.sendToUser({ userId, title, body });
  }

  async sendTestEmail(email: string, subject: string, content: string) {
    return this.emailService.send({
      to: email,
      subject,
      html: `<p>${content}</p>`,
    });
  }
}