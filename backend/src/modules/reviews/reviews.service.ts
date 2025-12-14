import { prisma } from '../../shared/prisma.js';
import { CreateReviewInput } from './reviews.schemas.js';

export class ReviewsService {
  async createReview(reviewerId: string, input: CreateReviewInput) {
    // Récupérer le parcel
    const parcel = await prisma.parcel.findUnique({
      where: { id: input.parcelId },
      include: { vendor: true, carrier: true },
    });

    if (!parcel) {
      throw new Error('Colis non trouvé');
    }

    if (parcel.status !== 'DELIVERED') {
      throw new Error('Le colis doit être livré avant de laisser un avis');
    }

    // Déterminer qui est reviewé
    let revieweeId: string;
    
    if (reviewerId === parcel.vendorId) {
      // Le vendeur note le livreur
      if (!parcel.carrierId) {
        throw new Error('Pas de livreur à évaluer');
      }
      revieweeId = parcel.carrierId;
    } else if (reviewerId === parcel.carrierId) {
      // Le livreur note le vendeur
      revieweeId = parcel.vendorId;
    } else {
      throw new Error('Vous ne pouvez pas laisser un avis sur ce colis');
    }

    // Vérifier si un avis existe déjà
    const existingReview = await prisma.review.findFirst({
      where: {
        parcelId: input.parcelId,
        reviewerId,
      },
    });

    if (existingReview) {
      throw new Error('Vous avez déjà laissé un avis pour ce colis');
    }

    // Créer l'avis
    const review = await prisma.review.create({
      data: {
        parcelId: input.parcelId,
        reviewerId,
        revieweeId,
        rating: input.rating,
        comment: input.comment,
      },
      include: {
        reviewer: {
          select: { id: true, firstName: true, avatarUrl: true },
        },
        reviewee: {
          select: { id: true, firstName: true, avatarUrl: true },
        },
      },
    });

    // Mettre à jour la note moyenne du carrier si c'est un livreur qui est noté
    const revieweeProfile = await prisma.carrierProfile.findUnique({
      where: { userId: revieweeId },
    });

    if (revieweeProfile) {
      const allReviews = await prisma.review.findMany({
        where: { revieweeId },
        select: { rating: true },
      });

      const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await prisma.carrierProfile.update({
        where: { userId: revieweeId },
        data: { averageRating },
      });
    }

    return review;
  }

  async getReviewsForUser(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
          reviewer: {
            select: { id: true, firstName: true, avatarUrl: true },
          },
          parcel: {
            select: { id: true, size: true, dropoffName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { revieweeId: userId } }),
    ]);

    // Calculer les stats
    const allRatings = await prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true },
    });

    const stats = {
      totalReviews: total,
      averageRating: allRatings.length > 0
        ? Math.round((allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length) * 10) / 10
        : null,
      ratingDistribution: {
        5: allRatings.filter(r => r.rating === 5).length,
        4: allRatings.filter(r => r.rating === 4).length,
        3: allRatings.filter(r => r.rating === 3).length,
        2: allRatings.filter(r => r.rating === 2).length,
        1: allRatings.filter(r => r.rating === 1).length,
      },
    };

    return {
      reviews,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyReviews(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { reviewerId: userId },
        include: {
          reviewee: {
            select: { id: true, firstName: true, avatarUrl: true },
          },
          parcel: {
            select: { id: true, size: true, dropoffName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { reviewerId: userId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}