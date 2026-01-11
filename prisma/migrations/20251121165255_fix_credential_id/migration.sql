/*
  Warnings:

  - You are about to drop the column `credentialId` on the `Node` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_credentialId_fkey";

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "credentialId",
ADD COLUMN     "credentialId" TEXT;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
