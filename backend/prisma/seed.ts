import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Nettoyer la base
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.parcel.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.carrierProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Créer des vendeurs
  const vendor1 = await prisma.user.create({
    data: {
      email: 'marie@test.com',
      passwordHash,
      firstName: 'Marie',
      lastName: 'Dubois',
      phone: '0612345678',
      role: 'VENDOR',
    },
  });

  const vendor2 = await prisma.user.create({
    data: {
      email: 'paul@test.com',
      passwordHash,
      firstName: 'Paul',
      lastName: 'Martin',
      phone: '0623456789',
      role: 'VENDOR',
    },
  });

  // Créer des livreurs
  const carrier1 = await prisma.user.create({
    data: {
      email: 'lucas@test.com',
      passwordHash,
      firstName: 'Lucas',
      lastName: 'Bernard',
      phone: '0634567890',
      role: 'CARRIER',
      carrierProfile: {
        create: {
          isAvailable: true,
          coverageRadiusKm: 10,
          currentLatitude: 48.8566,
          currentLongitude: 2.3522,
          totalDeliveries: 15,
          averageRating: 4.8,
        },
      },
    },
  });

  const carrier2 = await prisma.user.create({
    data: {
      email: 'emma@test.com',
      passwordHash,
      firstName: 'Emma',
      lastName: 'Petit',
      phone: '0645678901',
      role: 'CARRIER',
      carrierProfile: {
        create: {
          isAvailable: true,
          coverageRadiusKm: 5,
          currentLatitude: 48.8606,
          currentLongitude: 2.3376,
          totalDeliveries: 8,
          averageRating: 4.5,
        },
      },
    },
  });

  // Créer un utilisateur BOTH
  const bothUser = await prisma.user.create({
    data: {
      email: 'alex@test.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Durand',
      phone: '0656789012',
      role: 'BOTH',
      carrierProfile: {
        create: {
          isAvailable: false,
          coverageRadiusKm: 7,
          totalDeliveries: 3,
          averageRating: 5.0,
        },
      },
    },
  });

  // Créer des adresses
  const address1 = await prisma.address.create({
    data: {
      userId: vendor1.id,
      label: 'Domicile',
      street: '15 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      latitude: 48.8566,
      longitude: 2.3522,
      isDefault: true,
    },
  });

  const address2 = await prisma.address.create({
    data: {
      userId: vendor2.id,
      label: 'Bureau',
      street: '50 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      latitude: 48.8698,
      longitude: 2.3078,
      isDefault: true,
    },
  });

  // Créer des colis
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(16, 0, 0, 0);

  const parcel1 = await prisma.parcel.create({
    data: {
      vendorId: vendor1.id,
      pickupAddressId: address1.id,
      dropoffType: 'POST_OFFICE',
      dropoffName: 'Bureau de Poste Louvre',
      dropoffAddress: '52 Rue du Louvre, 75001 Paris',
      size: 'SMALL',
      description: 'Vêtements Vinted',
      price: 3.00,
      pickupSlotStart: tomorrow,
      pickupSlotEnd: tomorrowEnd,
      pickupCode: '123456',
      status: 'PENDING',
    },
  });

  const parcel2 = await prisma.parcel.create({
    data: {
      vendorId: vendor2.id,
      pickupAddressId: address2.id,
      dropoffType: 'RELAY_POINT',
      dropoffName: 'Mondial Relay - Tabac Le Diplomate',
      dropoffAddress: '78 Avenue Marceau, 75008 Paris',
      size: 'MEDIUM',
      description: 'Livre et DVD',
      price: 4.00,
      pickupSlotStart: tomorrow,
      pickupSlotEnd: tomorrowEnd,
      pickupCode: '654321',
      status: 'PENDING',
    },
  });

  console.log('✅ Seed completed!');
  console.log('');
  console.log('📝 Test accounts:');
  console.log('   Vendors: marie@test.com, paul@test.com');
  console.log('   Carriers: lucas@test.com, emma@test.com');
  console.log('   Both: alex@test.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });