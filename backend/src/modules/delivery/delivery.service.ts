import { ParcelStatus, MissionStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { NotificationService } from '../../shared/services/notification.service.js';

const CONFIRMATION_DELAY_HOURS = 12; // Délai de 12H pour que le vendeur confirme le dépôt

export class DeliveryService {
  private notificationService = new NotificationService();

  // ===== LIVREUR DÉPOSE LE COLIS =====
  async confirmDelivery(missionId: string, carrierId: string, proofUrl: string) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, carrierId },
      include: {
        parcel: {
          include: { vendor: true },
        },
      },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (mission.status !== MissionStatus.PICKED_UP) {
      throw new Error('Le colis doit d\'abord être récupéré');
    }

    // Calculer la deadline de confirmation (12H)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + CONFIRMATION_DELAY_HOURS);

    // Mettre à jour la mission - reste PICKED_UP jusqu'à validation vendeur
    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MissionStatus.PICKED_UP, // ⚠️ Reste PICKED_UP, pas DELIVERED
        deliveredAt: new Date(),
        deliveryProofUrl: proofUrl,
        deliveryConfirmationDeadline: deadline,
      },
      include: {
        parcel: {
          include: {
            vendor: true,
            pickupAddress: true,
          },
        },
        carrier: {
          select: { firstName: true, avatarUrl: true },
        },
      },
    });

    // Mettre à jour le statut du colis (reste en PICKED_UP jusqu'à confirmation)
    // On le passera en DELIVERED après confirmation client ou auto-confirmation

    // Notifier le client
    if (mission.parcel.vendor.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '📦 Colis déposé !',
        `Votre colis a été déposé. Vous avez 12h pour confirmer.`,
        {
          type: 'delivery_proof',
          parcelId: mission.parcelId,
          missionId,
          proofUrl,
          deadline: deadline.toISOString(),
        }
      );
    }

    return {
      mission: updatedMission,
      confirmationDeadline: deadline,
      hoursRemaining: CONFIRMATION_DELAY_HOURS,
    };
  }

  // ===== CLIENT CONFIRME LA LIVRAISON =====
  async clientConfirmDelivery(parcelId: string, vendorId: string, rating?: number, comment?: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: {
        mission: true,
        assignedCarrier: true,
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (!parcel.mission) {
      throw new Error('Aucune mission associée');
    }

    // Vérifier que le colis a été déposé (deliveredAt existe)
    if (!parcel.mission.deliveredAt) {
      throw new Error('Le colis n\'a pas encore été déposé');
    }

    if (parcel.mission.clientConfirmedDeliveryAt) {
      throw new Error('Vous avez déjà confirmé la livraison');
    }

    // Mettre à jour la mission avec la confirmation client
    await prisma.mission.update({
      where: { id: parcel.mission.id },
      data: {
        status: MissionStatus.DELIVERED, // ✅ Passe à DELIVERED lors de la confirmation
        clientConfirmedDeliveryAt: new Date(),
      },
    });

    // Mettre à jour le statut du colis
    await prisma.parcel.update({
      where: { id: parcelId },
      data: { status: ParcelStatus.DELIVERED },
    });

    // Incrémenter les stats du livreur
    await prisma.carrierProfile.update({
      where: { userId: parcel.assignedCarrierId! },
      data: {
        totalDeliveries: { increment: 1 },
      },
    });

    // Créer une review si rating fourni
    if (rating !== undefined && parcel.assignedCarrierId) {
      // Vérifier qu'il n'y a pas déjà une review
      const existingReview = await prisma.review.findFirst({
        where: {
          parcelId,
          reviewerId: vendorId,
        },
      });

      if (!existingReview) {
        // Créer la review
        await prisma.review.create({
          data: {
            parcelId,
            reviewerId: vendorId,
            revieweeId: parcel.assignedCarrierId,
            rating,
            comment: comment || null,
          },
        });

        // Mettre à jour la note moyenne du livreur
        const allReviews = await prisma.review.findMany({
          where: { revieweeId: parcel.assignedCarrierId },
          select: { rating: true },
        });

        const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await prisma.carrierProfile.update({
          where: { userId: parcel.assignedCarrierId },
          data: { averageRating },
        });
      }
    }

    // TODO: Déclencher le paiement du livreur ici
    // await this.processCarrierPayment(parcel.mission.id);

    // Notifier le livreur
    if (parcel.assignedCarrier?.fcmToken) {
      await this.notificationService.send(
        parcel.assignedCarrier.fcmToken,
        '✅ Livraison confirmée !',
        'Le client a confirmé la réception. Paiement en cours.',
        {
          type: 'delivery_confirmed',
          parcelId,
          missionId: parcel.mission.id,
        }
      );
    }

    return {
      success: true,
      message: 'Livraison confirmée ! Le paiement va être traité.',
    };
  }

  // ===== CLIENT CONTESTE LA LIVRAISON =====
  async clientContestDelivery(parcelId: string, vendorId: string, reason: string) {
    const parcel = await prisma.parcel.findFirst({
      where: { id: parcelId, vendorId },
      include: {
        mission: true,
        assignedCarrier: true,
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (!parcel.mission) {
      throw new Error('Aucune mission associée');
    }

    // Vérifier que le colis a été déposé (deliveredAt existe)
    if (!parcel.mission.deliveredAt) {
      throw new Error('Le colis n\'a pas encore été déposé');
    }

    if (parcel.mission.clientConfirmedDeliveryAt) {
      throw new Error('Vous avez déjà confirmé la livraison');
    }

    if (parcel.mission.clientContestedAt) {
      throw new Error('Vous avez déjà contesté cette livraison');
    }

    // Enregistrer la contestation
    await prisma.mission.update({
      where: { id: parcel.mission.id },
      data: {
        clientContestedAt: new Date(),
        contestReason: reason,
      },
    });

    // Notifier le livreur
    if (parcel.assignedCarrier?.fcmToken) {
      await this.notificationService.send(
        parcel.assignedCarrier.fcmToken,
        '⚠️ Livraison contestée',
        `Le client conteste la livraison: ${reason}`,
        {
          type: 'delivery_contested',
          parcelId,
          missionId: parcel.mission.id,
          reason,
        }
      );
    }

    // TODO: Créer un ticket de support / médiation

    return {
      success: true,
      message: 'Contestation enregistrée. Notre équipe va examiner le dossier.',
    };
  }

  // ===== AUTO-CONFIRMATION APRÈS 12H (appelé par le scheduler) =====
  async autoConfirmExpiredDeliveries() {
    const now = new Date();

    // Trouver toutes les missions en attente de confirmation dont le délai est dépassé
    // Status reste PICKED_UP tant que le vendeur n'a pas confirmé
    const expiredMissions = await prisma.mission.findMany({
      where: {
        status: MissionStatus.PICKED_UP, // ⚠️ Cherche les missions PICKED_UP (déposées mais pas validées)
        deliveredAt: { not: null }, // Qui ont bien été déposées
        deliveryConfirmationDeadline: { lt: now },
        clientConfirmedDeliveryAt: null,
        clientContestedAt: null,
        autoConfirmed: false,
      },
      include: {
        parcel: {
          include: {
            vendor: true,
            assignedCarrier: true,
          },
        },
      },
    });

    const results = [];

    for (const mission of expiredMissions) {
      try {
        // Auto-confirmer - passe la mission à DELIVERED
        await prisma.mission.update({
          where: { id: mission.id },
          data: {
            status: MissionStatus.DELIVERED, // ✅ Passe à DELIVERED lors de l'auto-confirmation
            autoConfirmed: true,
            clientConfirmedDeliveryAt: now,
          },
        });

        // Mettre à jour le statut du colis
        await prisma.parcel.update({
          where: { id: mission.parcelId },
          data: { status: ParcelStatus.DELIVERED },
        });

        // Incrémenter les stats du livreur
        if (mission.parcel.assignedCarrierId) {
          await prisma.carrierProfile.update({
            where: { userId: mission.parcel.assignedCarrierId },
            data: {
              totalDeliveries: { increment: 1 },
            },
          });
        }

        // TODO: Déclencher le paiement
        // await this.processCarrierPayment(mission.id);

        // Notifier les deux parties
        if (mission.parcel.vendor.fcmToken) {
          await this.notificationService.send(
            mission.parcel.vendor.fcmToken,
            '✅ Livraison auto-confirmée',
            'Le délai de 12h est écoulé. La livraison a été validée automatiquement.',
            {
              type: 'delivery_auto_confirmed',
              parcelId: mission.parcelId,
              missionId: mission.id,
            }
          );
        }

        if (mission.parcel.assignedCarrier?.fcmToken) {
          await this.notificationService.send(
            mission.parcel.assignedCarrier.fcmToken,
            '✅ Livraison validée !',
            'Le délai de confirmation est écoulé. Paiement en cours.',
            {
              type: 'delivery_auto_confirmed',
              parcelId: mission.parcelId,
              missionId: mission.id,
            }
          );
        }

        results.push({ missionId: mission.id, status: 'auto_confirmed' });
      } catch (error: any) {
        console.error(`Erreur auto-confirmation mission ${mission.id}:`, error);
        results.push({ missionId: mission.id, status: 'error', error: error.message });
      }
    }

    return {
      processed: expiredMissions.length,
      results,
    };
  }

  // ===== RÉCUPÉRER LE STATUT DE LIVRAISON =====
  async getDeliveryStatus(parcelId: string, userId: string) {
    console.log(`📦 getDeliveryStatus - parcelId: ${parcelId}, userId: ${userId}`);

    const parcel = await prisma.parcel.findFirst({
      where: {
        id: parcelId,
        OR: [
          { vendorId: userId },
          { assignedCarrierId: userId },
        ],
      },
      include: {
        mission: {
          select: {
            id: true,
            status: true,
            deliveredAt: true,
            deliveryProofUrl: true,
            deliveryConfirmationDeadline: true,
            clientConfirmedDeliveryAt: true,
            clientContestedAt: true,
            contestReason: true,
            autoConfirmed: true,
          },
        },
      },
    });

    console.log(`📦 Parcel trouvé:`, parcel ? 'Oui' : 'Non');
    console.log(`📦 Mission trouvée:`, parcel?.mission ? 'Oui' : 'Non');

    if (!parcel) {
      throw new Error('Colis non trouvé ou vous n\'êtes pas autorisé à y accéder');
    }

    if (!parcel.mission) {
      throw new Error('Ce colis n\'a pas encore de mission assignée');
    }

    console.log(`📦 Mission status:`, parcel.mission.status);
    console.log(`📦 deliveryProofUrl:`, parcel.mission.deliveryProofUrl ? 'Oui' : 'Non');
    console.log(`📦 deliveredAt:`, parcel.mission.deliveredAt ? 'Oui' : 'Non');

    const mission = parcel.mission;
    const now = new Date();
    
    let status: 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'CONTESTED' | 'AUTO_CONFIRMED';
    let hoursRemaining: number | null = null;

    if (mission.clientContestedAt) {
      status = 'CONTESTED';
    } else if (mission.autoConfirmed) {
      status = 'AUTO_CONFIRMED';
    } else if (mission.clientConfirmedDeliveryAt && mission.status === 'DELIVERED') {
      status = 'CONFIRMED';
    } else if (mission.deliveredAt && mission.deliveryConfirmationDeadline) {
      // Le colis a été déposé, en attente de validation vendeur
      status = 'AWAITING_CONFIRMATION';
      const msRemaining = mission.deliveryConfirmationDeadline.getTime() - now.getTime();
      hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)));
    } else {
      status = 'PENDING';
    }

    return {
      status,
      deliveredAt: mission.deliveredAt,
      proofUrl: mission.deliveryProofUrl,
      confirmationDeadline: mission.deliveryConfirmationDeadline,
      hoursRemaining,
      clientConfirmedAt: mission.clientConfirmedDeliveryAt,
      contestedAt: mission.clientContestedAt,
      contestReason: mission.contestReason,
      autoConfirmed: mission.autoConfirmed,
    };
  }
}
