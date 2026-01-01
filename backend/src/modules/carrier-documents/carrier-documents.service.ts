// backend/src/modules/carrier-documents/carrier-documents.service.ts

import prisma from '../../shared/prisma.js';
import { DocumentType, DocumentStatus, VehicleType } from '@prisma/client';

// Liste des documents requis selon le type de véhicule
export const REQUIRED_DOCUMENTS: Record<VehicleType, DocumentType[]> = {
  NONE: ['ID_CARD_FRONT', 'ID_CARD_BACK'],
  BIKE: ['ID_CARD_FRONT', 'ID_CARD_BACK'],
  SCOOTER: ['ID_CARD_FRONT', 'ID_CARD_BACK', 'DRIVING_LICENSE'],
  CAR: ['ID_CARD_FRONT', 'ID_CARD_BACK', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION'],
};

// Labels affichables pour chaque type de document
export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ID_CARD_FRONT: "Carte d'identité (recto)",
  ID_CARD_BACK: "Carte d'identité (verso)",
  KBIS: 'Extrait KBIS',
  VEHICLE_REGISTRATION: 'Carte grise du véhicule',
  DRIVING_LICENSE: 'Permis de conduire',
};

export async function uploadDocument(
  carrierId: string,
  type: DocumentType,
  fileUrl: string
) {
  // Vérifier si un document du même type existe déjà
  const existing = await prisma.carrierDocument.findFirst({
    where: { carrierId, type },
  });

  if (existing) {
    // Mettre à jour le document existant
    return prisma.carrierDocument.update({
      where: { id: existing.id },
      data: {
        fileUrl,
        status: 'PENDING',
        rejectionReason: null,
        uploadedAt: new Date(),
        reviewedAt: null,
      },
    });
  }

  // Créer un nouveau document
  return prisma.carrierDocument.create({
    data: {
      carrierId,
      type,
      fileUrl,
      status: 'PENDING',
    },
  });
}

export async function getCarrierDocuments(carrierId: string) {
  return prisma.carrierDocument.findMany({
    where: { carrierId },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function getOrCreateCarrierProfile(carrierId: string) {
  let profile = await prisma.carrierProfile.findUnique({
    where: { userId: carrierId },
  });

  if (!profile) {
    // Créer un profil par défaut si inexistant
    profile = await prisma.carrierProfile.create({
      data: {
        userId: carrierId,
        vehicleType: 'NONE',
        hasOwnPrinter: false,
        isAvailable: false,
        coverageRadiusKm: 5,
      },
    });
  }

  return {
    vehicleType: profile.vehicleType,
    hasOwnPrinter: profile.hasOwnPrinter,
    documentsVerified: profile.documentsVerified,
  };
}

export async function getRequiredDocuments(carrierId: string) {
  // Récupérer le profil livreur pour connaître le type de véhicule
  const profile = await prisma.carrierProfile.findUnique({
    where: { userId: carrierId },
  });

  const vehicleType = profile?.vehicleType || 'NONE';
  const requiredTypes = REQUIRED_DOCUMENTS[vehicleType];

  // Récupérer les documents existants
  const existingDocs = await prisma.carrierDocument.findMany({
    where: { carrierId },
  });

  // Construire la liste avec statut pour chaque document requis
  return requiredTypes.map((type) => {
    const doc = existingDocs.find((d) => d.type === type);
    return {
      type,
      label: DOCUMENT_LABELS[type],
      required: true,
      uploaded: !!doc,  // true si le document existe
      status: doc?.status || null,
      fileUrl: doc?.fileUrl || null,
      rejectionReason: doc?.rejectionReason || null,
      uploadedAt: doc?.uploadedAt || null,
    };
  });
}

export async function checkDocumentsComplete(carrierId: string): Promise<boolean> {
  const profile = await prisma.carrierProfile.findUnique({
    where: { userId: carrierId },
  });

  const vehicleType = profile?.vehicleType || 'NONE';
  const requiredTypes = REQUIRED_DOCUMENTS[vehicleType];

  const approvedDocs = await prisma.carrierDocument.findMany({
    where: {
      carrierId,
      type: { in: requiredTypes },
      status: 'APPROVED',
    },
  });

  return approvedDocs.length === requiredTypes.length;
}

export async function updateDocumentsVerifiedStatus(carrierId: string) {
  const isComplete = await checkDocumentsComplete(carrierId);
  
  await prisma.carrierProfile.update({
    where: { userId: carrierId },
    data: { documentsVerified: isComplete },
  });

  return isComplete;
}

export async function deleteDocument(carrierId: string, type: DocumentType) {
  const document = await prisma.carrierDocument.findFirst({
    where: { carrierId, type },
  });

  if (!document) {
    throw new Error('Document non trouvé');
  }

  await prisma.carrierDocument.delete({
    where: { id: document.id },
  });

  // Mettre à jour le statut de vérification
  await updateDocumentsVerifiedStatus(carrierId);

  return { success: true };
}

export async function updateCarrierProfile(
  carrierId: string,
  data: { vehicleType?: string; hasOwnPrinter?: boolean }
) {
  // Vérifier si le profil existe
  let profile = await prisma.carrierProfile.findUnique({
    where: { userId: carrierId },
  });

  if (!profile) {
    // Créer le profil s'il n'existe pas
    profile = await prisma.carrierProfile.create({
      data: {
        userId: carrierId,
        vehicleType: (data.vehicleType as VehicleType) || 'NONE',
        hasOwnPrinter: data.hasOwnPrinter || false,
      },
    });
  } else {
    // Mettre à jour le profil existant
    profile = await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: {
        ...(data.vehicleType && { vehicleType: data.vehicleType as VehicleType }),
        ...(data.hasOwnPrinter !== undefined && { hasOwnPrinter: data.hasOwnPrinter }),
      },
    });
  }

  return profile;
}