-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" TEXT,
ADD COLUMN     "authProviderId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;
