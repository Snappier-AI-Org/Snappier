-- CreateEnum
CREATE TYPE "EarningType" AS ENUM ('TEMPLATE_SALE', 'REFERRAL');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('PAYPAL', 'BANK_TRANSFER', 'WISE', 'CRYPTO', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'TWILIO';
ALTER TYPE "CredentialType" ADD VALUE 'SENDGRID';
ALTER TYPE "CredentialType" ADD VALUE 'AIRTABLE';
ALTER TYPE "CredentialType" ADD VALUE 'SUPABASE';
ALTER TYPE "CredentialType" ADD VALUE 'MYSQL';
ALTER TYPE "CredentialType" ADD VALUE 'POSTGRES';
ALTER TYPE "CredentialType" ADD VALUE 'MONGODB';
ALTER TYPE "CredentialType" ADD VALUE 'REDIS';
ALTER TYPE "CredentialType" ADD VALUE 'HUBSPOT';
ALTER TYPE "CredentialType" ADD VALUE 'SALESFORCE';
ALTER TYPE "CredentialType" ADD VALUE 'PIPEDRIVE';
ALTER TYPE "CredentialType" ADD VALUE 'JIRA';
ALTER TYPE "CredentialType" ADD VALUE 'CLICKUP';
ALTER TYPE "CredentialType" ADD VALUE 'TODOIST';
ALTER TYPE "CredentialType" ADD VALUE 'ASANA';
ALTER TYPE "CredentialType" ADD VALUE 'LINEAR';
ALTER TYPE "CredentialType" ADD VALUE 'TWITTER';
ALTER TYPE "CredentialType" ADD VALUE 'AWS';
ALTER TYPE "CredentialType" ADD VALUE 'DROPBOX';
ALTER TYPE "CredentialType" ADD VALUE 'MICROSOFT';
ALTER TYPE "CredentialType" ADD VALUE 'TELEGRAM';
ALTER TYPE "CredentialType" ADD VALUE 'WHATSAPP';
ALTER TYPE "CredentialType" ADD VALUE 'TYPEFORM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'AIRTABLE_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'NOTION_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_DRIVE_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_CALENDAR_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'HUBSPOT_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'JIRA_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'TWITTER_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'TYPEFORM_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'TWILIO';
ALTER TYPE "NodeType" ADD VALUE 'SENDGRID';
ALTER TYPE "NodeType" ADD VALUE 'AIRTABLE';
ALTER TYPE "NodeType" ADD VALUE 'SUPABASE';
ALTER TYPE "NodeType" ADD VALUE 'MYSQL';
ALTER TYPE "NodeType" ADD VALUE 'POSTGRES';
ALTER TYPE "NodeType" ADD VALUE 'MONGODB';
ALTER TYPE "NodeType" ADD VALUE 'REDIS';
ALTER TYPE "NodeType" ADD VALUE 'HUBSPOT';
ALTER TYPE "NodeType" ADD VALUE 'SALESFORCE';
ALTER TYPE "NodeType" ADD VALUE 'PIPEDRIVE';
ALTER TYPE "NodeType" ADD VALUE 'JIRA';
ALTER TYPE "NodeType" ADD VALUE 'CLICKUP';
ALTER TYPE "NodeType" ADD VALUE 'TODOIST';
ALTER TYPE "NodeType" ADD VALUE 'ASANA';
ALTER TYPE "NodeType" ADD VALUE 'LINEAR';
ALTER TYPE "NodeType" ADD VALUE 'TWITTER';
ALTER TYPE "NodeType" ADD VALUE 'AWS_S3';
ALTER TYPE "NodeType" ADD VALUE 'DROPBOX';
ALTER TYPE "NodeType" ADD VALUE 'MICROSOFT_EXCEL';
ALTER TYPE "NodeType" ADD VALUE 'GRAPHQL';
ALTER TYPE "NodeType" ADD VALUE 'CODE';
ALTER TYPE "NodeType" ADD VALUE 'MERGE';
ALTER TYPE "NodeType" ADD VALUE 'SPLIT';
ALTER TYPE "NodeType" ADD VALUE 'SWITCH';
ALTER TYPE "NodeType" ADD VALUE 'SET';
ALTER TYPE "NodeType" ADD VALUE 'ERROR_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'DATETIME';
ALTER TYPE "NodeType" ADD VALUE 'CRYPTO';
ALTER TYPE "NodeType" ADD VALUE 'JSON_PARSE';
ALTER TYPE "NodeType" ADD VALUE 'AGGREGATE';

-- AlterTable
ALTER TABLE "TemplatePurchase" ADD COLUMN     "earningId" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "TemplateEarning" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "saleAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "netEarning" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PayoutMethod" NOT NULL,
    "payoutDetails" JSONB NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "transactionFee" INTEGER,
    "referralIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "earningIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateEarning_purchaseId_key" ON "TemplateEarning"("purchaseId");

-- CreateIndex
CREATE INDEX "TemplateEarning_sellerId_idx" ON "TemplateEarning"("sellerId");

-- CreateIndex
CREATE INDEX "TemplateEarning_sellerId_status_idx" ON "TemplateEarning"("sellerId", "status");

-- CreateIndex
CREATE INDEX "TemplateEarning_templateId_idx" ON "TemplateEarning"("templateId");

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_idx" ON "PayoutRequest"("userId");

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_status_idx" ON "PayoutRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- CreateIndex
CREATE INDEX "TemplatePurchase_paymentStatus_idx" ON "TemplatePurchase"("paymentStatus");

-- AddForeignKey
ALTER TABLE "TemplateEarning" ADD CONSTRAINT "TemplateEarning_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
