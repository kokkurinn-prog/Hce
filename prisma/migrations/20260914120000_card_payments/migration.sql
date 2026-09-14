-- CreateEnum
CREATE TYPE "CardPaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cardPaymentStatus" "CardPaymentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "cardPaymentRef" TEXT;
