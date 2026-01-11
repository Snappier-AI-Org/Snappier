-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "CredentialType" ADD VALUE 'GMAIL';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_CALENDAR';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_DOCS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "NodeType" ADD VALUE 'GMAIL';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_CALENDAR';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_DOCS';
