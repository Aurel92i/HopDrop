import { DocumentStatus, ParcelStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { pushService } from '../notifications/push.service.js';

export class AdminService {
  /**
   * Récupérer tous les documents en attente
   */
  async getPendingDocuments() {
    const documents = await prisma.carrierDocument.findMany({
      where: { status: DocumentStatus.PENDING },
      include: {
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { uploadedAt: 'asc' },
    });

    return documents;
  }

  /**
   * Récupérer tous les documents (avec filtres)
   */
  async getAllDocuments(status?: DocumentStatus) {
    const where = status ? { status } : {};

    const documents = await prisma.carrierDocument.findMany({
      where,
      include: {
        carrier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents;
  }

  /**
   * Récupérer les documents d'un livreur spécifique
   */
  async getCarrierDocuments(carrierId: string) {
    const carrier = await prisma.user.findUnique({
      where: { id: carrierId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        carrierProfile: true,
        carrierDocuments: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!carrier) {
      throw new Error('Livreur non trouvé');
    }

    return carrier;
  }

  /**
   * Approuver un document
   */
  async approveDocument(documentId: string) {
    const document = await prisma.carrierDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        rejectionReason: null,
        reviewedAt: new Date(),
      },
      include: {
        carrier: {
          select: { id: true, firstName: true },
        },
      },
    });

    // Vérifier si tous les documents requis sont maintenant approuvés
    await this.checkAndUpdateVerificationStatus(document.carrierId);

    // Envoyer une notification au livreur
    await pushService.sendToUser(document.carrierId, {
      title: 'Document approuvé ✅',
      body: `Votre ${this.getDocumentTypeLabel(document.type)} a été validé.`,
      data: { type: 'document_approved', documentId },
    });

    return document;
  }

  /**
   * Rejeter un document
   */
  async rejectDocument(documentId: string, reason: string) {
    const document = await prisma.carrierDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
      include: {
        carrier: {
          select: { id: true, firstName: true },
        },
      },
    });

    // Mettre à jour le statut de vérification
    await prisma.carrierProfile.update({
      where: { userId: document.carrierId },
      data: { documentsVerified: false },
    });

    // Envoyer une notification au livreur
    await pushService.sendToUser(document.carrierId, {
      title: 'Document refusé ❌',
      body: `Votre ${this.getDocumentTypeLabel(document.type)} a été refusé. Raison: ${reason}`,
      data: { type: 'document_rejected', documentId },
    });

    return document;
  }

  /**
   * Vérifier et mettre à jour le statut de vérification d'un livreur
   */
  private async checkAndUpdateVerificationStatus(carrierId: string) {
    const profile = await prisma.carrierProfile.findUnique({
      where: { userId: carrierId },
    });

    if (!profile) return;

    // Documents requis
    const requiredTypes = ['ID_CARD_FRONT', 'ID_CARD_BACK', 'KBIS'];
    if (profile.vehicleType !== 'NONE' && profile.vehicleType !== 'BIKE') {
      requiredTypes.push('VEHICLE_REGISTRATION');
    }

    // Vérifier si tous sont approuvés
    const approvedDocs = await prisma.carrierDocument.findMany({
      where: {
        carrierId,
        type: { in: requiredTypes as any },
        status: 'APPROVED',
      },
    });

    const allApproved = approvedDocs.length === requiredTypes.length;

    await prisma.carrierProfile.update({
      where: { userId: carrierId },
      data: { documentsVerified: allApproved },
    });

    // Si tous les documents sont approuvés, notifier le livreur
    if (allApproved) {
      await pushService.sendToUser(carrierId, {
        title: 'Profil vérifié ! 🎉',
        body: 'Tous vos documents ont été validés. Vous pouvez maintenant accepter des missions.',
        data: { type: 'profile_verified' },
      });
    }
  }

  /**
   * Obtenir le label d'un type de document
   */
  private getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ID_CARD_FRONT: "pièce d'identité (recto)",
      ID_CARD_BACK: "pièce d'identité (verso)",
      KBIS: 'extrait Kbis',
      VEHICLE_REGISTRATION: 'carte grise',
    };
    return labels[type] || type;
  }

  /**
   * Statistiques admin
   */
  async getStats() {
    const [
      totalUsers,
      totalCarriers,
      totalVendors,
      pendingDocuments,
      approvedDocuments,
      rejectedDocuments,
      verifiedCarriers,
      totalParcels,
      deliveredParcels,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['CARRIER', 'BOTH'] } } }),
      prisma.user.count({ where: { role: { in: ['VENDOR', 'BOTH'] } } }),
      prisma.carrierDocument.count({ where: { status: DocumentStatus.PENDING } }),
      prisma.carrierDocument.count({ where: { status: DocumentStatus.APPROVED } }),
      prisma.carrierDocument.count({ where: { status: DocumentStatus.REJECTED } }),
      prisma.carrierProfile.count({ where: { documentsVerified: true } }),
      prisma.parcel.count(),
      prisma.parcel.count({ where: { status: ParcelStatus.DELIVERED } }),
    ]);

    return {
      users: {
        total: totalUsers,
        carriers: totalCarriers,
        vendors: totalVendors,
      },
      documents: {
        pending: pendingDocuments,
        approved: approvedDocuments,
        rejected: rejectedDocuments,
      },
      carriers: {
        verified: verifiedCarriers,
        total: totalCarriers,
      },
      parcels: {
        total: totalParcels,
        delivered: deliveredParcels,
      },
    };
  }
}