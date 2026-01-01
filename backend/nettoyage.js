import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nettoyage() {
  try {
    console.log('🧹 Début du nettoyage...\n');

    // 1. Récupérer les IDs
    const marie = await prisma.user.findUnique({
      where: { email: 'marie@test.com' }
    });

    const lucas = await prisma.user.findUnique({
      where: { email: 'lucas@test.com' }
    });

    if (!marie) {
      console.log('❌ marie@test.com non trouvée');
      return;
    }

    if (!lucas) {
      console.log('❌ lucas@test.com non trouvé');
      return;
    }

    console.log(`✅ Marie ID: ${marie.id}`);
    console.log(`✅ Lucas ID: ${lucas.id}\n`);

    // 2. Supprimer les missions de Lucas
    const deletedMissions = await prisma.mission.deleteMany({
      where: { carrierId: lucas.id }
    });
    console.log(`🗑️  ${deletedMissions.count} missions de Lucas supprimées`);

    // 3. Supprimer les reviews liées aux colis de Marie
    const deletedReviews = await prisma.review.deleteMany({
      where: {
        parcel: {
          vendorId: marie.id
        }
      }
    });
    console.log(`🗑️  ${deletedReviews.count} reviews supprimées`);

    // 4. Supprimer les messages des conversations de Marie
    const marieConversations = await prisma.conversation.findMany({
      where: {
        parcel: {
          vendorId: marie.id
        }
      },
      select: { id: true }
    });

    const deletedMessages = await prisma.message.deleteMany({
      where: {
        conversationId: {
          in: marieConversations.map(c => c.id)
        }
      }
    });
    console.log(`🗑️  ${deletedMessages.count} messages supprimés`);

    // 5. Supprimer les conversations
    const deletedConversations = await prisma.conversation.deleteMany({
      where: {
        parcel: {
          vendorId: marie.id
        }
      }
    });
    console.log(`🗑️  ${deletedConversations.count} conversations supprimées`);

    // 6. Supprimer les colis de Marie
    const deletedParcels = await prisma.parcel.deleteMany({
      where: { vendorId: marie.id }
    });
    console.log(`🗑️  ${deletedParcels.count} colis de Marie supprimés`);

    // 7. Vérification finale
    const remainingParcels = await prisma.parcel.count({
      where: { vendorId: marie.id }
    });

    const remainingMissions = await prisma.mission.count({
      where: { carrierId: lucas.id }
    });

    console.log('\n✅ NETTOYAGE TERMINÉ !');
    console.log(`📦 Colis restants de Marie: ${remainingParcels}`);
    console.log(`🚚 Missions restantes de Lucas: ${remainingMissions}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

nettoyage();
