import { prisma } from '../../shared/prisma.js';

// ===== LIVREUR CONFIRME L'EMBALLAGE =====
export async function carrierConfirmPackaging(
  missionId: string,
  carrierId: string,
  photoUrl: string
) {
  // Vérifier que la mission existe et appartient au livreur
  const mission = await prisma.mission.findFirst({
    where: {
      id: missionId,
      carrierId: carrierId,
      status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
    },
    include: {
      parcel: {
        include: {
          vendor: true,
        },
      },
    },
  });

  if (!mission) {
    throw new Error('Mission non trouvée ou non autorisée');
  }

  if (!mission.arrivedAt) {
    throw new Error('Vous devez d\'abord signaler votre arrivée');
  }

  // Mettre à jour le colis avec la photo et la confirmation livreur
  const updatedParcel = await prisma.parcel.update({
    where: { id: mission.parcelId },
    data: {
      packagingPhotoUrl: photoUrl,
      packagingConfirmedAt: new Date(),
    },
    include: {
      vendor: true,
      assignedCarrier: true,
    },
  });

  // TODO: Envoyer notification push au vendeur
  // if (updatedParcel.vendor?.fcmToken) { ... }

  return {
    success: true,
    message: 'Emballage confirmé. En attente de la confirmation du client.',
    parcel: updatedParcel,
  };
}

// ===== CLIENT CONFIRME L'EMBALLAGE =====
export async function vendorConfirmPackaging(
  parcelId: string,
  vendorId: string
) {
  // Vérifier que le colis existe et appartient au vendeur
  const parcel = await prisma.parcel.findFirst({
    where: {
      id: parcelId,
      vendorId: vendorId,
    },
    include: {
      assignedCarrier: true,
      mission: true,
    },
  });

  if (!parcel) {
    throw new Error('Colis non trouvé ou non autorisé');
  }

  if (!parcel.packagingConfirmedAt) {
    throw new Error('Le livreur n\'a pas encore confirmé l\'emballage');
  }

  if (parcel.vendorPackagingConfirmedAt) {
    throw new Error('Vous avez déjà confirmé l\'emballage');
  }

  // Mettre à jour avec la confirmation vendeur
  const updatedParcel = await prisma.parcel.update({
    where: { id: parcelId },
    data: {
      vendorPackagingConfirmedAt: new Date(),
    },
    include: {
      assignedCarrier: true,
      vendor: true,
    },
  });

  // TODO: Envoyer notification push au livreur
  // if (updatedParcel.assignedCarrier?.fcmToken) { ... }

  return {
    success: true,
    message: 'Emballage confirmé ! Le livreur peut maintenant récupérer le colis.',
    parcel: updatedParcel,
  };
}

// ===== CLIENT REFUSE L'EMBALLAGE =====
export async function vendorRejectPackaging(
  parcelId: string,
  vendorId: string,
  reason: string
) {
  // Vérifier que le colis existe et appartient au vendeur
  const parcel = await prisma.parcel.findFirst({
    where: {
      id: parcelId,
      vendorId: vendorId,
    },
    include: {
      assignedCarrier: true,
    },
  });

  if (!parcel) {
    throw new Error('Colis non trouvé ou non autorisé');
  }

  // Réinitialiser la confirmation livreur pour qu'il refasse
  const updatedParcel = await prisma.parcel.update({
    where: { id: parcelId },
    data: {
      packagingConfirmedAt: null,
      packagingPhotoUrl: null,
      packagingRejectedAt: new Date(),
      packagingRejectionReason: reason,
    },
  });

  // TODO: Notifier le livreur
  // if (parcel.assignedCarrier?.fcmToken) { ... }

  return {
    success: true,
    message: 'Emballage refusé. Le livreur doit recommencer.',
    parcel: updatedParcel,
  };
}

// ===== RÉCUPÉRER LE STATUT D'EMBALLAGE =====
export async function getPackagingStatus(parcelId: string, userId: string) {
  const parcel = await prisma.parcel.findFirst({
    where: {
      id: parcelId,
      OR: [
        { vendorId: userId },
        { assignedCarrierId: userId },
      ],
    },
    select: {
      id: true,
      packagingPhotoUrl: true,
      packagingConfirmedAt: true,
      vendorPackagingConfirmedAt: true,
      packagingRejectedAt: true,
      packagingRejectionReason: true,
      status: true,
    },
  });

  if (!parcel) {
    throw new Error('Colis non trouvé');
  }

  let status: 'PENDING' | 'CARRIER_CONFIRMED' | 'FULLY_CONFIRMED' | 'REJECTED' = 'PENDING';

  if (parcel.packagingRejectedAt && !parcel.packagingConfirmedAt) {
    status = 'REJECTED';
  } else if (parcel.vendorPackagingConfirmedAt) {
    status = 'FULLY_CONFIRMED';
  } else if (parcel.packagingConfirmedAt) {
    status = 'CARRIER_CONFIRMED';
  }

  return {
    status,
    photoUrl: parcel.packagingPhotoUrl,
    carrierConfirmedAt: parcel.packagingConfirmedAt,
    vendorConfirmedAt: parcel.vendorPackagingConfirmedAt,
    rejectedAt: parcel.packagingRejectedAt,
    rejectionReason: parcel.packagingRejectionReason,
  };
}