import { ParcelStatus, MissionStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { NotificationService } from '../../shared/services/notification.service.js';
import { PaymentsService } from '../payments/payments.service.js';

const CONFIRMATION_DELAY_HOURS = 12; // Délai de 12H pour que le vendeur confirme le dépôt

export class DeliveryService {
  private notificationService = new NotificationService();
  private paymentsService = new PaymentsService();

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
        status: MissionStatus.PICKED_UP, // Reste PICKED_UP, pas DELIVERED
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
  // Fonctionne AUSSI après une contestation (le client change d'avis)
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

    // Si déjà confirmé ET pas contesté entre temps → bloquer
    if (parcel.mission.clientConfirmedDeliveryAt && !parcel.mission.clientContestedAt) {
      throw new Error('Vous avez déjà confirmé la livraison');
    }

    // Si le litige est déjà résolu par un admin → bloquer
    if (parcel.mission.disputeResolvedAt) {
      throw new Error('Ce litige a déjà été résolu par un administrateur');
    }

    // Mettre à jour la mission avec la confirmation client
    // Si c'était contesté, on annule la contestation
    await prisma.mission.update({
      where: { id: parcel.mission.id },
      data: {
        status: MissionStatus.DELIVERED,
        clientConfirmedDeliveryAt: new Date(),
        // Annuler la contestation si elle existait
        clientContestedAt: null,
        contestReason: null,
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
      const existingReview = await prisma.review.findFirst({
        where: { parcelId, reviewerId: vendorId },
      });

      if (!existingReview) {
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

    // Capturer le paiement et transférer au livreur
    try {
      await this.paymentsService.captureAndTransfer(parcelId);
    } catch (paymentError) {
      console.error('Erreur capture paiement:', paymentError);
    }

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

    if (!parcel.mission.deliveredAt) {
      throw new Error('Le colis n\'a pas encore été déposé');
    }

    // Si le litige est déjà résolu par un admin → bloquer
    if (parcel.mission.disputeResolvedAt) {
      throw new Error('Ce litige a déjà été résolu par un administrateur');
    }

    // Enregistrer la contestation (écrase une éventuelle contestation précédente)
    await prisma.mission.update({
      where: { id: parcel.mission.id },
      data: {
        clientContestedAt: new Date(),
        contestReason: reason,
        // Annuler une éventuelle confirmation précédente
        clientConfirmedDeliveryAt: null,
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

    return {
      success: true,
      message: 'Contestation enregistrée. Le livreur sera notifié.',
    };
  }

  // ===== LIVREUR RÉPOND À UNE CONTESTATION =====
  async carrierRespondToDispute(
    missionId: string,
    carrierId: string,
    response: string,
    proofUrl?: string
  ) {
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

    if (!mission.clientContestedAt) {
      throw new Error('Aucune contestation en cours pour cette mission');
    }

    if (mission.disputeResolvedAt) {
      throw new Error('Ce litige a déjà été résolu');
    }

    const updateData: any = {
      carrierDisputeResponse: response,
    };

    // Si nouvelle preuve fournie, mettre à jour
    if (proofUrl) {
      updateData.carrierDisputeProofUrl = proofUrl;
    }

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        parcel: {
          include: { vendor: true },
        },
      },
    });

    // Notifier le client
    if (mission.parcel.vendor.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '📝 Réponse du livreur',
        'Le livreur a répondu à votre contestation.',
        {
          type: 'dispute_response',
          parcelId: mission.parcelId,
          missionId,
        }
      );
    }

    return {
      success: true,
      message: 'Votre réponse a été envoyée.',
      mission: updatedMission,
    };
  }

  // ===== ADMIN : RÉCUPÉRER TOUS LES LITIGES =====
  async getDisputes() {
    const disputes = await prisma.mission.findMany({
      where: {
        clientContestedAt: { not: null },
      },
      include: {
        parcel: {
          include: {
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            assignedCarrier: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            pickupAddress: true,
          },
        },
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { clientContestedAt: 'desc' },
    });

    return disputes.map((d) => ({
      id: d.id,
      parcelId: d.parcelId,
      status: d.disputeResolvedAt
        ? 'RESOLVED'
        : d.clientConfirmedDeliveryAt
          ? 'CONFIRMED_AFTER_CONTEST'
          : 'OPEN',
      // Infos contestation
      contestedAt: d.clientContestedAt,
      contestReason: d.contestReason,
      // Réponse livreur
      carrierResponse: d.carrierDisputeResponse,
      carrierDisputeProofUrl: d.carrierDisputeProofUrl,
      // Preuves
      deliveryProofUrl: d.deliveryProofUrl,
      deliveredAt: d.deliveredAt,
      // Résolution
      resolvedAt: d.disputeResolvedAt,
      resolution: d.disputeResolution,
      resolvedBy: d.disputeResolvedBy,
      // Acteurs
      vendor: d.parcel.vendor,
      carrier: d.parcel.assignedCarrier,
      // Colis
      parcel: {
        id: d.parcel.id,
        size: d.parcel.size,
        dropoffName: d.parcel.dropoffName,
        dropoffAddress: d.parcel.dropoffAddress,
        price: d.parcel.price,
        description: d.parcel.description,
      },
    }));
  }

  // ===== ADMIN : RÉSOUDRE UN LITIGE =====
  async resolveDispute(
    missionId: string,
    adminId: string,
    resolution: 'CARRIER_WINS' | 'CLIENT_WINS' | 'REFUND'
  ) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        parcel: {
          include: {
            vendor: true,
            assignedCarrier: true,
          },
        },
      },
    });

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    if (!mission.clientContestedAt) {
      throw new Error('Aucune contestation sur cette mission');
    }

    if (mission.disputeResolvedAt) {
      throw new Error('Ce litige est déjà résolu');
    }

    // Résoudre le litige
    const updateData: any = {
      disputeResolvedAt: new Date(),
      disputeResolution: resolution,
      disputeResolvedBy: adminId,
    };

    if (resolution === 'CARRIER_WINS') {
      // Le livreur a raison → confirmer la livraison + déclencher paiement
      updateData.status = MissionStatus.DELIVERED;
      updateData.clientConfirmedDeliveryAt = new Date();

      await prisma.parcel.update({
        where: { id: mission.parcelId },
        data: { status: ParcelStatus.DELIVERED },
      });

      // Incrémenter les stats du livreur
      if (mission.parcel.assignedCarrierId) {
        await prisma.carrierProfile.update({
          where: { userId: mission.parcel.assignedCarrierId },
          data: { totalDeliveries: { increment: 1 } },
        });
      }

      // Déclencher le paiement
      try {
        await this.paymentsService.captureAndTransfer(mission.parcelId);
      } catch (e) {
        console.error('Erreur paiement après résolution litige:', e);
      }
    } else if (resolution === 'CLIENT_WINS' || resolution === 'REFUND') {
      // Le client a raison → annuler la mission
      updateData.status = MissionStatus.CANCELLED;

      await prisma.parcel.update({
        where: { id: mission.parcelId },
        data: { status: ParcelStatus.CANCELLED },
      });

      // TODO: Déclencher le remboursement via Stripe
      // await this.paymentsService.refund(mission.parcelId);
    }

    await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
    });

    // Notifier les deux parties
    const resolutionMessages: Record<string, { vendor: string; carrier: string }> = {
      CARRIER_WINS: {
        vendor: 'Le litige a été résolu en faveur du livreur. La livraison est confirmée.',
        carrier: 'Le litige a été résolu en votre faveur. Paiement en cours.',
      },
      CLIENT_WINS: {
        vendor: 'Le litige a été résolu en votre faveur. Un remboursement sera effectué.',
        carrier: 'Le litige a été résolu en faveur du client.',
      },
      REFUND: {
        vendor: 'Le litige a été résolu. Un remboursement sera effectué.',
        carrier: 'Le litige a été résolu avec remboursement du client.',
      },
    };

    const messages = resolutionMessages[resolution];

    if (mission.parcel.vendor?.fcmToken) {
      await this.notificationService.send(
        mission.parcel.vendor.fcmToken,
        '⚖️ Litige résolu',
        messages.vendor,
        { type: 'dispute_resolved', parcelId: mission.parcelId, missionId, resolution }
      );
    }

    if (mission.parcel.assignedCarrier?.fcmToken) {
      await this.notificationService.send(
        mission.parcel.assignedCarrier.fcmToken,
        '⚖️ Litige résolu',
        messages.carrier,
        { type: 'dispute_resolved', parcelId: mission.parcelId, missionId, resolution }
      );
    }

    return {
      success: true,
      message: `Litige résolu : ${resolution}`,
    };
  }

  // ===== AUTO-CONFIRMATION APRÈS 12H (appelé par le scheduler) =====
  async autoConfirmExpiredDeliveries() {
    const now = new Date();

    // Trouver toutes les missions déposées dont le délai est dépassé
    // EXCLURE les missions contestées (litige en cours)
    const expiredMissions = await prisma.mission.findMany({
      where: {
        status: MissionStatus.PICKED_UP,
        deliveredAt: { not: null },
        deliveryConfirmationDeadline: { lt: now },
        clientConfirmedDeliveryAt: null,
        clientContestedAt: null, // Pas de contestation en cours
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
        await prisma.mission.update({
          where: { id: mission.id },
          data: {
            status: MissionStatus.DELIVERED,
            autoConfirmed: true,
            clientConfirmedDeliveryAt: now,
          },
        });

        await prisma.parcel.update({
          where: { id: mission.parcelId },
          data: { status: ParcelStatus.DELIVERED },
        });

        if (mission.parcel.assignedCarrierId) {
          await prisma.carrierProfile.update({
            where: { userId: mission.parcel.assignedCarrierId },
            data: { totalDeliveries: { increment: 1 } },
          });
        }

        try {
          await this.paymentsService.captureAndTransfer(mission.parcelId);
        } catch (paymentError) {
          console.error(`Erreur capture paiement mission ${mission.id}:`, paymentError);
        }

        // Notifier les deux parties
        if (mission.parcel.vendor.fcmToken) {
          await this.notificationService.send(
            mission.parcel.vendor.fcmToken,
            '✅ Livraison auto-confirmée',
            'Le délai de 12h est écoulé. La livraison a été validée automatiquement.',
            { type: 'delivery_auto_confirmed', parcelId: mission.parcelId, missionId: mission.id }
          );
        }

        if (mission.parcel.assignedCarrier?.fcmToken) {
          await this.notificationService.send(
            mission.parcel.assignedCarrier.fcmToken,
            '✅ Livraison validée !',
            'Le délai de confirmation est écoulé. Paiement en cours.',
            { type: 'delivery_auto_confirmed', parcelId: mission.parcelId, missionId: mission.id }
          );
        }

        results.push({ missionId: mission.id, status: 'auto_confirmed' });
      } catch (error: any) {
        console.error(`Erreur auto-confirmation mission ${mission.id}:`, error);
        results.push({ missionId: mission.id, status: 'error', error: error.message });
      }
    }

    return { processed: expiredMissions.length, results };
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
            carrierDisputeResponse: true,
            carrierDisputeProofUrl: true,
            disputeResolvedAt: true,
            disputeResolution: true,
          },
        },
      },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé ou vous n\'êtes pas autorisé à y accéder');
    }

    if (!parcel.mission) {
      throw new Error('Ce colis n\'a pas encore de mission assignée');
    }

    const mission = parcel.mission;
    const now = new Date();

    let status: 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'CONTESTED' | 'AUTO_CONFIRMED' | 'DISPUTE_RESOLVED';
    let hoursRemaining: number | null = null;

    if (mission.disputeResolvedAt) {
      status = 'DISPUTE_RESOLVED';
    } else if (mission.clientContestedAt && !mission.clientConfirmedDeliveryAt) {
      // Contesté ET pas (re)confirmé depuis
      status = 'CONTESTED';
    } else if (mission.autoConfirmed) {
      status = 'AUTO_CONFIRMED';
    } else if (mission.clientConfirmedDeliveryAt && mission.status === 'DELIVERED') {
      status = 'CONFIRMED';
    } else if (mission.deliveredAt && mission.deliveryConfirmationDeadline) {
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
      // Infos litige
      carrierDisputeResponse: mission.carrierDisputeResponse,
      carrierDisputeProofUrl: mission.carrierDisputeProofUrl,
      disputeResolvedAt: mission.disputeResolvedAt,
      disputeResolution: mission.disputeResolution,
    };
  }
}