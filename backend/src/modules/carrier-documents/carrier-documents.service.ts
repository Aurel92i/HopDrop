import { DocumentType, DocumentStatus, VehicleType } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { UploadDocumentInput, UpdateCarrierProfileInput, ReviewDocumentInput } from './carrier-documents.schemas.js';

export class CarrierDocumentsService {
  // Récupérer tous les documents d'un livreur
  async getDocuments(carrierId: string) {
    const documents = await prisma.carrierDocument.findMany({
      where: { carrierId },
      orderBy: { uploadedAt: 'desc' },
    });

    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    // Vérifier quels documents sont requis et leur statut
    const requiredDocs = ['ID_CARD_FRONT', 'ID_CARD_BACK', 'KBIS'];
    const needsVehicleDoc = profile?.vehicleType && profile.vehicleType !== 'NONE';
    
    if (needsVehicleDoc) {
      requiredDocs.push('VEHICLE_REGISTRATION');
    }

    const documentStatus = requiredDocs.map((type) => {
      const doc = documents.find((d) => d.type === type);
      return {
        type,
        required: true,
        uploaded: !!doc,
        status: doc?.status || null,
        fileUrl: doc?.fileUrl || null,
        rejectionReason: doc?.rejectionReason || null,
      };
    });

    // Ajouter VEHICLE_REGISTRATION si pas requis mais uploadé
    if (!needsVehicleDoc) {
      const vehicleDoc = documents.find((d) => d.type === 'VEHICLE_REGISTRATION');
      if (vehicleDoc) {
        documentStatus.push({
          type: 'VEHICLE_REGISTRATION',
          required: false,
          uploaded: true,
          status: vehicleDoc.status,
          fileUrl: vehicleDoc.fileUrl,
          rejectionReason: vehicleDoc.rejectionReason,
        });
      }
    }

    return {
      documents: documentStatus,
      profile: {
        vehicleType: profile?.vehicleType || 'NONE',
        hasOwnPrinter: profile?.hasOwnPrinter || false,
        documentsVerified: profile?.documentsVerified || false,
      },
    };
  }

  // Uploader un document
  async uploadDocument(carrierId: string, input: UploadDocumentInput) {
    // Vérifier que le profil carrier existe
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) {
      throw new Error('Profil livreur non trouvé. Veuillez d\'abord activer votre compte livreur.');
    }

    // Créer ou mettre à jour le document
    const document = await prisma.carrierDocument.upsert({
      where: {
        carrierId_type: {
          carrierId,
          type: input.type as DocumentType,
        },
      },
      update: {
        fileUrl: input.fileUrl,
        status: 'PENDING',
        rejectionReason: null,
        uploadedAt: new Date(),
      },
      create: {
        carrierId,
        type: input.type as DocumentType,
        fileUrl: input.fileUrl,
        status: 'PENDING',
      },
    });

    // Mettre à jour documentsVerified à false car nouveau document
    await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: { documentsVerified: false },
    });

    return document;
  }

  // Supprimer un document
  async deleteDocument(carrierId: string, type: string) {
    const document = await prisma.carrierDocument.findUnique({
      where: {
        carrierId_type: {
          carrierId,
          type: type as DocumentType,
        },
      },
    });

    if (!document) {
      throw new Error('Document non trouvé');
    }

    await prisma.carrierDocument.delete({
      where: {
        carrierId_type: {
          carrierId,
          type: type as DocumentType,
        },
      },
    });

    // Mettre à jour documentsVerified
    await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: { documentsVerified: false },
    });

    return { message: 'Document supprimé' };
  }

  // Mettre à jour le profil (vehicleType, hasOwnPrinter)
  async updateProfile(carrierId: string, input: UpdateCarrierProfileInput) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) {
      throw new Error('Profil livreur non trouvé');
    }

    // Si on change de type de véhicule vers motorisé, documentsVerified = false
    const needsReverification = 
      input.vehicleType && 
      input.vehicleType !== 'NONE' && 
      profile.vehicleType === 'NONE';

    return prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: {
        ...(input.vehicleType && { vehicleType: input.vehicleType as VehicleType }),
        ...(input.hasOwnPrinter !== undefined && { hasOwnPrinter: input.hasOwnPrinter }),
        ...(needsReverification && { documentsVerified: false }),
      },
    });
  }

  // Vérifier si tous les documents requis sont approuvés
  async checkDocumentsComplete(carrierId: string): Promise<boolean> {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) return false;

    const requiredTypes: DocumentType[] = ['ID_CARD_FRONT', 'ID_CARD_BACK', 'KBIS'];
    
    if (profile.vehicleType !== 'NONE') {
      requiredTypes.push('VEHICLE_REGISTRATION');
    }

    const approvedDocs = await prisma.carrierDocument.findMany({
      where: {
        carrierId,
        type: { in: requiredTypes },
        status: 'APPROVED',
      },
    });

    return approvedDocs.length === requiredTypes.length;
  }

  // === ADMIN: Approuver/Rejeter un document ===
  async reviewDocument(documentId: string, input: ReviewDocumentInput) {
    const document = await prisma.carrierDocument.update({
      where: { id: documentId },
      data: {
        status: input.status as DocumentStatus,
        rejectionReason: input.status === 'REJECTED' ? input.rejectionReason : null,
        reviewedAt: new Date(),
      },
    });

    // Vérifier si tous les documents sont maintenant approuvés
    const allApproved = await this.checkDocumentsComplete(document.carrierId);
    
    if (allApproved) {
      await prisma.carrierProfile.update({
        where: { userId: document.carrierId },
        data: { documentsVerified: true },
      });
    }

    return document;
  }
}