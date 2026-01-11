-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'GMAIL_TRIGGER';

-- CreateTable
CREATE TABLE "GmailWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "labelIds" TEXT[] DEFAULT ARRAY['INBOX']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GmailWatch_userId_idx" ON "GmailWatch"("userId");

-- CreateIndex
CREATE INDEX "GmailWatch_expiration_idx" ON "GmailWatch"("expiration");

-- CreateIndex
CREATE UNIQUE INDEX "GmailWatch_workflowId_credentialId_key" ON "GmailWatch"("workflowId", "credentialId");
