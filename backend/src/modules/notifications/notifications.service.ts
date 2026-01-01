import { EmailService } from './email.service.js';
import { PushService, pushService } from './push.service.js';
import { prisma } from '../../shared/prisma.js';

export class NotificationsService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
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
    await pushService.notifyParcelAccepted(
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

    await pushService.notifyParcelPickedUp(parcel.vendor.id);
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
    await pushService.notifyParcelDelivered(parcel.vendor.id);

    // Push au livreur pour le paiement
    if (parcel.carrier) {
      const carrierPayout = Number(parcel.price) * 0.8;
      await pushService.notifyPaymentReceived(parcel.carrier.id, carrierPayout);
    }
  }

  // Notification emballage à valider
  async onPackagingToValidate(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { vendor: true },
    });

    if (!parcel) return;
    await pushService.notifyPackagingToValidate(parcel.vendor.id);
  }

  // Notification emballage validé
  async onPackagingValidated(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { carrier: true },
    });

    if (!parcel?.carrier) return;
    await pushService.notifyPackagingValidated(parcel.carrier.id);
  }

  // Notification emballage refusé
  async onPackagingRejected(parcelId: string, reason: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { carrier: true },
    });

    if (!parcel?.carrier) return;
    await pushService.notifyPackagingRejected(parcel.carrier.id, reason);
  }

  // Notification nouvelle mission disponible
  async onNewMissionAvailable(parcelId: string) {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { pickupAddress: true },
    });

    if (!parcel?.pickupAddress) return;

    await pushService.notifyNewMissionAvailable(
      parcel.pickupAddress.latitude,
      parcel.pickupAddress.longitude,
      5, // 5km de rayon
      {
        pickupAddress: `${parcel.pickupAddress.street}, ${parcel.pickupAddress.city}`,
        price: Number(parcel.price),
      }
    );
  }

  // Test de notification
  async sendTestPush(userId: string, title: string, body: string) {
    return pushService.sendToUser({ userId, title, body });
  }

  async sendTestEmail(email: string, subject: string, content: string) {
    return this.emailService.send({
      to: email,
      subject,
      html: `<p>${content}</p>`,
    });
  }
}

export const notificationsService = new NotificationsService();